# Redesign LoginPage theo style ảnh mẫu (blue gradient + stacked card)

> **Trạng thái:** Đã triển khai vào [LoginPage.tsx](../frontend/src/pages/LoginPage.tsx). Tài liệu này lưu lại bối cảnh và phạm vi thay đổi để tham khảo sau này.

## Context
Trang đăng nhập hiện tại (`frontend/src/pages/LoginPage.tsx`) đang dùng nền xám phẳng (`bg-gray-100`), card trắng đơn giản với viền/bo góc nhỏ, input viền xám mảnh, và tab pill để chuyển Đăng nhập/Đăng ký. Người dùng muốn thị giác hiện đại hơn, theo ảnh tham khảo: nền gradient xanh dương với khối bo tròn trang trí phía sau, thẻ trắng nổi bật (dạng "stacked card" — có một khối xanh lấp ló phía sau thẻ trắng), tiêu đề lớn "Sign in", input dạng nền xám phẳng bo tròn nhiều, ô mật khẩu có icon ẩn/hiện, nút submit bo tròn lớn.

Đã xác nhận với người dùng:
- **Không thêm** link "Quên mật khẩu?" (backend chưa hỗ trợ, tránh UI giả không hoạt động).
- **Không thêm** nút phụ kiểu "Sign in with other" (app không có SSO). Giữ nguyên cơ chế chuyển Đăng nhập/Đăng ký bằng tab pill hiện có, chỉ restyle cho hợp thẩm mỹ mới.

Đây là thay đổi thuần UI/frontend (Tailwind, không cần thư viện mới), không đụng tới backend hay logic `handleSubmit`/state hiện có.

## Phạm vi thay đổi
Chỉ sửa file: `frontend/src/pages/LoginPage.tsx`. Không cần sửa `tailwind.config.js` (dùng palette `blue-*` sẵn có, đã nhất quán với phần còn lại của app) và không cần asset mới.

### 1. Nền trang (wrapper ngoài cùng)
- Đổi từ `bg-gray-100` phẳng sang gradient xanh: `bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900`.
- Thêm `relative overflow-hidden` trên wrapper, và 2 khối blob trang trí (`absolute`, `rounded-full`, `blur-3xl`, màu `bg-blue-400/30` và `bg-blue-300/20`) đặt ở góc trên-trái và dưới-phải để tạo chiều sâu giống ảnh mẫu, không cần ảnh/asset mới.

### 2. Hiệu ứng "stacked card"
- Bọc card hiện tại trong 1 `div` `relative w-full max-w-sm`.
- Thêm 1 lớp "thẻ nền" phía sau: `absolute` lệch nhẹ (`-left-3 -top-3` hoặc tương tự), `rounded-3xl`, nền xanh bán trong suốt (`bg-blue-400/40`), cùng kích thước với thẻ chính — tạo cảm giác thẻ trắng nổi trên một thẻ xanh lấp ló, đúng như ảnh mẫu.
- Thẻ chính (trắng) đặt `relative` phía trên, bo góc lớn hơn hiện tại (`rounded-3xl`), tăng đổ bóng (`shadow-2xl`), giữ padding tương tự (`p-8`).

### 3. Tiêu đề & mô tả
- Tăng cỡ chữ tiêu đề `{appName}` lên `text-3xl font-bold` (hiện là `text-2xl`), giữ vị trí và text động (`appName`, `householdName` không đổi — vẫn lấy từ `useApp`).
- Giữ nguyên đoạn mô tả phụ bên dưới tiêu đề (login: "Đăng nhập để quản lý chi tiêu nhà {householdName}"; register: "Tạo tài khoản mới...") — chỉ chỉnh màu/khoảng cách cho hài hòa với thẻ mới, không đổi nội dung logic.

### 4. Tab chuyển Đăng nhập / Đăng ký
- Giữ nguyên hành vi (`switchMode`, state `mode`), chỉ restyle: bo tròn hơn (`rounded-full` thay vì `rounded-lg`) để đồng bộ với ngôn ngữ thiết kế bo tròn lớn của thẻ và nút mới.

### 5. Input Tên đăng nhập / Mật khẩu
- Đổi style input dùng chung (`inputClass`) từ dạng viền mảnh (`border border-gray-300`) sang dạng nền xám phẳng bo tròn lớn, giống ảnh mẫu: `w-full rounded-full bg-gray-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500` (bỏ viền, dùng ring khi focus).
- Riêng ô Mật khẩu: bọc trong `div relative`, thêm nút icon con mắt (ẩn/hiện mật khẩu) ở bên phải trong input — thêm state mới `showPassword`/`visible` và toggle `type={visible ? 'text' : 'password'}`. Áp dụng icon ẩn/hiện đơn giản bằng SVG inline (không cần cài thư viện icon), tái sử dụng cùng pattern cho ô "Xác nhận mật khẩu" ở chế độ đăng ký (component chung `PasswordField`).

### 6. Nút submit
- Đổi `rounded-lg` thành `rounded-full`, giữ nguyên `bg-blue-600 hover:bg-blue-700`, tăng `py-3` cho cân đối với input mới. Giữ nguyên text động (Đăng nhập/Đăng ký/Đang xử lý...) và `disabled` logic.

### 7. Các phần không thay đổi
- Không thêm "Quên mật khẩu?" và không thêm nút "Sign in with other" (theo lựa chọn của người dùng).
- Không đổi logic `handleSubmit`, `axiosErrorMessage`, gọi API `/auth/login` / `/auth/register`, và điều hướng sau đăng nhập.
- Không đổi `types/index.ts`, `stores/auth.ts`, `stores/app.ts`.

## Kiểm thử
1. Chạy `npm run dev` trong `frontend/` (proxy `/api` đã cấu hình sẵn tới backend port 8080; nếu backend binary không chạy được do thiếu source, vẫn có thể xem giao diện tĩnh của trang login mà không cần submit thành công).
2. Mở `http://localhost:5173/login` (hoặc port Vite in ra), kiểm tra:
   - Nền gradient + hiệu ứng blob + thẻ "stacked" hiển thị đúng, không bị tràn ngang (overflow) trên màn hình nhỏ.
   - Tiêu đề `{appName}` và mô tả household hiển thị đúng dữ liệu động (không hardcode).
   - Chuyển tab Đăng nhập/Đăng ký vẫn hoạt động, form Đăng ký hiện thêm ô xác nhận mật khẩu.
   - Icon ẩn/hiện mật khẩu hoạt động đúng (click đổi giữa `password`/`text`).
   - Responsive: kiểm tra ở độ rộng mobile (< 400px) thẻ không bị vỡ layout.
3. `npm run lint` (oxlint) và `npm run build` (tsc + vite build) trong `frontend/` để đảm bảo không có lỗi type/lint mới. Đã chạy và pass tại thời điểm triển khai.
