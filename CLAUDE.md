# CLAUDE.md

Quy tắc làm việc cho Claude Code (và các AI agent khác) khi code trong dự án
**Personal Finance Chat** — ứng dụng quản lý chi tiêu qua giao diện chat
(xem `README.md` để biết tổng quan tính năng).

## 1. Ngôn ngữ

- **Tiếng Việt là ngôn ngữ chính** cho: giao tiếp với người dùng, tài liệu
  (`docs/*.md`, `README.md`), file plan, commit message, và mọi text hiển thị
  cho người dùng cuối (UI, thông báo lỗi, bot reply).
- Tên biến/hàm/class/route/file vẫn đặt bằng **tiếng Anh** theo quy ước code
  thông thường — không dịch tên kỹ thuật sang tiếng Việt.
- Comment trong code: chỉ viết khi cần giải thích lý do (why) không rõ ràng
  từ code, và viết bằng tiếng Việt.

## 2. Kiến trúc

- **Backend:** Go + Gin — `backend/` (JSON store, không cần DB ngoài).
- **Frontend:** React + Vite + TypeScript + Tailwind CSS — `frontend/src/`.
- Đây là **một web app duy nhất, responsive** — hiện chưa có codebase mobile
  native (React Native/Flutter...) riêng. "Mobile" trong dự án này nghĩa là
  **màn hình hẹp trên trình duyệt** (điện thoại/tablet truy cập qua web),
  không phải app native. Nếu sau này có dự án mobile native riêng, cập nhật
  lại mục này.

## 3. Style nhất quán trên mọi màn hình

- Trước khi tạo màn hình/component mới, xem lại các trang hiện có
  (`frontend/src/pages/`, `frontend/src/components/ui/`) để tái sử dụng
  pattern đã có thay vì tự sáng tạo style mới.
- Ngôn ngữ thiết kế hiện tại của app (tham khảo `docs/login-redesign-plan.md`
  để hiểu bối cảnh): nền gradient xanh (`from-blue-600 via-blue-700
  to-blue-900`), card bo góc lớn (`rounded-3xl`), input/button bo tròn nhiều
  (`rounded-full`), dùng `focus:ring-2 focus:ring-blue-500` thay vì viền
  input mảnh, đổ bóng `shadow-2xl` cho card nổi.
- Ưu tiên tái sử dụng component dùng chung (`components/ui/`) và class
  Tailwind nhất quán thay vì lặp lại style rời rạc ở từng trang. Nếu một
  style mới xuất hiện ở ≥ 2 nơi, tách thành component chung.
- Mọi màn hình mới phải khớp với ngôn ngữ thiết kế hiện có, trừ khi người
  dùng yêu cầu redesign rõ ràng.

## 4. Responsive — website & mobile

- Đây là 1 codebase React duy nhất phục vụ cả desktop và mobile qua trình
  duyệt — mọi UI phải dùng được tốt trên **cả 2 loại màn hình**, dùng
  breakpoint Tailwind (`sm:`, `md:`, `lg:`...) để tùy chỉnh layout, không
  giả định chỉ một loại kích thước màn hình.
- Khi implement hoặc review UI, luôn kiểm tra ở cả 2 kích thước: desktop
  (≥ 1024px) và mobile (< 400px) — đảm bảo không vỡ layout, không tràn
  ngang (overflow-x) ở kích thước hẹp.

## 5. Quy trình làm việc — Plan trước, verify sau

1. **Trước khi code** bất kỳ tính năng/thay đổi nào (trừ sửa lỗi nhỏ 1 dòng
   hoặc thay đổi hiển nhiên không cần bàn), tạo **file plan** trong `docs/`
   (tên `<ten-tinh-nang>-plan.md`, xem `docs/login-redesign-plan.md` làm
   mẫu) gồm: Context, Phạm vi thay đổi, các bước cụ thể, phần Kiểm thử.
2. File plan bắt đầu bằng dòng trạng thái, ví dụ:
   ```
   > **Trạng thái:** Đang triển khai
   ```
3. **Sau khi code xong**, trước khi báo thành công với người dùng:
   - **Verify lại** theo đúng checklist/kiểm thử đã ghi trong plan (chạy
     lint/build/test liên quan, hoặc tự kiểm tra UI bằng tay nếu cần).
   - **Cập nhật trạng thái trong file plan** — đổi dòng trạng thái thành
     `Đã triển khai` (hoặc `Hoàn thành`), ghi chú ngắn nếu có sai khác so
     với kế hoạch ban đầu.
4. Không báo "hoàn thành"/"đã xong" với người dùng nếu chưa verify và chưa
   cập nhật trạng thái plan.

## 6. Kiểm thử liên quan

- Backend: `cd backend && go test ./... && go vet ./...`
- Frontend: `cd frontend && npm run lint && npm run build`

## 7. Git & xóa file — luôn xin phép trước

- **Không tự ý chạy lệnh git** (commit, push, force-push, merge, reset,
  checkout đổi nhánh, rm, clean...) khi người dùng chưa cho phép rõ ràng
  trong chính yêu cầu đó. Đã được đồng ý một lần không có nghĩa là được phép
  tự lặp lại cho lần/thay đổi khác — luôn hỏi lại trước mỗi thao tác git.
  Đặc biệt cẩn trọng với các lệnh có thể **mất dữ liệu hoặc ghi đè lịch sử**
  (`push --force`, `reset --hard`, `checkout`/`clean` khi có thay đổi chưa
  commit).
- **Xóa file** (bất kỳ file nào — kể cả file có vẻ trùng lặp, file build cũ,
  file "chắc là không cần nữa"): phải **hỏi xin phép người dùng trước**, nêu
  rõ sẽ xóa file nào và lý do. Không tự động xóa dù thấy hợp lý.
- Lý do: tránh mất dữ liệu quan trọng (`data/data.json`, lịch sử git...) do
  thao tác tự động ngoài ý muốn người dùng.
