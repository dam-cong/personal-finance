> **Trạng thái:** Đã triển khai — đã build/lint pass, đã chạy server và
> verify qua code review kỹ theo checklist bên dưới. Lưu ý: môi trường này
> không có browser tool để tự chụp/kiểm tra UI trực quan trên trình duyệt
> thật — cần người dùng tự kiểm tra bằng mắt trên điện thoại/DevTools mobile
> viewport (xem mục Kiểm thử) trước khi coi là hoàn tất 100%.

# Chuyển navigation từ Header sang Bottom Navigation Bar (chỉ Mobile)

## Context

Hiện tại toàn bộ điều hướng (Chat, Trò chuyện gia đình, Dashboard) và menu
tài khoản (Hồ sơ, Thông tin hộ gia đình, Đăng xuất) đều nằm gọn trong
`<header>` của `AppLayout.tsx` — dùng chung một layout cho cả desktop lẫn
mobile, không có breakpoint responsive nào. Trên màn hình hẹp, cách bố trí
này chiếm nhiều không gian dọc quý giá và không quen thuộc với thao tác ngón
tay cái trên mobile.

Người dùng muốn tách riêng trải nghiệm mobile: chuyển các chức năng điều
hướng xuống một **thanh Bottom Navigation** cố định ở đáy màn hình, tham
khảo phong cách trực quan/cute từ app "Dart" (bo góc lớn, icon rõ ràng, nút
hành động chính nổi bật ở giữa dạng hình tròn nhô lên). Bản desktop **giữ
nguyên như hiện tại**, không đầu tư thêm vì ít người dùng.

## Phạm vi thay đổi

- **Chỉ áp dụng cho mobile** (`< md`, tức < 768px theo Tailwind). Desktop
  (`>= md`) giữ nguyên 100% header hiện tại, không đổi gì.
- **5 mục bottom nav** (bố cục tham khảo ảnh Dart: Home / Circles / [+ nổi
  giữa] / Payment / Profile):
  1. "Trò chuyện" → `/chat`
  2. "Gia đình" → `/family-chat` (giữ badge đỏ unread như hiện tại)
  3. **Nút "+" nổi giữa** → điều hướng `/chat` và tự động focus ô nhập chat
     (tận dụng luồng AI-chat ghi giao dịch có sẵn, không thêm logic ghi giao
     dịch mới)
  4. "Thống kê" → `/dashboard`
  5. "Cá nhân" → mở **bottom sheet** tái dùng đúng nội dung dropdown avatar
     hiện tại (Hồ sơ của tôi, Thông tin, Đăng xuất) — không tạo trang mới
- **Header mobile**: thu gọn chỉ còn logo + tên hộ gia đình (bỏ nav links và
  avatar dropdown vì đã chuyển xuống bottom nav). Desktop không đổi.
- **Phong cách**: icon SVG inline (đúng convention project, không thêm thư
  viện icon), outline khi inactive (`text-gray-400`) → filled xanh khi
  active (`text-blue-600`), label chữ nhỏ dưới icon, nút "+" hình tròn
  gradient xanh nổi hẳn lên trên thanh bar (`shadow-lg`, `ring-4 ring-white`),
  hiệu ứng bấm nảy nhẹ `active:scale-90 transition-transform` (dùng class
  Tailwind có sẵn, không cần thêm animation library hay sửa
  `tailwind.config.js`).

### Bám theo design system hiện có (không được lệch chuẩn)

- Bo góc: `rounded-xl` cho card/input/nút thường; `rounded-full` cho
  pill/avatar/icon tròn; `rounded-3xl`/`rounded-t-3xl` chỉ cho panel lớn
  dạng hero (đúng như header hiện dùng `rounded-b-3xl`) — bottom nav và
  bottom sheet dùng `rounded-t-3xl`.
- Card/dropdown: `shadow-sm` (card), `shadow-lg ring-1 ring-black/5`
  (dropdown/menu nổi).
- Palette: chỉ dùng `blue-500/600/700/900`, `gray-50/100/200/400/500/900`,
  `red-500/600` — không thêm màu mới.
- Icon: SVG inline tay, `stroke="currentColor"`/`fill="currentColor"`, tối
  giản 1-3 phần tử/icon, theo đúng mẫu `PaperclipIcon` trong `ChatInput.tsx`.
- Không dùng framer-motion — chỉ CSS transition qua class Tailwind có sẵn.
- **Giữ code đơn giản, không lan man**: ưu tiên thay đổi tối thiểu, tái dùng
  component/logic có sẵn (`Avatar`, `Modal.tsx` làm tham khảo, modal
  `ProfileModal`/`HouseholdInfoModal` giữ nguyên), tránh thêm trừu tượng khi
  không cần thiết.

## Các bước cụ thể

### 1. Tạo icon set — `frontend/src/components/layout/BottomNavIcons.tsx`
Export cặp icon outline/filled cho từng mục (24x24, viewBox tối giản):
- **Trò chuyện**: bong bóng chat bo tròn + 3 chấm nhỏ bên trong.
- **Gia đình**: 2 hình người cách điệu chồng nhẹ lên nhau.
- **Thống kê**: 3 cột biểu đồ cao thấp khác nhau (outline `rect` viền /
  filled `rect` tô màu).
- **Dấu +**: icon đơn giản 2 đường thẳng vuông góc, `stroke="white"`.
- **Cá nhân**: dùng lại component `Avatar` có sẵn
  (`components/ui/Avatar.tsx`), không cần vẽ icon mới.

### 2. Tạo `frontend/src/components/ui/BottomSheet.tsx`
Component dùng chung, tham khảo `Modal.tsx` (overlay + click-outside để
đóng) nhưng thêm animation trượt từ dưới lên bằng CSS transition thuần:
- Pattern 2 state `mounted`/`visible` để chạy transition đóng trước khi
  unmount (`onTransitionEnd` set `mounted=false`).
- Overlay `bg-black/40` fade opacity; panel `rounded-t-3xl bg-white
  shadow-lg` trượt `translate-y-full ↔ translate-y-0`.
- Có tay cầm kéo trang trí ở đầu panel (không bắt buộc chức năng kéo tay
  thật — đóng bằng tap overlay hoặc nút hành động là đủ).
- Props: `open`, `onClose`, `children`, `title?`.

### 3. Tạo `frontend/src/components/layout/AccountSheet.tsx`
Nội dung render bên trong `BottomSheet` khi mở tab "Cá nhân" — tái dùng y
nguyên logic dropdown hiện tại: `Avatar` + tên hiển thị, nút "Hồ sơ của tôi"
(mở `ProfileModal`), nút "Thông tin" (mở `HouseholdInfoModal`), nút "Đăng
xuất" (gọi `logout()`). Item cỡ chạm lớn hơn dropdown desktop (`px-4 py-3`)
cho phù hợp thao tác ngón tay.

### 4. Tạo `frontend/src/components/layout/BottomNav.tsx`
- Props: `unreadCount: number`, `onOpenAccount: () => void`.
- Wrapper `fixed inset-x-0 bottom-0 z-20 md:hidden`, có
  `pb-[env(safe-area-inset-bottom)]` cho notch.
- Nền thanh: `rounded-t-3xl bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)]
  border-t border-gray-100`, layout `grid grid-cols-5`.
- 4 tab thường dùng sub-component `TabItem` (render-prop `NavLink` để đổi
  cả icon lẫn màu theo `isActive`), tab "Gia đình" giữ badge đỏ
  `ring-2 ring-white` (nền trắng thay vì `ring-blue-600` như header cũ).
- Ô giữa để trống làm khoảng đệm; nút "+" đặt `absolute` đè lên, kích thước
  lớn hơn (`h-14 w-14`), `-translate-y-1/2` để nhô lên trên mép thanh, gọi
  `navigate('/chat', { state: { focusInput: true, nonce: Date.now() } })`.
- Tab "Cá nhân" dùng `button` (không phải `NavLink`) gọi `onOpenAccount`.

### 5. Sửa `frontend/src/components/layout/AppLayout.tsx`
- Thêm state `accountSheetOpen`, giữ nguyên `menuOpen` cho dropdown desktop
  (không gộp chung vì hành vi khác nhau).
- Bọc khối `<div className="relative mt-1 flex w-full ...">` (chứa `<nav>`
  + avatar dropdown, dòng 66-132 hiện tại) bằng thêm class `hidden md:flex`
  — đây là cách thay đổi tối thiểu, đảm bảo desktop không đổi gì.
- Phần "brand block" (logo + `appName` + `householdName` + slogan) giữ
  hiển thị cho cả 2 kích thước; có thể ẩn `slogan` trên mobile bằng
  `hidden md:inline-block` để header mobile gọn hơn (tùy chọn, không bắt
  buộc).
- Sửa `<main>`: thêm
  `pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0` để nội dung không
  bị `BottomNav` che (các trang con `ChatWindow`/`FamilyChatWindow`/
  `DashboardPage` đã tự quản lý `overflow-y-auto` bên trong `flex-1`, không
  cần sửa gì thêm).
- Render `<BottomNav>` + `<BottomSheet><AccountSheet/></BottomSheet>` ở
  cuối, ngang hàng 2 modal hiện có (`HouseholdInfoModal`, `ProfileModal`).
- Thêm `viewport-fit=cover` vào meta viewport trong `frontend/index.html`
  để `env(safe-area-inset-bottom)` hoạt động trên iOS.

### 6. Autofocus ô nhập chat khi bấm nút "+"
Dùng `react-router` `location.state` (không dùng query param, không lưu
vào URL):
- **`ChatPage.tsx`**: đọc `location.state?.nonce`, dùng `useEffect` dọn
  state qua `navigate(location.pathname, { replace: true, state: {} })`,
  truyền `autoFocusNonce={focusNonce}` xuống `<ChatWindow>`.
- **`ChatWindow.tsx`**: thêm prop optional `autoFocusNonce?: number`,
  pass-through xuống `<ChatInput autoFocusNonce={autoFocusNonce} />`.
- **`ChatInput.tsx`** (props hiện tại: `onSend, onSendImage, disabled,
  placeholder`, input chưa có `ref`): thêm prop optional
  `autoFocusNonce?: number`, thêm `inputRef = useRef<HTMLInputElement>(null)`,
  gắn vào ô input,
  `useEffect(() => { if (autoFocusNonce) inputRef.current?.focus() },
  [autoFocusNonce])`. Thay đổi tối thiểu, không phá vỡ hành vi cũ vì prop
  optional.

### Danh sách file

**Tạo mới:**
- `frontend/src/components/layout/BottomNav.tsx`
- `frontend/src/components/layout/BottomNavIcons.tsx`
- `frontend/src/components/layout/AccountSheet.tsx`
- `frontend/src/components/ui/BottomSheet.tsx`

**Sửa:**
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/pages/ChatPage.tsx`
- `frontend/src/components/chat/ChatWindow.tsx`
- `frontend/src/components/chat/ChatInput.tsx`
- `frontend/index.html` (thêm `viewport-fit=cover`)

## Kiểm thử

1. **Mobile <400px** (DevTools iPhone SE): header mobile chỉ còn logo + tên
   hộ; BottomNav hiện đủ 5 mục, không tràn ngang, nút "+" nổi đúng vị trí;
   `ChatInput` không bị BottomNav che.
2. **Thiết bị có notch** (DevTools iPhone 14/15): BottomNav không bị home
   indicator đè lên.
3. **Desktop ≥1024px và biên 768px**: header y hệt hiện tại (3 nav link +
   avatar dropdown), không thấy BottomNav; kiểm tra đúng breakpoint chuyển
   đổi tại 767px/768px.
4. **Badge unread**: tạo tin nhắn gia đình chưa đọc, chấm đỏ hiện đúng trên
   cả BottomNav (mobile) và header (desktop) — dùng chung 1 query, không bị
   lệch dữ liệu.
5. **Nút "+"**: từ `/dashboard` hoặc `/family-chat`, bấm "+" → về `/chat` và
   ô nhập tự động focus; bấm "+" liên tiếp khi đã ở `/chat` vẫn phải focus
   lại.
6. **BottomSheet**: bấm "Cá nhân" → sheet trượt lên đúng tên/avatar; bấm ra
   overlay → trượt xuống & unmount sạch; bấm "Hồ sơ của tôi"/"Thông tin" →
   sheet đóng và modal tương ứng mở đúng.
7. **Đăng xuất từ sheet**: điều hướng về `/login`, token bị xóa, hành vi
   giống hệt nút đăng xuất desktop.
8. Không phá vỡ luồng cuộn/hiển thị hiện có của `ChatPage`, `FamilyChatPage`,
   `DashboardPage` (kiểm tra ảnh nền household trong ChatWindow vẫn hiện
   đúng, không bị icon/BottomNav che).
9. Chạy `cd frontend && npm run lint && npm run build` — không lỗi
   TypeScript/ESLint.
