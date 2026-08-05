> **Trạng thái:** Đã code xong đúng scope (backend + frontend). Frontend:
> `npm run lint` + `npm run build` pass, và đã build thật + xác nhận server
> đang chạy phục vụ đúng bản build mới (hash file khớp).
>
> **Backend: đã thử build qua skill `run`, xác nhận không build được** — máy
> này không có Go toolchain (Windows lẫn WSL Ubuntu) và Docker Desktop engine
> không chạy. `curl /api/me` vẫn trả 404 vì server đang chạy là binary
> `bin/pf-server` cũ (build trước khi có route `/me`, `/me/avatar`). Cần bạn
> tự build lại ở máy có Go (`cd backend && go build -o ../bin/pf-server
> ./cmd/server`) hoặc qua Docker rồi **xin phép restart** server (theo đúng
> quy tắc của skill `run` — server có thể đang phục vụ người dùng thật)
> trước khi tính năng hồ sơ/avatar hoạt động thật. Đổi ở đây có 1 điểm khác
> biệt so với 2 lần trước: đã **xác nhận chắc chắn** (không phải suy đoán)
> là không build được, nhờ skill `run` mới thêm.
>
> **Header đã đổi khác 1 chi tiết so với plan gốc** (theo phản hồi trực tiếp
> giữa lúc code): chỉ hiện avatar (không kèm text tên) — tên hiển thị được
> đưa vào dòng đầu trong dropdown thay vì hiện luôn ngoài header.

# Hồ sơ người dùng — Tên hiển thị & Avatar (upload ảnh thật)

## Context

Header hiện tại (`AppLayout.tsx`) hiển thị `{username} ▾` — tức username
dùng để đăng nhập (VD: `hiendc`), không thân thiện. Người dùng muốn mỗi
user có thêm **Tên hiển thị** và **Avatar**, và header hiển thị **avatar +
tên** thay vì username thô.

Đã hỏi và người dùng chọn: **avatar là ảnh upload thật từ máy** (không phải
avatar tự sinh từ chữ cái đầu, cũng không phải dán URL ảnh) — đây là lựa
chọn phức tạp nhất trong 3 phương án vì cần thêm:
- Endpoint nhận file ảnh (multipart), validate loại file + dung lượng.
- Nơi lưu ảnh trên server (backend hiện là JSON file store, chưa có cơ chế
  lưu/serve file tĩnh do người dùng upload).
- Route serve ảnh tĩnh, dọn ảnh cũ khi đổi ảnh mới (tránh rác tích tụ).

**Khác với `docs/household-settings-plan.md`** (dữ liệu chung theo nhà): Tên
hiển thị + avatar là dữ liệu **riêng của từng user**, không dùng chung trong
nhà — đổi avatar của `hiendc` không ảnh hưởng `trangdt`. Vì vậy cần endpoint
**tự phục vụ** (`/me`, xác định qua JWT, không nhận ID trong URL) thay vì
theo `household_id` như các plan trước.

Tận dụng volume Docker đã có sẵn: `docker-compose.yml` đã mount
`./backend/data:/app/data`, nên lưu ảnh vào `data/avatars/` sẽ tự động
persist qua restart mà **không cần sửa `docker-compose.yml`**.

Việc này đụng backend lẫn frontend. Về build/test backend: plan
`household-settings-plan.md` trước ghi "máy dev này không có Go toolchain",
nhưng vừa phát hiện có **skill `run`** (`.claude/skills/run/SKILL.md`) nói có
thể build + chạy app Go trên máy Windows này — nên lần này sẽ **thử dùng
skill đó để build/test thật** sau khi code xong, thay vì mặc định bỏ qua.

## Phạm vi thay đổi

### Backend (Go)

1. **`backend/internal/models/models.go`** — thêm 2 field vào `User`:
   ```go
   type User struct {
       ID             int    `json:"id"`
       Username       string `json:"username"`
       PasswordHash   string `json:"password_hash"`
       HouseholdID    int    `json:"household_id"`
       CreatedAt      string `json:"created_at"`
       DisplayName    string `json:"display_name,omitempty"`     // "" = chưa đặt, FE fallback về username
       AvatarFilename string `json:"avatar_filename,omitempty"`  // tên file trong data/avatars/, "" = chưa có
   }
   ```

2. **`backend/internal/store/store.go`** — thêm 2 method mới, theo đúng
   pattern khóa/mutate/`saveLocked()`:
   ```go
   func (s *Store) UpdateUserDisplayName(username, displayName string) (*models.User, error) {
       s.mu.Lock()
       defer s.mu.Unlock()
       for i := range s.data.Users {
           if s.data.Users[i].Username == username {
               s.data.Users[i].DisplayName = displayName
               if err := s.saveLocked(); err != nil {
                   return nil, err
               }
               u := s.data.Users[i]
               return &u, nil
           }
       }
       return nil, fmt.Errorf("user %q not found", username)
   }

   // UpdateUserAvatar ghi đè tên file avatar, trả về user CŨ (trước khi ghi đè)
   // và user MỚI để handler biết file cũ nào cần xóa trên đĩa.
   func (s *Store) UpdateUserAvatar(username, filename string) (old *models.User, new *models.User, err error) {
       s.mu.Lock()
       defer s.mu.Unlock()
       for i := range s.data.Users {
           if s.data.Users[i].Username == username {
               oldCopy := s.data.Users[i]
               s.data.Users[i].AvatarFilename = filename
               if err := s.saveLocked(); err != nil {
                   return nil, nil, err
               }
               newCopy := s.data.Users[i]
               return &oldCopy, &newCopy, nil
           }
       }
       return nil, nil, fmt.Errorf("user %q not found", username)
   }
   ```
   (Trả cả `old` lẫn `new` để `ProfileHandler.UploadAvatar` không cần gọi
   `FindUser` thêm 1 lần chỉ để biết filename cũ.)

3. **File mới `backend/internal/handlers/profile.go`**:
   ```go
   package handlers

   import (
       "fmt"
       "net/http"
       "os"
       "path/filepath"
       "strings"
       "time"

       "github.com/gin-gonic/gin"

       "personal-finance/backend/internal/store"
   )

   const maxAvatarSize = 2 << 20 // 2MB

   var allowedAvatarExt = map[string]bool{
       ".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
   }

   type ProfileHandler struct {
       Store     *store.Store
       AvatarDir string
   }

   func avatarURL(filename string) string {
       if filename == "" {
           return ""
       }
       return "/avatars/" + filename
   }

   func (h *ProfileHandler) Get(c *gin.Context) {
       username, _ := c.Get("username")
       u, err := h.Store.FindUser(fmt.Sprint(username))
       if err != nil {
           c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy user"})
           return
       }
       c.JSON(http.StatusOK, gin.H{
           "username":     u.Username,
           "display_name": u.DisplayName,
           "avatar_url":   avatarURL(u.AvatarFilename),
       })
   }

   type updateNameRequest struct {
       DisplayName string `json:"display_name"`
   }

   func (h *ProfileHandler) UpdateName(c *gin.Context) {
       var req updateNameRequest
       if err := c.ShouldBindJSON(&req); err != nil {
           c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
           return
       }
       username, _ := c.Get("username")
       u, err := h.Store.UpdateUserDisplayName(fmt.Sprint(username), strings.TrimSpace(req.DisplayName))
       if err != nil {
           c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
           return
       }
       c.JSON(http.StatusOK, gin.H{
           "username":     u.Username,
           "display_name": u.DisplayName,
           "avatar_url":   avatarURL(u.AvatarFilename),
       })
   }

   func (h *ProfileHandler) UploadAvatar(c *gin.Context) {
       fh, err := c.FormFile("avatar")
       if err != nil {
           c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu file ảnh"})
           return
       }
       if fh.Size > maxAvatarSize {
           c.JSON(http.StatusBadRequest, gin.H{"error": "Ảnh tối đa 2MB"})
           return
       }
       ext := strings.ToLower(filepath.Ext(fh.Filename))
       if !allowedAvatarExt[ext] {
           c.JSON(http.StatusBadRequest, gin.H{"error": "Chỉ hỗ trợ JPG, PNG, WEBP"})
           return
       }

       username, _ := c.Get("username")
       uname := fmt.Sprint(username)
       filename := fmt.Sprintf("%s-%d%s", uname, time.Now().UnixNano(), ext)

       if err := os.MkdirAll(h.AvatarDir, 0o755); err != nil {
           c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu ảnh"})
           return
       }
       if err := c.SaveUploadedFile(fh, filepath.Join(h.AvatarDir, filename)); err != nil {
           c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu ảnh"})
           return
       }

       old, newUser, err := h.Store.UpdateUserAvatar(uname, filename)
       if err != nil {
           c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
           return
       }
       if old != nil && old.AvatarFilename != "" && old.AvatarFilename != filename {
           _ = os.Remove(filepath.Join(h.AvatarDir, old.AvatarFilename)) // ảnh cũ, bỏ qua lỗi nếu đã mất
       }

       c.JSON(http.StatusOK, gin.H{
           "username":     newUser.Username,
           "display_name": newUser.DisplayName,
           "avatar_url":   avatarURL(newUser.AvatarFilename),
       })
   }
   ```
   Dùng `fmt.Sprint(username)` giống đúng pattern `currentHouseholdID` ở
   `budget.go`.

4. **`backend/internal/handlers/handlers.go`** — đăng ký route (cần thêm
   import `"path/filepath"`):
   ```go
   avatarDir := filepath.Join(filepath.Dir(cfg.DataFile), "avatars")
   profile := &ProfileHandler{Store: s, AvatarDir: avatarDir}
   protected.GET("/me", profile.Get)
   protected.PUT("/me", profile.UpdateName)
   protected.POST("/me/avatar", profile.UploadAvatar)
   ```

5. **`backend/cmd/server/main.go`** — serve thư mục avatar tĩnh (thêm import
   `"path/filepath"`), gọi trước `serveFrontend(r)`:
   ```go
   avatarDir := filepath.Join(filepath.Dir(cfg.DataFile), "avatars")
   if err := os.MkdirAll(avatarDir, 0o755); err != nil {
       log.Printf("không tạo được thư mục avatar: %v", err)
   }
   r.Static("/avatars", avatarDir)
   ```

6. **`backend/internal/handlers/auth.go`** — `respondToken` thêm 2 field
   vào response JSON (dùng lại `avatarURL()` từ `profile.go`, cùng package):
   ```go
   c.JSON(status, gin.H{
       "token":          tokenStr,
       "username":       u.Username,
       "household_id":   u.HouseholdID,
       "household_name": householdName,
       "display_name":   u.DisplayName,
       "avatar_url":     avatarURL(u.AvatarFilename),
   })
   ```
   Giống cách `household_name` đã có sẵn trong response login/register — để
   header có đủ dữ liệu hiển thị ngay sau khi đăng nhập, không cần gọi
   thêm `/me`.

### Frontend (React/TS)

1. **`frontend/src/types/index.ts`**:
   ```ts
   export interface User {
     id: number
     username: string
     household_id: number
     created_at: string
     display_name?: string
     avatar_url?: string
   }

   export interface LoginResponse {
     token: string
     username: string
     household_id: number
     household_name: string
     display_name?: string
     avatar_url?: string
   }
   ```

2. **`frontend/src/stores/auth.ts`** — thêm state + setter:
   ```ts
   interface AuthState {
     token: string | null
     username: string | null
     householdName: string | null
     displayName: string | null
     avatarUrl: string | null
     setAuth: (
       token: string,
       username: string,
       householdName?: string,
       displayName?: string,
       avatarUrl?: string,
     ) => void
     setHouseholdName: (name: string) => void
     setProfile: (displayName: string, avatarUrl: string) => void
     logout: () => void
   }
   // setAuth: set({ token, username, householdName: householdName ?? null, displayName: displayName ?? null, avatarUrl: avatarUrl ?? null })
   // setProfile: (displayName, avatarUrl) => set({ displayName, avatarUrl })
   // logout: cũng reset displayName/avatarUrl về null
   ```

3. **`frontend/src/pages/LoginPage.tsx`** — cập nhật lời gọi `setAuth`:
   ```ts
   setAuth(data.token, data.username, data.household_name, data.display_name, data.avatar_url)
   ```
   Không đổi gì khác ở file này.

4. **File mới `frontend/src/api/profile.ts`**:
   ```ts
   import { api } from '../lib/api'

   export interface Profile {
     username: string
     display_name?: string
     avatar_url?: string
   }

   export async function updateDisplayName(displayName: string): Promise<Profile> {
     const { data } = await api.put<Profile>('/me', { display_name: displayName })
     return data
   }

   export async function uploadAvatar(file: File): Promise<Profile> {
     const form = new FormData()
     form.append('avatar', file)
     const { data } = await api.post<Profile>('/me/avatar', form, {
       headers: { 'Content-Type': 'multipart/form-data' },
     })
     return data
   }
   ```
   Không cần `fetchMe()` — `ProfileModal` (mục 5) lấy dữ liệu ban đầu thẳng
   từ `useAuth` (đã có sẵn từ lúc đăng nhập), không cần fetch riêng.

5. **File mới `frontend/src/components/layout/ProfileModal.tsx`** — tái sử
   dụng `Modal` (children pattern), theo pattern state của
   `HouseholdInfoModal`/`BudgetCard`:
   - Props `{ open: boolean; onClose: () => void }`.
   - Khi mở: seed `displayName` từ `useAuth((s) => s.displayName ?? '')`,
     preview avatar = `useAuth((s) => s.avatarUrl)` (không fetch, đã có sẵn).
   - State thêm: `pendingFile: File | null`, `previewUrl: string | null`
     (dùng `URL.createObjectURL(file)` khi user chọn ảnh mới, `revoke` khi
     đổi ảnh khác hoặc đóng modal — tránh leak).
   - Input file: `<input type="file" accept="image/png,image/jpeg,image/webp" onChange={...}>`
     — validate nhẹ phía client (size ≤ 2MB) để phản hồi nhanh, dù backend
     vẫn validate lại (không tin client).
   - Avatar preview: hình tròn `h-20 w-20 rounded-full object-cover` nếu có
     ảnh, fallback hình tròn màu `bg-blue-600 text-white` hiện chữ cái đầu
     của `displayName || username` nếu chưa có ảnh nào.
   - Save: nếu có `pendingFile` → `uploadAvatar(pendingFile)`; nếu
     `displayName` khác giá trị ban đầu → `updateDisplayName(displayName.trim())`;
     gộp kết quả mới nhất, gọi `setProfile(display_name, avatar_url)`, đóng
     modal. Lỗi → hiện message tiếng Việt (theo pattern `BudgetCard`).
   - `<Modal open title="Hồ sơ của tôi" onConfirm={save} onCancel={onClose} confirmVariant="primary" confirmLabel={saving ? 'Đang lưu...' : 'Lưu'} confirmDisabled={saving}>`.

6. **`frontend/src/components/layout/AppLayout.tsx`**:
   - Đọc thêm `displayName`, `avatarUrl` từ `useAuth`.
   - Thay nút `{username} ▾` bằng: avatar tròn nhỏ (`h-7 w-7 rounded-full
     object-cover` nếu có `avatarUrl`, else fallback chữ cái đầu trên nền
     `bg-white/20`) + text `{displayName || username} ▾`.
   - Thêm state `profileOpen`, thêm mục **"Hồ sơ của tôi"** trong dropdown
     (trên "Thông tin"), mount `<ProfileModal open={profileOpen} onClose={...} />`
     cạnh `<HouseholdInfoModal>` đã có.

7. **`frontend/vite.config.ts`** — thêm `/avatars` vào proxy dev (mirror
   `/api`), để `<img src="/avatars/...">` load được khi chạy `npm run dev`
   (production đã cùng origin nên không cần):
   ```ts
   proxy: {
     '/api': 'http://localhost:8080',
     '/avatars': 'http://localhost:8080',
   },
   ```

## Kiểm thử

1. **Backend:** thử dùng skill `run` để build + chạy thật (thay vì bỏ qua
   như plan trước) — `cd backend && go build ./... && go vet ./...`. Nếu
   skill đó vẫn không chạy được ở đây, quay lại flow cũ: người dùng tự build
   ở máy có Go / qua Docker.
2. **Frontend:** `cd frontend && npm run lint && npm run build`.
3. Thủ công:
   - Đăng nhập `hiendc` → header hiện avatar chữ cái "H" nền xanh + text
     "hiendc ▾" (chưa có display_name/avatar → fallback đúng).
   - Mở "Hồ sơ của tôi" → nhập tên hiển thị "Hiến" → chọn ảnh JPG < 2MB →
     Lưu → header đổi ngay thành ảnh thật + "Hiến ▾", không cần F5.
   - Đổi ảnh avatar lần 2 → ảnh cũ trên `backend/data/avatars/` bị xóa
     (kiểm tra thư mục không tích tụ file rác).
   - Thử upload file .gif hoặc > 2MB → báo lỗi rõ, không crash, ảnh cũ giữ
     nguyên.
   - Đăng xuất, đăng nhập lại → avatar + tên hiển thị vẫn đúng (đến từ
     response login, không mất).
   - Đăng nhập `trangdt` (cùng nhà `hiendc`) → avatar/tên của `trangdt`
     độc lập, không bị ảnh hưởng bởi thay đổi của `hiendc`.
   - Kiểm tra responsive: avatar + tên dài không vỡ layout header ở mobile
     (< 400px) — dùng `truncate` cho phần tên giống cách `appName` đang làm.

Sau khi triển khai xong và verify đủ các bước trên, cập nhật dòng
**Trạng thái** ở đầu file này thành `Đã triển khai`.
