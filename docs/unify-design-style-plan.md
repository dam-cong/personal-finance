# Đồng nhất style toàn bộ dự án theo chuẩn mới của LoginPage

> **Trạng thái:** Đã code xong theo đúng scope (mục 1–6), `npm run lint` và
> `npm run build` đã pass. **Chưa xác nhận bằng mắt** — môi trường này không
> có tool trình duyệt/screenshot, cần bạn mở app kiểm tra theo mục Kiểm thử
> rồi mới coi là `Đã triển khai` hoàn tất.
>
> Chi tiết implement `Modal.tsx` (mục 4): ngoài `children`, đã thêm luôn 3
> prop tùy chọn `confirmLabel`, `confirmVariant` (`'primary' | 'destructive'`),
> `confirmDisabled` — cần thiết để `BudgetCard` tái sử dụng `Modal` cho nút
> "Lưu" (xanh, có trạng thái đang lưu) thay vì nút "Xóa" (đỏ) mặc định. Vẫn
> backward-compatible 100% với 2 chỗ dùng `Modal` cũ (`ChatPage`,
> `DashboardPage` delete-confirm) — không cần sửa gì ở 2 file đó.

## Context

`LoginPage.tsx` vừa được redesign và người dùng đã duyệt UI trực tiếp trên
trình duyệt (xem `docs/login-style-split-panel-plan.md`, trạng thái
`Đã triển khai`). Style mới này giờ là **chuẩn tham chiếu** cho toàn bộ giao
diện. Người dùng muốn áp style này lên phần còn lại của dự án
(`AppLayout`, `ChatPage`/`ChatWindow`/`ChatInput`/`MessageBubble`,
`DashboardPage` và các component con) để toàn bộ web đồng nhất — không chỉ
riêng trang login.

Đã khảo sát toàn bộ 13 file UI hiện có (layout, chat, dashboard, `ui/Modal`)
để liệt kê style hiện tại và các điểm **không nhất quán** giữa các file (chi
tiết ở mục "Khảo sát hiện trạng"). Plan này định nghĩa 1 bộ "token" style
dùng chung dựa trên `LoginPage`, rồi áp dụng có chọn lọc vào từng file —
**giữ nguyên toàn bộ logic/hành vi/nội dung**, chỉ đổi class Tailwind.

## Khảo sát hiện trạng — các điểm không nhất quán cần xử lý

1. **Nền trang:** `AppLayout` dùng `bg-gray-100`, `LoginPage` dùng `bg-gray-50`.
2. **Bo góc card:** đa số dashboard card đã dùng `rounded-xl` (chuẩn), nhưng
   `AppLayout` (nav pill, dropdown), `Modal`, `BudgetCard`'s modal riêng lại
   dùng `rounded-lg`.
3. **Input:** 3 kiểu khác nhau đang tồn tại — `LoginPage` (`rounded-xl`,
   `bg-gray-50`, có `focus:ring-2 focus:ring-blue-100`) vs `ChatInput`
   (`rounded-full`, không nền, không ring) vs `BudgetCard` modal input
   (`rounded-lg`, không nền, không ring). Đây là khoảng cách lớn nhất.
4. **Nút chính (primary button):** 3 bo góc khác nhau cho cùng 1 loại nút —
   `rounded-full` (ChatInput), `rounded-xl` (LoginPage), `rounded-lg`
   (Modal, BudgetCard).
5. **Segmented toggle** (tab Đăng nhập/Đăng ký vs Tháng/Quý/Năm): LoginPage
   dùng wrapper `bg-gray-100` + nút `rounded-full`; `PeriodSelector` dùng
   wrapper `bg-gray-200` + nút `rounded-md` trong wrapper `rounded-lg`.
6. **Markup trùng lặp** thay vì tái sử dụng component chung:
   - `BudgetCard.tsx` tự viết lại y hệt overlay/panel/button của
     `components/ui/Modal.tsx` thay vì tái sử dụng.
   - `MessageBubble.tsx` và `TransactionList.tsx` có cùng 1 đoạn class cho
     nút xóa tròn nhỏ khi hover, lặp lại y hệt ở 2 nơi.

Những phần **đã nhất quán, không cần sửa**: dashboard card
(`rounded-xl bg-white p-5 shadow-sm` ở `BudgetCard`, `SummaryCards`,
`SpendingChart`, `TransactionList`), màu hex trong `SpendingChart` (đã khớp
`blue-600`/`gray-200`), bubble chat (`rounded-2xl` + góc đuôi bong bóng — đây
là pattern riêng của chat bubble, không phải "card", giữ nguyên).

## Bộ token style dùng chung (chuẩn từ LoginPage)

| Thành phần | Class chuẩn |
|---|---|
| Nền trang | `bg-gray-50` |
| Card nội dung (inline) | `rounded-xl bg-white shadow-sm` (đã là chuẩn ở dashboard, giữ nguyên) |
| Menu/dropdown nổi | `rounded-xl shadow-lg ring-1 ring-black/5` |
| Panel hero (chỉ LoginPage) | `rounded-3xl shadow-2xl` — **không** áp cho nơi khác |
| Input | `rounded-xl border border-gray-200 bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100` |
| Nút chính (solid primary) | `rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50` |
| Nút phụ (outline) | `rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50` |
| Nút nguy hiểm (destructive solid) | `rounded-xl bg-red-600 text-white hover:bg-red-700` |
| Segmented toggle | wrapper `rounded-full bg-gray-100 p-1`; nút `rounded-full`, active `bg-white text-blue-700 shadow-sm`, inactive `text-gray-500 hover:text-gray-800` |
| Icon button tròn nhỏ (mũi tên, nút xóa hover) | `rounded-full` (đã nhất quán, giữ nguyên) |

## Phạm vi thay đổi theo từng file

### 1. `components/layout/AppLayout.tsx`
- Root wrapper: `bg-gray-100` → `bg-gray-50`.
- Nav link (`navLinkClass`): `rounded-lg` → `rounded-xl` (đồng bộ nhóm nút).
- Dropdown menu: `rounded-lg` → `rounded-xl`, giữ `shadow-lg ring-1 ring-black/5`.
- Không đổi: header `shadow-sm`, logic dropdown/logout.

### 2. `components/chat/ChatInput.tsx`
- Input: đổi từ `rounded-full border-gray-300` (không nền/ring) sang token
  input chuẩn: `rounded-xl border-gray-200 bg-gray-50 ... focus:ring-2
  focus:ring-blue-100`.
- Nút Gửi: `rounded-full` → `rounded-xl` (nút chính).
- Không đổi: logic gửi tin, disabled state.

### 3. `components/chat/MessageBubble.tsx` + `components/dashboard/TransactionList.tsx`
- Tách nút xóa tròn nhỏ (hover-reveal) đang bị lặp y hệt ở 2 file thành 1
  component chung mới: `components/ui/DeleteIconButton.tsx` (nhận `onClick`,
  style `hidden h-6 w-6 items-center justify-center rounded-full bg-gray-200
  text-sm text-gray-600 hover:bg-red-500 hover:text-white group-hover:flex`,
  cho phép truyền thêm `className` để `MessageBubble` giữ vị trí
  `absolute -right-2 -top-2` còn `TransactionList` dùng inline).
- Không đổi giao diện hiển thị (cùng 1 class, chỉ gom lại 1 chỗ), không đổi
  hành vi xóa.

### 4. `components/ui/Modal.tsx`
- Nút Hủy (outline): `rounded-lg` → `rounded-xl`.
- Nút Xác nhận (destructive): `rounded-lg` → `rounded-xl`.
- Thêm prop `children?: ReactNode` tùy chọn để hiển thị nội dung tùy biến
  (form) bên trong panel thay vì chỉ title/message cố định — phục vụ mục 5
  (để `BudgetCard` tái sử dụng thay vì tự viết modal riêng). Nếu có
  `children`, hiển thị thay cho đoạn message mặc định; props hiện tại
  (`title`, `message`, `onConfirm`, `onCancel`...) giữ nguyên, không đổi API
  cũ (backward-compatible, `ChatPage`/`DashboardPage` đang dùng `Modal` cho
  delete-confirm không cần sửa gì).

### 5. `components/dashboard/BudgetCard.tsx`
- Modal chỉnh sửa hạn mức: bỏ overlay/panel tự viết tay, chuyển sang dùng
  `<Modal>` (mục 4) với `children` là form input hạn mức hiện tại — xóa phần
  markup trùng lặp overlay/panel/nút Hủy-Xác nhận.
- Input số tiền trong modal: áp token input chuẩn (`rounded-xl bg-gray-50
  border-gray-200 ... focus:ring-2 focus:ring-blue-100`) thay vì `rounded-lg`
  không nền/ring.
- Nút "Đặt hạn mức" (chip xanh nhạt `bg-blue-50 text-blue-700`): giữ màu (đây
  là biến thể nút phụ hợp lý, không phải lỗi), chỉ đổi bo góc `rounded-lg` →
  `rounded-xl` cho nhất quán.
- Không đổi: logic tính %, gauge, gọi API budget.

### 6. `components/dashboard/PeriodSelector.tsx`
- Segmented toggle Tháng/Quý/Năm: đổi để **khớp y hệt** style toggle của
  LoginPage — wrapper `bg-gray-200 rounded-lg` → `bg-gray-100 rounded-full`;
  nút `rounded-md` → `rounded-full`; inactive `text-gray-600` →
  `text-gray-500` (khớp `hover:text-gray-800`).
- Nút mũi tên trước/sau: giữ nguyên (`rounded-full bg-gray-100
  hover:bg-gray-200`, đã đúng chuẩn icon button tròn).

### 7. Các file không cần sửa (đã khớp chuẩn hoặc là pattern riêng hợp lý)
- `pages/App.tsx`, `pages/ChatPage.tsx`, `components/chat/ChatWindow.tsx`:
  không có class card/input/button riêng, không cần đổi.
- `components/dashboard/SummaryCards.tsx`, `SpendingChart.tsx`,
  `TransactionList.tsx` (phần card): đã dùng đúng `rounded-xl bg-white
  shadow-sm`, giữ nguyên. Màu hex trong `SpendingChart` đã khớp `blue-600`/
  `gray-200`, không cần sửa.
- `MessageBubble.tsx`: giữ nguyên hình dạng bong bóng (`rounded-2xl` + góc
  đuôi `rounded-br-sm`/`rounded-bl-sm`) — đây là pattern chat bubble riêng,
  không áp chuẩn "card" vào đây.

### 8. Điểm cần bạn quyết định (không tự ý đổi)
- `SummaryCards.tsx` dùng `text-red-600` cho số tiền đã chi (ý nghĩa "tiền ra")
  — trùng màu với các nút/hành động "nguy hiểm/xóa" ở nơi khác. Đây là quy
  ước phổ biến trong app tài chính (đỏ = tiền chi ra) nên **plan này đề xuất
  giữ nguyên**, không đổi, trừ khi bạn muốn tách riêng 1 màu khác cho ý nghĩa
  "chi tiêu" để tránh nhầm với hành động xóa.
- Banner thông báo (`DashboardPage` có banner xanh `bg-blue-50 text-blue-800`,
  `LoginPage` có banner lỗi đỏ `bg-red-50 text-red-600`) — có thể tách thành
  1 component `ui/Banner` dùng chung (variant info/error) để dễ đồng bộ sau
  này, nhưng đây là refactor thêm ngoài scope "đồng nhất style hiển thị".
  **Plan này không làm việc này** trừ khi bạn muốn mở rộng scope.

## Kiểm thử

1. `cd frontend && npm run dev`, đăng nhập, kiểm tra bằng mắt (không có tool
   trình duyệt tự động ở môi trường này, cần bạn xác nhận trực tiếp):
   - `AppLayout`: nền trang, nav, dropdown user menu đổi bo góc/nền đúng,
     không vỡ layout ở mobile.
   - Chat: ô nhập tin + nút gửi đổi sang `rounded-xl`, nút xóa hover trên
     bong bóng chat vẫn hoạt động đúng (component `DeleteIconButton` mới).
   - Dashboard: `PeriodSelector` toggle Tháng/Quý/Năm đổi giống style tab
     Đăng nhập/Đăng ký ở LoginPage; `BudgetCard` mở modal đặt hạn mức dùng
     `Modal` chung, input/nút trong modal đổi bo góc đúng; nút xóa giao dịch
     trong `TransactionList` vẫn hoạt động đúng.
   - `Modal` (delete-confirm ở Chat & Dashboard): nút Hủy/Xác nhận đổi bo góc
     `rounded-xl`, hành vi xác nhận/hủy không đổi.
2. `npm run lint` (oxlint) và `npm run build` (tsc + vite build) — không có
   lỗi type/lint mới.
3. Test riêng cho `BudgetCard`: đặt hạn mức mới, sửa, xóa hạn mức — xác nhận
   modal mới (dùng `Modal` chung) hoạt động y hệt modal cũ về mặt chức năng.

Sau khi triển khai xong và verify đủ các bước trên, cập nhật dòng
**Trạng thái** ở đầu file này thành `Đã triển khai`.
