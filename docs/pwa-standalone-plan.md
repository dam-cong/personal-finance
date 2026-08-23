> **Trạng thái:** Đã triển khai — build/lint pass, đã chạy qua binary WSL
> theo skill `run` (cổng 8080), verify hash file + `manifest.webmanifest` +
> `icon-192.png` đều đúng qua curl. Cần người dùng tự test "Thêm vào màn
> hình chính" trên điện thoại thật (xem ghi chú bên dưới).

# Ẩn thanh điều hướng trình duyệt trên điện thoại (PWA standalone)

## Context

Khi mở app trên điện thoại qua tab trình duyệt (Safari/Chrome), hệ điều
hành luôn hiển thị thanh điều hướng gốc của trình duyệt — không phải UI do
app vẽ ra nên không thể ẩn trực tiếp. Cách khắc phục: biến app thành PWA
chạy chế độ `standalone`. Khi người dùng "Thêm vào màn hình chính" và mở
app từ icon đó, trình duyệt sẽ ẩn toàn bộ thanh địa chỉ + thanh điều hướng,
chỉ còn UI của app. Ý tưởng tham khảo từ 1 dự án khác (pos-manager), điều
chỉnh theo thực tế dự án này (đã có sẵn `favicon.png` 512×512).

## Phạm vi thay đổi

- Thêm `frontend/public/icon-192.png` (resize từ `favicon.png` có sẵn).
- Thêm `frontend/public/manifest.webmanifest` (`display: standalone`).
- Cập nhật `frontend/index.html`: link manifest, `theme-color`, meta iOS.
- Không thêm service worker/`vite-plugin-pwa`, không sửa backend hay UI
  component nào khác.

## Các bước

1. Resize `favicon.png` (512×512) → `icon-192.png` (192×192).
2. Tạo `manifest.webmanifest`.
3. Cập nhật `index.html`.
4. Build frontend, chạy/verify theo skill `run` (`.claude/skills/run/SKILL.md`)
   — không cần Docker vì không đổi backend.

## Kiểm thử

- `cd frontend && npm run lint && npm run build` không lỗi.
- `curl http://localhost:8080/manifest.webmanifest` trả đúng JSON, `curl -I
  http://localhost:8080/icon-192.png` trả 200.
- Trên điện thoại thật: "Thêm vào màn hình chính"/"Cài đặt ứng dụng" → mở
  từ icon → không còn thanh điều hướng trình duyệt.
- Mở qua tab thường (chưa add-to-home-screen) → thanh điều hướng vẫn hiện
  bình thường — đúng hành vi kỳ vọng.
