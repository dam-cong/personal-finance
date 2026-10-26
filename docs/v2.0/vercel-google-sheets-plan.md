# Personal Finance Chat 2.0 — Vercel Services + Google Sheets

> **Trạng thái:** Đang triển khai — Phase 1 đã code, xem
> [`implementation-plan.md`](implementation-plan.md)
>
> **Version:** 2.0
>
> **Ngày lập:** 2026-10-25
>
> **Đối tượng:** Dev tiếp nhận codebase `personal-finance`.
>
> **Kế hoạch thực thi theo phase:** [`implementation-plan.md`](implementation-plan.md).
>
> **Nguyên tắc:** Tài liệu này chỉ là kế hoạch. Chưa có thay đổi code nào
> được thực hiện. Dev đọc kỹ, triển khai theo thứ tự phase, không tự ý mở
> rộng scope.

---

## 1. Context

### 1.1 Hiện trạng

- Backend Go + Gin, frontend React + Vite + TypeScript + Tailwind.
- Store là JSON file `backend/data/data.json`, ghi bằng mutex + atomic rename.
- Deploy hiện tại: Docker image `pf-server`, Nginx + SSL trên VPS.
- Có các tính năng: đăng nhập/đăng ký, chat nhập chi tiêu, dashboard
  tháng/tuần/quý/năm, hạn mức tháng, thông tin nhà, tên hiển thị, avatar,
  chat gia đình, gửi ảnh, ảnh nhà, unread badge.
- Seed user cũ nằm trong `backend/.env.example`, `docker-compose.yml` và
  `README.md`.
- Repository đang **public**; `data/data.json`, `data/test-e2e.json`,
  `backend/server.log` đang được track.
- `backend/server.log` đang có thay đổi chưa commit.

### 1.2 Vì sao chuyển

- Vercel Functions có filesystem read-only (chỉ `/tmp`), không thể dùng JSON
  file làm store bền vững.
- Muốn một project duy nhất vừa chạy frontend vừa chạy Go API.
- Muốn giảm vận hành VPS/Docker/Nginx.
- Google Sheets phù hợp với quy mô gia đình, dễ xem/sửa dữ liệu trực tiếp.

### 1.3 Quyết định đã chốt với người dùng

1. Dùng **Vercel Services** cho cả frontend và backend trong cùng project.
2. **Google Sheets là store chính**, có cache đọc ngắn hạn.
3. **Bỏ hoàn toàn chat gia đình** và **bỏ toàn bộ ảnh** (avatar, ảnh nhà,
   ảnh chat, upload).
4. **Bắt đầu dữ liệu mới**; không migrate dữ liệu 1.0.
5. **Security git để sau**: chưa chuyển repo private, chưa purge history,
   chưa rotate secret trong đợt code này. Phải xử lý trước khi coi là
   production thật.

---

## 2. Mục tiêu và phạm vi

### 2.1 Mục tiêu

- Deploy được một Vercel project:
  - `/` và các route SPA → frontend Vite.
  - `/api/*` → Go/Gin service.
- Dữ liệu nằm trong Google Sheets, đọc/ghi qua service account.
- Giữ nguyên nghiệp vụ:
  - Đăng nhập/đăng ký.
  - Chat nhập chi tiêu (parse số tiền, lưu, xoá giao dịch của mình).
  - Dashboard tháng/tuần/quý/năm, gộp theo household.
  - Hạn mức tháng + hạn mức mặc định.
  - Thông tin household: tên, khẩu hiệu, màu chủ đạo, hạn mức mặc định.
  - Tên hiển thị cá nhân.
- UI không còn dấu vết của family chat/ảnh.
- Có endpoint init một lần để tạo schema + household + user seed.
- Có tài liệu deploy/verify đủ để dev khác làm lại.

### 2.2 Không nằm trong phạm vi

- Không migrate giao dịch/tin nhắn/ảnh cũ.
- Không làm chat gia đình, upload ảnh, avatar, ảnh nhà.
- Không làm realtime/websocket/polling.
- Không làm mobile native.
- Không đổi nghiệp vụ parser chi tiêu.
- Không làm multi-household management UI.
- Không xoá dữ liệu cũ khỏi máy/git trong đợt này.
- Không tự chuyển domain production sang Vercel khi chưa được duyệt.
- Không xử lý git history/force-push trong đợt này.

---

## 3. Kiến trúc đích

```text
Browser
   |
   | https://<project>.vercel.app
   v
Vercel top-level rewrites
   |-- /api/(.*)  -> service "api" (Go + Gin)
   |-- /(.*)      -> service "web" (Vite static + SPA fallback)
                          |
                          v
                 Google Sheets API
                          |
                          v
                 Spreadsheet "Personal Finance Data"
```

- Frontend và backend cùng origin → **không cần CORS**.
- Frontend không gọi Google Sheets trực tiếp; mọi quyền nằm ở backend.
- Service account chỉ cần quyền với spreadsheet, không cần Drive.

---

## 4. Cấu trúc thư mục sau 2.0

```text
personal-finance/
├── vercel.json
├── .vercelignore
├── docs/
│   ├── README.md
│   ├── v1.0/                  # đóng băng, chỉ đọc
│   └── v2.0/
│       ├── README.md
│       └── vercel-google-sheets-plan.md
├── backend/
│   ├── go.mod
│   ├── go.sum
│   ├── cmd/server/main.go
│   └── internal/
│       ├── config/config.go
│       ├── handlers/          # bỏ message/image, thêm admin init
│       ├── middleware/auth.go
│       ├── models/models.go
│       ├── services/          # parser, stats
│       └── store/
│           ├── repository.go  # interface Repository
│           ├── file_store.go  # JSON store (local/Docker)
│           ├── sheets_store.go
│           └── sheets_client.go
└── frontend/
    ├── vite.config.ts
    └── src/
        ├── api/               # bỏ messages, upload
        ├── components/        # bỏ familychat, ảnh
        ├── pages/
        ├── stores/auth.ts
        └── types/index.ts
```

---

## 5. Data model và Google Sheets

### 5.1 Tabs

Tạo spreadsheet mới, không dùng dữ liệu cũ. Tên tab và cột phải cố định.

#### `_meta`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `key` | string | `schema_version` |
| `value` | string | `2` |

#### `households`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | number | ID số an toàn cho JavaScript |
| `name` | string | |
| `created_at` | string | RFC3339, offset `+07:00` |
| `default_budget` | number/empty | Empty = dùng env `DEFAULT_BUDGET` |
| `slogan` | string | Empty = không có |
| `primary_color` | string | `#RRGGBB`, empty = mặc định |

#### `users`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | number | |
| `username` | string | Duy nhất, case-sensitive |
| `password_hash` | string | bcrypt |
| `household_id` | number | |
| `created_at` | string | RFC3339 |
| `display_name` | string | Empty = frontend fallback username |

#### `transactions`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | number | |
| `household_id` | number | Thêm mới so với 1.0 |
| `username` | string | Người nhập |
| `content` | string | Nội dung chi tiêu |
| `amount` | number | VND, > 0 |
| `created_at` | string | RFC3339 |
| `deleted` | boolean | `TRUE` = đã xoá mềm |

#### `budgets`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | number | |
| `household_id` | number | |
| `month` | string | `YYYY-MM` |
| `amount` | number | > 0 |
| `created_at` | string | RFC3339 |
| `deleted` | boolean | `TRUE` = đã xoá mềm |

### 5.2 Quy ước dữ liệu

- Header row luôn ở dòng 1; dữ liệu bắt đầu dòng 2.
- Đọc bằng `spreadsheets.values.batchGet`, `majorDimension=ROWS`.
- Ghi bằng `ValueInputOption=RAW` để tránh formula injection (nội dung bắt
  đầu bằng `=`, `+`, `-`, `@`).
- Append dùng `InsertDataOption=INSERT_ROWS`.
- Xoá giao dịch/budget là **soft delete**: cập nhật `deleted=TRUE`, không xoá
  row. Nhờ vậy số thứ tự row ổn định cho các lần update sau.
- Bỏ qua row trống; row thiếu cột coi như giá trị rỗng.
- `amount`, `id`, `household_id` có thể trả về dạng number hoặc string tùy
  Google Sheets; parser phải chấp nhận cả hai.
- `created_at` luôn ghi kèm timezone Việt Nam.
- Không dùng công thức trong sheet.
- Không lưu `next_id`; ID sinh mới khi tạo.

### 5.3 Sinh ID

Không dùng `next_id` vì Sheets append không atomic. Dùng:

```text
id = UnixMilli() * 1000 + random(0..999)
```

- Giá trị khoảng `1.7e15`, vẫn dưới `Number.MAX_SAFE_INTEGER` (`9e15`).
- Có thể trùng nếu 2 request cùng ms và cùng random; xác suất thấp.
- Sau khi append, đọc lại row cuối để xác nhận ID; nếu trùng, sinh lại.
- Không đổi ID khi update/delete.

### 5.4 Cache

- Cache toàn bộ dữ liệu đọc được trong memory theo từng instance.
- TTL mặc định `10s` (`SHEETS_CACHE_TTL`).
- Sau mọi write: invalidate cache (đơn giản nhất là xoá toàn bộ).
- Không cache lỗi; lỗi trả về ngay.
- Không polling; frontend tự refetch khi cần.

---

## 6. Backend

### 6.1 Interface Repository

Tạo `backend/internal/store/repository.go`. Handlers chỉ phụ thuộc interface,
không phụ thuộc concrete store.

```go
type Repository interface {
    FindUser(username string) (*models.User, error)
    DefaultHousehold() (*models.Household, error)
    FindHousehold(id int) (*models.Household, error)
    UpdateHousehold(id int, name string, defaultBudget *int64, slogan, primaryColor string) (*models.Household, error)
    UpdateUserDisplayName(username, displayName string) (*models.User, error)
    ListUsersInHousehold(householdID int) []string
    UserCount() int
    CreateUser(u *models.User) error

    ListTransactionsByUser(username string) ([]models.Transaction, error)
    ListTransactionsByHousehold(householdID int) ([]models.Transaction, error)
    GetTransaction(id int) (*models.Transaction, error)
    CreateTransaction(t *models.Transaction) error
    DeleteTransaction(id int) error

    SetBudget(householdID int, month string, amount int64) (*models.Budget, error)
    GetBudget(householdID int, month string) (*models.Budget, error)
    DeleteBudget(householdID int, month string) error
}
```

- Không đưa method message/image vào interface.
- `ListTransactions` chỉ cần cho test FileStore; có thể giữ trên `FileStore`,
  không cần trong interface.
- `NewFileStore(path, householdName, location)` và
  `NewSheetsStore(...)` trả về `Repository` (hoặc concrete type có method
  `Init`).
- `currentHouseholdID(c, st store.Repository)` trong `budget.go` đổi tham số
  sang interface.
- Tất cả handler struct đổi `Store *store.Store` → `Store store.Repository`.

### 6.2 Model changes

`backend/internal/models/models.go`:

- `Household`: bỏ `ImageFilename`.
- `User`: bỏ `AvatarFilename`, `LastReadMessageID`.
- `Transaction`: thêm `HouseholdID int` với JSON `household_id`.
- Xoá hoàn toàn `Message`.
- Giữ nguyên `Budget`.

Lý do thêm `transaction.household_id`:

- Dashboard lọc trực tiếp theo household, không phụ thuộc danh sách username.
- Dữ liệu mới nên gắn chủ sở hữu rõ ràng.
- API trả thêm field này; frontend có thể bỏ qua hoặc thêm optional type.

### 6.3 FileStore

- Đổi tên `Store` → `FileStore`, constructor `NewFileStore`.
- Giữ hành vi cũ: load JSON, migrate household, atomic write.
- Bỏ `Messages`, `NextMessageID`, các method message.
- Bỏ method ảnh: `UpdateHouseholdImage`, `UpdateUserAvatar`.
- `CreateTransaction` phải set `HouseholdID` nếu chưa có? Không nên tự đoán
  household từ username trong store; handler set trước khi gọi. Nếu bằng 0,
  trả lỗi rõ ràng.
- `ListTransactionsByHousehold` dùng `HouseholdID`; nếu gặp row cũ
  `household_id=0`, fallback theo username để test/migrate local dễ hơn.
  Trong dữ liệu Sheets mới, field này luôn có.
- Sort giao dịch mới nhất trước: ưu tiên `created_at`, fallback `id`.
- `seedUsers` vẫn chạy khi `DATA_BACKEND=file` để local/Docker hoạt động.

### 6.4 SheetsStore

Tạo `sheets_store.go`, dùng `google.golang.org/api/sheets/v4` và
`golang.org/x/oauth2/google`.

Khởi tạo:

1. Decode base64 `GOOGLE_SERVICE_ACCOUNT_JSON_B64`.
2. Tạo credentials với scope:
   `https://www.googleapis.com/auth/spreadsheets`.
3. Tạo `sheets.Service` với context timeout.
4. Không dùng Drive scope.

Đọc:

- `BatchGet` các range:
  - `households!A2:F`
  - `users!A2:F`
  - `transactions!A2:G`
  - `budgets!A2:G`
  - `_meta!A2:B`
- Parse thành struct; bỏ row trống.
- Lưu cache kèm `rowNumber` cho từng ID để update/delete.
- `rowNumber` = index trong range + 2.

Ghi:

- `CreateUser`, `CreateTransaction`, `SetBudget` (insert mới): append.
- `UpdateHousehold`, `UpdateUserDisplayName`, `DeleteTransaction`,
  `DeleteBudget`, `SetBudget` (upsert): update đúng row.
- Luôn dùng `RAW`, `INSERT_ROWS`.
- Sau write: invalidate cache.
- Retry khi gặp 429/5xx: tối đa 3 lần, exponential backoff + jitter.
- Mutex `sync.Mutex` chỉ bảo vệ trong một instance; không giả định atomic
  toàn cục.

Các method:

- `FindUser`: đọc cache, so khớp username.
- `DefaultHousehold`: row đầu tiên; nếu không có → lỗi.
- `FindHousehold`: theo ID.
- `UpdateHousehold`: update row; giữ `created_at`.
- `UpdateUserDisplayName`: update row; trả user mới.
- `ListUsersInHousehold`: username của user cùng household.
- `UserCount`: đếm user.
- `CreateUser`: kiểm tra username trùng; sinh ID; append.
- `ListTransactionsByUser`: filter username, `deleted != TRUE`, sort mới nhất.
- `ListTransactionsByHousehold`: filter `household_id`, `deleted != TRUE`,
  sort mới nhất.
- `GetTransaction`: filter `deleted != TRUE`.
- `CreateTransaction`: kiểm tra `HouseholdID != 0`, `Amount > 0`; sinh ID;
  append.
- `DeleteTransaction`: tìm row; nếu không thấy hoặc đã xoá → lỗi; update
  `deleted=TRUE`.
- `SetBudget`: tìm theo `household_id + month + deleted != TRUE`; nếu có thì
  update amount + created_at; nếu chưa thì append.
- `GetBudget`: trả nil nếu không có hoặc đã xoá.
- `DeleteBudget`: soft delete; không lỗi nếu không có.

Lỗi cần rõ ràng:

- `ErrNotFound` cho user/household/transaction/budget.
- `ErrSheetNotInitialized` khi thiếu tab/header.
- `ErrQuotaExceeded` khi Google trả 429 sau retry.

### 6.5 Init endpoint

Route công khai có bảo vệ:

```text
POST /api/admin/init
Header: X-Init-Secret: <INIT_SECRET>
Body: {}
```

Hành vi:

- Nếu `INIT_SECRET` rỗng → trả 404 (ẩn endpoint).
- So sánh secret bằng constant-time.
- Nếu sheet chưa có tab: tạo tab + header row + `_meta.schema_version=2`.
- Nếu header sai: trả lỗi rõ ràng, **không ghi đè**.
- Nếu chưa có household: tạo household mặc định từ `HOUSEHOLD_NAME`,
  `DEFAULT_BUDGET`.
- Tạo user seed từ `SEED_USERS` nếu chưa tồn tại; bcrypt hash.
- Idempotent: gọi lại không tạo trùng household/user.
- Trả JSON tóm tắt: `household_id`, `users_created`, `users_existing`,
  `schema_version`.
- Sau khi init thành công: xoá `INIT_SECRET` trên Vercel và redeploy.
- Không log secret, password, hash, service account key.

Lưu ý: Với `DATA_BACKEND=sheets`, **không seed user tự động trong `main`**
mỗi cold start. Chỉ seed qua init. Với `DATA_BACKEND=file`, giữ seed khi khởi
động như cũ.

### 6.6 Config

Thêm các field:

```go
type Config struct {
    Port          string
    JWTSecret     string
    DataBackend   string // "file" | "sheets"
    DataFile      string
    SeedUsers     string
    AppName       string
    HouseholdName string
    DefaultBudget int64

    GoogleSheetsID               string
    GoogleServiceAccountJSONB64  string
    SheetsCacheTTL               time.Duration

    InitSecret  string
    AppLocation *time.Location
    AppEnv      string
    ServeFrontend bool
}
```

Quy tắc:

- `DATA_BACKEND` mặc định `file` để local/Docker không đổi.
- `APP_LOCATION` mặc định `Asia/Ho_Chi_Minh`; load bằng
  `time.LoadLocation`; lỗi → `log.Fatal`.
- Import `_ "time/tzdata"` trong `main` để có timezone trên Alpine/Vercel.
- `APP_ENV=production`:
  - `JWT_SECRET` rỗng hoặc bằng `dev-secret-change-me` → fatal.
  - `SEED_USERS` không được dùng mật khẩu cũ.
- `INIT_SECRET` không có default.
- `SERVE_FRONTEND` mặc định `false`; Docker set `true` nếu muốn serve static.
- `SHEETS_CACHE_TTL` parse duration, mặc định `10s`.
- Không log giá trị secret.

### 6.7 Bỏ family chat và ảnh

Xoá/không còn dùng:

- `backend/internal/handlers/message.go`
- `models.Message`
- `store` methods: `CreateMessage`, `ListMessagesByHousehold`,
  `LatestMessageID`, `MarkMessagesRead`, `CountUnreadMessages`
- `dataFile.Messages`, `NextMessageID`
- routes:
  - `GET /api/messages`
  - `POST /api/messages`
  - `GET /api/messages/unread-count`
  - `POST /api/messages/read`
  - `POST /api/messages/image`
- upload ảnh:
  - `POST /api/household/image`
  - `POST /api/me/avatar`
  - `serveUploadDir`, `maxAvatarSize`, `allowedAvatarExt`, `avatarURL`
- field `ImageFilename`, `User.AvatarFilename`, `User.LastReadMessageID`
- CORS middleware và dependency `gin-contrib/cors`
- `AvatarDir`, `ImageDir` khỏi handler construction
- `householdJSON` không trả `image_url`
- `ProfileHandler` không trả `avatar_url`
- `AuthHandler.respondToken` không trả `avatar_url`

Giữ:

- `POST /api/auth/register` (trừ khi người dùng quyết định khoá).
- `PUT /api/household` (name, default_budget, slogan, primary_color).
- `GET /api/me`, `PUT /api/me` (display_name).
- Toàn bộ transaction, budget, dashboard.

### 6.8 Routes cuối cùng

```text
POST   /api/auth/login
POST   /api/auth/register
GET    /api/config

GET    /api/transactions
POST   /api/transactions
DELETE /api/transactions/:id

PUT    /api/budgets
DELETE /api/budgets?month=YYYY-MM

GET    /api/household
PUT    /api/household

GET    /api/me
PUT    /api/me

GET    /api/dashboard/month
GET    /api/dashboard/week
GET    /api/dashboard/quarter
GET    /api/dashboard/year

POST   /api/admin/init
```

`/api/admin/init` không dùng middleware JWT; bảo vệ bằng header riêng.

### 6.9 Timezone

- Mọi `time.Now()` ghi dữ liệu dùng `time.Now().In(cfg.AppLocation)`.
- Dashboard dùng `cfg.AppLocation` thay `time.Local`:
  - `Month`, `Week`, `Quarter`, `Year`.
  - `queryDate` parse bằng location.
- Store nhận `location` hoặc clock để test.
- `created_at` trả về RFC3339 kèm `+07:00`.
- Frontend hiển thị theo local browser; dữ liệu tháng vẫn đúng theo giờ VN.

### 6.10 main.go

- Chọn store theo `DATA_BACKEND`.
- FileStore: seed user khi khởi động.
- SheetsStore: không seed; chờ init.
- Bỏ CORS.
- Bỏ `serveUploadDir`.
- `serveFrontend` chỉ gọi khi `cfg.ServeFrontend` và `frontend/dist` tồn tại.
- Go server listen `":" + cfg.Port` (Vercel set `PORT`).
- Log rõ backend đang dùng, không log secret.

---

## 7. Frontend

### 7.1 Xoá file/component

Xoá:

- `frontend/src/pages/FamilyChatPage.tsx`
- `frontend/src/components/familychat/FamilyMessageBubble.tsx`
- `frontend/src/components/familychat/FamilyChatWindow.tsx`
- `frontend/src/api/messages.ts`

### 7.2 Routes và layout

`App.tsx`:

- Bỏ lazy import `FamilyChatPage`.
- Bỏ route `/family-chat`.
- Giữ `/chat`, `/dashboard`, `/login`, redirect `/` → `/chat`.

`AppLayout.tsx`:

- Bỏ `useQuery` unread + `fetchUnreadCount`.
- Bỏ navLink `/family-chat` và badge đỏ.
- Bỏ `<img>` ảnh nhà trong header; chỉ hiển thị tên app/nhà/slogan.
- Bỏ `avatarUrl`; avatar chỉ chữ cái đầu.
- Giữ menu tài khoản, thông tin nhà, đăng xuất.
- Mobile: truyền `nameLabel`, bỏ `avatarUrl`, bỏ `unreadCount`.

`BottomNav.tsx`:

- Bỏ tab Gia đình và badge.
- Giữ FAB giữa (nút thêm giao dịch nhanh).
- Bố cục 5 cột đối xứng:
  - Cột 1: **Chat** (`/chat`) — thay chỗ tab Gia đình.
  - Cột 2: **Thông tin**.
  - Cột 3: spacer cho FAB.
  - Cột 4: **Thống kê**.
  - Cột 5: **Cá nhân**.
- Thêm icon Chat outline/filled vào `BottomNavIcons.tsx`; bỏ Family icons.
- FAB vẫn navigate `/chat` với `state.focusInput`.

`AccountSheet.tsx`:

- Bỏ `avatarUrl`; chỉ `Avatar label`.
- Giữ Hồ sơ/Đăng xuất.

### 7.3 Ảnh và avatar

`Avatar.tsx`:

- Chỉ còn props `label`, `className`.
- Luôn render chữ cái đầu; không render `<img>`.
- Xoá prop `avatarUrl` và mọi truyền prop này.

`ProfileModal.tsx`:

- Chỉ sửa `display_name`.
- Bỏ file input, preview, upload, `MAX_AVATAR_SIZE`, `pendingFile`.
- Bỏ state `avatarUrl`; `setProfile(displayName)`.

`HouseholdInfoModal.tsx`:

- Giữ tên nhà, hạn mức mặc định, khẩu hiệu, màu chủ đạo.
- Bỏ chọn ảnh, preview, `uploadHouseholdImage`, `currentImageUrl`.
- Avatar của nhà dùng chữ cái đầu từ tên.

`ChatInput.tsx`:

- Bỏ `onSendImage`, paperclip icon, file input.
- Chỉ nhập text + gửi.

`ChatWindow.tsx`:

- Bỏ `backgroundImageUrl` và lớp background.
- Giữ scroll, MessageBubble, ChatInput.

`ChatPage.tsx`:

- Bỏ query `household` nếu chỉ dùng cho ảnh nền.
- Bỏ `backgroundImageUrl`.
- Giữ transaction query, optimistic send, delete confirm.

`MessageBubble.tsx`:

- Bỏ `useAuth` avatar; dùng `Avatar label`.
- Giữ nội dung/số tiền/nút xoá.

`LoginPage.tsx`:

- `setAuth(token, username, householdName, displayName)` — bỏ avatar.
- Không đổi UI/luồng đăng nhập.

`stores/auth.ts`:

- Bỏ `avatarUrl` khỏi state, `setAuth`, `setProfile`.
- `setProfile(displayName: string)`.
- Có thể clear key `pf_auth` cũ một lần nếu muốn tránh dữ liệu avatar cũ
  trong localStorage; không bắt buộc vì field không còn dùng.

`types/index.ts`:

- Bỏ `image_url` khỏi `Household`.
- Bỏ `avatar_url` khỏi `User`, `LoginResponse`.
- Bỏ `FamilyMessage`.
- Thêm `household_id?: number` vào `Transaction` nếu muốn type đầy đủ.

`api/profile.ts`:

- Bỏ `avatar_url`, `uploadAvatar`; chỉ `updateDisplayName`.

`api/household.ts`:

- Bỏ `uploadHouseholdImage`.

`vite.config.ts`:

- Proxy chỉ còn `/api` → `http://localhost:8080`.
- Bỏ `/avatars`, `/chat-images`.

### 7.4 Kiểm tra không còn tham chiếu

Chạy grep và đảm bảo không còn:

```text
family-chat
FamilyChat
messages
unread-messages
avatar_url
image_url
uploadAvatar
uploadHouseholdImage
/avatars
/chat-images
```

Ngoại lệ: tên biến `messages` của chat chi tiêu trong `ChatPage` là hợp lệ;
chỉ xoá message family chat.

---

## 8. Vercel

### 8.1 `vercel.json`

Đặt ở root repo:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "web": {
      "root": "frontend/",
      "framework": "vite",
      "routes": [
        { "handle": "filesystem" },
        { "src": "/.*", "dest": "/index.html" }
      ]
    },
    "api": {
      "root": "backend/",
      "framework": "go"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": { "service": "api" }
    },
    {
      "source": "/(.*)",
      "destination": { "service": "web" }
    }
  ]
}
```

Ghi chú:

- `go.mod` phải nằm ở `backend/go.mod` (root của service api).
- Vercel đọc Go version từ `go.mod`; nếu báo unsupported, tăng directive lên
  version Vercel hỗ trợ.
- Không đặt `framework`, `buildCommand`, `outputDirectory` ở top-level khi
  dùng `services`.
- Service `web` nhận mọi route không phải `/api`; `routes` xử lý SPA fallback.
- Service `api` nhận nguyên path `/api/...`; Gin hiện đã mount `/api`.

### 8.2 `.vercelignore`

```text
backend/data/
backend/server.log
data/
bin/
frontend/dist/
.env
.env.*
*.log
```

- Không upload dữ liệu thật/local log lên Vercel.
- Không ignore `backend/go.sum`.

### 8.3 Env

Production và Preview:

| Biến | Giá trị | Ghi chú |
|---|---|---|
| `DATA_BACKEND` | `sheets` | |
| `GOOGLE_SHEETS_ID` | ID spreadsheet | |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | base64 key JSON | Không commit |
| `SHEETS_CACHE_TTL` | `10s` | |
| `JWT_SECRET` | random ≥ 32 bytes | Mới, không dùng default |
| `SEED_USERS` | `user1:pass1,user2:pass2` | Mật khẩu mới |
| `APP_NAME` | `Personal Finance Chat` | |
| `HOUSEHOLD_NAME` | tên nhà | |
| `DEFAULT_BUDGET` | `10000000` | 0 = tắt mặc định |
| `APP_LOCATION` | `Asia/Ho_Chi_Minh` | |
| `APP_ENV` | `production` | |
| `INIT_SECRET` | random tạm | Xoá sau init |

Không set `SERVE_FRONTEND` trên Vercel. Không set `DATA_FILE` trên Vercel.
Nên dùng spreadsheet riêng cho Preview để tránh bẩn dữ liệu Production.

### 8.4 Local development

Cách 1 — FileStore:

```powershell
cd backend
$env:DATA_BACKEND="file"
$env:APP_LOCATION="Asia/Ho_Chi_Minh"
$env:SERVE_FRONTEND="false"
go run ./cmd/server
```

```powershell
cd frontend
npm run dev
```

Cách 2 — Sheets:

- Set các env Google Sheets trong terminal backend.
- Chạy backend + frontend như trên.
- Hoặc `npx vercel dev -L` để chạy cả 2 service; kiểm tra lại hành vi Go
  service trước khi dùng làm chuẩn.

---

## 9. Deployment runbook

### 9.1 Chuẩn bị Google Cloud

1. Tạo project `personal-finance`.
2. Bật **Google Sheets API**.
3. Tạo service account `pf-sheets`.
4. Tạo key JSON; tải về máy.
5. Tạo spreadsheet mới `Personal Finance Data`.
6. Share spreadsheet cho email service account, quyền **Editor**.
7. Copy Spreadsheet ID từ URL.
8. Encode key base64 một dòng:

```powershell
[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes("C:\keys\pf-sheets.json")
) | Set-Clipboard
```

9. Không commit file key; không dán key vào chat/log.

### 9.2 Chuẩn bị Vercel

1. `npx vercel login`.
2. `npx vercel link` tại root repo.
3. Giữ **Root Directory = repo root**; không set `frontend/`.
4. Set env Production/Preview theo bảng trên.
5. Deploy preview trước: `npx vercel`.
6. Gọi init cho preview:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://<preview-domain>/api/admin/init" `
  -Headers @{ "X-Init-Secret" = "<INIT_SECRET>" } `
  -ContentType "application/json" `
  -Body "{}"
```

7. Kiểm tra sheet preview có đủ tab + user.
8. Xoá `INIT_SECRET` khỏi Preview; redeploy preview.
9. Deploy production: `npx vercel --prod`.
10. Gọi init production một lần; xoá `INIT_SECRET`; redeploy.

### 9.3 Sau deploy

- Kiểm tra Vercel build log: Go version, `go.sum`, service routing.
- Kiểm tra function log: không có lỗi credential/quota.
- Kiểm tra Google Sheets: dữ liệu ghi đúng tab/cột, không tạo tab lạ.
- Chưa chuyển domain `personal-finance.com.vn` cho đến khi checklist pass.
- Giữ VPS/Docker v1.0 làm rollback trong thời gian verify.

---

## 10. Kiểm thử

### 10.1 Backend

```powershell
cd backend
go mod tidy
go test ./...
go vet ./...
```

Test cần có:

- FileStore: giữ các test cũ, bỏ test message/image, cập nhật
  `Transaction.HouseholdID`.
- `SetBudget` upsert, delete, persist.
- `CreateTransaction` từ chối `HouseholdID=0`, amount <= 0.
- `DeleteTransaction` soft delete; `GetTransaction` không trả row đã xoá.
- `DeleteBudget` soft delete.
- Sheets parser: đọc number/string, row trống, boolean `TRUE/FALSE`.
- ID generator: nằm trong safe integer, không trả 0.
- Cache: write invalidates; TTL hết hạn đọc lại.
- Retry 429/5xx với fake client.
- Init idempotent; header mismatch trả lỗi; secret sai trả 401/404.

Không bắt buộc test gọi Google API thật trong CI. Nếu có, gate bằng env
`GOOGLE_SHEETS_ID` và bỏ qua khi thiếu.

### 10.2 Frontend

```powershell
cd frontend
npm ci
npm run lint
npm run build
```

### 10.3 Checklist chức năng

- [ ] Đăng nhập user seed thành công.
- [ ] Đăng ký user mới thành công (nếu giữ register).
- [ ] Không có tab/nav “Gia đình” hoặc “Trò chuyện”.
- [ ] Không có nút chọn ảnh/paperclip/avatar.
- [ ] Chat nhập `Cafe 45000` → lưu, bot trả lời đúng.
- [ ] Chat nhập sai → báo lỗi, không lưu.
- [ ] Xoá giao dịch của mình thành công.
- [ ] Không xoá được giao dịch của user khác (403).
- [ ] Dashboard tháng/tuần/quý/năm đúng số liệu.
- [ ] Dashboard gộp đúng household.
- [ ] Hạn mức mặc định + hạn mức tháng hoạt động.
- [ ] Sửa tên nhà, khẩu hiệu, màu chủ đạo, hạn mức mặc định.
- [ ] Sửa tên hiển thị; avatar chỉ còn chữ cái đầu.
- [ ] Route trực tiếp `/chat`, `/dashboard` không 404.
- [ ] Mobile < 400px không tràn ngang; BottomNav/FAB không đè.
- [ ] Desktop ≥ 1024px layout đúng.
- [ ] Ngày/tháng hiển thị đúng timezone VN.
- [ ] Refresh trang vẫn còn dữ liệu (đọc từ Sheets).
- [ ] Không còn request `/messages`, `/avatars`, `/chat-images`.
- [ ] Vercel function không có lỗi 429 kéo dài.

### 10.4 Kiểm tra cấu hình

- [ ] `vercel.json` hợp lệ, `npx vercel build` không lỗi.
- [ ] `/api/config` trả đúng, không lộ secret.
- [ ] `/api/admin/init` trả 404 khi `INIT_SECRET` rỗng.
- [ ] `INIT_SECRET` đã xoá sau init.
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON_B64` chỉ có trong Vercel env.
- [ ] Preview dùng spreadsheet riêng.
- [ ] Vercel Deployment Protection bật cho preview nếu repo public.

---

## 11. Rủi ro và cách giảm

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Vercel Go runtime/Services Beta | Cao | Test preview trước; giữ Docker 1.0 rollback |
| Sheets append không atomic | Trung bình | Mutex, `INSERT_ROWS`, verify row sau append, retry |
| Quota 60 read/write/phút/user | Trung bình | Cache 10s, batchGet, tránh polling |
| Nhiều instance cache lệch | Thấp | TTL ngắn; write invalidate; chấp nhận eventual |
| Service account key lộ | Cao | Chỉ env; rotate nếu lộ; repo private sau |
| Repo public còn secret cũ | Cao | Xử lý Phase 5 trước production thật |
| Sai timezone | Trung bình | `time/tzdata`, `APP_LOCATION`, test tháng |
| Formula injection | Thấp | `RAW`, không chạy công thức |
| Go version unsupported | Trung bình | Kiểm tra build log; tăng `go` directive |
| SPA 404 | Thấp | Service `routes` filesystem + fallback |
| Mất dữ liệu do xoá row | Thấp | Soft delete; backup sheet |
| Register công khai | Trung bình | Cân nhắc khoá sau init; ngoài scope code |

---

## 12. Các phase triển khai

### Phase 0 — Chuẩn bị

- Cài Go local để chạy test.
- Tạo GCP project, service account, spreadsheet.
- Tạo Vercel project, env preview.
- Backup sheet/JSON cũ; không xoá dữ liệu.

### Phase 1 — Bỏ family chat + ảnh (backend + frontend cùng lúc)

Mục tiêu: app vẫn chạy với FileStore, nhưng không còn tính năng bị bỏ.

- Backend: xoá model/route/store method/upload/CORS; cập nhật tests.
- Frontend: xoá page/component/api/type/upload; sửa layout/nav/avatar.
- Chạy `go test`, `go vet`, `npm run lint`, `npm run build`.
- Không deploy production ở phase này nếu chưa cần.

### Phase 2 — Repository + Google Sheets + init + timezone

- Tách interface `Repository`.
- Đổi FileStore sang interface.
- Thêm SheetsStore, cache, retry, init endpoint.
- Thêm `Transaction.HouseholdID`.
- Đổi timezone sang `APP_LOCATION`.
- Test FileStore + unit test Sheets parser/fake client.

### Phase 3 — Vercel Services

- Thêm `vercel.json`, `.vercelignore`.
- Set env preview.
- Deploy preview, init sheet preview.
- Kiểm tra routing, SPA, API, timezone.
- Deploy production, init, xoá `INIT_SECRET`.
- Chưa chuyển domain.

### Phase 4 — Verify và bàn giao

- Chạy toàn bộ checklist mục 10.
- Cập nhật `README.md` sang hướng dẫn 2.0.
- Cập nhật `.env.example` (không chứa secret thật).
- Ghi chú rollback.
- Đổi trạng thái plan thành `Đã triển khai` sau khi verify.

### Phase 5 — Security (cần duyệt riêng)

- Chuyển repo private.
- Xoá `data/data.json`, `data/test-e2e.json`, `backend/server.log` khỏi git
  history bằng `git filter-repo`.
- Rotate seed passwords, JWT secret, Google service account key.
- Force-push history đã rewrite.
- Kiểm tra lại deployment sau khi rotate.
- **Không làm nếu người dùng chưa cho phép rõ ràng.**

---

## 13. Rollback

- Giữ VPS/Docker v1.0 và domain hiện tại cho đến khi 2.0 pass checklist.
- Nếu Vercel lỗi:
  - Rollback deployment trên Vercel dashboard.
  - Hoặc trỏ domain về VPS cũ.
- Dữ liệu 2.0 nằm ở spreadsheet mới; không ảnh hưởng JSON cũ.
- Không xoá spreadsheet/JSON cũ trong thời gian chuyển đổi.

---

## 14. Bàn giao

Dev nhận bàn giao cần nắm:

- Không migrate dữ liệu cũ.
- Không commit secret.
- Không chạy lệnh git nguy hiểm nếu chưa được duyệt.
- Không tự ý mở rộng scope (không thêm chat/ảnh trở lại).
- Sau khi xong, cập nhật trạng thái plan và ghi rõ sai khác (nếu có).
- Nếu phát hiện Google Sheets không đáp ứng được (quota/race), dừng và báo
  người dùng trước khi đổi sang giải pháp khác.
