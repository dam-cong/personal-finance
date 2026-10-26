> **Trạng thái:** Đã code + build + deploy xong. `go vet`/`go test ./...`
> qua Docker (`golang:1.25-alpine`, cache module có sẵn) đều pass;
> `npm run lint`/`npm run build` frontend pass. Server đã restart (xin phép
> trước), xác nhận `POST /api/messages/image` trả `401` (nhận diện đúng
> route) thay vì `404`. Còn thiếu bước cuối: **bạn tự test tay** theo mục
> Kiểm thử (gửi ảnh thật giữa 2 tài khoản, thử ảnh quá 5MB/sai định dạng)
> rồi mới đánh dấu `Đã triển khai` hoàn tất.

# Gửi ảnh trong "Trò chuyện" (family group chat)

## Context

Tab **"Trò chuyện"** (`docs/family-group-chat-plan.md`, đã triển khai) hiện
chỉ gửi được text. Người dùng muốn **gửi ảnh** trong chat này.

**Thiết kế cốt lõi — tái sử dụng đúng pattern upload avatar đã có**
(`docs/user-profile-avatar-plan.md`): multipart upload → validate loại/dung
lượng → lưu file vào `data/chat-images/` (song song `data/avatars/`, cũng
tự động persist qua volume Docker `./backend/data` có sẵn, không cần sửa
`docker-compose.yml`) → serve tĩnh qua `/chat-images` → `Message` lưu thêm
field `image_url` (giống cách lưu `avatar_url`).

**Phạm vi v1 (để giữ đơn giản, có thể mở rộng sau nếu cần):**
- Mỗi tin nhắn là **hoặc text hoặc ảnh**, không có caption đính kèm ảnh —
  bấm nút đính kèm → chọn ảnh → gửi ngay thành 1 tin ảnh riêng. Nội dung
  đang gõ dở trong ô nhập (nếu có) **không bị ảnh hưởng**, vẫn gửi được
  bình thường sau đó như tin text riêng.
- Định dạng cho phép: **JPG, PNG, WEBP** (giống avatar, không gồm GIF/video).
- Giới hạn dung lượng: **5MB** (avatar giới hạn 2MB; ảnh chụp từ điện thoại
  thường nặng hơn nên nới ra — có thể chỉnh lại nếu bạn muốn số khác).
- Không có lightbox xem ảnh phóng to — bấm vào ảnh mở tab mới (thẻ `<a
  target="_blank">`), đơn giản, không cần thêm component modal riêng.

Vẫn theo backend/frontend, và **đã có cách build/test/deploy thật qua
Docker** (`golang:1.25-alpine`, xác nhận ổn định ở 2 tính năng gần nhất) —
không còn giới hạn "không build được" nữa.

## Phạm vi thay đổi

### Backend (Go)

1. **`backend/internal/models/models.go`** — thêm field vào `Message`:
   ```go
   ImageURL string `json:"image_url,omitempty"` // "" = tin text thường
   ```
   Không cần sửa `store.go` — `CreateMessage`/`ListMessagesByHousehold` đã
   tổng quát theo `*models.Message`, không quan tâm field nào được set.

2. **`backend/internal/handlers/message.go`** — thêm hằng số + handler mới:
   ```go
   const maxChatImageSize = 5 << 20 // 5MB

   var allowedChatImageExt = map[string]bool{
       ".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
   }
   ```
   (Khai báo riêng, **không** tái dùng `allowedAvatarExt`/`maxAvatarSize`
   bên `profile.go` — dù trùng nội dung, tách riêng để 2 tính năng
   avatar/chat-image độc lập nhau, không phải sửa file `profile.go` đang
   chạy ổn định chỉ để dùng chung 4 dòng map. Đánh đổi: có lặp code nhỏ,
   chấp nhận được.)

   ```go
   func (h *MessageHandler) UploadImage(c *gin.Context) {
       fh, err := c.FormFile("image")
       if err != nil { ... 400 "Thiếu file ảnh" ... }
       if fh.Size > maxChatImageSize { ... 400 "Ảnh tối đa 5MB" ... }
       ext := strings.ToLower(filepath.Ext(fh.Filename))
       if !allowedChatImageExt[ext] { ... 400 "Chỉ hỗ trợ JPG, PNG, WEBP" ... }

       username, _ := c.Get("username")
       uname := fmt.Sprint(username)
       u, err := h.Store.FindUser(uname)
       if err != nil { ... 401 ... }
       householdID, err := currentHouseholdID(c, h.Store)
       if err != nil { ... 401 ... }

       filename := fmt.Sprintf("%s-%d%s", uname, time.Now().UnixNano(), ext)
       if err := os.MkdirAll(h.ImageDir, 0o755); err != nil { ... 500 ... }
       if err := c.SaveUploadedFile(fh, filepath.Join(h.ImageDir, filename)); err != nil { ... 500 ... }

       m := &models.Message{
           HouseholdID: householdID,
           Username:    u.Username,
           DisplayName: u.DisplayName,
           AvatarURL:   avatarURL(u.AvatarFilename),
           ImageURL:    "/chat-images/" + filename,
       }
       if err := h.Store.CreateMessage(m); err != nil { ... 500 ... }
       c.JSON(http.StatusCreated, gin.H{"message": m})
   }
   ```
   `MessageHandler` struct thêm field `ImageDir string`. Không cần dọn ảnh
   cũ như avatar (mỗi tin nhắn ảnh là 1 file độc lập, không "ghi đè" như
   avatar 1 user 1 ảnh — xóa tin nhắn ảnh không nằm trong scope v1 này nên
   chưa cần dọn file khi xóa).

3. **`backend/internal/handlers/handlers.go`**:
   ```go
   chatImageDir := filepath.Join(filepath.Dir(cfg.DataFile), "chat-images")
   msg := &MessageHandler{Store: s, ImageDir: chatImageDir}
   ...
   protected.POST("/messages/image", msg.UploadImage)
   ```

4. **`backend/cmd/server/main.go`** — tổng quát hóa `serveAvatars` thành
   helper dùng chung cho cả 2 thư mục upload (đang thêm thư mục thứ 2 nên
   tách hàm chung hợp lý, tránh copy-paste y hệt):
   ```go
   func serveUploadDir(r *gin.Engine, cfg *config.Config, subdir, urlPrefix string) {
       dir := filepath.Join(filepath.Dir(cfg.DataFile), subdir)
       if err := os.MkdirAll(dir, 0o755); err != nil {
           log.Printf("không tạo được thư mục %s: %v", subdir, err)
           return
       }
       r.Static(urlPrefix, dir)
   }
   ```
   Thay lời gọi cũ `serveAvatars(r, cfg)` bằng:
   ```go
   serveUploadDir(r, cfg, "avatars", "/avatars")
   serveUploadDir(r, cfg, "chat-images", "/chat-images")
   ```
   (xóa hàm `serveAvatars` cũ, hành vi giữ nguyên 100% cho `/avatars`.)

### Frontend (React/TS)

1. **`frontend/src/types/index.ts`** — thêm vào `FamilyMessage`:
   ```ts
   image_url?: string
   ```

2. **`frontend/src/api/messages.ts`** — thêm:
   ```ts
   export async function sendImageMessage(file: File): Promise<FamilyMessage> {
     const form = new FormData()
     form.append('image', file)
     const { data } = await api.post<{ message: FamilyMessage }>(
       '/messages/image',
       form,
       { headers: { 'Content-Type': 'multipart/form-data' } },
     )
     return data.message
   }
   ```

3. **`frontend/src/components/chat/ChatInput.tsx`** — thêm prop tùy chọn
   `onSendImage?: (file: File) => void`. Chỉ khi prop này được truyền mới
   hiện thêm nút đính kèm (icon kẹp giấy, SVG inline) + `<input type="file"
   accept="image/jpeg,image/png,image/webp" className="hidden">` kích hoạt
   qua ref, đặt bên trái ô nhập text. `ChatPage.tsx` (expense chat) không
   truyền prop này nên **không đổi giao diện** ở đó — tương thích ngược
   100%.

4. **`frontend/src/components/familychat/FamilyChatWindow.tsx`** — nhận
   thêm prop `onSendImage`, truyền xuống `ChatInput`.

5. **`frontend/src/components/familychat/FamilyMessageBubble.tsx`** — nếu
   `message.image_url` có giá trị: render ảnh (`<a href={image_url}
   target="_blank" rel="noreferrer"><img src={image_url} className="max-w-
   [240px] rounded-xl shadow-sm" /></a>`) thay cho bong bóng chữ có nền màu
   (ảnh tự đủ "nổi" không cần nền), giữ nguyên avatar + tên người gửi ở vị
   trí cũ. Nếu tin vừa có `content` vừa có `image_url` (dự phòng, dù v1
   không tạo ra trường hợp này) thì hiện ảnh trước, chữ bên dưới.

6. **`frontend/src/pages/FamilyChatPage.tsx`** — thêm `handleSendImage(file)`
   tương tự `handleSend`: gọi `sendImageMessage`, `invalidateQueries(['messages'])`,
   dùng chung state `sending`/`error` (disable input khi đang upload, hiện
   lỗi rõ nếu vượt quá 5MB/sai định dạng — lỗi từ backend đã có message
   tiếng Việt sẵn, tái sử dụng qua `err.response?.data?.error` như
   `handleSend` đang làm).

7. **`frontend/vite.config.ts`** — thêm `/chat-images` vào proxy dev (mirror
   `/avatars`):
   ```ts
   proxy: {
     '/api': 'http://localhost:8080',
     '/avatars': 'http://localhost:8080',
     '/chat-images': 'http://localhost:8080',
   },
   ```

## Kiểm thử

1. **Backend:** `go build ./... && go vet ./... && go test ./...` qua
   Docker — pass trước khi deploy. Xin phép restart server sau khi build.
2. **Frontend:** `npm run lint && npm run build`.
3. Thủ công (2 tài khoản cùng nhà):
   - Gửi ảnh JPG < 5MB → hiện ngay trong khung chat (ảnh bo góc, không có
     nền màu), tài khoản kia thấy ảnh trong ≤ 3s (polling).
   - Bấm vào ảnh → mở tab mới xem ảnh gốc.
   - Gửi ảnh > 5MB hoặc định dạng `.gif`/`.pdf` → báo lỗi rõ ràng (banner đỏ
     có sẵn từ tính năng trước), không crash, không tạo tin nhắn rỗng.
   - Tin nhắn ảnh cũng tính vào **chưa đọc** đúng như tin text (chấm đỏ
     trên nav) — vì dùng chung `Message`/`last_read_message_id`, không cần
     sửa gì thêm ở tính năng unread.
   - Gõ dở 1 đoạn text, rồi gửi ảnh (không bấm Gửi cho đoạn text) → ảnh gửi
     độc lập, đoạn text vẫn còn nguyên trong ô nhập, gửi riêng sau đó vẫn
     được.
   - Kiểm tra `ChatPage.tsx` (tab "Chat" nhập chi tiêu) **không xuất hiện**
     nút đính kèm ảnh — xác nhận không đổi hành vi ở đó.
   - Responsive: ảnh trong bong bóng không tràn ngang ở mobile (< 400px),
     `max-w-[240px]` co lại hợp lý trên màn hẹp.

Sau khi triển khai xong và verify đủ các bước trên, cập nhật dòng
**Trạng thái** ở đầu file này thành `Đã triển khai`.
