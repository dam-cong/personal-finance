# Kế hoạch: Script deploy 1 bước cho server Docker

> **Trạng thái:** Đã triển khai

Ghi chú: `deploy.sh` đã qua kiểm tra cú pháp (`bash -n`) và `docker compose
config` parse OK trên máy dev. Chưa test deploy thật trên server (chưa có SSH);
bước deploy thật theo checklist trong `docs/DEPLOY.md`. Lưu ý: trong lúc làm,
dòng `APP_NAME` trong `docker-compose.yml` bị đổi thành `Gia đình Trang -
Hiến` (không phải do tôi sửa, có thể do thao tác khác trên máy) — nhất quán
với `HOUSEHOLD_NAME`, không ảnh hưởng deploy.

## Context

- Dự án đã được deploy trước đó lên server Linux bằng Docker (Docker Compose
  + Nginx reverse proxy `personal-finance.com.vn` → `127.0.0.1:8080`).
- Code hiện được **upload thủ công** lên server (không dùng git trên server),
  và không có SSH từ máy dev. Nên script deploy phải chạy **trên server**.
- Nhu cầu: "deploy bổ sung" (cập nhật code mới) trong **1 bước** —
  sau khi upload code mới, chạy `./deploy.sh` là xong.

## Vấn đề phát hiện

1. **Bug volume sai trong `docker-compose.yml`**: app chạy với `WORKDIR
   /app/backend`, `DATA_FILE=data/data.json` → ghi vào
   `/app/backend/data/data.json`. Nhưng compose mount `./backend/data:/app/data`
   → **không khớp**, dữ liệu không được persist ra host. Khi container bị
   recreate (đúng bước rebuild khi deploy) → **dữ liệu có thể mất**. Cần sửa
   mount thành `./backend/data:/app/backend/data`.
2. Chưa có script nào tự động hóa bước build + restart + kiểm tra.

## Phạm vi thay đổi

- `deploy.sh` — script bash mới, chạy trên server (mới).
- `docker-compose.yml` — sửa đường dẫn volume (sửa bug, 1 dòng).
- `docs/DEPLOY.md` — thêm hướng dẫn deploy bổ sung 1 bước.

## Các bước thực hiện

1. Tạo `deploy.sh` với luồng:
   1. Kiểm tra môi trường (docker, docker compose, chạy đúng thư mục gốc dự án).
   2. **Di trú dữ liệu cũ** (an toàn): nếu host chưa có `backend/data/data.json`
      mà container cũ đang có dữ liệu trong container → copy ra host trước khi
      rebuild (giải cứu trường hợp volume cũ bị mount sai).
   3. **Backup** `backend/data/data.json` vào `backups/` kèm timestamp.
   4. `docker compose up -d --build`.
   5. **Kiểm tra sức khỏe**: gọi `GET /api/config` (không cần auth) trên cổng
      published thật (lấy từ `docker compose port`), timeout 60s.
   6. Báo cáo kết quả + dung lượng file data còn nguyên.
2. Sửa volume trong `docker-compose.yml`.
3. Cập nhật `docs/DEPLOY.md`.

## Kiểm thử

- Kiểm tra cú pháp bash: chạy `bash -n deploy.sh` (nếu máy dev có bash).
- Kiểm tra `docker-compose.yml` parse được: `docker compose config` nếu máy dev
  có Docker (không bắt buộc).
- Trên server: xem checklist trong `docs/DEPLOY.md` (bước 6/7) — deploy thật,
  đăng nhập được, dữ liệu cũ còn nguyên sau khi rebuild.
