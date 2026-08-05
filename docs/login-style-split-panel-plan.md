# Redesign LoginPage theo style ảnh mẫu (split-panel: trái xanh trang trí + phải form trắng)

> **Trạng thái:** Đã triển khai vào [LoginPage.tsx](../frontend/src/pages/LoginPage.tsx),
> người dùng đã xem trực tiếp trên trình duyệt và xác nhận OK.
>
> Sai khác so với plan ban đầu (theo phản hồi trực tiếp của người dùng khi
> duyệt UI, không đổi logic/API):
> - Bỏ hẳn label cho cả 3 input (Tên đăng nhập, Mật khẩu, Xác nhận mật khẩu),
>   chỉ dùng placeholder cùng tên — thay vì giữ label như mục 4 nêu ban đầu.
> - Nút hiện/ẩn mật khẩu đổi từ text "Hiện/Ẩn" sang icon con mắt (mở/gạch chéo).
> - Heading "Đăng nhập"/"Đăng ký" (mục 3) căn giữa (`text-center`).
> - Khối branding rút gọn trên mobile (mục 3): căn giữa, thêm nền gradient xanh
>   (đồng bộ panel trái desktop) thay vì nền trắng/chữ xám như plan ban đầu;
>   tiêu đề `{appName}` trên mobile dùng `text-blue-700` khi chưa có nền, sau
>   đó đổi `text-white` khi thêm nền xanh.
> - Chữ "Welcome" (mục 2) đổi thành "Chào mừng đến với".
> - Đoạn mô tả household (mục 2 & 3) in nghiêng (`italic`) ở cả desktop và mobile.
> - Trên desktop đoạn mô tả hiển thị 1 dòng (ẩn `<br>` qua `md:hidden`), mobile
>   vẫn giữ xuống dòng như plan ban đầu.

## Context

Trang đăng nhập hiện tại (`frontend/src/pages/LoginPage.tsx`) đang ở dạng
1 card trắng căn giữa trên nền xám phẳng (`bg-gray-100`), input viền mảnh
(`border border-gray-300`, `rounded-lg`), tab pill Đăng nhập/Đăng ký ở giữa
card, nút submit `rounded-lg` xanh.

> Ghi chú: trước đây đã có 1 lần redesign khác (`docs/login-redesign-plan.md`
> — style "stacked card" nền gradient) được triển khai, nhưng do quá trình
> merge nhánh `final` vào `master` gần đây, code `LoginPage.tsx` hiện tại đã
> quay lại bản gốc (không còn giữ style đó). Plan này làm lại từ code hiện
> tại, theo 1 ảnh tham khảo mới, không phụ thuộc vào bản đã mất.

Người dùng cung cấp ảnh tham khảo mới: layout 2 cột —
- **Cột trái**: nền gradient xanh dương đậm, có các khối tròn trang trí
  chồng lên nhau (blob), chữ "WELCOME" + headline lớn + đoạn mô tả ngắn.
- **Cột phải**: nền trắng, tiêu đề "Sign in", input có icon bên trái (user
  icon cho username), ô mật khẩu có chữ "SHOW" để hiện/ẩn, checkbox "Remember
  me" + link "Forgot Password?", nút "Sing in" (xanh đậm, bo góc vừa) và nút
  "Sing in with other" (viền), dòng "Don't have an account? Sign Up" cuối.

**Yêu cầu của người dùng: chỉ tham khảo style/layout, giữ nguyên toàn bộ nội
dung và logic hiện có.** Áp dụng nguyên tắc này, những phần sau trong ảnh mẫu
**sẽ KHÔNG đưa vào** vì thêm nội dung/tính năng mới không tồn tại hiện tại
(giống quyết định đã có ở lần redesign trước, xem `docs/login-redesign-plan.md`
mục 7):
- Không thêm "Remember me" (backend không phân biệt phiên đăng nhập kiểu này).
- Không thêm "Forgot Password?" (backend chưa hỗ trợ quên mật khẩu).
- Không thêm nút "Sign in with other" (app không có SSO).
- Không thêm dòng link "Don't have an account? Sign Up" riêng — app đã có
  cơ chế chuyển Đăng nhập/Đăng ký bằng tab pill, giữ nguyên cơ chế này thay
  vì thêm 1 link trùng chức năng.

Đây là thay đổi thuần UI/frontend (Tailwind, không cần thư viện/asset mới),
không đụng backend hay logic `handleSubmit`, state, gọi API.

## Phạm vi thay đổi

Chỉ sửa file: `frontend/src/pages/LoginPage.tsx`.

### 1. Layout tổng thể — 2 cột trên desktop, 1 cột trên mobile

- Container ngoài: `min-h-screen flex items-center justify-center bg-gray-50 p-4`.
- Khối card chính: `flex w-full max-w-4xl overflow-hidden rounded-3xl shadow-2xl`,
  bên trong chia 2 phần `md:w-1/2` mỗi bên.
- **Panel trái chỉ hiện ở desktop** (`hidden md:flex md:w-1/2 ...`) — trên
  mobile (< 768px) ẩn hẳn panel trang trí, chỉ hiện panel form (chiếm full
  width) để tránh vỡ layout/tràn ngang ở màn hình hẹp, đúng nguyên tắc
  responsive ở `CLAUDE.md` mục 4.
- Panel phải luôn full width trên mobile, `md:w-1/2` trên desktop.

### 2. Panel trái (trang trí + branding) — desktop only

- Nền: `bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900`,
  `relative overflow-hidden`, `text-white`, `p-10 flex flex-col justify-center`.
- Thêm 2-3 khối blob trang trí chồng nhau (`absolute rounded-full`, các màu
  bán trong suốt `bg-blue-400/30`, `bg-blue-300/20`, `bg-white/10`, kích
  thước khác nhau, đặt lệch góc dưới-trái và trên-phải) — thuần CSS, không
  cần ảnh, giống kỹ thuật blob đã dùng ở plan trước.
- Nội dung (tái sử dụng nguyên văn dữ liệu/text đang có, chỉ đổi vị trí +
  cỡ chữ):
  - Headline lớn: `{appName}` (`text-3xl md:text-4xl font-bold`) — thay cho
    vị trí tiêu đề hiện tại đang đặt giữa card.
  - Đoạn mô tả động theo `mode` (y nguyên nội dung hiện tại, không đổi chữ):
    login → "Đăng nhập để quản lý chi tiêu nhà {householdName}"; register →
    "Tạo tài khoản mới — dữ liệu dùng chung cho cả nhà". Đổi màu sang
    `text-blue-100` cho hợp nền tối.

### 3. Panel phải (form) — hiện ở cả desktop & mobile

- Nền trắng: `bg-white p-8 sm:p-10 flex flex-col justify-center`.
- Trên **mobile**: vì panel trái bị ẩn, hiển thị lại `{appName}` +  mô tả
  ngắn gọn phía trên form (thu nhỏ, `md:hidden`) để không mất thông tin
  branding — vẫn nguyên nội dung, chỉ hiện có điều kiện theo breakpoint.
- Tiêu đề panel phải: dùng chính label mode hiện có (`Đăng nhập` / `Đăng ký`)
  làm heading lớn (`text-2xl font-bold`) phía trên form, thay cho việc chỉ
  hiển thị trong tab — **không đổi chữ**, chỉ tái sử dụng text đã có sẵn ở
  tab để làm heading, tab pill vẫn giữ nguyên bên dưới heading để chuyển
  Đăng nhập/Đăng ký (không đổi cơ chế `switchMode`).

### 4. Input Tên đăng nhập / Mật khẩu — thêm icon, giữ nguyên hành vi

- Đổi `inputClass` dùng chung sang dạng có khoảng trống bên trái cho icon:
  `w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3
  focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100`.
- Bọc mỗi input trong `div relative`, thêm icon SVG inline (user icon cho
  Tên đăng nhập) đặt `absolute left-3 top-1/2 -translate-y-1/2 text-gray-400`
  — không cần cài thư viện icon mới.
- Ô Mật khẩu: thêm nút text "Hiện"/"Ẩn" (theo tinh thần "SHOW" trong ảnh mẫu,
  dịch tiếng Việt để nhất quán ngôn ngữ UI hiện tại) ở `absolute right-3`,
  toggle state `showPassword` mới, đổi `type={showPassword ? 'text' :
  'password'}`. Áp dụng cùng pattern cho ô "Xác nhận mật khẩu" ở chế độ đăng
  ký. **Đây là 1 hành vi tương tác nhỏ được thêm mới** (trước đây từng có ở
  lần redesign cũ đã mất do merge) — nêu rõ ở đây để người dùng xác nhận khi
  duyệt plan; nếu muốn giữ tuyệt đối không thêm gì ngoài CSS thuần, có thể bỏ
  phần này và giữ input password thường.

### 5. Tab chuyển Đăng nhập / Đăng ký

- Giữ nguyên hành vi (`switchMode`, state `mode`), restyle nhẹ cho hợp tông
  màu mới: `rounded-full bg-gray-100 p-1`, tab active `bg-white text-blue-700
  shadow-sm` (giữ nguyên như hiện tại, không đổi).

### 6. Nút submit

- Đổi `rounded-lg` thành `rounded-xl` (bo vừa phải giống ảnh mẫu, không bo
  tròn hết cỡ `rounded-full` như lần redesign trước), giữ nguyên
  `bg-blue-600 hover:bg-blue-700`, `w-full`, tăng `py-2.5`. Giữ nguyên text
  động (Đăng nhập/Đăng ký/Đang xử lý...) và `disabled` logic.

### 7. Các phần không thay đổi

- Không thêm "Remember me", "Forgot Password?", nút "Sign in with other",
  link "Don't have an account?" riêng (lý do nêu ở mục Context).
- Không đổi logic `handleSubmit`, `axiosErrorMessage`, gọi API
  `/auth/login` / `/auth/register`, điều hướng sau đăng nhập.
- Không đổi `types/index.ts`, `stores/auth.ts`, `stores/app.ts`.
- Không thêm asset/ảnh mới, không cài thư viện icon (dùng SVG inline).

## Kiểm thử

1. `cd frontend && npm run dev`, mở `http://localhost:5173/login`.
2. Desktop (≥ 768px): thấy đủ 2 cột — trái gradient + blob + headline/mô tả
   đúng dữ liệu động; phải form trắng có icon input, toggle hiện/ẩn mật khẩu
   hoạt động đúng.
3. Mobile (giả lập < 400px hoặc thu nhỏ cửa sổ trình duyệt): panel trái ẩn
   hẳn, chỉ còn panel form full width, không tràn ngang, vẫn thấy branding
   rút gọn phía trên form.
4. Chuyển tab Đăng nhập ⇄ Đăng ký: mô tả bên panel trái (desktop) / trên
   form (mobile) đổi đúng nội dung theo mode; form Đăng ký hiện thêm ô xác
   nhận mật khẩu, toggle hiện/ẩn hoạt động cho cả 2 ô mật khẩu.
5. Submit sai/đúng vẫn hiển thị lỗi/điều hướng như cũ (không đổi logic).
6. `npm run lint` (oxlint) và `npm run build` (tsc + vite build) — không có
   lỗi type/lint mới.

Sau khi triển khai xong và verify đủ các bước trên, cập nhật dòng
**Trạng thái** ở đầu file này thành `Đã triển khai`.
