# Hướng dẫn Deploy - Personal Finance Chat

## Tổng quan

Ứng dụng quản lý chi tiêu qua chat, gồm:
- **Backend**: Go + Gin, phục vụ API REST + static frontend
- **Frontend**: React + Vite + TypeScript + Tailwind
- **Storage**: JSON file (`data/data.json`), không cần database
- **Auth**: JWT (7 ngày), bcrypt

Binary cuối cùng: `bin/pf-server` (1 file duy nhất, không cần Node/PostgreSQL khi chạy).

---

## Yêu cầu hệ thống

- Docker 24+ và Docker Compose
- RAM tối thiểu: 128MB
- Disk: ~50MB

---

## Cách 1: Docker Compose (khuyến nghị)

### 1. Clone và cấu hình

```bash
git clone <repo-url>
cd personal-finance
```

Sao chép file env mẫu và chỉnh sửa:

```bash
cp backend/.env.example backend/.env
# Chỉnh sửa backend/.env nếu cần
```

### 2. Build và chạy

```bash
docker compose up -d --build
```

Ứng dụng sẽ chạy tại: http://localhost:8080

### 3. Dừng

```bash
docker compose down
```

### 4. Xem log

```bash
docker compose logs -f
```

---

## Cách 2: Docker thủ công

### Build image

```bash
docker build -t pf-server .
```

### Chạy container

```bash
docker run -d \
  --name pf-server \
  -p 8080:8080 \
  -v $(pwd)/backend/data:/app/backend/data \
  -v $(pwd)/backend/.env:/app/backend/.env \
  --restart unless-stopped \
  pf-server
```

---

## Cách 3: Build thủ công (không Docker)

### Build

```bash
make build
```

Lệnh này:
1. `cd frontend && npm install && npm run build` → tạo `frontend/dist/`
2. `cd backend && go build -o ../bin/pf-server ./cmd/server` → tạo `bin/pf-server`

### Chạy

```bash
cd backend && ../bin/pf-server
```

Ứng dụng chạy trên http://localhost:8080

### Biến môi trường (file `.env` trong thư mục `backend/`)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PORT` | `8080` | Cổng server |
| `JWT_SECRET` | `dev-secret-change-me` | Khóa ký JWT — **bắt buộc đổi khi deploy** |
| `DATA_FILE` | `data/data.json` | Đường dẫn file dữ liệu (relative to CWD) |
| `SEED_USERS` | `hiendc:1998,trangdt:1999` | User mặc định (username:password) |
| `APP_NAME` | `Personal Finance Chat` | Tên ứng dụng |
| `HOUSEHOLD_NAME` | `Gia đình Trang - Hiến` | Tên nhà |
| `DEFAULT_BUDGET` | `10000000` | Hạn mức chi tiêu mặc định/tháng (0 = tắt) |

---

## Cách 4: Deploy bổ sung (cập nhật code) — 1 bước

Dùng khi server **đã chạy** rồi, chỉ cần đưa code mới lên.

### Các bước

1. **Upload code mới** lên server (ghi đè vào thư mục dự án). Dữ liệu cũ nằm
   ở `backend/data/data.json` — **không xóa file này**.

2. Chạy script deploy (1 lệnh duy nhất):

   ```bash
   cd <thư mục dự án trên server>
   ./deploy.sh
   ```

### Script `deploy.sh` tự động làm:

| Bước | Việc làm |
|---|---|
| 1 | Kiểm tra docker, docker compose, đúng thư mục dự án |
| 2 | **Di trú dữ liệu cũ** nếu trước đó volume mount sai (chống mất data) |
| 3 | **Backup** `backend/data/data.json` → `backups/data_<timestamp>.json` |
| 4 | `docker compose up -d --build` |
| 5 | Kiểm tra sức khỏe qua `GET /api/config`, báo lỗi nếu server không phản hồi sau 60s |

Nếu lần deploy trước chưa từng chạy script này, lần đầu tiên cần có quyền
execute: `chmod +x deploy.sh`.

---

## Cấu trúc thư mục khi chạy

```
/app/
├── backend/
│   ├── pf-server          # Binary Go
│   ├── .env               # Cấu hình
│   └── data/
│       └── data.json      # Dữ liệu (persist qua volume)
└── frontend/
    └── dist/              # Static files (build output)
```

Binary chạy từ `/app/backend`, tìm frontend tại `../frontend/dist` và data tại `data/data.json`.

---

## Biến môi trường Docker (docker-compose.yml)

| Biến | Giá trị mặc định | Mô tả |
|---|---|---|
| `PORT` | `8080` | Cổng server |
| `JWT_SECRET` | *(phải đặt)* | Khóa ký JWT |
| `HOUSEHOLD_NAME` | `Gia đình Trang - Hiến` | Tên nhà |
| `DEFAULT_BUDGET` | `10000000` | Hạn mức mặc định |
| `SEED_USERS` | `hiendc:1998,trangdt:1999` | User seed |

---

## Lưu ý khi deploy

1. **Đổi `JWT_SECRET`** — giá trị mặc định chỉ dành cho dev.
2. **Persist dữ liệu** — mount volume cho `backend/data/` để không mất dữ liệu khi restart container.
3. **HTTPS** — nếu deploy public, dùng reverse proxy (Nginx/Caddy) phía trước để có SSL.
4. **CORS** — hiện tại cho phép tất cả origin (`*`). Nếu dùng reverse proxy, có thể giữ nguyên.
5. **Backup** — sao lưu `data/data.json` định kỳ.
6. **Cập nhật** — khi có thay đổi code: upload code mới rồi chạy `./deploy.sh`
   (xem Cách 4). Script tự backup data và build lại `docker compose up -d --build`.
7. **Volume dữ liệu** — compose mount đúng `./backend/data:/app/backend/data`
   (khớp `DATA_FILE=data/data.json` của app). Nếu trước đây mount sai
   (`/app/data`), chạy `deploy.sh` để script tự di trú dữ liệu cũ.

---

## Kiểm tra sau khi deploy

```bash
# Kiểm tra server đang chạy
curl http://localhost:8080/api/budgets

# Kiểm tra frontend
curl http://localhost:8080/

# Đăng nhập test
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hiendc","password":"1998"}'
```

---

## Troubleshooting

| Vấn đề | Giải pháp |
|---|---|
| Port 8080 đã được dùng | Đổi `PORT` trong `.env` hoặc `docker-compose.yml` |
| Không tìm thấy `frontend/dist` | Đã chạy `npm run build` chưa? Kiểm tra `frontend/dist/` có tồn tại |
| Lỗi JWT | Đổi `JWT_SECRET` thành giá trị ngẫu nhiên dài |
| Data bị mất sau restart | Đảm bảo volume mount cho `backend/data/` |
| CORS error khi dev | Frontend Vite proxy đã cấu hình `/api` → `:8080` |
