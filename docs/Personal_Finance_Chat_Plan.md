# Personal Finance Chat — Kế hoạch triển khai chi tiết

> Tài liệu dành cho developer. Đọc kỹ trước khi code.
> File ý tưởng gốc: `Personal_Finance_Chat_Idea.md`.

---

## 1. Tổng quan

Ứng dụng web quản lý chi tiêu qua giao diện chat giống Messenger.
Người dùng nhắn tin chi tiêu (VD: `Cafe Highland 45000`), hệ thống
parse số tiền, lưu vào file JSON chung của cả nhà, và trả lời xác nhận.

- **Một nhà (cùng một gia đình)**: mọi người dùng chia sẻ chung một file dữ liệu.
- **Chat với hệ thống**: không có chat thật giữa người với người.
- **Không dùng AI** ở phiên bản đầu.

## 2. Kiến trúc

```
React (Vite + TypeScript)
        │  REST API (JSON)
        ▼
     Go + Gin
        │
        ▼
   data.json  (1 file chung, lưu local)
```

- Backend phục vụ luôn cả frontend đã build (1 binary duy nhất khi deploy).
- Không dùng PostgreSQL / Docker / GORM. Toàn bộ lưu trữ là 1 file JSON.

## 3. Công nghệ

| Tầng | Công nghệ | Phiên bản gợi ý |
|---|---|---|
| Frontend | React | 18.x |
| Frontend | Vite | 5.x |
| Frontend | TypeScript | 5.x |
| Frontend | React Router | 6.x |
| Frontend | Axios | 1.x |
| Frontend | TanStack Query | 5.x |
| Frontend | Zustand | 4.x/5.x |
| Frontend | recharts | 2.x (biểu đồ web) |
| Frontend | Tailwind CSS | 3.x |
| Backend | Go | 1.21+ |
| Backend | Gin | latest |
| Backend | golang-jwt/jwt/v5 | v5 |
| Backend | golang.org/x/crypto (bcrypt) | latest |

## 4. Cấu trúc thư mục

```
personal-finance/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/config.go        # đọc env, đường dẫn file
│   │   ├── models/models.go        # User, Transaction
│   │   ├── store/
│   │   │   ├── store.go            # JSON store (mutex + atomic write)
│   │   │   ├── store_test.go
│   │   │   └── data.json           # dữ liệu thật (dev)
│   │   ├── services/
│   │   │   ├── parser.go           # regex tách nội dung + số tiền
│   │   │   └── parser_test.go
│   │   ├── handlers/
│   │   │   ├── auth.go
│   │   │   ├── transactions.go
│   │   │   ├── dashboard.go
│   │   │   └── handlers.go         # đăng ký routes
│   │   └── middleware/auth.go      # JWT middleware
│   ├── go.mod
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts              # proxy /api → localhost:8080
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                 # router setup
│       ├── index.css
│       ├── lib/
│       │   ├── api.ts              # axios instance + interceptor JWT
│       │   └── format.ts           # format tiền, ngày
│       ├── stores/auth.ts          # Zustand: token + user
│       ├── types/index.ts          # User, Transaction, DashboardData
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── ChatPage.tsx
│       │   └── DashboardPage.tsx
│       └── components/
│           ├── chat/ChatWindow.tsx
│           ├── chat/MessageBubble.tsx
│           ├── chat/ChatInput.tsx
│           ├── chat/BotReply.tsx
│           ├── dashboard/SummaryCards.tsx
│           ├── dashboard/PeriodSelector.tsx
│           ├── dashboard/SpendingChart.tsx
│           ├── dashboard/TransactionList.tsx
│           └── ui/Modal.tsx        # modal xác nhận xóa
└── README.md
```

## 5. Dữ liệu — data.json

### 5.1 Định dạng

```json
{
  "users": [
    {
      "id": 1,
      "username": "bo",
      "password_hash": "$2a$10$...",
      "created_at": "2026-08-05T09:00:00+07:00"
    }
  ],
  "transactions": [
    {
      "id": 1,
      "content": "Cafe Highland",
      "amount": 45000,
      "created_at": "2026-08-05T10:00:00+07:00",
      "username": "bo"
    }
  ],
  "next_user_id": 2,
  "next_transaction_id": 2
}
```

### 5.2 Quy ước

- Mọi timestamp là RFC3339 **có múi giờ** (VD `+07:00`).
- `next_user_id`, `next_transaction_id` để sinh id tự tăng.
- `amount` là số nguyên (VND), không dùng float.
- `username` trong transaction để biết ai nhập (chỉ để hiển thị, mọi người đều thấy chung).

### 5.3 Ghi file an toàn

- Dùng `sync.RWMutex` bảo vệ dữ liệu trong bộ nhớ.
- Khi có thay đổi: **ghi ra file tạm** (`data.json.tmp`) rồi `os.Rename` sang `data.json`
  để tránh file hỏng khi mất điện/giữa chừng.
- Nếu file chưa tồn tại khi khởi động → tự tạo file với mảng rỗng.

## 6. Parser (services/parser.go)

### 6.1 Định dạng hỗ trợ

| Input | content | amount |
|---|---|---|
| `Cafe Highland 45000` | `Cafe Highland` | 45000 |
| `Cafe 45k` | `Cafe` | 45000 |
| `Cafe 45K` | `Cafe` | 45000 |
| `Cafe 45.000` | `Cafe` | 45000 |
| `Cafe 45,000` | `Cafe` | 45000 |
| `Cafe 45 000` | `Cafe` | 45000 |
| `Ăn sáng\n35000` | `Ăn sáng` | 35000 |

### 6.2 Quy tắc xử lý

1. Trim khoảng trắng 2 đầu.
2. Nếu có ký tự xuống dòng (`\n`): dòng cuối cùng là số tiền, phần còn lại là content.
3. Ngược lại: tìm con số ở **cuối chuỗi** bằng regex:
   `(\d[\d\s]*)(?:\s*(k|K))?\s*$`
4. Chuẩn hóa amount:
   - Bỏ dấu `.`, `,`, khoảng trắng làm phân tách hàng nghìn.
   - Nếu có hậu tố `k`/`K` → nhân 1000.
   - Đổi sang int.
5. Content = phần đầu sau khi bỏ số tiền, trim.
6. Lỗi khi:
   - Không tìm thấy số tiền.
   - Content rỗng sau khi tách.
   - Amount ≤ 0.

### 6.3 Interface

```go
type Parsed struct {
    Content string
    Amount  int64
}

func Parse(input string) (*Parsed, error)
```

### 6.4 Test bắt buộc (parser_test.go)

Cover đủ tất cả case ở bảng 6.1 + các case lỗi
(chuỗi rỗng, không có số, `0 đồng`, `abc`, số âm, quá dài).

## 7. API Spec

Base URL: `http://localhost:8080/api`. Nội dung là `application/json`.
Tất cả endpoint (trừ login) cần header `Authorization: Bearer <token>`.

Lỗi chuẩn trả về:

```json
{ "error": "mô tả lỗi" }
```

| Method | Path | Chức năng |
|---|---|---|
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/transactions` | Danh sách giao dịch (mới nhất trước) |
| POST | `/api/transactions` | Nhập từ chat |
| DELETE | `/api/transactions/:id` | Xóa giao dịch |
| GET | `/api/dashboard/month` | Thống kê theo tháng |
| GET | `/api/dashboard/quarter` | Thống kê theo quý |
| GET | `/api/dashboard/year` | Thống kê theo năm |

### 7.1 POST /api/auth/login

Request:

```json
{ "username": "bo", "password": "123456" }
```

Response `200`:

```json
{ "token": "eyJhbGciOi...", "username": "bo" }
```

Response `401`: `{ "error": "Sai tên đăng nhập hoặc mật khẩu" }`

- Mật khẩu check bằng `bcrypt.CompareHashAndPassword`.
- JWT: secret từ env `JWT_SECRET`, thời hạn mặc định 7 ngày.
- User không tồn tại trong file → tự tạo mới? **Không.** Phải có cơ chế tạo
  user đầu tiên. Xem mục 9.1.

### 7.2 GET /api/transactions

Response `200`:

```json
{
  "items": [
    {
      "id": 2,
      "content": "Đi chợ",
      "amount": 250000,
      "created_at": "2026-08-05T11:00:00+07:00",
      "username": "me"
    }
  ]
}
```

### 7.3 POST /api/transactions

Request:

```json
{ "message": "Cafe Highland 45000" }
```

Response `200` — trả cả giao dịch đã lưu + nội dung phản hồi cho bot:

```json
{
  "transaction": {
    "id": 1,
    "content": "Cafe Highland",
    "amount": 45000,
    "created_at": "2026-08-05T10:00:00+07:00",
    "username": "bo"
  },
  "reply": "Đã ghi nhận: Cafe Highland — 45.000đ"
}
```

Response `400` — sai định dạng:

```json
{ "error": "Không tìm thấy số tiền. Vd: Cafe 45000", "reply": "..." }
```

Quy tắc: trường `reply` luôn có để bot hiển thị, kể cả khi lỗi
(tin nhắn của bot = câu trả lời parse thành công/thất bại).

### 7.4 DELETE /api/transactions/:id

Response `200`: `{ "message": "Đã xóa" }`
Response `404`: `{ "error": "Không tìm thấy giao dịch" }`

### 7.5 GET /api/dashboard/month?year=2026&month=8

Response `200`:

```json
{
  "period": "month",
  "year": 2026,
  "month": 8,
  "total": 1520000,
  "count": 23,
  "daily": [
    { "label": "2026-08-01", "total": 120000 },
    { "label": "2026-08-02", "total": 0 }
  ],
  "transactions": []
}
```

- `daily`: đủ 30/31/28 ngày của tháng, ngày không có chi = 0.
- `transactions`: danh sách giao dịch trong tháng (mới nhất trước).

### 7.6 GET /api/dashboard/quarter?year=2026&quarter=3

`daily` thay bằng `monthly` (3 phần tử: tháng đầu quý → cuối quý):

```json
{
  "period": "quarter",
  "year": 2026,
  "quarter": 3,
  "total": 5200000,
  "count": 61,
  "monthly": [
    { "label": "2026-07", "total": 1800000 },
    { "label": "2026-08", "total": 2000000 },
    { "label": "2026-09", "total": 1400000 }
  ],
  "transactions": []
}
```

### 7.7 GET /api/dashboard/year?year=2026

```json
{
  "period": "year",
  "year": 2026,
  "total": 72000000,
  "count": 500,
  "monthly": [
    { "label": "2026-01", "total": 5000000 },
    { "label": "2026-02", "total": 6000000 }
  ],
  "transactions": []
}
```

- `monthly`: đủ 12 tháng, tháng không có chi = 0.
- Query param thiếu `year`/`month`/`quarter` → mặc định là thời điểm hiện tại.

## 8. Backend — chi tiết triển khai

### 8.1 Khởi tạo

```bash
cd backend
go mod init personal-finance/backend
go get github.com/gin-gonic/gin
go get github.com/golang-jwt/jwt/v5
go get golang.org/x/crypto/bcrypt
```

### 8.2 config.go

```go
type Config struct {
    Port       string // PORT, mặc định "8080"
    JWTSecret  string // JWT_SECRET
    DataFile   string // DATA_FILE, mặc định "internal/store/data.json"
}
```

### 8.3 models.go

```go
type User struct {
    ID           int    `json:"id"`
    Username     string `json:"username"`
    PasswordHash string `json:"password_hash"`
    CreatedAt    string `json:"created_at"`
}

type Transaction struct {
    ID        int    `json:"id"`
    Content   string `json:"content"`
    Amount    int64  `json:"amount"`
    CreatedAt string `json:"created_at"`
    Username  string `json:"username"`
}
```

### 8.4 store.go — API

```go
type Store struct { mu sync.RWMutex; ... }

func New(path string) (*Store, error)     // load hoặc tạo mới
func (s *Store) FindUser(username string) (*User, error)
func (s *Store) CreateUser(u *User) error
func (s *Store) ListTransactions() ([]Transaction, error)
func (s *Store) CreateTransaction(t *Transaction) error
func (s *Store) DeleteTransaction(id int) error
func (s *Store) Save() error              // atomic write, gọi trong mọi mutation
```

### 8.5 middleware/auth.go

- Đọc header `Authorization: Bearer <token>`.
- Verify chữ ký JWT bằng `JWTSecret`.
- Parse `sub`/`username` từ claims → lưu vào context Gin.
- Thiếu/sai token → `401 { "error": "Unauthorized" }`.

### 8.6 main.go

```go
// 1. Đọc config
// 2. Mở store (tự tạo data.json nếu chưa có)
// 3. Tạo router: /api group + middleware auth
// 4. Nếu thư mục ../frontend/dist tồn tại → serve static + SPA fallback
// 5. Chạy trên :8080
```

SPA fallback: mọi route không phải `/api` trả về `index.html`
(để React Router tự xử lý).

## 9. Auth đặc biệt — user đầu tiên

### 9.1 Vấn đề

Không có trang đăng ký trong API (theo ý tưởng MVP chỉ có login),
nhưng lần đầu chạy file rỗng thì không có user nào để đăng nhập.

### 9.2 Giải pháp (chọn 1)

**Option A (chọn mặc định): Seeder qua env.**
Khi khởi động, nếu file `data.json` **không có user nào** và env
`SEED_USERNAME` + `SEED_PASSWORD` được set → tự tạo user đó.
. Thiếu env → in log cảnh báo "Chưa có user, đăng ký qua env SEED_USERNAME/SEED_PASSWORD".

**Option B: thêm endpoint `POST /api/auth/register`.** Tạo user mới
(được phép mở, không cần token). Đơn giản, phù hợp "cả nhà" — ai cũng đăng ký được.

> Khuyến nghị làm **Option A** cho Phase 1 (tối giản), cân nhắc thêm Option B ở Phase 4 nếu cần.

## 10. Frontend — chi tiết triển khai

### 10.1 Khởi tạo

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install react-router-dom axios @tanstack/react-query zustand recharts
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

- `vite.config.ts`: proxy `/api` → `http://localhost:8080` để dev không vướng CORS.

### 10.2 Auth flow

- `stores/auth.ts` (Zustand): `{ token, username, login(), logout() }`.
- Token lưu `localStorage` key `pf_token`.
- `lib/api.ts`: axios instance; `request` interceptor gắn `Authorization`;
  `response` interceptor gặp `401` → logout + redirect về `/login`.
- React Router: route `/login` public; route `/` và `/dashboard` kiểm tra token
  (guard component), chưa đăng nhập → redirect `/login`.

### 10.3 ChatPage — UI giống Messenger

```
┌────────────────────────────────┐
│  Tên app — Quản lý chi tiêu    │   header
├────────────────────────────────┤
│  [BOT] Chào bạn! Nhập chi tiêu │
│  như tin nhắn, VD: Cafe 45000  │
│  [me]  Cafe Highland 45000     │
│  [BOT] Đã ghi nhận: Cafe       │
│        Highland — 45.000đ      │
│  (tin nhắn cũ ↑ có thể cuộn)   │
├────────────────────────────────┤
│  [ ô nhập tin nhắn ] [ Gửi ]   │   footer
└────────────────────────────────┘
```

- Người dùng: bubble bên phải, màu xanh.
- Hệ thống/bot: bubble bên trái, màu xám.
- **Enter = gửi** (trên web không cần hỗ trợ xuống dòng).
- Sau khi gửi:
  1. Thêm tin "đang gửi" của user ngay lập tức vào danh sách.
  2. Gọi `POST /api/transactions`.
  3. Thêm tin của bot với nội dung `reply`.
  4. Cuộn xuống đáy.
- **Lịch sử**: khi mở trang, gọi `GET /api/transactions` để hiện các giao dịch
  đã nhập (render dưới dạng tin nhắn) — người dùng xem được "cuộc trò chuyện" cũ.
- **Xóa**: hover tin nhắn (máy tính) hoặc long-press (mobile) → nút xóa →
  hiện `Modal` xác nhận → `DELETE /api/transactions/:id`.

### 10.4 DashboardPage

- `PeriodSelector`: 3 nút **Tháng / Quý / Năm** + selector chọn kỳ cụ thể
  (VD: Tháng 8/2026, Quý 3/2026, Năm 2026).
- `SummaryCards`: Tổng chi + Số giao dịch của kỳ đang chọn.
- `SpendingChart`: dùng `recharts`:
  - Tháng → `BarChart` 30 cột (theo ngày).
  - Quý → `BarChart` 3 cột (theo tháng).
  - Năm → `BarChart` 12 cột (theo tháng).
- `TransactionList`: danh sách giao dịch trong kỳ, có nút xóa.

### 10.5 lib/format.ts

- `formatVND(n: number): string` → `45.000đ`.
- `formatDate(iso: string): string` → `05/08 10:00`.

## 11. Các giai đoạn triển khai

### Phase 1 — Nền tảng
**Mục tiêu:** chạy được app trắng, login được.

- [x] Tạo `backend/` + `go.mod` + các package rỗng.
- [x] `config.go`, `models.go`.
- [x] `store.go` + test (tạo/load file, create/find user, atomic save).
- [x] `POST /api/auth/login` + `middleware/auth.go`.
- [x] Seeder user đầu tiên (Option A).
- [x] Tạo `frontend/` Vite + TS + Tailwind.
- [x] `LoginPage` + Zustand + axios + guard route.
- [x] Serve static `frontend/dist` từ Go (thử build tĩnh).

**Tiêu chí hoàn thành:** login với user seeder → vào được trang trống có logout.

### Phase 2 — Chat + Parser
**Mục tiêu:** nhập chi tiêu bằng chat.

- [x] `services/parser.go` + `parser_test.go` (toàn bộ case ở 6.1).
- [x] `POST /api/transactions` (parse → lưu → trả reply).
- [x] `GET /api/transactions`.
- [x] `DELETE /api/transactions/:id`.
- [x] `ChatPage` full UI Messenger (input, bubbles, Enter gửi, bot reply).
- [x] Lịch sử tin nhắn + xóa qua Modal.

**Tiêu chí hoàn thành:** nhắn `Cafe 45k` → thấy bot trả lời "Đã ghi nhận: Cafe — 45.000đ",
refresh lại vẫn còn tin.

### Phase 3 — Dashboard
**Mục tiêu:** thống kê tháng/quý/năm.

- [x] 3 endpoint dashboard + logic tổng hợp theo ngày/tháng.
- [x] `PeriodSelector`, `SummaryCards`, `SpendingChart`, `TransactionList`.
- [x] Test nhanh bằng dữ liệu mẫu nhiều tháng.

**Tiêu chí hoàn thành:** chọn Tháng/Quý/Năm → số liệu + biểu đồ đúng
(so sánh bằng cách tính tay từ data.json).

### Phase 4 — Hoàn thiện
- [x] `go test ./...` pass, đủ coverage parser + store.
- [x] (Tùy chọn) `POST /api/auth/register`.
- [x] Build prod: `go build` + copy `frontend/dist` → 1 binary.
- [x] Viết `README.md`: cách chạy dev, seed user, build prod.
- [x] Cập nhật `Personal_Finance_Chat_Idea.md` cho khớp hướng mới.

**Tiêu chí hoàn thành:** chạy 1 lệnh `go run ./cmd/server` là có app dùng được.

## 12. Quy ước code

- Không commit file `data.json` chứa dữ liệu thật (thêm vào `.gitignore`);
  giữ 1 bản `data.example.json` để minh họa.
- Go: package theo folder, export type/method viết hoa, doc comment ngắn.
- React: component function + TS type rõ ràng; không dùng `any`.
- Mọi ngày giờ lưu/trả về đều có múi giờ.
- Tất cả câu trả lời của bot/tin nhắn hệ thống bằng tiếng Việt, có dấu.
- Commit message tiếng Anh, ngắn gọn (`feat: add message parser`).

## 13. Định hướng mở rộng (chưa làm)

- Phân loại danh mục (category).
- Ngân sách theo tháng, mục tiêu tiết kiệm.
- Nhiều gia đình → tách file JSON theo từng nhà.
- AI phân tích tài chính (bản sau).
- Xác thực bằng JWT refresh token.
