> **Trạng thái:** Đã code xong đúng theo scope (backend + frontend, mục
> Phạm vi thay đổi). Frontend: `npm run lint` và `npm run build` đã pass.
> Backend: **chưa build/test được** — máy dev này không có Go toolchain
> (đã ghi rõ trong Context). Cần người dùng tự `cd backend && go build
> ./... && go test ./... && go vet ./...` ở máy có Go (hoặc build lại qua
> Docker `docker compose build`) rồi kiểm tra bằng tay theo mục Kiểm thử
> trước khi coi là `Đã triển khai` hoàn tất.

# Menu "Thông tin" — chỉnh sửa tên nhà, hạn mức mặc định & câu khẩu hiệu

## Context
Nút `{username} ▾` ở header (`AppLayout.tsx`) hiện chỉ có 1 action là "Đăng
xuất". Người dùng muốn thêm action **"Thông tin"** mở ra chỗ xem/chỉnh:
- **Tên nhà** (household name) — hiện chỉ set 1 lần qua biến môi trường
  `HOUSEHOLD_NAME` lúc khởi động server, chưa có cách đổi qua UI.
- **Hạn mức mặc định** (default monthly budget) — hiện chỉ set qua biến môi
  trường `DEFAULT_BUDGET`, áp dụng chung mọi tháng chưa đặt hạn mức riêng
  (khác với hạn mức riêng từng tháng đã có sẵn ở `BudgetCard` trên Dashboard).
  Muốn chỉnh được ngay trong app, không cần sửa file `.env` + restart server.
- **Câu khẩu hiệu / lời động viên cho nhà** (household slogan) — tính năng
  hoàn toàn mới, chưa tồn tại dưới bất kỳ hình thức nào (không qua env, không
  có field cũ nào tương đương). Bất kỳ thành viên nào trong nhà cũng sửa/thêm
  được (cùng cơ chế "dữ liệu chung theo household" như hạn mức mặc định, tên
  nhà — không phải dữ liệu riêng từng user). Yêu cầu hiển thị **ở header,
  nổi bật** — không phải chỉ nằm im trong modal Thông tin.

Tính năng này đụng tới **cả backend lẫn frontend** — khác các plan trước chỉ
sửa frontend. Backend Go source đã có sẵn ở `backend/` (khác với vài tuần
trước khi source còn thiếu), nhưng **môi trường dev hiện tại không có Go
toolchain** (xem `.claude/skills/run/SKILL.md`) nên khi triển khai, phần Go
sẽ được viết theo đúng convention hiện có nhưng **không tự build/test được
bằng `go build`/`go test` ở đây** — cần người dùng tự build lại `bin/pf-server`
ở máy có Go, hoặc dùng Docker, trước khi verify tính năng chạy được thật.

## Phạm vi thay đổi

### Backend (Go)
1. **`backend/internal/models/models.go`** — thêm field nullable
   (`DefaultBudget`) và field slogan vào `Household`:
   ```go
   type Household struct {
       ID            int    `json:"id"`
       Name          string `json:"name"`
       CreatedAt     string `json:"created_at"`
       DefaultBudget *int64 `json:"default_budget,omitempty"` // nil = dùng DEFAULT_BUDGET env
       Slogan        string `json:"slogan,omitempty"`         // "" = chưa có khẩu hiệu
   }
   ```
   `Slogan` dùng `string` trần (không cần con trỏ như `DefaultBudget`) vì
   không có tình huống "0 hợp lệ nhưng khác nil" — chuỗi rỗng tự nhiên nghĩa
   là "chưa đặt". Dữ liệu cũ trong `data.json` không có key này vẫn parse ra
   `""` bình thường, không cần migrate.

2. **`backend/internal/store/store.go`** — thêm method mới, đặt ngay sau
   `FindHousehold`, theo đúng pattern khóa/mutate/`saveLocked()` như
   `SetBudget`:
   ```go
   func (s *Store) UpdateHousehold(id int, name string, defaultBudget *int64, slogan string) (*models.Household, error) {
       s.mu.Lock()
       defer s.mu.Unlock()
       for i := range s.data.Households {
           if s.data.Households[i].ID == id {
               s.data.Households[i].Name = name
               s.data.Households[i].DefaultBudget = defaultBudget
               s.data.Households[i].Slogan = slogan
               if err := s.saveLocked(); err != nil {
                   return nil, err
               }
               hh := s.data.Households[i]
               return &hh, nil
           }
       }
       return nil, errors.New("household not found")
   }
   ```

3. **File mới `backend/internal/handlers/household.go`** — theo đúng
   convention của `budget.go` (struct handler nhận `Store`, lỗi tiếng Việt,
   response `gin.H{"household": hh}`, dùng lại helper `currentHouseholdID(c, st)`
   đã có sẵn trong package):
   ```go
   type HouseholdHandler struct {
       Store  *store.Store
       Config *config.Config
   }

   func (h *HouseholdHandler) Get(c *gin.Context) {
       householdID, err := currentHouseholdID(c, h.Store)
       if err != nil { c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"}); return }
       hh, err := h.Store.FindHousehold(householdID)
       if err != nil { c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhà"}); return }
       c.JSON(http.StatusOK, gin.H{"household": hh})
   }

   type updateHouseholdRequest struct {
       Name          string `json:"name"`
       DefaultBudget *int64 `json:"default_budget"` // null/omit = xóa override, dùng lại DEFAULT_BUDGET hệ thống
       Slogan        string `json:"slogan"`          // "" = xóa khẩu hiệu
   }

   func (h *HouseholdHandler) Update(c *gin.Context) {
       var req updateHouseholdRequest
       if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
           c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"}); return
       }
       householdID, err := currentHouseholdID(c, h.Store)
       if err != nil { c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"}); return }
       hh, err := h.Store.UpdateHousehold(householdID, req.Name, req.DefaultBudget, req.Slogan)
       if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"}); return }
       c.JSON(http.StatusOK, gin.H{"household": hh})
   }
   ```
   Không giới hạn độ dài slogan ở backend (chỉ giới hạn nhẹ ở frontend qua
   `maxLength` cho input, xem phần Frontend) — không cần validate phức tạp,
   giống cách `Name` chỉ check rỗng. Không có khái niệm owner/role trong app
   này — mọi thành viên cùng nhà đều bình đẳng (giống cách `PUT /budgets`
   hiện cho phép bất kỳ ai trong nhà sửa hạn mức chung), nên endpoint này chỉ
   cần xác thực đăng nhập, không cần check quyền thêm.

4. **`backend/internal/handlers/handlers.go`** — đăng ký route trong nhóm
   `protected` (cần JWT):
   ```go
   household := &HouseholdHandler{Store: s, Config: cfg}
   protected.GET("/household", household.Get)
   protected.PUT("/household", household.Update)
   ```

5. **`backend/internal/handlers/dashboard.go`** — trong `DashboardHandler.Month`,
   trước khi gọi `budgetBlock`, resolve override của nhà:
   ```go
   effectiveDefault := h.Config.DefaultBudget
   if hh, err := h.Store.FindHousehold(householdID); err == nil && hh.DefaultBudget != nil {
       effectiveDefault = *hh.DefaultBudget
   }
   // ... "budget": budgetBlock(h.Store, householdID, monthKey, st.Total, effectiveDefault),
   ```
   Toàn bộ logic còn lại của `budgetBlock` (hạn mức riêng theo tháng vẫn ưu
   tiên cao nhất, `<=0` vẫn tắt hạn mức) giữ nguyên không đổi.

### Frontend (React/TS)
1. **`frontend/src/types/index.ts`** — thêm field vào `Household`:
   ```ts
   export interface Household {
     id: number
     name: string
     created_at: string
     default_budget?: number | null
     slogan?: string
   }
   ```

2. **File mới `frontend/src/api/household.ts`** (theo đúng pattern
   `api/budgets.ts`):
   ```ts
   import { api } from '../lib/api'
   import type { Household } from '../types'

   export async function fetchHousehold(): Promise<Household> {
     const { data } = await api.get<{ household: Household }>('/household')
     return data.household
   }

   export async function updateHousehold(
     name: string,
     defaultBudget: number | null,
     slogan: string,
   ): Promise<Household> {
     const { data } = await api.put<{ household: Household }>('/household', {
       name,
       default_budget: defaultBudget,
       slogan,
     })
     return data.household
   }
   ```

3. **File mới `frontend/src/components/layout/HouseholdInfoModal.tsx`** —
   tái sử dụng `components/ui/Modal.tsx` (đã tổng quát hóa với `children`),
   theo đúng pattern state của `BudgetCard.tsx` (`open`/`saving`/`error` +
   thêm `loading` vì cần gọi API lấy dữ liệu hiện tại lúc mở modal):
   - Props: `{ open: boolean; onClose: () => void }`.
   - Khi `open` chuyển sang `true`: gọi `fetchHousehold()`, đổ vào state
     `name`, `defaultBudgetInput` (string, rỗng nếu `default_budget` null),
     và **`slogan`** (string, rỗng nếu chưa có).
   - Form 3 field: "Tên nhà" (text, required), "Hạn mức mặc định" (numeric,
     placeholder "Để trống = dùng mặc định hệ thống", cùng cách parse
     số tiền như `BudgetCard` — strip ký tự không phải số), và **"Câu khẩu
     hiệu / lời động viên"** (text input hoặc `textarea` 1-2 dòng, không
     required, `maxLength={100}` để tránh phá layout header khi hiển thị dài,
     placeholder gợi ý ví dụ: "VD: Tiết kiệm hôm nay, an nhiên ngày mai!").
   - Save: gọi `updateHousehold(name, amount || null, slogan.trim())`,
     thành công thì:
     - Cập nhật `useAuth` để header đổi tên ngay không cần reload (xem mục 4).
     - `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` để
       `BudgetCard` phản ánh hạn mức mặc định mới ngay (nếu tháng đang xem
       chưa có hạn mức riêng).
     - **`queryClient.invalidateQueries({ queryKey: ['household'] })`** để
       header (mục 5) refetch và hiển thị slogan mới ngay, không cần reload.
     - Đóng modal.
   - Lỗi: hiện message tiếng Việt trong modal, theo đúng pattern
     `BudgetCard`'s `catch { setError(...) }`.
   - Dùng `<Modal open title="Thông tin nhà" onConfirm={save} onCancel={onClose} confirmVariant="primary" confirmLabel={saving ? 'Đang lưu...' : 'Lưu'} confirmDisabled={saving || loading}>` bọc 3 field trên.

4. **`frontend/src/stores/auth.ts`** — thêm setter nhỏ để cập nhật
   `householdName` sau khi đổi tên mà không cần đăng nhập lại:
   ```ts
   setHouseholdName: (name: string) => void
   // ...
   setHouseholdName: (name) => set({ householdName: name }),
   ```
   (`AppLayout.tsx` đọc `householdName` từ `useAuth`, không phải `useApp`, nên
   phải cập nhật đúng store này để header đổi ngay lập tức.) Slogan **không**
   cần thêm vào `useAuth` — dùng react-query cache riêng ở mục 5 thay vì đi
   qua auth store, vì slogan chỉ cần hiển thị (không ảnh hưởng logic đăng
   nhập/điều hướng như `householdName`), và tránh phải sửa response
   `/auth/login`/`/auth/register` (vốn không đụng tới trong plan này).

5. **`frontend/src/components/layout/AppLayout.tsx`** — thêm state
   `infoOpen` và 1 item "Thông tin" trong dropdown, phía trên "Đăng xuất";
   **thêm 1 `useQuery` để lấy + hiển thị slogan nổi bật trong header**:
   ```tsx
   const [infoOpen, setInfoOpen] = useState(false)
   const { data: household } = useQuery({
     queryKey: ['household'],
     queryFn: fetchHousehold,
     staleTime: Infinity, // chỉ refetch khi bị invalidate từ HouseholdInfoModal
   })
   // ...
   {household?.slogan && (
     <p className="mt-1 inline-block rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold italic text-white">
       "{household.slogan}"
     </p>
   )}
   // đặt ngay dưới đoạn "Nhà {householdName}" hiện có, phía trên <nav>
   // ...
   <button onClick={() => { setMenuOpen(false); setInfoOpen(true) }}
           className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
     Thông tin
   </button>
   {/* giữ nguyên link Đăng xuất bên dưới */}
   // ...
   <HouseholdInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
   ```
   Dùng `useQuery` (không phải đọc trực tiếp từ `useAuth`) vì `household_name`
   trả về từ login/register hiện tại **không** kèm slogan — phải gọi
   `GET /household` riêng. Class `bg-white/15 ... italic` để nổi bật rõ trên
   nền gradient xanh của header (đã đổi màu ở lần chỉnh header trước), khác
   hẳn dòng "Nhà {householdName}" (`text-blue-100`, không có nền) ngay phía
   trên — đúng yêu cầu "nổi bật lên" thay vì chỉ thêm 1 dòng chữ chìm.

## Kiểm thử (sau khi code xong)
1. **Backend** — theo `CLAUDE.md`: `cd backend && go test ./... && go vet ./...`.
   ⚠️ Môi trường máy dev này hiện **không có Go toolchain** để tự chạy bước
   này (xem `.claude/skills/run/SKILL.md`) — cần build/test ở máy có Go, hoặc
   qua Docker, rồi copy `bin/pf-server` mới vào để chạy thử.
2. **Frontend:** `cd frontend && npm run lint && npm run build`.
3. Sau khi có `bin/pf-server` mới build từ code đã sửa, kiểm tra bằng tay:
   - Đăng nhập, mở menu `hiendc ▾` → thấy "Thông tin" phía trên "Đăng xuất".
   - Mở "Thông tin": hiện đúng tên nhà + hạn mức mặc định hiện tại (rỗng nếu
     chưa từng đặt override) + **khẩu hiệu hiện tại (rỗng nếu chưa có)**.
   - Đổi tên nhà → Lưu → header đổi tên ngay, không cần F5.
   - Đặt hạn mức mặc định mới → sang Dashboard, tháng chưa có hạn mức riêng
     → `BudgetCard` hiện đúng số mới (badge "mặc định" vẫn hiện).
   - Xóa trắng ô hạn mức mặc định → Lưu → hạn mức mặc định quay lại dùng giá
     trị `DEFAULT_BUDGET` từ `.env`.
   - **Nhập khẩu hiệu mới (VD: "Chi tiêu thông minh, gia đình hạnh phúc!")
     → Lưu → header hiện ngay dòng khẩu hiệu dạng pill nổi bật, không cần F5,
     không vỡ layout header ở màn hình hẹp (< 400px, khẩu hiệu dài tối đa
     100 ký tự vẫn phải xuống dòng gọn, không tràn ngang).**
   - **Xóa trắng ô khẩu hiệu → Lưu → dòng khẩu hiệu biến mất khỏi header
     (không hiện pill rỗng).**
   - Test với 2 tài khoản cùng nhà (`hiendc`/`trangdt`) — đổi tên/khẩu hiệu từ
     tài khoản này, tài khoản kia refresh cũng thấy thay đổi mới (dữ liệu
     dùng chung theo `household_id`, không phải per-user).
