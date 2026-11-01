# Personal Finance Chat (bản đơn giản)

Quản lý chi tiêu qua giao diện chat. Nhắn `Cafe 45k` → ghi vào Google Sheet;
xem thống kê ở tab Dashboard (tuần / tháng / quý / năm).

- **Giao diện:** một trang HTML tĩnh (`index.html` + `parser.js`), không cần build.
- **API + dữ liệu:** Google Apps Script gắn với Google Sheet
  ([`apps-script/Code.gs`](apps-script/Code.gs)).
- **Cấu hình** (tên nhà, khẩu hiệu, màu, danh sách người nhập): tab `config`
  trong chính Google Sheet.
- **Truy cập:** một mã chung (`TOKEN`) đặt trong Apps Script.

## Cấu trúc

```
index.html          giao diện (Chat + Dashboard)
parser.js           phân tích "Cafe 45k" → nội dung + số tiền
icons/, manifest.webmanifest  icon "Thêm vào Màn hình chính" + PWA
apps-script/Code.gs mã dán vào Apps Script của Google Sheet
tests/              test parser: node tests/parser.test.js
vercel.json         cấu hình deploy static lên Vercel
docs/               tài liệu (v1.0 đóng băng, v2.0 hiện hành)
```

## Cài đặt

1. Làm theo [hướng dẫn 4 bước](docs/v2.0/simple-sheets-guide.md) để tạo Sheet,
   Apps Script, `TOKEN` và lấy URL Web app.
2. Deploy lên Vercel — xem mục dưới.
3. Mở trang web, nhập URL Apps Script + mã chung + chọn tên.

## Deploy lên Vercel

Repo là site tĩnh, không cần build.

1. Vercel → **Add New… → Project** → chọn repo này.
2. **Framework Preset:** Other. **Root Directory:** để trống (gốc repo).
   Build Command / Output Directory để mặc định (đã khai trong `vercel.json`).
3. **Deploy**.
4. Hoặc dùng CLI: `npx vercel` (preview) / `npx vercel --prod`.

Không cần biến môi trường: URL Apps Script và mã chung do người dùng nhập
trong trình duyệt và lưu cục bộ.

## Chạy thử trên máy

```
npx serve .
```

## Kiểm thử

```
node tests/parser.test.js
```

## Tài liệu

- [Kế hoạch bản đơn giản](docs/v2.0/simple-sheets-plan.md)
- [Hướng dẫn cài đặt](docs/v2.0/simple-sheets-guide.md)
- [Version 1.0 (Go + React, đã ngừng)](docs/v1.0/README.md)
