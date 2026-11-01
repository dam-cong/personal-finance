# Tài liệu dự án

Tài liệu được lưu theo từng version để tránh lẫn giữa bản đang chạy và bản
đang thiết kế.

## Version hiện tại

**Version 2.0 — bản đơn giản (code xong, chờ verify):** HTML tĩnh trên
Vercel + Google Apps Script + Google Sheet; chỉ còn Chat và Dashboard.

- [Mục lục Version 2.0](v2.0/README.md)
- [Kế hoạch bản đơn giản](v2.0/simple-sheets-plan.md)
- [Hướng dẫn cài đặt 4 bước](v2.0/simple-sheets-guide.md)

## Version đã đóng băng

**Version 1.0 — 2026-10-25:** Docker/JSON store, chat gia đình, upload ảnh.

- [Mục lục Version 1.0](v1.0/README.md)

## Lịch sử version

| Version | Ngày | Trạng thái | Phạm vi chính |
|---|---|---|---|
| 1.0 | 2026-10-25 | Đóng băng | Tự host Docker, JSON store, chat gia đình, ảnh |
| 2.0 | 2026-11-01 | Đang triển khai | HTML tĩnh + Apps Script + Google Sheet; chỉ Chat và Dashboard |

## Quy ước

- Tài liệu của version đang triển khai nằm trong `docs/v2.0/`.
- Tài liệu version cũ chỉ đọc, không sửa; thay đổi mới tạo file trong version
  hiện tại.
- Mỗi file plan bắt đầu bằng dòng trạng thái theo `CLAUDE.md`.
- Không commit service account key, mật khẩu seed, JWT secret hoặc file dữ
  liệu thật vào repository.
