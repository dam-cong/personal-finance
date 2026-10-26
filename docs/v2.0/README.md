# Tài liệu Version 2.0

> **Trạng thái:** Đang triển khai — Phase 1 code xong, chờ kiểm tra UI thủ công.

## Mục tiêu

Chuyển ứng dụng từ mô hình tự host Docker/JSON sang:

- **Vercel Services**: frontend Vite + backend Go/Gin trong cùng project.
- **Google Sheets**: store chính, service account, cache ngắn hạn.
- **Bỏ chat gia đình** và **bỏ toàn bộ upload ảnh**.
- **Bắt đầu dữ liệu mới**: chỉ tạo household mặc định + user seed, không
  migrate dữ liệu 1.0.
- Giữ nguyên nghiệp vụ chat nhập chi tiêu, dashboard, household, profile,
  auth.

## Tài liệu

- [Kế hoạch triển khai theo phase](implementation-plan.md) — thứ tự thực thi,
  gate và điều kiện dừng.
- [Thiết kế chi tiết](vercel-google-sheets-plan.md) — schema, API, cấu hình,
  checklist đầy đủ.
- [Mục lục Version 1.0](../v1.0/README.md) — bản đóng băng để tham khảo.

## Quyết định đã chốt

1. Dùng Vercel Services, không tách 2 project.
2. Google Sheets là store chính; cache đọc 10 giây; không polling.
3. Bỏ hẳn family chat, unread badge, ảnh chat, avatar, ảnh nhà.
4. Không migrate dữ liệu cũ; tạo dữ liệu mới qua endpoint init.
5. Bảo mật git (đưa repo về private, xoá secret khỏi history, rotate key)
   được xử lý riêng sau khi code xong, cần người dùng duyệt lại.

## Cảnh báo

- Vercel Go runtime và Services đang ở **Beta**.
- Repository hiện là **public** và còn file nhạy cảm trong lịch sử git.
  Không đưa service account key hay mật khẩu thật vào repo trước khi xử lý
  bảo mật.
