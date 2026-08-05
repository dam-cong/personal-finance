---
name: run
description: Build và chạy app Personal Finance Chat (backend Go + frontend React) trên máy dev Windows này. Dùng khi cần khởi động app để xem thay đổi UI/API, hoặc khi cần build lại frontend sau khi sửa code và đồng bộ vào server đang chạy.
---

# Chạy app Personal Finance Chat (dev, Windows + WSL)

## Bối cảnh môi trường (quan trọng, đọc trước khi làm)

- `bin/pf-server` là **binary Linux (ELF)** — không chạy trực tiếp trên Windows.
  Phải chạy qua **WSL, distro `Ubuntu`** (không phải `docker-desktop`, distro
  đó không dùng để chạy app).
- Máy dev Windows này **không có Go toolchain** (không có trên Windows, không
  có trong WSL Ubuntu) và **Docker Desktop engine không chạy** (`docker ps`
  báo lỗi kết nối pipe). Vì vậy **không thể `go build` lại `bin/pf-server`**
  trong môi trường này — chỉ có thể chạy binary đã build sẵn có trong
  `bin/pf-server`. Nếu cần build lại backend (sau khi sửa code Go), phải báo
  cho người dùng biết là cần Go toolchain hoặc Docker daemon, không tự ý tìm
  cách khác để "né" việc thiếu công cụ.
- Frontend (`frontend/`) build bình thường bằng Node/npm ngay trên Windows,
  không cần WSL.
- Server đọc file tĩnh frontend (`frontend/dist`) **trực tiếp từ đĩa mỗi khi
  có request** — không cache/embed cứng. Nghĩa là: sau khi sửa frontend, chỉ
  cần `npm run build` lại là server đang chạy sẽ tự phục vụ bản mới, **không
  cần restart** `pf-server`. Luôn dùng cách kiểm tra ở Bước 4 để xác nhận
  thay vì đoán.

## Bước 1 — Kiểm tra xem app đã chạy chưa (tránh chạy trùng)

```bash
wsl.exe -d Ubuntu -e bash -c "ps aux | grep pf-server | grep -v grep"
```

Nếu đã có tiến trình `pf-server` đang chạy: **không tự ý kill để chạy lại**
— server này có thể đang phục vụ người dùng thật trong nhà (vd: hiendc,
trangdt đang chat/xem dashboard). Hỏi xin phép người dùng trước khi restart
(xem mục "Restart khi cần" bên dưới). Nếu chưa có gì chạy, sang Bước 2.

## Bước 2 — Build frontend

```bash
cd /d/sourcecode/personal-finance/frontend
npm install   # phòng khi node_modules bị thiếu/hỏng (đã từng gặp: tsc "not recognized")
npm run build
```

Kiểm tra build thành công (không lỗi tsc/vite), output vào `frontend/dist/`.

## Bước 3 — Khởi động backend (nếu chưa chạy)

Server phải chạy với **working directory là `backend/`** (không phải root
repo) — các đường dẫn tương đối trong `.env` (`DATA_FILE=data/data.json`) và
static file serving (`../frontend/dist`) đều tính từ đó.

```bash
wsl.exe -d Ubuntu -e bash -c "cd /mnt/d/sourcecode/personal-finance/backend && nohup /mnt/d/sourcecode/personal-finance/bin/pf-server > server.log 2>&1 & disown; sleep 1; ps aux | grep pf-server | grep -v grep"
```

Log ghi vào `backend/server.log`.

## Bước 4 — Kiểm tra app đã chạy đúng

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8080/
curl -s http://localhost:8080/api/config
```

Kỳ vọng: `HTTP 200` và JSON `{"app_name":"...","household_name":"..."}`.

Nếu vừa sửa frontend và muốn xác nhận server đã phục vụ bản build mới nhất
(không chỉ là cache cũ), so sánh tên file hash trong `frontend/dist/index.html`
với file server thực sự trả về:

```bash
grep -o 'index-[A-Za-z0-9_-]*\.\(js\|css\)' frontend/dist/index.html
curl -s http://localhost:8080/ | grep -o 'index-[A-Za-z0-9_-]*\.\(js\|css\)'
```

Hai kết quả phải khớp nhau.

## Dev nhanh cho frontend (hot reload, không cần build/restart backend)

Nếu chỉ đang lặp lại chỉnh sửa UI và muốn xem live mà không build/deploy mỗi
lần, chạy Vite dev server (cần backend ở Bước 3 đã chạy để proxy `/api`):

```bash
cd /d/sourcecode/personal-finance/frontend
npm run dev
```

Mở `http://localhost:5173` (Vite tự proxy `/api` → `http://localhost:8080`
theo cấu hình `vite.config.ts`).

## Restart khi cần (PHẢI xin phép người dùng trước)

Chỉ restart khi người dùng đồng ý rõ ràng — server có thể đang phục vụ
người dùng thật. Cách restart:

```bash
wsl.exe -d Ubuntu -e bash -c "pkill -f pf-server; sleep 1; cd /mnt/d/sourcecode/personal-finance/backend && nohup /mnt/d/sourcecode/personal-finance/bin/pf-server > server.log 2>&1 & disown"
```

## Ghi chú khác

- Có 2 WSL distro trên máy này: `Ubuntu` (dùng để chạy app) và
  `docker-desktop` (nội bộ của Docker Desktop, không dùng trực tiếp).
- Không dùng `docker compose up` ở môi trường này trừ khi Docker Desktop
  engine đang chạy thật (`docker ps` không lỗi) — hiện tại engine không chạy.
