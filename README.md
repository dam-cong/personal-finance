# Personal Finance Chat

Ứng dụng web quản lý chi tiêu qua giao diện chat giống Messenger.
Người dùng nhắn tin chi tiêu (VD: `Cafe Highland 45000`), hệ thống phân tích
số tiền, lưu vào file JSON, và trả lời xác nhận.

- Mỗi thành viên thuộc một **nhà** (household) — **chat là riêng** của từng người.
- **Dashboard là chung** cho cả nhà: gộp chi tiêu của mọi thành viên cùng nhà.
- Chỉ **chủ giao dịch** mới được xóa.

- **Backend:** Go + Gin (JSON store, không cần cơ sở dữ liệu ngoài)
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Tài liệu liên quan:** `Personal_Finance_Chat_Idea.md` (ý tưởng),
  `Personal_Finance_Chat_Plan.md` (kế hoạch chi tiết)

> Trạng thái hiện tại: **Phase 4 hoàn thành** (nền tảng + đăng nhập + chat nhập
> chi tiêu + dashboard tháng/quý/năm + mô hình "nhà": chat riêng, dashboard chung).

---

## 1. Tài khoản mặc định

| Username | Mật khẩu |
|---|---|
| `hiendc` | `1998` |
| `trangdt` | `1999` |

Các tài khoản này được tạo tự động khi server khởi động lần đầu
(mã hóa bcrypt). Có thể thay đổi qua env `SEED_USERS` — xem mục 4.

## 2. Yêu cầu môi trường

- **Go** >= 1.25
- **Node.js** >= 20, **npm**

## 3. Cấu trúc thư mục

```
personal-finance/
├── backend/                  # Go + Gin
│   ├── cmd/server/main.go    # entrypoint: config, seed, routes, serve static
│   ├── internal/
│   │   ├── config/           # đọc biến môi trường
│   │   ├── models/           # Household, User, Transaction
│   │   ├── store/            # JSON store (mutex + atomic write) + test
│   │   ├── handlers/         # xử lý HTTP: auth, routes
│   │   └── middleware/       # JWT auth
│   └── data/                 # data.json (tự tạo khi chạy)
├── frontend/                 # React + Vite + TS
│   └── src/
│       ├── pages/            # LoginPage, HomePage
│       ├── lib/              # axios instance, format
│       ├── stores/           # Zustand (auth)
│       └── types/            # kiểu dữ liệu chia sẻ
├── .gitignore
└── README.md
```

## 4. Cấu hình (Backend)

Các biến môi trường (xem `backend/.env.example`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `8080` | Cổng chạy server |
| `JWT_SECRET` | `dev-secret-change-me` | Khóa ký JWT — **đổi khi deploy** |
| `DATA_FILE` | `data/data.json` | Đường dẫn file dữ liệu |
| `SEED_USERS` | `hiendc:1998,trangdt:1999` | User seed, format `user:pass,user:pass` |
| `APP_NAME` | `Personal Finance Chat` | Tên hiển thị của ứng dụng (login + header) |
| `HOUSEHOLD_NAME` | `Gia đình Trang - Hiến` | Tên nhà — mọi user đăng ký thuộc nhà này |
| `DEFAULT_BUDGET` | `10000000` | Hạn mức chi tiêu mặc định mỗi tháng (0 = tắt, tháng nào cũng đặt riêng được) |

> Đổi tên ứng dụng/nhà: set `APP_NAME` / `HOUSEHOLD_NAME` rồi khởi động lại
> backend — tên hiển thị và tiêu đề tab đổi theo. Nếu `data.json` chưa có nhà,
> server tự tạo nhà mặc định và gán toàn bộ user cũ vào đó.

## 5. Cách chạy

Có Makefile tiện dụng: `make run` (build 1 binary + chạy), `make dev-backend`,
`make dev-frontend`, `make test`, `make build`, `make clean`.

### 5.1 Chạy toàn bộ (production build)

```bash
# 1. Build frontend (tạo frontend/dist)
cd frontend && npm install && npm run build

# 2. Chạy backend (Go tự serve cả API + frontend đã build)
cd ../backend && go run ./cmd/server
```

Mở trình duyệt: http://localhost:8080 — đăng nhập bằng tài khoản mặc định.

### 5.2 Chạy dev (hot reload, tách 2 tiến trình)

Terminal 1 — Backend:

```bash
cd backend && go run ./cmd/server
```

Terminal 2 — Frontend (Vite proxy `/api` → `localhost:8080`):

```bash
cd frontend && npm run dev
```

Mở trình duyệt: http://localhost:5173

### 5.3 Build thành 1 binary duy nhất (deploy)

```bash
make build          # = npm build frontend + go build backend → bin/pf-server
./bin/pf-server
```

Chỉ cần chạy `pf-server` cùng thư mục `data/` — không cần Node/PostgreSQL.

### 5.4 Deploy với Docker

#### Điều kiện
- Docker 24+ và Docker Compose
- Domain đã trỏ DNS vào server IP

#### Build và chạy

```bash
docker compose up -d --build
```

Ứng dụng chạy trên http://localhost:8080.

#### Cấu hình domain

1. Copy file cấu hình Nginx:
   ```bash
   sudo cp nginx/personal-finance.com.vn.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/personal-finance.com.vn.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
2. Cấp SSL certificate:
   ```bash
   sudo certbot certonly --nginx -d personal-finance.com.vn -d www.personal-finance.com.vn
   ```
3. Thêm 2 dòng SSL vào server block 443 trong file cấu hình Nginx:
   ```nginx
   ssl_certificate     /etc/letsencrypt/live/personal-finance.com.vn/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/personal-finance.com.vn/privkey.pem;
   ```
4. Reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

#### Biến môi trường Docker

| Biến | Giá trị mặc định | Mô tả |
|---|---|---|
| `JWT_SECRET` | *(phải đặt)* | Khóa ký JWT |
| `PORT` | `8080` | Cổng server |
| `HOUSEHOLD_NAME` | `Gia đình Trang - Hiến` | Tên nhà |
| `DEFAULT_BUDGET` | `10000000` | Hạn mức mặc định |
| `SEED_USERS` | `hiendc:1998,trangdt:1999` | User seed |

#### Dừng và xoá

```bash
docker compose down
```

## 6. Hướng dẫn sử dụng

### 6.1 Đăng nhập / Đăng ký

1. Mở ứng dụng → tab **Đăng nhập** hoặc **Đăng ký**.
2. Chưa có tài khoản → chọn **Đăng ký**, nhập tên + mật khẩu (tối thiểu 6 ký tự)
   → tài khoản mới được tạo và đăng nhập luôn (dữ liệu dùng chung cả nhà).
3. Đăng nhập thành công → token JWT lưu trong `localStorage`, vào trang chủ.
4. Nhấn **Đăng xuất** để kết thúc phiên.

### 6.2 Nhập chi tiêu qua chat

Vào tab **Chat**, gõ tin nhắn rồi nhấn **Enter** (hoặc nút Gửi).
Hệ thống phân tích và trả lời xác nhận bằng bong bóng bot.
**Chat là riêng của từng người** —
bạn chỉ thấy giao dịch do chính mình nhập; giao dịch của thành viên khác
không hiện trong chat của bạn.

- Tin nhắn hiển thị **theo thứ tự thời gian** (cũ → mới, newest ở cuối).
- Bot reply hiển thị ngay trong chat: thành công → "Đã lưu thành công",
  lỗi → "Tin nhắn không hợp lệ, chưa được lưu".
- Bong bóng bot được giữ lại khi reload trang hoặc chuyển sang dashboard
  rồi quay lại chat — không cần reload thủ công.

Định dạng hỗ trợ:

| Nhập vào | Nội dung | Số tiền |
|---|---|---|
| `Cafe Highland 45000` | Cafe Highland | 45.000đ |
| `Cafe 45k` | Cafe | 45.000đ |
| `Cafe 45.000` | Cafe | 45.000đ |
| `Cafe 45,000` | Cafe | 45.000đ |
| `Cafe 45 000` | Cafe | 45.000đ |
| `Ăn sáng\n35000` | Ăn sáng | 35.000đ |

- Muốn **xóa** một giao dịch: di chuột vào tin nhắn (có số tiền) → nhấn `×`
  → xác nhận trong hộp thoại. (Chỉ xóa được giao dịch của chính mình.)
- Tin nhắn sai định dạng → hệ thống trả lời hướng dẫn, không lưu gì cả.

### 6.3 Dashboard

Vào tab **Dashboard**, chọn kỳ thống kê:

- **Dashboard là chung cho cả nhà**: tổng chi + số giao dịch gộp của mọi
  thành viên trong cùng nhà; từng giao dịch ghi rõ người nhập.
- Nút **Tháng / Quý / Năm** để chọn loại kỳ.
- Chọn năm, tháng hoặc quý cụ thể.
- Hiển thị: tổng chi, số giao dịch, biểu đồ cột (chi theo từng ngày trong
  tháng / từng tháng trong quý, năm) và danh sách giao dịch trong kỳ
  (chỉ xóa được giao dịch của chính mình).

**Hạn mức chi tiêu tháng** (chỉ hiện ở chế độ **Tháng**):

- Mỗi tháng đều có hạn mức **mặc định** (`DEFAULT_BUDGET`, mặc định 10 triệu) —
  không cần đặt riêng, thanh tiến trình luôn hiển thị (thẻ đánh dấu "mặc định").
- Chưa đặt riêng → nút **"Đặt hạn mức"** để ghi đè cho riêng tháng đó.
- Đã đặt riêng → hiển thị: tổng chi so với hạn mức, **% đã dùng**, thanh tiến trình
  (xanh < 70% · vàng 70–100% · đỏ vượt hạn mức) và dòng "Còn lại X"
  hoặc "Đã vượt hạn mức Y".
- Nút **Chỉnh sửa / Xóa** để đổi hoặc bỏ hạn mức riêng (xóa → quay về mặc định).
- Hạn mức là **chung của cả nhà** (gộp tổng chi mọi thành viên), đặt theo từng
  tháng và lưu lịch sử.

## 7. Hướng dẫn kiểm thử

### 7.1 Kiểm thử Backend (Go)

```bash
cd backend
go test ./...          # chạy toàn bộ test
go test -v ./...       # chạy kèm chi tiết
go test -race ./...    # chạy với race detector
go vet ./...           # kiểm tra tĩnh
```

Test hiện có:

| Test | Nội dung |
|---|---|
| `internal/store/store_test.go` | Household (tạo mặc định, migrate file cũ), user, transaction: tạo/tìm/xóa, lọc theo user/nhà, budget (set/upsert/get/xóa, persist), persist, auto-create, file hỏng |
| `internal/services/parser_test.go` | Parser: 13 case hợp lệ + 8 case lỗi |
| `internal/services/stats_test.go` | Tổng hợp dashboard: tổng, count, buckets, bỏ qua ngày hỏng |

### 7.2 Kiểm thử Frontend

```bash
cd frontend
npm run lint          # oxlint — kiểm tra lỗi cú pháp/quy ước
npm run build         # tsc -b + vite build — kiểm tra type + build được
```

### 7.3 Kiểm thử API thủ công (curl)

Chạy backend trước, sau đó:

```bash
# Đăng nhập (lấy token)
curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"hiendc","password":"1998"}'

# Đăng nhập sai mật khẩu → mong đợi 401
curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"hiendc","password":"wrong"}'
```

### 7.4 Checklist kiểm thử Phase 1

- [ ] Đăng nhập đúng `hiendc`/`1998` → nhận token, vào được trang chủ
- [ ] Đăng nhập đúng `trangdt`/`1999` → vào được trang chủ
- [ ] Đăng nhập sai mật khẩu → thông báo "Sai tên đăng nhập hoặc mật khẩu"
- [ ] Không có token truy cập trang chủ → bị đưa về `/login`
- [ ] Token hết hạn (hoặc sửa sai trong localStorage) → tự logout
- [ ] Xóa `data/data.json`, khởi động lại → file tự tạo lại, 2 user tự seed

### 7.5 Checklist kiểm thử Phase 2

- [ ] Nhắn `Cafe Highland 45000` → bong bóng bot "Đã lưu thành công: Cafe Highland — 45.000đ"
- [ ] Nhắn `xin chào` → bong bóng bot "Tin nhắn không hợp lệ, chưa được lưu. Vd: Cafe 45000"
- [ ] Nhắn `Cafe 45k` → lưu đúng 45.000đ
- [ ] Nhắn `Cafe 45.000`, `Cafe 45,000`, `Cafe 45 000` → đều lưu 45.000đ
- [ ] Nhắn `Ăn sáng\n35000` (xuống dòng) → lưu đúng
- [ ] Nhắn `abc` → bot báo lỗi, không lưu gì
- [ ] Gọi API transactions không kèm token → 401
- [ ] Hover tin nhắn có tiền → thấy nút `×` → xóa → tin biến mất
- [ ] Refresh trang → lịch sử chat vẫn còn đầy đủ
- [ ] Tin nhắn mới nhất luôn ở cuối danh sách (cũ → mới)
- [ ] Chuyển sang dashboard rồi quay lại chat → tin nhắn mới vẫn còn, không cần reload

### 7.6 Checklist kiểm thử Phase 3

- [ ] Nhập chi tiêu ở nhiều tháng khác nhau
- [ ] Dashboard chọn Tháng 8/2026 → tổng chi đúng, biểu đồ có cột ngày 05 và 15
- [ ] Chọn Quý 3/2026 → tổng = tổng 3 tháng 7+8+9
- [ ] Chọn Năm 2026 → đủ 12 cột, tổng khớp
- [ ] Chọn tháng không có dữ liệu → tổng = 0, không lỗi
- [ ] Xóa giao dịch trong Dashboard → tổng giảm theo, tab Chat cũng mất tin
- [ ] Param sai (VD: month=13) → lỗi 400 rõ ràng

### 7.7 Checklist kiểm thử Phase 4 — Nhà / chat riêng / dashboard chung

- [ ] Khởi động lại với `data.json` cũ (chưa có `households`) → tự tạo nhà mặc
  định, 2 user `hiendc`, `trangdt` được gán vào nhà đó
- [ ] Đăng nhập `hiendc` → chat chỉ thấy giao dịch của `hiendc`
- [ ] Đăng nhập `trangdt` → chat chỉ thấy giao dịch của `trangdt`
- [ ] Dashboard (đăng nhập ai cũng được) → hiển thị đủ giao dịch của cả 2 người
- [ ] Login/register trả về `household_name`; trang đăng nhập + header hiện tên nhà
- [ ] `hiendc` xóa giao dịch của `trangdt` (curl DELETE) → 403
- [ ] `hiendc` xóa giao dịch của chính mình → 200
- [ ] Dashboard hiện banner tên nhà + số thành viên; nút `×` chỉ hiện trên giao
  dịch của mình

### 7.8 Checklist kiểm thử hạn mức chi tiêu

- [ ] Chế độ Tháng, chưa đặt hạn mức → thẻ hiện "Chưa đặt hạn mức" + nút Đặt
- [ ] Đặt hạn mức 10.000.000đ → thanh tiến trình hiển thị % đã dùng đúng
- [ ] Chi tiêu dưới 70% hạn mức → thanh màu xanh, dòng "Còn lại X"
- [ ] Chi tiêu từ 70–100% → thanh màu vàng
- [ ] Chi tiêu vượt hạn mức → thanh màu đỏ, dòng "Đã vượt hạn mức Y"
- [ ] Chỉnh sửa hạn mức → cập nhật ngay, % tính lại
- [ ] Xóa hạn mức → thẻ quay về trạng thái "Chưa đặt"
- [ ] PUT `/budgets` với `amount` ≤ 0 hoặc `month` sai dạng → 400
- [ ] Đặt hạn mức cho tháng khác → tháng cũ giữ nguyên
- [ ] Chế độ Quý/Năm → không hiện thẻ hạn mức

## 8. API

Base URL: `http://localhost:8080/api` — định dạng JSON.
Các endpoint trừ `/auth/login` cần header `Authorization: Bearer <token>`.

| Method | Path | Chức năng | Auth |
|---|---|---|---|
| GET | `/config` | Cấu hình app (`app_name`, `household_name`) | Không |
| POST | `/auth/register` | Đăng ký, trả JWT + `household_name` | Không |
| POST | `/auth/login` | Đăng nhập, trả JWT + `household_name` | Không |
| GET | `/transactions` | Giao dịch của **chính user đang đăng nhập** (chat riêng) | JWT |
| POST | `/transactions` | Nhập giao dịch từ chat, trả lời bot | JWT |
| DELETE | `/transactions/:id` | Xóa giao dịch — **chỉ chủ sở hữu** (403 nếu khác) | JWT |
| GET | `/dashboard/month?year=&month=` | Thống kê tháng — gộp **cả nhà** + `budget` | JWT |
| GET | `/dashboard/quarter?year=&quarter=` | Thống kê quý — gộp **cả nhà** | JWT |
| GET | `/dashboard/year?year=` | Thống kê năm — gộp **cả nhà** | JWT |
| PUT | `/budgets` | Đặt/cập nhật hạn mức tháng `{ "month": "2026-08", "amount": 10000000 }` | JWT |
| DELETE | `/budgets?month=2026-08` | Xóa hạn mức tháng | JWT |

> Thiếu tham số `year`/`month`/`quarter` → mặc định là thời điểm hiện tại.

### POST /auth/login

Request:

```json
{ "username": "hiendc", "password": "1998" }
```

Response `200`:

```json
{
  "token": "eyJhbGciOi...",
  "username": "hiendc",
  "household_id": 1,
  "household_name": "Gia đình Trang - Hiến"
}
```

Response `401`:

```json
{ "error": "Sai tên đăng nhập hoặc mật khẩu" }
```

### POST /transactions (kèm JWT)

Request:

```json
{ "message": "Cafe Highland 45000" }
```

Response `200`:

```json
{
  "transaction": {
    "id": 1,
    "content": "Cafe Highland",
    "amount": 45000,
    "created_at": "2026-08-05T10:00:00+07:00",
    "username": "hiendc"
  },
  "reply": "Đã lưu thành công: Cafe Highland — 45.000đ",
  "valid": true,
  "saved": true
}
```

Response `400` — sai định dạng:

```json
{
  "error": "không tìm thấy số tiền",
  "reply": "Tin nhắn không hợp lệ, chưa được lưu. Vd: Cafe 45000",
  "valid": false,
  "saved": false
}
```

- `reply` để hiển thị trong bong bóng bot khi gửi tin;
  `valid`/`saved` cho biết tin nhắn có hợp lệ và dữ liệu đã được lưu hay chưa.

### GET /transactions (kèm JWT)

Chỉ trả về giao dịch của user đang đăng nhập (chat riêng). Response `200`:

```json
{ "items": [ { "id": 1, "content": "Cafe Highland", "amount": 45000 } ] }
```

### DELETE /transactions/:id (kèm JWT)

Chỉ chủ sở hữu giao dịch được xóa.

Response `200`: `{ "message": "Đã xóa" }`
Response `403` (không phải chủ sở hữu): `{ "error": "Chỉ chủ giao dịch mới được xóa" }`
Response `404`: `{ "error": "Không tìm thấy giao dịch" }`

### GET /dashboard/month?year=2026&month=8 (kèm JWT)

Response `200`:

```json
{
  "period": "month",
  "year": 2026,
  "month": 8,
  "total": 380000,
  "count": 3,
  "daily": [
    { "label": "2026-08-05", "total": 80000 },
    { "label": "2026-08-15", "total": 300000 }
  ],
  "transactions": [ { "id": 5, "content": "Đi chợ", "amount": 300000 } ],
  "household": "Gia đình Trang - Hiến",
  "members": ["hiendc", "trangdt"],
  "budget": {
    "month": "2026-08",
    "amount": 10000000,
    "spent": 380000,
    "percent": 3.8,
    "remaining": 9620000,
    "status": "ok",
    "default": false
  }
}
```

- `daily` luôn đủ số ngày trong tháng (ngày không có chi = 0).
- `/dashboard/quarter` trả `quarter` + `monthly` (3 phần tử);
  `/dashboard/year` trả `monthly` (12 phần tử).
- Dữ liệu gộp **toàn bộ thành viên trong nhà** của user đang đăng nhập;
  `household` = tên nhà, `members` = danh sách thành viên.
- `budget` chỉ có ở `/dashboard/month`; chưa đặt hạn mức riêng → vẫn trả hạn mức
  **mặc định** (`default: true`, theo `DEFAULT_BUDGET`); đặt `DEFAULT_BUDGET=0`
  mới trả `budget: null` khi chưa đặt. `status`: `ok` (<70%), `near` (70–100%),
  `over` (>100%).

### PUT /budgets (kèm JWT) — đặt hạn mức tháng

Request:

```json
{ "month": "2026-08", "amount": 10000000 }
```

Response `200`:

```json
{ "budget": { "id": 1, "household_id": 1, "month": "2026-08", "amount": 10000000, "created_at": "..." } }
```

- `month` phải có dạng `YYYY-MM`, `amount` > 0 → sai trả `400`.
- Đặt lại tháng đã có → cập nhật số tiền (upsert).

### DELETE /budgets?month=2026-08 (kèm JWT)

Response `200`: `{ "message": "Đã xóa hạn mức" }`
