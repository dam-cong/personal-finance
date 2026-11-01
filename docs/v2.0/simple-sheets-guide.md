# Hướng dẫn cài đặt bản đơn giản (Google Sheet + Apps Script + HTML)

> Giao diện Google hiển thị bằng tiếng Anh (hoặc tiếng Việt tuỳ tài khoản).
> Tên nút/menu bên dưới ghi **song ngữ**: tiếng Việt (English). Hãy tìm theo
> chữ tiếng Anh nếu giao diện của bạn khác.
>
> Kế hoạch chi tiết: [`simple-sheets-plan.md`](simple-sheets-plan.md)

Bạn cần: một tài khoản Google, và 3 file trong repo:
`Code.gs`, `index.html`, `parser.js`.

---

## Bước 1 — Tạo Google Sheet và dán mã Apps Script

### 1.1 Tạo Sheet mới

1. Mở <https://sheets.google.com> → bấm **Trống (Blank spreadsheet)**.
2. Đặt tên file, ví dụ `Personal Finance Data` (bấm vào "Bảng tính không có
   tiêu đề / Untitled spreadsheet" ở góc trên bên trái).

### 1.2 Mở Apps Script

1. Trên menu của Sheet chọn **Tiện ích mở rộng (Extensions)** →
   **Apps Script**.
2. Một tab mới mở ra với dự án "Dự án chưa đặt tên (Untitled project)" và file
   `Code.gs` có sẵn vài dòng mã mẫu.

### 1.3 Dán mã

1. Mở file [`apps-script/Code.gs`](../../apps-script/Code.gs) trong repo, copy **toàn bộ**.
2. Trong trình soạn Apps Script, bấm vào file `Code.gs` ở cột bên trái, chọn
   hết mã mẫu (Ctrl+A) và dán đè (Ctrl+V).
3. Bấm biểu tượng đĩa mềm **Lưu dự án (Save project)** (hoặc Ctrl+S).
4. (Tuỳ chọn) Đổi tên dự án ở góc trên bên trái, ví dụ `Personal Finance API`.

### 1.4 Chạy `setup()` một lần để tạo 2 tab

1. Trên thanh công cụ, ở ô chọn hàm (**Chọn hàm để chạy / Select function to
   run**) chọn `setup`.
2. Bấm **Chạy (Run)**.
3. Lần đầu sẽ hiện hộp thoại **Cần có quyền (Authorization required)** →
   bấm **Xem lại quyền (Review permissions)** → chọn tài khoản Google của bạn.
4. Nếu thấy cảnh báo **Google chưa xác minh ứng dụng này (Google hasn't
   verified this app)**: bấm **Nâng cao (Advanced)** → **Chuyển đến … (không an
   toàn) (Go to … (unsafe))** → **Cho phép (Allow)**.
   *Đây là script do chính bạn viết trong Sheet của bạn nên an toàn.*
5. Chờ dòng **Thực thi đã hoàn tất (Execution completed)** ở khung nhật ký.

### 1.5 Kiểm tra kết quả

Quay lại tab Google Sheet, bạn phải thấy 2 tab ở dưới cùng:

- **`transactions`**: dòng 1 là `id | created_at | username | content | amount | deleted`.
- **`config`**: dòng 1 là `key | value`, kèm các dòng mẫu
  `app_name`, `household_name`, `slogan`, `primary_color`, `users`.

> Nếu không thấy, tải lại trang Sheet. Nếu vẫn không có, chạy lại `setup`
> (chạy lại an toàn, không ghi đè dữ liệu đã có).

### 1.6 Sửa cấu hình (tuỳ chọn, làm lúc nào cũng được)

Mở tab `config` và sửa cột `value`:

| key | Ý nghĩa | Ví dụ |
|---|---|---|
| `app_name` | Tiêu đề trang web | `Personal Finance Chat` |
| `household_name` | Tên nhà, hiện ở đầu trang | `Nhà Hiền` |
| `slogan` | Khẩu hiệu (để trống = ẩn) | `Chi tiêu thông minh` |
| `primary_color` | Màu chủ đạo, dạng `#RRGGBB` | `#2563EB` |
| `users` | Tên những người nhập, cách nhau dấu phẩy | `Hiền,Lan,Nam` |

Sửa xong chỉ cần tải lại trang web của app, không cần deploy lại.

---

## Bước 2 — Đặt mã chung `TOKEN`

`TOKEN` là **mật khẩu chung do bạn tự đặt** (không lấy từ đâu cả). Ai có URL
và mã này đều đọc/ghi được dữ liệu, nên hãy đặt chuỗi dài, khó đoán, ví dụ
`nha-minh-2026-k7Qx9`.

1. Trong trình soạn Apps Script, bấm biểu tượng bánh răng
   **Cài đặt dự án (Project Settings)** ở thanh bên trái.
2. Kéo xuống mục **Thuộc tính tập lệnh (Script Properties)**.
3. Bấm **Thêm thuộc tính tập lệnh (Add script property)**.
4. Ô **Thuộc tính (Property)** nhập đúng: `TOKEN` (viết hoa).
5. Ô **Giá trị (Value)** nhập mã bạn chọn.
6. Bấm **Lưu thuộc tính tập lệnh (Save script properties)**.

Ghi lại mã này để nhập vào app ở Bước 4. Muốn đổi mã sau này: sửa **Giá trị**
ở đây, **không cần** deploy lại; sau đó nhập mã mới trong app.

---

## Bước 3 — Deploy thành Web app và lấy URL

1. Ở góc trên bên phải trình soạn Apps Script bấm **Triển khai (Deploy)** →
   **Triển khai mới (New deployment)**.
2. Bấm biểu tượng bánh răng cạnh **Chọn loại (Select type)** → chọn
   **Ứng dụng web (Web app)**.
3. Điền:
   - **Mô tả (Description)**: `v1` (tuỳ ý).
   - **Thực thi dưới tư cách (Execute as)**: **Tôi (Me)** — tài khoản của bạn.
   - **Người có quyền truy cập (Who has access)**: **Bất kỳ ai (Anyone)**.
     *(Mã `TOKEN` sẽ chặn người lạ; không chọn "Anyone with Google account"
     vì trình duyệt sẽ bị yêu cầu đăng nhập và app không gọi được.)*
4. Bấm **Triển khai (Deploy)**. Nếu được hỏi quyền, làm như bước 1.4.
5. Copy **URL ứng dụng web (Web app URL)**, có dạng
   `https://script.google.com/macros/s/AKfycb.../exec`.
   Lưu lại để dùng ở Bước 4.

### Kiểm tra nhanh URL

Dán vào trình duyệt (thay `URL` và `MA_TOKEN` của bạn):

```
URL?action=list&token=MA_TOKEN
```

- Thấy `{"ok":true,"config":{...},"items":[]}` → đúng.
- Thấy `{"ok":false,"error":"unauthorized"}` → sai `TOKEN` (xem Bước 2).

> **Lưu ý quan trọng:** mỗi lần bạn **sửa `Code.gs`** phải deploy lại bản mới:
> **Triển khai (Deploy)** → **Quản lý bản triển khai (Manage deployments)** →
> bấm biểu tượng bút chì (Edit) → **Phiên bản (Version)**: **Phiên bản mới
> (New version)** → **Triển khai (Deploy)**. URL giữ nguyên. Nếu chỉ lưu mà
> không tạo version mới, URL vẫn chạy mã cũ.

---

## Bước 4 — Mở app và dùng thử

### 4.1 Mở trang web

Chọn một cách:

- **Chạy trên máy (nhanh nhất để thử):** mở terminal tại thư mục dự án và chạy
  `npx serve .`, rồi mở địa chỉ hiện ra (thường `http://localhost:3000`).
  Hoặc mở thẳng file `index.html` bằng trình duyệt (kèm `parser.js`
  cùng thư mục).
- **Đưa lên mạng (để cả nhà dùng):** đẩy repo lên Vercel (xem `README.md`) hoặc host tĩnh khác
  (Vercel, GitHub Pages, Netlify…). Hai file `index.html` và `parser.js` phải
  nằm cùng thư mục.

### 4.2 Kết nối

1. Màn hình **Kết nối Google Sheet**: dán **URL Apps Script** (Bước 3) và
   **Mã chung** (`TOKEN`, Bước 2) → bấm **Kết nối**.
2. Màn hình **Bạn là ai?**: chọn tên của bạn (lấy từ `users` trong tab
   `config`) → bấm **Vào**.

URL, mã và tên được lưu trong trình duyệt; lần sau vào thẳng app. Đổi lại bằng
nút **Đổi cài đặt** ở góc trên.

### 4.3 Dùng thử

- Tab **Chat**: gõ `Cafe 45k` rồi Enter → thấy bong bóng mới, và Sheet
  `transactions` có thêm một dòng.
  Các cách nhập: `Cafe 45000`, `Cafe 45.000`, `Cafe 45 000`,
  `Đi chợ 2.5 triệu`, hoặc nhiều dòng (số tiền ở dòng cuối).
- Bấm **Xoá** trên giao dịch của mình → dòng đó biến mất khỏi app; trong Sheet
  cột `deleted` thành `TRUE` (không xoá hàng).
- Tab **Dashboard**: chọn Tuần / Tháng / Quý / Năm, dùng nút ◀ ▶ để xem kỳ
  trước.

---

## Xử lý sự cố

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| "Sai mã chung" | `TOKEN` trong Script Properties khác mã bạn nhập. Kiểm tra chữ hoa/thường, khoảng trắng thừa. |
| "Không kết nối được. Kiểm tra URL." | URL sai/thiếu `/exec`; hoặc **Who has access** chưa là **Anyone**; hoặc chưa deploy. |
| Báo `server_error` | Chưa chạy `setup()` (thiếu tab `transactions`). Chạy lại Bước 1.4. |
| Sửa `Code.gs` nhưng không đổi hành vi | Chưa tạo **New version** khi deploy. Xem ghi chú cuối Bước 3. |
| Đổi `config` mà không thấy đổi | Tải lại trang web (F5). |
| Màu không đổi | `primary_color` phải đúng dạng `#RRGGBB` (6 ký tự hex), nếu sai app dùng màu xanh mặc định. |
| Giờ lệch | App và Sheet dùng múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) cố định. |
| Thêm giao dịch chậm 1–2 giây | Bình thường với Apps Script. |

## Lưu ý bảo mật

- Không đăng URL Apps Script và `TOKEN` lên nơi công khai.
- Nghi ngờ bị lộ: đổi `TOKEN` ở Bước 2 (không cần deploy lại), rồi nhập lại mã
  mới trên các thiết bị.
- Dữ liệu nằm trong Google Sheet của bạn; có thể xem lại lịch sử sửa bằng
  **Tệp (File)** → **Lịch sử phiên bản (Version history)**.
