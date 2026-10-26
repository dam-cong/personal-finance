> **Trạng thái:** Đã code xong đúng scope. Frontend: `npm run lint` +
> `npm run build` pass.
>
> **Cập nhật: đã build + deploy thành công.** Docker Desktop engine được bật
> lại, dùng container `golang:1.25-alpine` build `bin/pf-server` (thay vì
> cài Go trực tiếp vào WSL) — `go build`/`go vet`/`go test ./...` đều pass.
> Đã restart server trong WSL (xin phép trước khi restart), xác nhận
> `/api/messages`, `/api/household`, `/api/me` đều trả `401` (nhận diện
> đúng route, chỉ thiếu token) thay vì `404` như trước. Còn thiếu bước cuối:
> **bạn tự test tay** theo mục Kiểm thử (gửi tin nhắn, kiểm tra polling giữa
> 2 tài khoản) rồi mới đánh dấu `Đã triển khai` hoàn tất.
>
> **1 sai khác nhỏ so với plan gốc:** mục 4 (Frontend) nói tái sử dụng
> nguyên `ChatInput.tsx` "không cần sửa gì", nhưng thực tế phải thêm 1 prop
> `placeholder?: string` (mặc định giữ nguyên text "Nhập: Chi tiêu 1 triệu"
> cho `ChatPage` cũ) vì placeholder cũ bị hardcode, dùng nguyên cho chat
> thật sẽ gây nhầm lẫn. Đổi tương thích ngược 100%, không ảnh hưởng
> `ChatPage.tsx`.

# Chat giữa các thành viên trong nhà (group chat chung cả nhà)

## Context

Tab **"Chat"** hiện tại (`ChatPage.tsx`) **không phải nhắn tin giữa người
với người** — đó là giao diện kiểu chat để **nhập chi tiêu** (parse text
thành giao dịch), và **riêng tư theo từng user** (mỗi người chỉ thấy tin
nhắn/giao dịch của chính mình). Người dùng muốn thêm 1 tính năng **hoàn
toàn mới**: các thành viên **nhắn tin thật với nhau**.

Đã hỏi và chốt 2 quyết định quan trọng:
1. **Phạm vi:** 1 phòng chat chung cho cả nhà (giống group chat gia đình) —
   không phải nhắn riêng 1-1 (DM). Mọi thành viên cùng `household_id` thấy
   chung 1 luồng tin nhắn, không cần khái niệm "cuộc trò chuyện"/conversation
   riêng giữa từng cặp người.
2. **Cơ chế cập nhật:** polling định kỳ (frontend tự gọi lại API mỗi vài
   giây qua `react-query`, giống cách `DashboardPage` đang làm), **không**
   dùng WebSocket — backend hiện chưa có WebSocket, thêm vào sẽ phức tạp
   đáng kể (quản lý kết nối, reconnect...) so với lợi ích cho quy mô 1 nhà
   vài người.

**Đây là tính năng mới hoàn toàn, tách biệt với "Chat" (đổi tên chi tiêu)**
— sẽ thêm 1 tab điều hướng mới tên **"Trò chuyện"** (khác "Chat" để tránh
nhầm lẫn 2 tính năng), route riêng, không đụng vào logic parse chi tiêu/
`ChatPage.tsx` hiện có.

**Tận dụng tính năng avatar/tên hiển thị vừa xây** (`docs/user-profile-avatar-plan.md`):
mỗi tin nhắn sẽ **lưu kèm** `display_name` + `avatar_url` của người gửi tại
thời điểm gửi (denormalize giống cách `Transaction` đang lưu thẳng
`Username` thay vì phải join) — đơn giản hơn nhiều so với việc thêm 1
endpoint "danh sách thành viên kèm avatar" riêng để FE tự tra cứu. Đánh đổi:
nếu sau này đổi avatar/tên hiển thị, **tin nhắn cũ vẫn hiện avatar/tên tại
thời điểm gửi** (không retroactive) — chấp nhận được cho quy mô 1 nhà nhỏ,
và nhất quán với cách `Transaction` đang xử lý `Username`.

Backend build/test: vẫn giữ nguyên giới hạn đã xác nhận ở
`user-profile-avatar-plan.md` — máy dev này không có Go toolchain, Docker
Desktop cũng không chạy. Sẽ viết code đúng convention nhưng cần bạn tự build
lại `bin/pf-server` + deploy trước khi tính năng chạy được thật.

## Phạm vi thay đổi

### Backend (Go)

1. **`backend/internal/models/models.go`** — thêm model `Message`:
   ```go
   type Message struct {
       ID          int    `json:"id"`
       HouseholdID int    `json:"household_id"`
       Username    string `json:"username"`
       DisplayName string `json:"display_name,omitempty"`
       AvatarURL   string `json:"avatar_url,omitempty"`
       Content     string `json:"content"`
       CreatedAt   string `json:"created_at"`
   }
   ```

2. **`backend/internal/store/store.go`**:
   - Thêm `Messages []models.Message` + `NextMessageID int` vào `dataFile`
     struct, khởi tạo `NextMessageID: 1` ở nhánh tạo file mới trong `load()`
     (giống các slice/ID khác) — dữ liệu cũ không có key này vẫn parse ra
     slice rỗng bình thường (không cần migrate).
   - `CreateMessage(m *models.Message) error` — theo đúng pattern
     `CreateTransaction`: gán `ID`/`CreatedAt`, `append`, `saveLocked()`.
   - `ListMessagesByHousehold(householdID int) ([]models.Message, error)` —
     lọc theo `household_id`, trả **cũ → mới** (khác `ListTransactions*`
     đang trả mới→cũ, vì chat thường hiện tin cũ ở trên/tin mới ở dưới —
     đúng thứ tự UI đã dùng ở `ChatWindow` hiện tại).

3. **File mới `backend/internal/handlers/message.go`**:
   ```go
   type MessageHandler struct {
       Store *store.Store
   }

   func (h *MessageHandler) List(c *gin.Context) {
       householdID, err := currentHouseholdID(c, h.Store)
       if err != nil { ... 401 ... }
       msgs, err := h.Store.ListMessagesByHousehold(householdID)
       if err != nil { ... 500 ... }
       c.JSON(http.StatusOK, gin.H{"items": msgs})
   }

   type createMessageRequest struct {
       Content string `json:"content"`
   }

   func (h *MessageHandler) Create(c *gin.Context) {
       var req createMessageRequest
       if err := c.ShouldBindJSON(&req); err != nil { ... 400 ... }
       content := strings.TrimSpace(req.Content)
       if content == "" {
           c.JSON(http.StatusBadRequest, gin.H{"error": "Tin nhắn không được để trống"})
           return
       }
       if len(content) > 2000 {
           c.JSON(http.StatusBadRequest, gin.H{"error": "Tin nhắn quá dài (tối đa 2000 ký tự)"})
           return
       }
       username, _ := c.Get("username")
       uname := fmt.Sprint(username)
       u, err := h.Store.FindUser(uname)
       if err != nil { ... 401 ... }
       householdID, err := currentHouseholdID(c, h.Store)
       if err != nil { ... 401 ... }
       m := &models.Message{
           HouseholdID: householdID,
           Username:    u.Username,
           DisplayName: u.DisplayName,
           AvatarURL:   avatarURL(u.AvatarFilename), // dùng lại helper từ profile.go
           Content:     content,
       }
       if err := h.Store.CreateMessage(m); err != nil { ... 500 ... }
       c.JSON(http.StatusCreated, gin.H{"message": m})
   }
   ```
   Không cần sửa/xóa tin nhắn ở bản đầu (chỉ gửi + xem) — giữ scope tối
   thiểu, giống việc `Transaction` mới có xóa còn sửa thì không.

4. **`backend/internal/handlers/handlers.go`** — đăng ký route:
   ```go
   msg := &MessageHandler{Store: s}
   protected.GET("/messages", msg.List)
   protected.POST("/messages", msg.Create)
   ```

### Frontend (React/TS)

1. **`frontend/src/types/index.ts`** — thêm:
   ```ts
   export interface FamilyMessage {
     id: number
     household_id: number
     username: string
     display_name?: string
     avatar_url?: string
     content: string
     created_at: string
   }
   ```

2. **File mới `frontend/src/api/messages.ts`**:
   ```ts
   export async function fetchMessages(): Promise<FamilyMessage[]> {
     const { data } = await api.get<{ items: FamilyMessage[] }>('/messages')
     return data.items
   }
   export async function sendMessage(content: string): Promise<FamilyMessage> {
     const { data } = await api.post<{ message: FamilyMessage }>('/messages', { content })
     return data.message
   }
   ```

3. **File mới `frontend/src/pages/FamilyChatPage.tsx`** — container/data
   component (theo đúng pattern `ChatPage.tsx`):
   - `useQuery({ queryKey: ['messages'], queryFn: fetchMessages, refetchInterval: 3000 })`
     — polling 3 giây/lần, chỉ khi tab đang mở (react-query tự dừng khi tab
     không active nếu cần, mặc định vẫn refetch nền — đủ dùng cho quy mô nhỏ).
   - Gửi tin: mutation gọi `sendMessage`, sau khi thành công gọi
     `queryClient.invalidateQueries({ queryKey: ['messages'] })` để lấy ngay
     tin vừa gửi (không cần optimistic update phức tạp, vì polling 3s đã đủ
     nhanh cho chat gia đình, giữ code đơn giản).
   - Render `FamilyChatWindow` (mục 4), truyền `messages`, `currentUsername`,
     `onSend`.

4. **File mới `frontend/src/components/familychat/FamilyChatWindow.tsx`** +
   **`FamilyMessageBubble.tsx`** — theo đúng cấu trúc
   `components/chat/ChatWindow.tsx` (list cuộn + `mx-auto max-w-3xl`), tái
   sử dụng **nguyên `components/chat/ChatInput.tsx`** làm ô nhập (component
   này đã đủ tổng quát — nhận `onSend`/`disabled`, không có logic parse chi
   tiêu, dùng lại được thẳng, không cần sửa gì).
   - `FamilyMessageBubble`: khác `MessageBubble` (expense chat) ở chỗ đây là
     **group chat nhiều người**, không chỉ "tôi vs bot". **Mọi tin nhắn đều
     kèm avatar tròn nhỏ** (`avatar_url`, fallback chữ cái đầu — tái sử dụng
     đúng pattern vừa làm ở `AppLayout`/`ProfileModal`) để phân biệt người
     gửi ngay trong luồng chat, không chỉ riêng tin của người khác:
     - Tin của **mình**: bong bóng bên phải, `bg-blue-600 text-white`,
       avatar nhỏ cạnh bong bóng phía bên phải, không hiện tên (đã biết là
       của mình).
     - Tin của **người khác**: bong bóng bên trái, avatar cạnh bên trái +
       **tên hiển thị** (`display_name || username`) phía trên bong bóng
       (quan trọng hơn với người khác vì có thể có ≥ 2 người khác trong
       nhà, chỉ avatar chưa chắc đủ phân biệt nhanh).
     - Không có amount tag / nút xóa giao dịch (khác `MessageBubble` cũ —
       đây không phải giao dịch).

5. **`frontend/src/components/layout/AppLayout.tsx`** — thêm 1 `NavLink`
   mới **"Trò chuyện"** (route `/family-chat`) cạnh Chat/Dashboard.

6. **`frontend/src/App.tsx`** — thêm route `/family-chat` → `FamilyChatPage`
   (lazy-load giống `ChatPage`/`DashboardPage` hiện có).

## Kiểm thử

1. **Backend:** viết đúng convention, nhưng **không build/test được ở máy
   này** (đã xác nhận qua skill `run` ở tính năng trước) — cần bạn tự
   `go build`/`go vet` rồi deploy.
2. **Frontend:** `npm run lint && npm run build`.
3. Thủ công (sau khi backend deploy xong):
   - Đăng nhập `hiendc`, vào tab "Trò chuyện", gửi tin nhắn → hiện ngay bong
     bóng bên phải.
   - Đăng nhập `trangdt` (trình duyệt/máy khác), vào "Trò chuyện" → thấy
     tin nhắn của `hiendc` bên trái kèm avatar + tên hiển thị đúng; gửi lại
     tin → trong ≤ 3s, màn hình của `hiendc` tự hiện tin mới (polling) mà
     không cần F5.
   - Đổi avatar/tên hiển thị (qua "Hồ sơ của tôi") rồi gửi tin mới → tin
     **mới** dùng avatar/tên mới; tin **cũ** vẫn giữ avatar/tên tại thời
     điểm gửi trước đó (đúng như thiết kế denormalize, không phải bug).
   - Responsive: mở ở màn hình < 400px, bong bóng + input không tràn ngang,
     giống cách `ChatWindow` (expense chat) đã đạt.
   - Test 1 user KHÁC nhà (nếu có sẵn) → không thấy tin nhắn của nhà khác
     (đúng cách ly theo `household_id`, giống toàn bộ dữ liệu khác trong app).

Sau khi triển khai xong và verify đủ các bước trên, cập nhật dòng
**Trạng thái** ở đầu file này thành `Đã triển khai`.
