# Personal Finance Chat (bản đơn giản)

Quản lý chi tiêu qua giao diện chat. Nhắn `Cafe 45k` → ghi vào Google Sheet;
xem thống kê ở tab Dashboard (tuần / tháng / quý / năm).

- **Giao diện:** một trang HTML tĩnh (`index.html` + `parser.js`), không cần build.
- **API + dữ liệu:** Google Apps Script gắn với Google Sheet
  ([`apps-script/Code.gs`](apps-script/Code.gs)).
- **Cấu hình** (tên nhà, khẩu hiệu, màu, danh sách người nhập): tab `config`
  trong chính Google Sheet.
- **Truy cập:** người dùng đăng nhập bằng tài khoản trong dòng `users` của tab `config` (`tên:mật khẩu`). URL Apps Script và mã chung nằm ở biến môi trường Vercel, đi qua `api/pf.js`.

## Cấu trúc

```
index.html          giao diện (Chat + Dashboard)
api/pf.js           Vercel function: đăng nhập + proxy tới Apps Script
parser.js           phân tích "Cafe 45k" → nội dung + số tiền
icons/, manifest.webmanifest  icon "Thêm vào Màn hình chính" + PWA
apps-script/Code.gs mã dán vào Apps Script của Google Sheet
dev-server.js      chạy thử trên máy: node dev-server.js
tests/              node tests/parser.test.js, node tests/proxy.test.js
vercel.json         cấu hình deploy static lên Vercel
docs/               tài liệu (v1.0 đóng băng, v2.0 hiện hành)
```

## Cài đặt

1. Làm theo [hướng dẫn](docs/v2.0/simple-sheets-guide.md): tạo Sheet + Apps Script,
   đặt `TOKEN`, deploy Web app, lấy URL.
2. Trong tab `config` của Sheet, đặt dòng `users` = `tên:mật khẩu,tên2:mật khẩu2`.
3. Deploy lên Vercel (mục dưới) và đặt 2 biến môi trường.
4. Mở trang web, đăng nhập.

## Deploy lên Vercel

Site tĩnh + một Vercel function (`api/pf.js`), không cần build.

1. Vercel → **Add New… → Project** → chọn repo này.
2. **Framework Preset:** Other. **Root Directory:** để trống (gốc repo).
3. **Settings → Environment Variables** (Production + Preview):
   - `APPS_SCRIPT_URL` — URL Web app Apps Script
   - `APPS_TOKEN` — đúng giá trị `TOKEN` trong Script Properties
4. **Deploy** (hoặc **Redeploy** sau khi thêm biến). CLI: `npx vercel --prod`.

URL Apps Script và mã chung chỉ nằm ở server Vercel, không gửi xuống trình duyệt.

## Chạy thử trên máy

Đặt 2 biến trên vào `.env.local` (không commit), rồi:

```
node dev-server.js
```

Mở http://localhost:8000. (Không cần đăng nhập Vercel; hoặc dùng `npx vercel dev` nếu đã đăng nhập.)

## Kiểm thử

```
node tests/parser.test.js
node tests/proxy.test.js
```

## Tài liệu

- [Kế hoạch bản đơn giản](docs/v2.0/simple-sheets-plan.md)
- [Hướng dẫn cài đặt](docs/v2.0/simple-sheets-guide.md)
- [Version 1.0 (Go + React, đã ngừng)](docs/v1.0/README.md)
