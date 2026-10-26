> **Trạng thái:** Đã triển khai — build Docker (compile Go) và frontend
> lint/build đều pass, đã test endpoint `GET /api/dashboard/week` (mặc định
> và có `date`) trả đúng tuần ISO, deploy container `pf-server` thành công.
> Không có Go toolchain cục bộ nên không chạy được `go vet`/`go test`
> trong môi trường này — Docker build (compile) là xác nhận thay thế.

# Biểu đồ "Chi tiêu theo ngày trong tuần" — hiện tuần thực tế + điều hướng

## Context

Biểu đồ "Chi tiêu trung bình theo ngày trong tuần"
(`WeekdaySpendingChart.tsx`) hiện tính **trung bình** chi tiêu mỗi thứ trong
tuần bằng cách gộp tất cả các tuần nằm trong kỳ đang chọn ở trên (Tháng/Quý/
Năm) rồi chia trung bình — không cho biết chính xác tuần nào, không xem
được tuần khác. Người dùng muốn xem đúng 1 tuần thực tế cụ thể (thứ 2 → chủ
nhật, số tiền thật từng ngày, không phải trung bình), kèm 2 nút tiến/lùi để
chuyển qua các tuần khác nhau.

## Thiết kế

Biến biểu đồ này thành **widget độc lập**, tự quản lý tuần đang xem và tự
gọi API riêng — không còn phụ thuộc vào Tháng/Quý/Năm đang chọn ở
`PeriodSelector` phía trên (vì nếu chỉ dùng lại `data.transactions` đã fetch
theo tháng, sẽ không đủ dữ liệu khi lùi/tiến sang tuần thuộc tháng khác).

### Backend
1. `backend/internal/handlers/dashboard.go`: thêm `Week(c *gin.Context)`
   theo đúng pattern của `Month`/`Quarter`/`Year` hiện có (dùng chung
   `h.summarize(...)`):
   - Đọc query `date` (YYYY-MM-DD), mặc định hôm nay nếu thiếu/sai định
     dạng (thêm helper `queryDate` cạnh `queryInt` đã có).
   - Tính thứ 2 đầu tuần chứa `date` (`(int(t.Weekday())+6)%7` ngày trước
     đó), `start` = 00:00 thứ 2 đó, `end = start.AddDate(0,0,7)`.
   - `labels := dayLabels(start, end)` (hàm có sẵn), gọi `h.summarize` với
     key format `"2006-01-02"` (giống `Month`).
   - Lấy `isoYear, isoWeek := start.ISOWeek()` (built-in Go, không cần tính
     tay).
   - Trả JSON: `period:"week"`, `week_start`, `week_end`, `iso_year`,
     `iso_week`, `total`, `count`, `daily: st.Buckets` (7 phần tử theo thứ
     tự thứ 2→chủ nhật, khớp thứ tự `dayLabels`).
2. `backend/internal/handlers/handlers.go`: thêm route
   `protected.GET("/dashboard/week", dash.Week)`.

### Frontend
3. `frontend/src/types/index.ts`: thêm interface `WeekDashboardData` (
   `week_start, week_end, iso_year, iso_week, total, count, daily: Bucket[]`).
4. `frontend/src/api/dashboard.ts`: thêm `fetchDashboardWeek(date: string):
   Promise<WeekDashboardData>` gọi `GET /dashboard/week?date=...`.
5. `frontend/src/components/dashboard/WeekdaySpendingChart.tsx`: viết lại
   thành component tự chủ:
   - Bỏ props `transactions`/`rangeStart`/`rangeEnd` (không cần nữa).
   - State `weekDate: Date` (mặc định hôm nay), `useQuery(['dashboard-week',
     dateKey], () => fetchDashboardWeek(dateKey))`.
   - 2 nút lùi/tiến (tái dùng icon chevron trái/phải theo đúng style
     `PeriodSelector.tsx` — nút tròn `bg-gray-100 hover:bg-gray-200`), mỗi
     lần bấm dịch `weekDate` ±7 ngày.
   - Label hiển thị "Tuần {iso_week}/{iso_year} ({week_start} – {week_end})"
     ở giữa 2 nút, cùng hàng với tiêu đề (giống bố cục
     `PeriodSelector`).
   - Đổi tiêu đề từ "Chi tiêu **trung bình** theo ngày trong tuần" thành
     "Chi tiêu theo ngày trong tuần" (không còn là trung bình nữa).
   - Map thẳng `data.daily[i].total` vào `WEEKDAY_LABELS[i]` (backend đã trả
     đúng thứ tự thứ 2→CN nên không cần logic `JS_DAY_TO_INDEX` cũ).
   - Tooltip đổi từ "TB chi tiêu" thành "Chi tiêu".
   - Tiện thể đổi màu line/dot đang hard-code `#2563eb` sang
     `var(--primary-600)` cho khớp tính năng đổi màu chủ đạo đã làm trước
     đó (bị sót vì dùng hex trực tiếp trong props `stroke`/`fill` của
     `recharts`, không phải class Tailwind nên lần quét trước không bắt
     được).
6. `frontend/src/pages/DashboardPage.tsx`: bỏ truyền
   `transactions`/`rangeStart`/`rangeEnd` cho `<WeekdaySpendingChart />`
   (gọi `<WeekdaySpendingChart />` không props); xoá luôn biến
   `rangeStart`/`rangeEnd` nếu không còn chỗ nào khác dùng (tránh biến thừa
   gây lỗi lint).

## Kiểm thử

1. Mặc định mở Dashboard → biểu đồ hiện đúng tuần chứa ngày hôm nay, đúng
   số thứ tự tuần/năm.
2. Bấm nút lùi/tiến nhiều lần, kể cả qua ranh giới tháng/năm — dữ liệu và
   nhãn tuần cập nhật đúng, không phụ thuộc Tháng/Quý/Năm đang chọn ở
   `PeriodSelector` phía trên.
3. Số tiền hiển thị đúng bằng tổng thực tế của từng ngày trong tuần đó
   (không phải trung bình).
4. `cd backend && go vet ./...` nếu có Go toolchain (môi trường hiện tại
   không có — sẽ dựa vào build Docker để bắt lỗi biên dịch thay thế).
5. `cd frontend && npm run lint && npm run build`.
6. Build/deploy container `pf-server`, verify qua `curl` endpoint
   `/api/dashboard/week?date=...` trả đúng cấu trúc, rồi kiểm tra thực tế
   trên trình duyệt/điện thoại.
