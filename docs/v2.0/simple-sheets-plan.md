> **Trạng thái:** Đang triển khai — code xong và đã đóng gói cho Vercel
> (static từ gốc repo). Parser pass 23 case (`node tests/parser.test.js`).
> **Chưa verify** với Google Sheet thật.
>
> Sai khác so với plan: `index.html` + `parser.js` đặt ở **gốc repo**,
> `Code.gs` ở `apps-script/`, test ở `tests/`. Đã xoá (được người dùng cho
> phép): `frontend/`, `backend/`, `nginx/`, `bin/`, `image/`, `Dockerfile`,
> `docker-compose.yml`, `.dockerignore`, `deploy.sh`, `Makefile`, `data/`,
> các plan v2.0 cũ (dữ liệu 1.0 đã có backup ngoài repo). Hướng Vercel Services + Go (các plan khác trong thư
> mục này) **không còn áp dụng**.

# Bản đơn giản: 1 file HTML + Google Apps Script + Google Sheet

**Ngày lập:** 2026-11-01

## 1. Context

Hướng Vercel Services + Go + SheetsStore (xem
các plan Vercel Services + Go cũ (đã xoá)) quá nặng so với nhu cầu.
Nhu cầu thực tế chỉ có 2 chức năng:

1. **Chat** nhập chi tiêu hằng ngày (`Cafe 45k`).
2. **Dashboard** quản lý chi tiêu.

Mọi thứ khác bỏ: đăng ký/đăng nhập theo user, household, hạn mức (budget),
profile, Go backend, Vercel Services, init endpoint. Riêng các thông tin
hiển thị (tên nhà, khẩu hiệu, màu chủ đạo...) **giữ lại nhưng chuyển thành
cấu hình nằm trong 1 tab của Google Sheet** (xem mục 4.2).

### Vì sao không gọi Sheets API trực tiếp từ HTML

- API key chỉ đọc được sheet công khai, không ghi được.
- Service account key không được đặt trong HTML (lộ).
- OAuth Google đăng nhập: phải cấu hình consent screen, phức tạp.

→ Dùng **Google Apps Script Web App** gắn vào chính Sheet làm API mỏng.
Không cần GCP project, service account hay key.

## 2. Quyết định đã chốt

| Mục | Quyết định |
|---|---|
| Truy cập | Một **mã chung** (token). Lưu trong Script Properties; trình duyệt nhập 1 lần, lưu `localStorage`. |
| Vị trí code | **Thay thế `frontend/`** bằng bản mới (xem mục 7 — xoá file phải xin phép). |
| Parser | **Port từ Go** (`backend/internal/services/parser.go`) sang JS, giữ đủ test case. |
| Dữ liệu cũ | Không migrate. Sheet mới. |

## 3. Kiến trúc

```text
index.html  (host tĩnh: Vercel / GitHub Pages / Netlify)
   │  fetch()  (GET đọc, POST ghi; kèm token)
   ▼
Apps Script Web App  (Code.gs, ~60 dòng, "Execute as: Me", "Anyone")
   │
   ▼
Google Sheet  — 2 tab: transactions (dữ liệu) + config (cấu hình)
```

Ghi chú kỹ thuật:

- Gọi Apps Script từ trình duyệt: POST dùng `Content-Type: text/plain`
  (tránh preflight CORS, Apps Script không xử lý OPTIONS). GET đọc dùng
  query string.
- Apps Script redirect 302 sang `googleusercontent.com`; `fetch` tự theo,
  không cần xử lý.
- Mỗi request khoảng 1–2 giây — chấp nhận được; UI dùng optimistic update.

## 4. Schema Sheet

### 4.1 Tab `transactions`

Dòng 1 là header:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | number | `Date.now()` (đủ cho quy mô nhà) |
| `created_at` | string | ISO 8601 kèm `+07:00` |
| `username` | string | Tên người nhập (chọn trong UI, không có đăng nhập) |
| `content` | string | Nội dung chi tiêu |
| `amount` | number | VND, > 0 |
| `deleted` | boolean | `TRUE` = xoá mềm |

- Ghi bằng `appendRow` với giá trị thuần; nội dung bắt đầu bằng `= + - @`
  được thêm tiền tố `'` để chống formula injection.
- Xoá = soft delete (đặt `deleted=TRUE`), không xoá row.

### 4.2 Tab `config`

Dạng key–value, dòng 1 là header `key | value`, mỗi cấu hình một dòng.
**Sửa trực tiếp trong Google Sheet**; app chỉ đọc (không có màn hình sửa
cấu hình trong app → bớt code, đúng tinh thần "đơn giản nhất").

| key | Ví dụ | Ghi chú |
|---|---|---|
| `app_name` | `Personal Finance Chat` | Tiêu đề trang/tab trình duyệt |
| `household_name` | `Nhà Hiền` | Hiển thị ở header |
| `slogan` | `Chi tiêu thông minh` | Rỗng = ẩn |
| `primary_color` | `#2563EB` | `#RRGGBB`; sai/rỗng = xanh mặc định |
| `users` | `Hiền,Lan,Nam` | Danh sách tên người nhập, cách nhau dấu phẩy; dùng cho ô chọn tên ở màn hình cài đặt |

- Key thiếu → dùng giá trị mặc định trong code; key lạ bị bỏ qua.
- Nếu muốn thêm cấu hình khác sau này (vd hạn mức mặc định), chỉ cần thêm
  dòng mới; hiện **chưa** có hạn mức vì đã bỏ budget.
- Áp dụng `primary_color` bằng CSS variable (`--primary`), validate bằng
  regex `^#[0-9a-fA-F]{6}$` trước khi dùng.
- Giá trị là text hiển thị: luôn gán bằng `textContent`, không `innerHTML`.

## 5. Apps Script API (`Code.gs`)

| Hành động | Request | Kết quả |
|---|---|---|
| Đọc | `GET ?action=list&token=…` | `{ok, config:{key:value,...}, items:[...]}` — `config` lấy từ tab `config`; `items` không gồm `deleted` |
| Thêm | `POST {action:"add", token, username, content, amount}` | `{ok, item}` |
| Xoá | `POST {action:"delete", token, id}` | `{ok}` |

- Token sai → `{ok:false, error:"unauthorized"}`.
- Server tự gán `id` và `created_at` (giờ `Asia/Ho_Chi_Minh`), kiểm tra
  `amount > 0` và `content` không rỗng.
- Dùng `LockService` khi ghi để tránh 2 request chồng lên nhau.
- Token đặt trong **Script Properties** (`TOKEN`), không nằm trong code.

## 6. Frontend (`index.html` đơn giản)

Một file HTML + JS thuần (hoặc Tailwind CDN cho khớp style hiện có:
nền xanh `blue-600→blue-900`, card `rounded-3xl`, input/button `rounded-full`,
`focus:ring-2 focus:ring-blue-500`). Hai tab, responsive (desktop ≥ 1024px,
mobile < 400px, không tràn ngang).

### 6.1 Cài đặt lần đầu

- Màn hình nhập **URL Apps Script**, **mã chung** và **tên người nhập**
  (chọn từ `config.users`, hoặc gõ tay nếu chưa cấu hình); lưu
  `localStorage`. Có nút đổi/đăng xuất.
- Sau khi tải được `config`: đặt `document.title = app_name`, hiện
  `household_name` + `slogan` ở header, áp `primary_color` cho nền/nút.

### 6.2 Tab Chat

- Danh sách giao dịch theo thời gian, dạng bong bóng (như hiện tại), nút xoá
  chỉ trên giao dịch của mình (so theo `username` trên UI).
- Ô nhập: `Cafe 45k` → parse JS → gửi POST → hiện bot reply
  ("Đã ghi: Cafe — 45.000đ"). Parse lỗi → báo lỗi, không gửi.
- Parser port đủ: `45000`, `45k`, `45.000`, `45,000`, `45 000`,
  `1.5 triệu`, nhiều dòng (số tiền ở dòng cuối); từ chối số ≤ 0, thiếu nội
  dung, số tiền không hợp lệ.

### 6.3 Tab Dashboard

- Chọn kỳ: **Tuần / Tháng / Quý / Năm**, có nút lùi/tiến kỳ.
- Thẻ tổng: tổng chi, số giao dịch, trung bình/ngày.
- Biểu đồ cột theo bucket (ngày trong tuần/tháng, tháng trong quý/năm) —
  vẽ bằng SVG/CSS thuần hoặc Chart.js CDN (chốt khi code; ưu tiên không
  thêm dependency).
- Danh sách giao dịch trong kỳ.
- Tính toán toàn bộ ở client từ danh sách `list` (port logic `Summarize`
  trong `stats.go`), theo múi giờ VN.

### 6.4 Tải dữ liệu

- Mở app: gọi `list` 1 lần, giữ trong bộ nhớ; refetch khi chuyển tab hoặc sau
  khi thêm/xoá. Không polling.

## 7. Phạm vi thay đổi trong repo

Thêm:

- `frontend/index.html` (bản mới, 1 file)
- `apps-script/Code.gs` (mã dán vào Apps Script)
- `docs/v2.0/simple-sheets-plan.md` (file này)

Cập nhật: `README.md` sang hướng dẫn bản đơn giản; `docs/v2.0/README.md`
đánh dấu hướng Vercel+Go là **thay thế/không triển khai**.

**Xoá — PHẢI xin phép từng lần trước khi thực hiện** (CLAUDE.md mục 7):
toàn bộ nội dung cũ của `frontend/` (React/Vite/Tailwind build,
`package.json`, `src/**`…). `backend/`, `vercel.json`, `.vercelignore`,
`docker-compose.yml` hiện **không đụng** tới; sẽ hỏi riêng nếu muốn gỡ.
Không chạy lệnh git nào khi chưa được cho phép.

## 8. Các bước triển khai

1. Duyệt plan này (kể cả danh sách file sẽ xoá).
2. Tạo Google Sheet mới + tab `transactions` + tab `config` (header + các
   dòng mẫu ở mục 4.2).
3. Viết `Code.gs`; dán vào Apps Script; đặt `TOKEN`; deploy Web App
   (Execute as: Me, Access: Anyone); lấy URL.
4. Viết `index.html`: màn hình cài đặt → tab Chat → tab Dashboard.
5. Port parser JS + bộ test case (chạy bằng `node` script nhỏ, xem mục 9).
6. Xin phép xoá `frontend/` cũ, rồi thay bằng bản mới.
7. Host tĩnh (Vercel static hoặc GitHub Pages) — chốt khi tới bước này.
8. Cập nhật README + trạng thái các plan.

## 9. Kiểm thử

- **Parser:** đối chiếu với `backend/internal/services/parser_test.go`;
  chạy bằng `node` — mọi case phải cho cùng kết quả như Go.
- **Apps Script:** gọi thử bằng `curl`/trình duyệt: token sai bị từ chối;
  thêm → xuất hiện đúng cột; xoá → `deleted=TRUE`; nội dung `=1+1` lưu thành
  text.
- **Chức năng (tay):**
  - [ ] Nhập `Cafe 45k` → dòng mới trong Sheet đúng cột, đúng giờ VN.
  - [ ] Nhập sai (`abc`, `Cafe 0`) → báo lỗi, không ghi.
  - [ ] Xoá giao dịch → biến mất, Sheet `deleted=TRUE`.
  - [ ] Dashboard 4 kỳ đúng số liệu; lùi/tiến kỳ đúng.
  - [ ] Refresh vẫn còn dữ liệu.
  - [ ] Sửa `household_name`, `slogan`, `primary_color` trong tab `config`
        → tải lại app thấy đổi; màu sai định dạng → dùng màu mặc định;
        thiếu key → dùng mặc định, không lỗi.
  - [ ] Desktop ≥ 1024px và mobile < 400px không vỡ/tràn ngang.
  - [ ] Token sai/URL sai → thông báo rõ ràng.

## 10. Đánh đổi và rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Mã chung nằm trong `localStorage`, ai có URL + mã đều ghi được | Chấp nhận (quy mô gia đình); đổi `TOKEN` khi nghi lộ |
| Không có user thật, `username` chỉ là nhãn | Chấp nhận; xoá "của mình" chỉ kiểm ở UI |
| Apps Script chậm 1–2 giây, có quota hằng ngày | Optimistic update, `list` 1 lần/lần mở |
| Sheet lớn dần → `list` chậm | Đủ cho hàng chục nghìn dòng; nếu cần, lọc theo tháng ở server |
| URL Web App lộ trong HTML | Có token chặn; không chứa key Google |
| Mất dữ liệu | Soft delete; dùng version history của Google Sheet |

## 11. Điều kiện hoàn thành

- Chat thêm/xoá và Dashboard 4 kỳ hoạt động với Sheet thật.
- Checklist mục 9 pass.
- README + trạng thái plan đã cập nhật (`Đã triển khai`).
