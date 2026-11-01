# Tài liệu Version 2.0

> **Trạng thái:** Đang triển khai — code xong, chờ verify với Google Sheet thật.

## Mục tiêu

Bản đơn giản chỉ giữ 2 chức năng:

1. **Chat** nhập chi tiêu hằng ngày (`Cafe 45k`).
2. **Dashboard** chi tiêu tuần / tháng / quý / năm.

Kiến trúc: một trang HTML tĩnh deploy trên Vercel, gọi Google Apps Script
gắn với Google Sheet (không còn Go, Docker, đăng nhập theo user).

## Tài liệu

- [Kế hoạch bản đơn giản](simple-sheets-plan.md) — kiến trúc, schema Sheet,
  API, kiểm thử.
- [Hướng dẫn cài đặt 4 bước](simple-sheets-guide.md) — thao tác trên Google
  Sheet / Apps Script / Vercel.
- [Mục lục Version 1.0](../v1.0/README.md) — bản đóng băng để tham khảo.

> Các plan cũ của 2.0 (Vercel Services + Go + SheetsStore) đã bị bỏ và xoá
> khỏi thư mục này; xem lại qua lịch sử git nếu cần.
