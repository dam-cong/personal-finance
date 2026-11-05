> **Trạng thái:** Đã triển khai — `node --test tests/*.test.js` pass (thêm test habits + proxy). Giao diện đã kiểm tra bằng Chrome headless với server giả (360/390px và 1280px): không tràn ngang, thêm/tích/100% + hiệu ứng, hàng chờ offline tự đồng bộ, trạng thái trống đều đúng. **Chưa thử với Google Sheet thật:** cần dán `Code.gs` mới, deploy lại rồi thử.

# Check-list công việc hằng ngày (thói quen) + biểu đồ động lực

## Context

Người dùng muốn lập kế hoạch việc hằng ngày (tập thể dục, đọc sách, dậy sớm…),
cài theo các thứ trong tuần, tích khi xong, và xem biểu đồ tỷ lệ hoàn thành để có
động lực. Đã chốt: **riêng từng người**, **không** thông báo đẩy. Dùng chung codebase
web responsive, lưu trong Google Sheet.

## Dữ liệu (tab tự tạo nếu thiếu)

- `habits`: `id | username | name | emoji | days | created_date | ended_date`
  (`days` dạng `1,2,3,4,5`, 1 = T2 … 7 = CN; xoá việc = ghi `ended_date` để giữ lịch sử).
- `habit_logs`: `date | habit_id | username` (có dòng = đã xong, bỏ tích = xoá dòng).
- Việc áp dụng cho ngày d khi `created_date ≤ d`, `ended_date` trống hoặc `> d`, và thứ của d nằm trong `days`.

## Phạm vi thay đổi

- `apps-script/Code.gs`: `habit_list`, `habit_save`, `habit_delete`, `habit_check`.
- `api/pf.js`: 4 action tương ứng, username lấy từ session.
- `habits.js` (mới, logic thuần dùng cho trình duyệt + test), `tests/habits.test.js`.
- `index.html`: tab/panel "Hằng ngày", vòng tiến độ, check-list, biểu đồ, sheet thêm/sửa, hàng chờ offline.
- `sw.js`, `dev-server.js`, README, `docs/v2.0/simple-sheets-guide.md`.

## Các bước

1. `habits.js` + test.
2. `Code.gs` + `api/pf.js` + test proxy.
3. Giao diện trong `index.html`.
4. Điều hướng (thanh tab dưới 4 mục, bộ chuyển ở desktop).
5. `sw.js`, `dev-server.js`, tài liệu.

## Kiểm thử

- `node --test tests/*.test.js`.
- Chạy `node dev-server.js`, thử thêm/tích/đổi ngày/biểu đồ; 2 tài khoản không thấy việc của nhau.
- Responsive 360/390/430px và ≥ 1024px; offline tích rồi có mạng lại tự đồng bộ.
- Người dùng cần dán `Code.gs` mới và deploy lại Apps Script.

## Sai khác so với kế hoạch ban đầu

- Gộp "dải tuần" vào biểu đồ cột: một biểu đồ duy nhất với bộ chọn 7 ngày / 30 ngày (kết thúc ở ngày đang xem), chạm cột để nhảy tới ngày đó.
- Việc không có lịch hôm nay vẫn hiện (mờ) ở cuối danh sách để còn sửa/xoá được.
- Sửa `days` của một việc áp dụng cho cả lịch sử đã có.

## Chỉnh giao diện lần 2

- Thanh tuần (T2–CN) thay bộ chuyển ngày: mỗi ngày có vòng nhỏ % hoàn thành, chạm để chọn ngày; mũi tên đổi tuần, nút "Về hôm nay".
- Thẻ tiến độ gọn hơn; mỗi việc là một thẻ lớn (chạm cả thẻ để tích, nút tích bên phải); nút "Sửa" bật chế độ chỉnh sửa; nút + nổi để thêm việc.
- Bảng thêm/sửa việc gọn vừa một khung hình điện thoại, Huỷ (đỏ) và Lưu chia 50/50.
