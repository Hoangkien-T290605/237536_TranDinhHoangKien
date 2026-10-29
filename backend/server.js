
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Chuẩn hóa chuỗi tiếng Việt để tìm kiếm không dấu
function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

// Tạo nội dung phục vụ tìm kiếm
function buildSearchText(food) {
  return normalizeText(
    [
      food.foodId,
      food.name,
      food.category,
      food.cuisine,
      ...(food.ingredients || []),
      food.description,
    ].join(" ")
  );
}

// Schema món ăn
const foodSchema = new mongoose.Schema(
  {
    foodId: {
      type: String,
      required: [true, "Mã món ăn là bắt buộc"],
      unique: true,
      trim: true,
      minlength: [1, "Mã món ăn không được để trống"],
    },
    name: {
      type: String,
      required: [true, "Tên món ăn là bắt buộc"],
      trim: true,
      minlength: [1, "Tên món ăn không được để trống"],
    },
    category: {
      type: String,
      required: [true, "Danh mục là bắt buộc"],
      trim: true,
    },
    cuisine: {
      type: String,
      required: [true, "Ẩm thực là bắt buộc"],
      trim: true,
    },
    ingredients: {
      type: [String],
      default: [],
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.every((item) => typeof item === "string"),
        message: "Nguyên liệu phải là một mảng chuỗi",
      },
    },
    price: {
      type: Number,
      required: [true, "Giá món ăn là bắt buộc"],
      min: [0, "Giá không được âm"],
      validate: {
        validator: Number.isFinite,
        message: "Giá phải là số hợp lệ",
      },
    },
    quantity: {
      type: Number,
      required: [true, "Số lượng là bắt buộc"],
      min: [0, "Số lượng không được âm"],
      validate: {
        validator: (value) =>
          Number.isInteger(value) && Number.isFinite(value),
        message: "Số lượng phải là số nguyên không âm",
      },
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    searchText: {
      type: String,
      default: "",
      select: false,
    },
  },
  { timestamps: true }
);

// Tự tạo lại searchText khi lưu món ăn
foodSchema.pre("validate", function () {
  this.searchText = buildSearchText(this);
});

const Food = mongoose.model("Food", foodSchema);

// Các trường được phép gửi lên API
const allowedFields = [
  "foodId",
  "name",
  "category",
  "cuisine",
  "ingredients",
  "price",
  "quantity",
  "description",
  "imageUrl",
];

function validateFoodBody(body, isUpdate = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Dữ liệu gửi lên phải là một đối tượng JSON";
  }

  const keys = Object.keys(body);

  if (keys.length === 0) {
    return "Vui lòng cung cấp dữ liệu món ăn";
  }

  const invalidFields = keys.filter(
    (key) => !allowedFields.includes(key)
  );

  if (invalidFields.length > 0) {
    return `Trường dữ liệu không được hỗ trợ: ${invalidFields.join(", ")}`;
  }

  if (isUpdate && Object.hasOwn(body, "foodId")) {
    return "Không được thay đổi mã món ăn";
  }

  const requiredFields = [
    "foodId",
    "name",
    "category",
    "cuisine",
    "price",
    "quantity",
  ];

  if (!isUpdate) {
    for (const field of requiredFields) {
      if (
        body[field] === undefined ||
        body[field] === null ||
        (typeof body[field] === "string" && !body[field].trim())
      ) {
        return `Trường ${field} là bắt buộc`;
      }
    }
  }

  if (body.ingredients !== undefined) {
    if (
      !Array.isArray(body.ingredients) ||
      !body.ingredients.every((item) => typeof item === "string")
    ) {
      return "ingredients phải là một mảng chuỗi";
    }
  }

  for (const field of ["price", "quantity"]) {
    if (body[field] !== undefined) {
      const value = body[field];

      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0
      ) {
        return `${field} phải là số không âm`;
      }

      if (field === "quantity" && !Number.isInteger(value)) {
        return "quantity phải là số nguyên";
      }
    }
  }

  return null;
}

// Trang gốc
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Food Management API đang hoạt động",
    endpoints: [
      "GET /health",
      "GET /api/foods",
      "GET /api/foods/:id",
      "POST /api/foods",
      "PUT /api/foods/:id",
      "DELETE /api/foods/:id",
    ],
  });
});

// Kiểm tra kết nối
app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected
      ? "Backend và MongoDB đang hoạt động"
      : "MongoDB chưa kết nối",
    database: connected ? "connected" : "disconnected",
  });
});

// GET /api/foods?search=pho
app.get("/api/foods", async (req, res, next) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? normalizeText(req.query.search)
        : "";

    let foods;

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      foods = await Food.find({
        searchText: {
          $regex: escapedSearch,
          $options: "i",
        },
      })
        .select("+searchText")
        .sort({ createdAt: -1 });
    } else {
      foods = await Food.find().sort({ createdAt: -1 });
    }

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods.map((food) => {
        const item = food.toObject();
        delete item.searchText;
        return item;
      }),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/foods/:id
app.get("/api/foods/:id", async (req, res, next) => {
  try {
    const food = await Food.findOne({ foodId: req.params.id });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy món ăn",
      });
    }

    res.status(200).json({
      success: true,
      data: food,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/foods
app.post("/api/foods", async (req, res, next) => {
  try {
    const validationError = validateFoodBody(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const food = await Food.create(req.body);

    res.status(201).json({
      success: true,
      message: "Thêm món ăn thành công",
      data: food,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Mã món ăn đã tồn tại",
      });
    }

    next(error);
  }
});

// PUT /api/foods/:id
app.put("/api/foods/:id", async (req, res, next) => {
  try {
    const validationError = validateFoodBody(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const food = await Food.findOne({
      foodId: req.params.id,
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy món ăn",
      });
    }

    Object.assign(food, req.body);
    await food.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật món ăn thành công",
      data: food,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Mã món ăn đã tồn tại",
      });
    }

    next(error);
  }
});

// DELETE /api/foods/:id
app.delete("/api/foods/:id", async (req, res, next) => {
  try {
    const food = await Food.findOneAndDelete({
      foodId: req.params.id,
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy món ăn",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa món ăn thành công",
    });
  } catch (error) {
    next(error);
  }
});

// Route không tồn tại
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Đường dẫn API không tồn tại",
  });
});

// Xử lý lỗi
app.use((error, req, res, next) => {
  console.error("Lỗi API:", error.message);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "JSON gửi lên không hợp lệ",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error instanceof mongoose.Error.StrictModeError
  ) {
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ",
      error: error.message,
    });
  }

  res.status(500).json({
    success: false,
    message: "Lỗi máy chủ nội bộ",
  });
});

// Kết nối MongoDB và cập nhật dữ liệu tìm kiếm cũ
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Chưa cấu hình MONGODB_URI trong file .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Đã kết nối MongoDB Atlas");

    // Cập nhật searchText cho các món ăn đã có từ trước
    const existingFoods = await Food.find().select("+searchText");

    for (const food of existingFoods) {
      const searchText = buildSearchText(food);

      if (food.searchText !== searchText) {
        food.searchText = searchText;
        await food.save();
      }
    }

    console.log(
      `Đã cập nhật dữ liệu tìm kiếm cho ${existingFoods.length} món ăn`
    );

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend đang chạy tại http://localhost:${PORT}`);
      console.log(`Kiểm tra trạng thái: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Không thể khởi động backend:", error.message);
    process.exit(1);
  }
}

startServer();
