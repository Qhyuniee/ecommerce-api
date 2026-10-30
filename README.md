# ECOMMERCE API – MONOLITHIC ARCHITECTURE

## 1. Giới thiệu

Ecommerce API là hệ thống RESTful API thương mại điện tử được xây dựng theo kiến trúc Monolithic.

Hệ thống hỗ trợ:

- Đăng ký và đăng nhập tài khoản.
- Xác thực người dùng bằng JWT.
- Phân quyền người dùng thường và ADMIN.
- Quản lý sản phẩm.
- Tạo và tra cứu đơn hàng.
- Kiểm tra và cập nhật số lượng tồn kho.
- Tự động tạo thông tin vận chuyển khi đặt hàng.
- Quản lý trạng thái vận chuyển.

## 2. Công nghệ sử dụng

| Công nghệ      | Vai trò                     |
| -------------- | --------------------------- |
| Node.js        | Môi trường chạy JavaScript  |
| Express        | Xây dựng RESTful API        |
| Prisma ORM     | Tương tác với cơ sở dữ liệu |
| PostgreSQL 17  | Lưu trữ dữ liệu             |
| JWT            | Xác thực người dùng         |
| bcryptjs       | Mã hóa mật khẩu             |
| Docker         | Đóng gói ứng dụng           |
| Docker Compose | Khởi chạy API và PostgreSQL |
| Postman        | Kiểm thử API                |

## 3. Kiến trúc hệ thống

Hệ thống sử dụng kiến trúc Monolithic.

Các chức năng được tổ chức thành các Controller, Route và Middleware riêng biệt nhưng vẫn chạy trong cùng một ứng dụng Node.js/Express.

```text
ecommerce-api/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── shipmentController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   └── shipmentRoutes.js
│   ├── middlewares/
│   │   └── authMiddleware.js
│   └── lib/
│       └── prisma.js
├── server.js
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## 4. Cơ sở dữ liệu

Hệ thống sử dụng PostgreSQL và Prisma ORM.

Các bảng dữ liệu chính:

| Bảng        | Chức năng                             |
| ----------- | ------------------------------------- |
| Role        | Lưu vai trò người dùng                |
| MemberShip  | Lưu thông tin hạng thành viên và điểm |
| User        | Lưu thông tin tài khoản               |
| Product     | Lưu thông tin sản phẩm và tồn kho     |
| Order       | Lưu thông tin đơn hàng                |
| OrderDetail | Lưu chi tiết sản phẩm trong đơn       |
| Shipment    | Lưu thông tin vận chuyển              |

Các quan hệ được khai báo trong `prisma/schema.prisma`.

## 5. Các API chính

### Authentication

| Method | Endpoint       | Chức năng                |
| ------ | -------------- | ------------------------ |
| POST   | /auth/register | Đăng ký tài khoản        |
| POST   | /auth/login    | Đăng nhập và nhận JWT    |
| GET    | /auth/me       | Xem thông tin người dùng |
| GET    | /admin/check   | Kiểm tra quyền ADMIN     |

### Product

| Method | Endpoint       | Chức năng                 |
| ------ | -------------- | ------------------------- |
| GET    | /products      | Lấy danh sách sản phẩm    |
| GET    | /products/:pid | Lấy chi tiết sản phẩm     |
| POST   | /products      | Thêm sản phẩm – ADMIN     |
| PUT    | /products/:pid | Cập nhật sản phẩm – ADMIN |
| DELETE | /products/:pid | Xóa sản phẩm – ADMIN      |

### Order

| Method | Endpoint     | Chức năng              |
| ------ | ------------ | ---------------------- |
| POST   | /orders      | Tạo đơn hàng           |
| GET    | /orders      | Xem danh sách đơn hàng |
| GET    | /orders/:oid | Xem chi tiết đơn hàng  |

### Shipment

| Method | Endpoint           | Chức năng                              |
| ------ | ------------------ | -------------------------------------- |
| POST   | /shipments         | Tạo thông tin vận chuyển – ADMIN       |
| PATCH  | /shipments/:shipid | Cập nhật trạng thái vận chuyển – ADMIN |

### Health Check

| Method | Endpoint | Chức năng                          |
| ------ | -------- | ---------------------------------- |
| GET    | /health  | Kiểm tra API và kết nối PostgreSQL |

## 6. Hướng dẫn cài đặt và chạy

### Bước 1: Clone repository

```bash
git clone https://github.com/Qhyuniee/ecommerce-api.git
cd ecommerce-api
```

### Bước 2: Tạo file .env

Tạo file `.env` tại thư mục gốc:

```env
POSTGRES_USER=ecommerce_user
POSTGRES_PASSWORD=replace_with_strong_password
POSTGRES_DB=ecommerce_db
JWT_SECRET=replace_with_long_random_secret
JWT_EXPIRES_IN=1d
```

Các giá trị trên là ví dụ cấu hình. Cần thay bằng thông tin phù hợp với môi trường triển khai.

Không đưa file `.env` lên GitHub.

### Bước 3: Khởi chạy Docker Compose

```bash
docker compose up -d --build
```

### Bước 4: Kiểm tra container

```bash
docker compose ps
```

API và PostgreSQL cần chuyển sang trạng thái `healthy`.

### Bước 5: Kiểm tra Health Check

```bash
curl -i http://localhost:3001/health
```

Kết quả mong đợi:

```json
{
  "status": "healthy",
  "service": "ecommerce-api",
  "database": "connected"
}
```

## 7. Kiểm thử bằng Postman

Base URL:

```text
http://localhost:3001
```

### Đăng ký

```http
POST /auth/register
Content-Type: application/json
```

### Đăng nhập

```http
POST /auth/login
Content-Type: application/json
```

Sau khi đăng nhập thành công, sử dụng JWT trong tab Authorization của Postman:

```text
Auth Type: Bearer Token
Token: <JWT nhận từ API>
```

### Tạo đơn hàng

```http
POST /orders
Authorization: Bearer <JWT>
Content-Type: application/json
```

Ví dụ:

```json
{
  "items": [
    { "pid": 4, "qty": 2 },
    { "pid": 3, "qty": 5 }
  ]
}
```

Lưu ý: Các PID phải tồn tại và có đủ tồn kho. Ví dụ này sẽ tạo đơn hàng thật và trừ số lượng sản phẩm nếu request thành công.

Khi tạo đơn hàng thành công:

- Hệ thống sử dụng UID từ JWT.
- Kiểm tra số lượng tồn kho.
- Trừ tồn kho trong Prisma Transaction.
- Tạo Order và OrderDetail.
- Tự động tạo Shipment với trạng thái PENDING.

## 8. Kiểm tra PostgreSQL

Mở PostgreSQL CLI:

```bash
docker compose exec db psql -U ecommerce_user -d ecommerce_db
```

Liệt kê các bảng:

```sql
\dt
```

Kiểm tra sản phẩm:

```sql
SELECT * FROM "Product";
```

Kiểm tra đơn hàng:

```sql
SELECT * FROM "Order";
```

Kiểm tra chi tiết đơn hàng:

```sql
SELECT * FROM "OrderDetail";
```

Kiểm tra vận chuyển:

```sql
SELECT * FROM "Shipment";
```

Thoát PostgreSQL:

```sql
\q
```

## 9. Kiểm tra cú pháp

```bash
npm test
```

Lệnh hiện tại thực hiện kiểm tra cú pháp `server.js` bằng Node.js, chưa phải bộ kiểm thử tự động toàn bộ API.

## 10. Dừng hệ thống

```bash
docker compose down
```

Lệnh này dừng và xóa các container thuộc Compose, không tự động xóa volume PostgreSQL.

Không sử dụng `docker compose down -v` nếu muốn giữ dữ liệu trong database.

## 11. Repository

https://github.com/Qhyuniee/ecommerce-api
