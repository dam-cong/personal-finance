> **Trạng thái:** Đã triển khai — đã lint/build frontend pass, đã build lại
> và deploy container Docker `pf-server`, verify qua `curl` hash file JS/CSS
> khớp bản mới.

# Dashboard: tổng tiền + bộ lọc theo user trong danh sách giao dịch

## Context

Phần "Giao dịch" trên trang Thống kê (`/dashboard`) chỉ liệt kê giao dịch
theo thời gian, không hiện tổng tiền ngay đầu danh sách và không có cách
xem nhanh từng thành viên trong nhà đã chi bao nhiêu. Người dùng muốn thêm
tổng tiền lên đầu danh sách và bộ lọc theo user — phạm vi giới hạn trong
khu vực danh sách giao dịch, không ảnh hưởng biểu đồ/thẻ tổng quan phía
trên.

## Phát hiện quan trọng — không cần sửa backend

- `data.transactions` từ `/api/dashboard` là toàn bộ giao dịch trong kỳ
  đang chọn, không giới hạn/phân trang phía server.
- `data.members` (từ `Store.ListUsersInHousehold`) là danh sách **tất cả**
  thành viên trong nhà, kể cả người chưa có giao dịch nào trong kỳ.
- Toàn bộ tính năng làm được chỉ bằng cách sửa
  `frontend/src/components/dashboard/TransactionList.tsx` và truyền thêm 1
  prop từ `DashboardPage.tsx` — không đổi backend, không thêm API.

## Thay đổi

### `TransactionList.tsx`
- Thêm prop `members: string[]`.
- Tính `totalsByUser` (map user → tổng tiền, khởi tạo 0 cho mọi thành viên,
  cộng dồn từ `transactions`), sort giảm dần theo tổng chi.
- Thêm hàng chip lọc theo user (`Tất cả` + từng thành viên kèm tổng tiền),
  bấm để lọc danh sách; reset `visibleCount` khi đổi filter.
- Header đổi từ text tĩnh "Giao dịch" thành hàng có tổng tiền của tập đã
  lọc bên phải (`formatVND`, màu `text-red-600` như `SummaryCards`).
- Thêm thông báo trống khi lọc ra 0 kết quả.
- `key={period-year-month-quarter}` đã có sẵn ở `DashboardPage.tsx` nên đổi
  kỳ tự động remount component, reset luôn `selectedUser`/`visibleCount` —
  không cần code thêm cho việc này.

### `DashboardPage.tsx`
- Truyền `members={data?.members ?? []}` vào `<TransactionList>`.

## Kiểm thử đã thực hiện

- `npm run lint && npm run build`: pass.
- Build Docker + deploy: pass, verify hash file JS/CSS khớp bản mới qua
  `curl`.
- Cần người dùng tự kiểm tra trên trình duyệt/điện thoại: bấm từng chip lọc
  đúng theo user, tổng tiền đầu danh sách khớp, đổi kỳ reset lại "Tất cả".
