> **Trạng thái:** Đã triển khai — test parser/proxy pass, cú pháp JS và `sw.js` hợp lệ, server trả 200 cho `/`, `/sw.js`, manifest, icon maskable. Chưa kiểm tra giao diện bằng mắt trên trình duyệt/điện thoại thật: cần người dùng thử (xem mục Kiểm thử).

# Giao diện mobile "như app" (responsive, dùng chung codebase)

## Context

Website (≥ 1024px) đã ổn. Trên điện thoại, cùng một `index.html` nhưng cần
cảm giác app: thanh điều hướng dưới, vùng chạm lớn, chạy standalone từ Màn
hình chính, mở được khi mất mạng. Chỉ đổi phần mobile (`@media (max-width:
1023px)`) và các file PWA; **desktop giữ nguyên**. Không làm app native.

## Phạm vi thay đổi

- `index.html`: CSS + JS mobile.
- `manifest.webmanifest`, `sw.js` (mới), `icons/icon-maskable-512.png` (mới).
- `vercel.json` (header cho `sw.js`), `dev-server.js` (cho phép `sw.js`).
- Không đổi `api/pf.js`, `apps-script/`, `parser.js`, giao diện desktop.

## Các bước

1. Thanh tab dưới (Chat / Thống kê / Cài đặt), ẩn khi bàn phím mở.
2. Header mobile gọn dạng gradient, panel bo góc đè lên header; thẻ "Hôm nay".
3. Vùng chạm ≥ 44px; chặn rubber-band, double-tap zoom, bôi chọn trên UI.
4. Manifest đầy đủ (id, scope, maskable, shortcuts…), `background_color` khớp splash.
5. Service worker: network-first (luôn bản mới khi online, bản cache khi offline),
   không cache `/api/pf`. Cập nhật app **không cần cài lại**.
6. Hàng chờ gửi khoản chi khi offline (`pf_queue`), tự gửi khi có mạng.
7. Gợi ý cài app (Android: nút cài; iOS: hướng dẫn) trong màn Tài khoản.

## Kiểm thử

- `node --test tests` (parser, proxy) không lỗi.
- Giả lập 360/390/430px và ≥ 1024px: không tràn ngang, desktop không đổi.
- DevTools → Application: manifest hợp lệ, SW activated; bật Offline → tải lại
  vẫn vào app, gửi khoản chi vào hàng chờ, bỏ Offline → tự đồng bộ không trùng.
- Người dùng tự thử trên điện thoại thật (iOS: Thêm vào MH chính).

## Sai khác so với kế hoạch ban đầu

- Không thêm `apple-mobile-web-app-status-bar-style` và giữ nguyên chỗ chừa
  thanh trạng thái iPhone đã chỉnh ở commit trước, vì đã được thử trên máy thật.
- Không có toast "Có bản mới": SW network-first nên mở lại app là có bản mới.
