> **Trạng thái:** Đã triển khai — build frontend (lint/build) và build Docker
> (compile Go) đều pass, đã test API `PUT /api/household` với `primary_color`
> hợp lệ/không hợp lệ. **Lưu ý:** không có Go toolchain trong môi trường này
> nên chưa chạy được `go test ./... && go vet ./...` cục bộ — cần người dùng
> tự chạy 2 lệnh này ở máy có Go, hoặc coi việc Docker build (compile) thành
> công là xác nhận một phần.

# Màu chủ đạo tùy chỉnh theo từng nhà

## Context

Toàn bộ giao diện hiện đang hard-code màu xanh Tailwind (`blue-50` →
`blue-900`, chủ yếu `blue-600` #2563EB) ở khắp nơi: header, nút chính, bottom
nav, bong bóng chat, focus ring, badge... Người dùng muốn chủ nhà tự chọn
màu chủ đạo riêng cho nhà mình trong màn "Thông tin nhà", thay vì bị cố định
một màu xanh.

## Phạm vi thay đổi

- **Áp dụng toàn app** sau khi đăng nhập (mọi màn trong `AppLayout`: header,
  bottom nav, Chat, Trò chuyện gia đình, Thống kê, các modal/bottom sheet).
  Đây là gần như toàn bộ trải nghiệm thực tế của người dùng.
- **Ngoại lệ duy nhất: trang `/login`** — giữ nguyên màu xanh mặc định, vì
  trước khi đăng nhập hệ thống chưa biết là nhà nào (không có ngữ cảnh
  household) nên không có màu để áp — không phải giới hạn kỹ thuật cố ý bỏ
  qua mà là do bản chất luồng auth.
- **Cách chọn màu**: `<input type="color">` (bộ chọn màu gốc trình duyệt,
  không thêm thư viện) + ô nhập mã hex để gõ tay, có ô xem trước (swatch)
  ngay trong modal "Thông tin nhà" trước khi lưu.
- **Mặc định**: chưa chọn màu (`primary_color` rỗng) → dùng đúng
  `#2563EB` (giá trị hex của `blue-600` hiện tại) để không đổi giao diện
  của các nhà chưa cấu hình.

## Cơ chế kỹ thuật

1. **Sinh bảng màu 10 sắc độ (50–900) từ 1 mã hex** — viết hàm thuần
   `hexToShades(hex)` trong file mới `frontend/src/lib/theme.ts`: coi màu
   người dùng chọn là mốc "600" (giữ nguyên hue/saturation, đổi lightness
   theo các mức delta cố định so với lightness gốc, ví dụ +45% cho 50,
   +38% cho 100, ... -22% cho 900, có clamp 4–97%). Không cần thư viện màu
   ngoài — chỉ cần hex↔HSL bằng công thức toán học đơn giản.
2. **Áp dụng qua CSS custom property** — trong `AppLayout.tsx`, một
   `useEffect`/tính toán khi `household?.primary_color` (hoặc mặc định)
   thay đổi, set 10 biến `--primary-50` … `--primary-900` bằng inline
   `style` trên `<div>` gốc của layout. Do `Modal`/`BottomSheet` không dùng
   React portal (render tại chỗ trong cây DOM, không đẩy ra `document.body`),
   toàn bộ modal/sheet con vẫn nằm trong cây DOM này nên tự động thừa
   hưởng biến CSS — không cần Context hay props riêng.
3. **Thay class Tailwind** — đổi mọi `bg-blue-600`, `text-blue-700`,
   `ring-blue-100`, `from-blue-500 to-blue-700`, `focus:ring-blue-100`...
   thành giá trị tùy ý tham chiếu biến CSS, ví dụ `bg-[var(--primary-600)]`,
   `focus:ring-[var(--primary-100)]`. Áp dụng cùng một khuôn mẫu
   (blue-NNN → `[var(--primary-NNN)]`, giữ nguyên modifier `hover:`/
   `focus:`/`from-`/`to-`/`via-`/`ring-`/`border-`) cho toàn bộ ~15 file
   đang dùng màu xanh, đại diện: `AppLayout.tsx`, `BottomNav.tsx`,
   `ChatInput.tsx`, `MessageBubble.tsx`, `BudgetCard.tsx`, `Modal.tsx`,
   `Avatar.tsx`, `ProfileModal.tsx`, `HouseholdInfoModal.tsx`,
   `TransactionList.tsx`, `PeriodSelector.tsx`, `DashboardPage.tsx`,
   `FamilyMessageBubble.tsx`. **Không đổi** `frontend/src/pages/LoginPage.tsx`
   (ngoại lệ đã nêu ở trên) và không đổi các màu `gray-*`/`red-*` (trung
   tính/cảnh báo, không thuộc "màu chủ đạo").

## Các bước cụ thể

### Backend
1. `backend/internal/models/models.go`: thêm field
   `PrimaryColor string \`json:"primary_color,omitempty"\`` vào `Household`.
2. `backend/internal/store/store.go`: thêm tham số `primaryColor string` vào
   `UpdateHousehold(...)`, gán và lưu như các field khác.
3. `backend/internal/handlers/household.go`:
   - Thêm `primary_color` vào `householdJSON()`.
   - Thêm `PrimaryColor string \`json:"primary_color"\`` vào
     `updateHouseholdRequest`, validate bằng regex `^#[0-9a-fA-F]{6}$`
     (cho phép rỗng = xóa/dùng mặc định), trả lỗi 400 "Mã màu không hợp lệ"
     nếu sai định dạng. Truyền xuống `Store.UpdateHousehold`.

### Frontend — tiện ích theme
4. Tạo `frontend/src/lib/theme.ts`: export `DEFAULT_PRIMARY_COLOR =
   '#2563EB'` và hàm `hexToShades(hex: string): Record<'50'|'100'|...|'900', string>`.
5. `frontend/src/types.ts` (hoặc nơi định nghĩa `Household`): thêm
   `primary_color?: string`.
6. `frontend/src/api/household.ts`: `updateHousehold` thêm tham số
   `primaryColor: string` vào body request.

### Frontend — áp dụng theme
7. `AppLayout.tsx`: tính `shades = hexToShades(household?.primary_color ||
   DEFAULT_PRIMARY_COLOR)`, set làm CSS custom property qua `style` trên
   `<div>` gốc (dùng `as React.CSSProperties` để TypeScript chấp nhận key
   tùy ý).
8. Quét và thay class theo khuôn mẫu ở mục "Cơ chế kỹ thuật" bước 3, trên
   toàn bộ file liệt kê ở trên.

### Frontend — UI chọn màu trong `HouseholdInfoModal.tsx`
9. Thêm state `colorHex` (khởi tạo từ `hh.primary_color || DEFAULT_PRIMARY_COLOR`
   khi mở modal, theo đúng pattern các field khác trong file này).
10. Thêm 1 khối UI mới (đặt sau field "Câu khẩu hiệu"): label "Màu chủ đạo",
    `<input type="color">` (đồng bộ 2 chiều với ô hex) + `<input type="text">`
    nhập hex tay + 1 swatch tròn preview cạnh đó dùng `style={{ background:
    colorHex }}` (preview cục bộ trong modal, không đổi theme cả app cho
    tới khi bấm Lưu).
11. `save()` truyền `colorHex` vào `updateHousehold(...)`.

## Kiểm thử

1. Mở "Thông tin nhà", đổi màu chủ đạo (thử cả bộ chọn màu và gõ hex tay),
   bấm Lưu → toàn bộ header, bottom nav active, nút chính, bong bóng chat
   của mình đổi sang màu mới ngay (React Query invalidate `['household']`
   đã có sẵn trong `HouseholdInfoModal`).
2. Nhập hex sai định dạng ở ô text → hiện lỗi, không cho lưu (validate cả
   client lẫn server).
3. Xóa trắng để dùng lại mặc định → giao diện quay về đúng xanh `#2563EB`
   như trước khi có tính năng này.
4. Trang `/login` (chưa đăng nhập) vẫn giữ nguyên màu xanh mặc định, không
   đổi theo màu đã chọn.
5. Kiểm tra không sót chỗ nào còn hard-code `blue-*` sau khi đổi (trừ
   `LoginPage.tsx`): `grep -rn "blue-[0-9]" frontend/src` chỉ còn ra kết quả
   trong `LoginPage.tsx`.
6. Test cả 2 kích thước mobile (<400px) và desktop (≥1024px), đảm bảo màu
   mới áp dụng đúng ở cả 2 (bottom nav mobile-only, header desktop).
7. `cd backend && go test ./... && go vet ./...`
8. `cd frontend && npm run lint && npm run build`
9. Build lại và deploy container Docker `pf-server` (`docker compose up -d
   --build pf-server`), verify qua `curl` như các lần trước trong phiên
   này, kiểm tra thực tế trên điện thoại.
