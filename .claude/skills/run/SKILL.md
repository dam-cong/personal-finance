---
name: run
description: Chạy app FamFin (Personal Finance) trên máy dev Windows này bằng dev-server Node. Dùng khi cần khởi động app để xem thay đổi UI/API hoặc khi người dùng báo đăng nhập lỗi "mất kết nối mạng".
---

# Chạy app FamFin (dev, Windows)

## Bối cảnh

- App là **site tĩnh + 1 hàm `api/pf.js`** (proxy đăng nhập tới Apps Script),
  không còn backend Go/frontend React, không cần build, không cần WSL/Docker.
- `dev-server.js` (Node ≥ 20) đọc `.env.local` (`APPS_SCRIPT_URL`, `APPS_TOKEN`),
  phục vụ file tĩnh ở thư mục gốc và gắn `api/pf.js` tại `/api/pf`.
- **Không mở `index.html` bằng `file://`** — không có `/api/pf` nên đăng nhập
  báo "mất kết nối mạng". Luôn truy cập qua `http://localhost:8000`.

## Bước 1 — Kiểm tra đã chạy chưa

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8000/
```

`HTTP 200` → đã chạy, không khởi động lại. Nếu cần restart, hỏi người dùng
trước khi kill tiến trình `node dev-server.js`.

## Bước 2 — Khởi động

```bash
cd /d/sourcecode/personal-finance
(nohup node dev-server.js > dev-server.log 2>&1 &)
sleep 2; cat dev-server.log
```

Đổi cổng bằng biến `PORT` nếu 8000 bị chiếm. Nếu thiếu `.env.local`, log báo
"Không đọc được .env.local" — nhắc người dùng tạo file với 2 biến trên (không
in giá trị ra màn hình).

## Bước 3 — Kiểm tra

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8000/
```

Kỳ vọng `HTTP 200`, rồi báo người dùng mở **http://localhost:8000**.
Không tự đăng nhập thử, vì việc đó gọi Google Sheet thật.

## Ghi chú

- Sửa `index.html`/`parser.js` chỉ cần tải lại trang (server gửi `no-store`);
  sửa `api/pf.js` cần restart server.
- Thay thế: `npx vercel dev` nếu đã đăng nhập Vercel.
- Kiểm thử liên quan xem `tests/` và `CLAUDE.md`.
