
# Hệ thống quản lý món ăn

## 1. Giới thiệu
Xây dựng hệ thống quản lý món ăn trên nền tảng đám mây, cho phép xem, tìm kiếm, thêm, cập nhật và xóa thông tin món ăn.

## 2. Công nghệ sử dụng
- Frontend: React
- Backend: Node.js, Express
- Cơ sở dữ liệu: MongoDB Atlas
- Quản lý mã nguồn: Git, GitHub
- Đóng gói ứng dụng: Docker
- Lưu trữ Docker image: Docker Hub
- Triển khai: Render

## 3. Cấu trúc dự án
```text
237536_TranDinhHoangKien/
├── frontend/
├── backend/
├── README.md
└── .gitignore
```

## 4. Cài đặt và chạy chương trình
Các hướng dẫn cài đặt và chạy frontend, backend sẽ được cập nhật sau khi hoàn thành phần xây dựng ứng dụng.

## Câu 5: Đóng gói Backend bằng Docker

- Docker Hub: https://hub.docker.com/r/237536trandinhhoangkien/backend
- Image: `237536trandinhhoangkien/backend:latest`
- Cổng container: `5000`
- Kiểm tra API: `http://localhost:5001/health`
- Kết quả kiểm tra: Backend hoạt động, MongoDB kết nối thành công.

Chạy container kiểm tra:

```bash
docker run -d --name food-backend-test -p 5001:5000 --env-file .env 237536trandinhhoangkien/backend:latest
> 
## 6. Cơ sở dữ liệu MongoDB Atlas

- **Project:** `237536_TranDinhHoangKien`
- **Cluster:** `FoodCluster`
- **Database:** `237536_TranDinhHoangKien`
- **Collection:** `foods`
- **Dữ liệu mẫu:** 3 món ăn, gồm Phở bò, Bánh mì thịt và Bún bò Huế.
- **Bảo mật:** Thông tin kết nối và mật khẩu được lưu trong biến môi trường, không đưa lên GitHub.