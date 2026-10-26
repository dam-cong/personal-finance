# Tài liệu Version 1.0

> **Trạng thái:** Đã đóng băng — chỉ đọc để tham khảo.
>
> **Ngày đóng băng:** 2026-10-25
>
> **Phạm vi:** Phiên bản tự host bằng Docker/JSON store, có chat gia đình và
> upload ảnh. Đây là bản mô tả đúng trạng thái code trước khi chuyển sang
> Version 2.0 (Vercel Services + Google Sheets).

## Quy ước

- Các file trong thư mục này **không sửa nội dung** nữa. Nếu cần thay đổi,
  tạo tài liệu mới trong `docs/v2.0/`.
- Ngoại lệ duy nhất đã sửa khi lưu trữ: link tương đối tới code trong
  `login-style-split-panel-plan.md` được đổi từ `../frontend/` thành
  `../../frontend/` do thư mục bị dịch chuyển.
- Trạng thái ghi theo dòng đầu của từng file; file không có dòng trạng thái
  được ghi là "Tham chiếu".

## Mục lục

### Tài liệu gốc và vận hành

| File | Loại | Trạng thái | Ghi chú |
|---|---|---|---|
| [Personal_Finance_Chat_Plan.md](Personal_Finance_Chat_Plan.md) | Kế hoạch gốc | Tham chiếu | Kiến trúc, API, lộ trình Phase 1–4 của bản 1.0 |
| [DEPLOY.md](DEPLOY.md) | Runbook | Áp dụng cho 1.0 | Deploy Docker/nginx, build thủ công, troubleshooting |
| [deploy-script-plan.md](deploy-script-plan.md) | Kế hoạch deploy | Đã triển khai | Script deploy 1 bước cho server Docker |

### Kế hoạch tính năng

| File | Trạng thái | Ghi chú |
|---|---|---|
| [bottom-nav-mobile-plan.md](bottom-nav-mobile-plan.md) | Đã triển khai | Bottom navigation cho mobile |
| [budget-gauge-chart-plan.md](budget-gauge-chart-plan.md) | Đã triển khai | Gauge hạn mức thay progress bar |
| [dashboard-remaining-budget-card-plan.md](dashboard-remaining-budget-card-plan.md) | Đã triển khai | Card "Số tiền còn lại" |
| [dashboard-transaction-filter-plan.md](dashboard-transaction-filter-plan.md) | Đã triển khai | Lọc giao dịch theo thành viên |
| [family-chat-images-plan.md](family-chat-images-plan.md) | Đã triển khai | Gửi ảnh trong chat gia đình — **bỏ ở 2.0** |
| [family-group-chat-plan.md](family-group-chat-plan.md) | Đã triển khai | Chat nhóm gia đình — **bỏ ở 2.0** |
| [household-image-plan.md](household-image-plan.md) | Đã triển khai | Ảnh nhà làm header/nền chat — **bỏ ở 2.0** |
| [household-settings-plan.md](household-settings-plan.md) | Đã triển khai | Tên nhà, hạn mức mặc định, khẩu hiệu |
| [login-style-split-panel-plan.md](login-style-split-panel-plan.md) | Đã triển khai | Redesign LoginPage split-panel |
| [pwa-standalone-plan.md](pwa-standalone-plan.md) | Đã triển khai | Ẩn thanh trình duyệt trên mobile |
| [theme-color-plan.md](theme-color-plan.md) | Đã triển khai | Màu chủ đạo theo nhà |
| [unify-design-style-plan.md](unify-design-style-plan.md) | Đã code, chờ verify thủ công | Đồng nhất style toàn app |
| [unread-messages-plan.md](unread-messages-plan.md) | Đã triển khai | Badge tin nhắn chưa đọc — **bỏ ở 2.0** |
| [user-profile-avatar-plan.md](user-profile-avatar-plan.md) | Đã triển khai | Tên hiển thị + avatar — **avatar bỏ ở 2.0** |
| [weekday-chart-week-navigation-plan.md](weekday-chart-week-navigation-plan.md) | Đã triển khai | Điều hướng tuần cho biểu đồ |
| [weekday-spending-chart-plan.md](weekday-spending-chart-plan.md) | Đã triển khai | Biểu đồ chi tiêu theo thứ |

## Tính năng sẽ bị bỏ ở Version 2.0

Các tài liệu sau chỉ còn giá trị lịch sử, không dùng làm căn cứ triển khai 2.0:

- `family-group-chat-plan.md`
- `family-chat-images-plan.md`
- `household-image-plan.md`
- `unread-messages-plan.md`
- phần avatar trong `user-profile-avatar-plan.md`

Xem kế hoạch thay thế tại
[`../v2.0/vercel-google-sheets-plan.md`](../v2.0/vercel-google-sheets-plan.md).
