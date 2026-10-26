> **Trạng thái:** Đã code + build + deploy xong. `go vet`/`go test ./...`
> qua Docker (`golang:1.25-alpine`) đều pass; `npm run lint`/`npm run build`
> frontend pass. Server đã restart (xin phép trước), xác nhận
> `POST /api/household/image` trả `401` (nhận diện đúng route) thay vì
> `404`. Còn thiếu bước cuối: **bạn tự test tay** theo mục Kiểm thử (upload
> ảnh nhà thật, kiểm tra hiện ở header + nền chat "Trò chuyện") rồi mới
> đánh dấu `Đã triển khai` hoàn tất.

# Ảnh đại diện của nhà — hiện ở header + làm nền "Trò chuyện"

## Context

Người dùng muốn thêm **ảnh đại diện cho cả nhà** (khác avatar cá nhân từng
user đã có ở `docs/user-profile-avatar-plan.md`):
1. Upload ảnh này trong modal **"Thông tin nhà"** (`HouseholdInfoModal`,
   `docs/household-settings-plan.md`).
2. Ảnh hiện **cạnh tiêu đề `{appName}`** ở header (`AppLayout.tsx`).
3. Ảnh dùng làm **nền (wallpaper)** cho khung chat "Trò chuyện"
   (`FamilyChatWindow.tsx`), giống tính năng đổi hình nền chat của
   Messenger/Zalo.

**Thiết kế cốt lõi — tái sử dụng tối đa cơ chế avatar user đã có**, vì đây
cùng là "ảnh đại diện 1 thực thể" (chỉ khác thực thể là nhà thay vì user):
- Dùng lại **đúng thư mục `data/avatars/`** và **route tĩnh `/avatars`** đã
  có — không tạo thư mục/route mới, không cần sửa `docker-compose.yml`.
- Dùng lại **đúng hằng số** `maxAvatarSize` (2MB), `allowedAvatarExt`
  (JPG/PNG/WEBP), và helper `avatarURL()` đang có sẵn trong `profile.go`
  (khác cách làm ở `chat-image` — lúc đó tôi cố tình tách riêng vì
  chat-image là tính năng khác hẳn; ở đây household-image cùng bản chất
  avatar nên tái dùng thẳng, không lặp code).
- Đặt tên file phân biệt với avatar user: `household-<id>-<timestamp>.<ext>`
  (khác pattern `<username>-<timestamp>.<ext>` của user, tránh đụng tên).

**1 thay đổi kèm theo (dọn dẹp nhỏ, không phải scope creep)**: hiện
`HouseholdHandler.Get`/`Update` đang trả **thẳng struct `models.Household`**
ra JSON (khác `profile.go` luôn tự dựng `gin.H` thủ công, không bao giờ trả
struct thô). Cần sửa 2 handler này để trả `image_url` (đã tính toán qua
`avatarURL()`) thay vì lộ `image_filename` thô — vì vậy phải đổi từ trả
thẳng `hh` sang dựng `gin.H` thủ công (giống `profile.go`), tiện thể nhất
quán luôn cách 2 file xử lý giống nhau.

Vẫn đã có cách build/test/deploy thật qua Docker (`golang:1.25-alpine`,
xác nhận ổn định ở 3 tính năng gần nhất).

## Phạm vi thay đổi

### Backend (Go)

1. **`backend/internal/models/models.go`** — thêm field vào `Household`:
   ```go
   ImageFilename string `json:"image_filename,omitempty"` // tên file trong data/avatars/, "" = chưa có
   ```

2. **`backend/internal/store/store.go`** — thêm method mới (theo đúng
   pattern `UpdateUserAvatar` nhưng đơn giản hơn — không cần trả "old" vì
   household v1 chưa cần dọn ảnh cũ khi đổi, giống lý do đã chấp nhận ở
   chat-image):
   ```go
   func (s *Store) UpdateHouseholdImage(id int, filename string) (*models.Household, error) {
       s.mu.Lock()
       defer s.mu.Unlock()
       for i := range s.data.Households {
           if s.data.Households[i].ID == id {
               s.data.Households[i].ImageFilename = filename
               if err := s.saveLocked(); err != nil {
                   return nil, err
               }
               hh := s.data.Households[i]
               return &hh, nil
           }
       }
       return nil, fmt.Errorf("household %d not found", id)
   }
   ```
   *(Ghi chú nhỏ: khác `UpdateUserAvatar`, hàm này KHÔNG xóa file ảnh cũ
   trên đĩa khi đổi ảnh mới — chấp nhận đánh đổi giữ đơn giản, giống
   chat-image; nếu sau này muốn dọn rác thì thêm logic tương tự
   `UpdateUserAvatar` sau.)*

3. **`backend/internal/handlers/household.go`**:
   - Struct `HouseholdHandler` thêm field `AvatarDir string`.
   - Sửa `Get` và `Update`: thay `c.JSON(http.StatusOK, gin.H{"household": hh})`
     bằng hàm dựng response chung:
     ```go
     func householdJSON(hh *models.Household) gin.H {
         return gin.H{
             "id":             hh.ID,
             "name":           hh.Name,
             "created_at":     hh.CreatedAt,
             "default_budget": hh.DefaultBudget,
             "slogan":         hh.Slogan,
             "image_url":      avatarURL(hh.ImageFilename),
         }
     }
     ```
     rồi gọi `c.JSON(http.StatusOK, gin.H{"household": householdJSON(hh)})`
     ở cả `Get`, `Update`, và handler mới `UploadImage` bên dưới.
   - Thêm handler mới:
     ```go
     func (h *HouseholdHandler) UploadImage(c *gin.Context) {
         fh, err := c.FormFile("image")
         if err != nil { ... 400 "Thiếu file ảnh" ... }
         if fh.Size > maxAvatarSize { ... 400 "Ảnh tối đa 2MB" ... }
         ext := strings.ToLower(filepath.Ext(fh.Filename))
         if !allowedAvatarExt[ext] { ... 400 "Chỉ hỗ trợ JPG, PNG, WEBP" ... }

         householdID, err := currentHouseholdID(c, h.Store)
         if err != nil { ... 401 ... }

         filename := fmt.Sprintf("household-%d-%d%s", householdID, time.Now().UnixNano(), ext)
         if err := os.MkdirAll(h.AvatarDir, 0o755); err != nil { ... 500 ... }
         if err := c.SaveUploadedFile(fh, filepath.Join(h.AvatarDir, filename)); err != nil { ... 500 ... }

         hh, err := h.Store.UpdateHouseholdImage(householdID, filename)
         if err != nil { ... 500 ... }
         c.JSON(http.StatusOK, gin.H{"household": householdJSON(hh)})
     }
     ```
     (dùng lại `maxAvatarSize`/`allowedAvatarExt` đã khai báo ở `profile.go`,
     cùng package `handlers` nên gọi thẳng được, không cần import gì thêm
     ngoài `os`, `path/filepath`, `strings`, `time` nếu `household.go` chưa
     có sẵn.)

4. **`backend/internal/handlers/handlers.go`**:
   ```go
   household := &HouseholdHandler{Store: s, Config: cfg, AvatarDir: avatarDir}
   protected.GET("/household", household.Get)
   protected.PUT("/household", household.Update)
   protected.POST("/household/image", household.UploadImage)
   ```
   (`avatarDir` đã có sẵn biến cục bộ ngay phía trên do `ProfileHandler`
   đang dùng — chỉ cần khai báo `HouseholdHandler` SAU dòng đó, đổi thứ tự
   nếu cần vì hiện `household := ...` đang đứng TRƯỚC đoạn tính `avatarDir`
   cho profile; sẽ dời `avatarDir := ...` lên trước cả 2 chỗ dùng.)

### Frontend (React/TS)

1. **`frontend/src/types/index.ts`** — `Household` thêm:
   ```ts
   image_url?: string
   ```

2. **`frontend/src/api/household.ts`** — thêm:
   ```ts
   export async function uploadHouseholdImage(file: File): Promise<Household> {
     const form = new FormData()
     form.append('image', file)
     const { data } = await api.post<{ household: Household }>(
       '/household/image',
       form,
       { headers: { 'Content-Type': 'multipart/form-data' } },
     )
     return data.household
   }
   ```

3. **`frontend/src/components/layout/HouseholdInfoModal.tsx`** — thêm UI
   chọn ảnh, theo đúng pattern đã có ở `ProfileModal.tsx` (preview tròn/vuông
   + nút "Chọn ảnh" + input file ẩn + `pendingImageFile`/`previewUrl` state,
   revoke object URL khi đổi/đóng modal):
   - Khi mở modal: preview ban đầu = ảnh nhà hiện tại (`household.image_url`
     lấy từ `fetchHousehold()` đã gọi sẵn trong modal này).
   - Save: nếu có `pendingImageFile` → gọi `uploadHouseholdImage` (độc lập
     với việc lưu tên/hạn mức/khẩu hiệu, giống cách `ProfileModal` tách
     upload avatar khỏi lưu tên hiển thị) → sau đó vẫn
     `invalidateQueries(['household'])` như cũ để header/chat cập nhật ảnh
     mới ngay.

4. **`frontend/src/components/layout/AppLayout.tsx`** — hiện ảnh nhà cạnh
   tiêu đề `{appName}`:
   ```tsx
   <div className="flex items-center justify-center gap-2">
     {household?.image_url && (
       <img
         src={household.image_url}
         alt="Ảnh nhà"
         className="h-7 w-7 rounded-full object-cover ring-2 ring-white/40"
       />
     )}
     <h1 className="truncate text-base font-bold text-white">{appName}</h1>
   </div>
   ```
   (dữ liệu `household` đã được `useQuery(['household'], fetchHousehold)`
   fetch sẵn trong file này từ tính năng khẩu hiệu trước — không cần query
   mới.)

5. **`frontend/src/pages/FamilyChatPage.tsx`** — thêm
   `useQuery({ queryKey: ['household'], queryFn: fetchHousehold, staleTime: Infinity })`
   (**cùng `queryKey`** với `AppLayout` nên react-query dùng chung cache,
   không gọi API thêm lần nào), lấy `household?.image_url` truyền xuống
   `FamilyChatWindow` qua prop `backgroundImageUrl`.

6. **`frontend/src/components/familychat/FamilyChatWindow.tsx`** — nhận
   thêm prop `backgroundImageUrl?: string`, áp dụng làm nền cho khu vực
   cuộn tin nhắn (lớp ảnh nền tuyệt đối phía sau + lớp nội dung bán trong
   suốt phía trên để chữ vẫn đọc được rõ trên ảnh, kiểu chat wallpaper
   thường thấy):
   ```tsx
   <div className="relative flex-1 overflow-y-auto">
     {backgroundImageUrl && (
       <div
         className="absolute inset-0 bg-cover bg-center"
         style={{ backgroundImage: `url(${backgroundImageUrl})` }}
       />
     )}
     <div className={`relative space-y-3 px-4 py-4 ${backgroundImageUrl ? 'bg-white/70' : ''}`}>
       <div className="mx-auto max-w-3xl space-y-3">
         {/* messages map + bottomRef như cũ */}
       </div>
     </div>
   </div>
   ```

## Kiểm thử

1. **Backend:** `go build ./... && go vet ./... && go test ./...` qua
   Docker — pass trước khi deploy. Xin phép restart server sau khi build.
2. **Frontend:** `npm run lint && npm run build`.
3. Thủ công:
   - Mở "Thông tin nhà" → chọn ảnh JPG/PNG/WEBP < 2MB → Lưu → header hiện
     ngay ảnh tròn nhỏ cạnh `{appName}`, không cần F5.
   - Vào tab "Trò chuyện" → khung chat hiện ảnh làm nền mờ phía sau tin
     nhắn, chữ vẫn đọc rõ (nhờ lớp phủ trắng bán trong suốt).
   - Đăng nhập tài khoản khác cùng nhà → thấy đúng ảnh nhà giống nhau (dữ
     liệu chung theo `household_id`, không phải riêng từng user).
   - Thử ảnh > 2MB hoặc `.gif` → báo lỗi rõ, không crash.
   - Chưa từng upload ảnh nhà → header/chat không hiện gì thêm (không vỡ
     layout, đúng như trước khi có tính năng này).
   - Responsive: ảnh tròn cạnh tiêu đề không vỡ layout header ở mobile
     (< 400px); nền chat co giãn đúng không tràn ngang.

Sau khi triển khai xong và verify đủ các bước trên, cập nhật dòng
**Trạng thái** ở đầu file này thành `Đã triển khai`.
