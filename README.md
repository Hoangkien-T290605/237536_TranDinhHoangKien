
# Hệ thống quản lý món ăn

## 1. Giới thiệu
Xây dựng hệ thống quản lý món ăn trên nền tảng đám mây, cho phép xem, tìm kiếm, thêm, cập nhật và xóa thông tin món ăn.


## Câu 2: Cơ sở dữ liệu MongoDB Atlas

- **Project:** `237536_TranDinhHoangKien`
- **Cluster:** `FoodCluster`
- **Database:** `237536_TranDinhHoangKien`
- **Collection:** `foods`
- **Dữ liệu mẫu:** 3 món ăn gồm Phở bò, Bánh mì thịt và Bún bò Huế.
- **Bảo mật:** Thông tin kết nối và mật khẩu được lưu trong biến môi trường, không đưa lên GitHub.

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

- Docker Hub: [Backend Image](https://hub.docker.com/r/237536trandinhhoangkien/backend)
- Image: `237536trandinhhoangkien/backend:latest`
- Cổng container: `5000`
- Địa chỉ kiểm tra: http://localhost:5001/health
- Kết quả kiểm tra: Backend hoạt động và kết nối MongoDB thành công.

Chạy container kiểm tra:

```bash
docker run -d --name food-backend-test -p 5001:5000 --env-file .env 237536trandinhhoangkien/backend:latest
```

Kiểm tra API:

```bash
curl http://localhost:5001/health
```

## Câu 6: Đóng gói Frontend bằng Docker

- Docker Hub: [Frontend Image](https://hub.docker.com/r/237536trandinhhoangkien/frontend)
- Image: `237536trandinhhoangkien/frontend:latest`
- Cổng container: `80`
- Địa chỉ kiểm tra: http://localhost:8080

Build image từ thư mục `frontend`:

```bash
docker build --build-arg VITE_API_URL=http://localhost:5001 -t 237536trandinhhoangkien/frontend:latest .
```

Chạy container:

```bash
docker run -d --name food-frontend-test -p 8080:80 237536trandinhhoangkien/frontend:latest
```
