> **Trạng thái:** Đã triển khai — lint/build frontend pass, đã build/deploy
> container `pf-server`, verify hash file JS/CSS khớp bản mới qua curl.

# Dashboard: bỏ trùng "Tổng chi tiêu", nổi bật "Số tiền còn lại"

## Context

Trên Dashboard (kỳ Tháng), số "Tổng chi tiêu" đang hiện 2 lần: một lần
trong `BudgetCard` (số lớn cạnh hạn mức) và một lần nữa trong card riêng ở
`SummaryCards.tsx` — gây rối mắt, lặp thông tin. Người dùng muốn: chỉ nổi
bật tổng chi tiêu 1 lần (giữ ở `BudgetCard`), còn card thứ 2 trong
`SummaryCards` đổi thành "Số tiền còn lại" (dương = xanh, âm = đỏ).

## Phạm vi thay đổi

- "Số tiền còn lại" = `budget.remaining` (đã có sẵn trong response
  `/api/dashboard/month`, không cần sửa backend).
- Chỉ áp dụng khi có `budget` (kỳ Tháng, đã có hạn mức) — Quý/Năm không có
  `BudgetCard` nên không bị trùng, giữ nguyên card "Tổng chi tiêu" như cũ
  khi không có budget.

## Các bước cụ thể

1. `frontend/src/components/dashboard/SummaryCards.tsx`: thêm prop
   `remaining?: number | null`; card đầu tiên hiện "Số tiền còn lại" (màu
   xanh nếu `>= 0`, đỏ nếu `< 0`) khi có `remaining`, ngược lại giữ "Tổng
   chi tiêu" như cũ.
2. `frontend/src/pages/DashboardPage.tsx`: truyền
   `remaining={data?.budget?.remaining}` vào `<SummaryCards>`.

## Kiểm thử

1. Kỳ Tháng còn dư tiền → card "Số tiền còn lại" màu xanh, đúng số.
2. Kỳ Tháng vượt hạn mức → card màu đỏ (số âm).
3. Kỳ Quý/Năm → vẫn hiện "Tổng chi tiêu" như cũ.
4. `npm run lint && npm run build`, build/deploy Docker, verify qua curl.
