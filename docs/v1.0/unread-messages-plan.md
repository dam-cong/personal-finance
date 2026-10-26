> **Trạng thái:** Đã code + build + deploy xong. `go vet`/`go test ./...`
> qua Docker (`golang:1.25-alpine`, dùng volume cache module nên build lần
> này nhanh hơn) đều pass; `npm run lint`/`npm run build` frontend pass.
> Server đã restart (xin phép trước), xác nhận `/api/messages/unread-count`
> và `/api/messages/read` đều trả `401` (nhận diện đúng route) thay vì
> `404`. Còn thiếu bước cuối: **bạn tự test tay** theo mục Kiểm thử (2 tài
> khoản, kiểm tra chấm đỏ hiện/biến mất đúng lúc) rồi mới đánh dấu
> `Đã triển khai` hoàn tất.

# Thông báo tin nhắn chưa đọc (badge trên tab "Trò chuyện")

## Context

Tab **"Trò chuyện"** (`docs/family-group-chat-plan.md`, đã triển khai) hiện
không có cách nào biết có tin nhắn mới mà không tự mở tab ra xem. Người
dùng muốn có **thông báo/số đếm tin nhắn chưa đọc**, hiển thị ngay ở nav
(giống badge đỏ trên icon chat của Messenger/Zalo).

**Thiết kế cốt lõi:** mỗi user có 1 con trỏ **"đã đọc đến tin nhắn ID
nào"** (`last_read_message_id`), lưu riêng theo user (không dùng chung theo
nhà, vì mỗi người đọc tin ở nhịp độ khác nhau). Chưa đọc = số tin nhắn có
`id > last_read_message_id` **và không phải do chính mình gửi** (tin mình
gửi không tính là "chưa đọc" của chính mình).

**Vấn đề cần bạn lưu ý (không phải bug, là hệ quả tự nhiên của thiết kế):**
User đã có tài khoản từ trước nhưng chưa từng mở tab "Trò chuyện" lần nào sẽ
có `last_read_message_id = 0` → **toàn bộ lịch sử chat hiện tại sẽ tính là
chưa đọc** ở lần đầu badge xuất hiện sau khi deploy tính năng này (giống
cảm giác join 1 kênh Slack có sẵn lịch sử — không migrate được gì khác vì
trước đây không có khái niệm "đã đọc").

Vẫn theo backend/frontend, và **giờ đã có cách build/test backend thật**
(qua Docker `golang:1.25-alpine`, xác nhận ở tính năng family-chat) — không
còn giới hạn "không build được" như các plan cũ nữa, miễn Docker Desktop
đang bật khi triển khai.

## Phạm vi thay đổi

### Backend (Go)

1. **`backend/internal/models/models.go`** — thêm field vào `User`:
   ```go
   LastReadMessageID int `json:"last_read_message_id,omitempty"` // 0 = chưa đọc gì
   ```

2. **`backend/internal/store/store.go`**:
   - `MarkMessagesRead(username string, lastMessageID int) error` — set
     `LastReadMessageID` = `lastMessageID` **chỉ khi lớn hơn giá trị hiện
     tại** (tránh set lùi nếu gọi không đúng thứ tự), `saveLocked()`.
   - `CountUnreadMessages(householdID int, username string) (int, error)` —
     lấy `last_read_message_id` hiện tại của user, đếm số message trong nhà
     có `ID > last_read_message_id` và `Username != username`.
   - `LatestMessageID(householdID int) int` — helper lấy ID lớn nhất trong
     danh sách tin nhắn của nhà (0 nếu chưa có tin nào), dùng khi đánh dấu
     "đã đọc hết".

3. **`backend/internal/handlers/message.go`** — thêm 2 handler:
   ```go
   func (h *MessageHandler) UnreadCount(c *gin.Context) {
       username, _ := c.Get("username")
       uname := fmt.Sprint(username)
       householdID, err := currentHouseholdID(c, h.Store)
       if err != nil { ... 401 ... }
       count, err := h.Store.CountUnreadMessages(householdID, uname)
       if err != nil { ... 500 ... }
       c.JSON(http.StatusOK, gin.H{"count": count})
   }

   func (h *MessageHandler) MarkRead(c *gin.Context) {
       username, _ := c.Get("username")
       uname := fmt.Sprint(username)
       householdID, err := currentHouseholdID(c, h.Store)
       if err != nil { ... 401 ... }
       latest := h.Store.LatestMessageID(householdID)
       if err := h.Store.MarkMessagesRead(uname, latest); err != nil { ... 500 ... }
       c.JSON(http.StatusOK, gin.H{"last_read_message_id": latest})
   }
   ```

4. **`backend/internal/handlers/handlers.go`** — đăng ký route:
   ```go
   protected.GET("/messages/unread-count", msg.UnreadCount)
   protected.POST("/messages/read", msg.MarkRead)
   ```
   (đặt trước `protected.POST("/messages", msg.Create)` về mặt khai báo
   không quan trọng vì Gin match theo path chính xác, không bị nhầm với
   `/messages/:id` kiểu param — ở đây không có route dạng `:id` nên không
   có rủi ro xung đột.)

### Frontend (React/TS)

1. **`frontend/src/api/messages.ts`** — thêm:
   ```ts
   export async function fetchUnreadCount(): Promise<number> {
     const { data } = await api.get<{ count: number }>('/messages/unread-count')
     return data.count
   }
   export async function markMessagesRead(): Promise<void> {
     await api.post('/messages/read')
   }
   ```

2. **`frontend/src/components/layout/AppLayout.tsx`**:
   - `useQuery({ queryKey: ['unread-messages'], queryFn: fetchUnreadCount, refetchInterval: 5000 })`
     — poll nhẹ hơn polling trong chat (5s thay vì 3s), vì đây chỉ là badge
     nền, không cần realtime sát sao.
   - Render **chấm đỏ** (không hiện số) ở góc `NavLink` "Trò chuyện":
     `<span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full
     bg-red-500 ring-2 ring-blue-600" />`, chỉ hiện khi `count > 0` — API
     vẫn trả về số lượng chính xác (không đổi backend), chỉ frontend không
     hiển thị con số, đơn giản hơn bản badge số ban đầu. `NavLink` cần thêm
     `relative` để chấm định vị đúng góc.

3. **`frontend/src/pages/FamilyChatPage.tsx`**:
   - Thêm `useEffect` chạy khi `messages` thay đổi (tức là mỗi lần có tin
     mới, kể cả từ polling): gọi `markMessagesRead()` rồi
     `queryClient.invalidateQueries({ queryKey: ['unread-messages'] })` để
     badge ở `AppLayout` mất/giảm ngay, không cần đợi chu kỳ poll 5s của
     riêng nó.
   - Không cần gọi khi `sending`/gửi tin của chính mình (chỉ cần khi nhận
     dữ liệu `messages` mới từ query, việc gửi tin cũng làm `messages`
     refetch nên đã tự bao gồм).

## Kiểm thử

1. **Backend:** `go build ./... && go vet ./... && go test ./...` qua
   container Docker (đã có sẵn cách làm) — pass trước khi deploy.
2. **Frontend:** `npm run lint && npm run build`.
3. Thủ công (2 tài khoản cùng nhà, VD `hiendc`/`trangdt`):
   - `trangdt` gửi 1 tin trong khi `hiendc` đang ở **Dashboard** (không mở
     tab Trò chuyện) → trong ≤ 5s, chấm đỏ hiện trên nav "Trò chuyện" của
     `hiendc`.
   - `hiendc` mở tab "Trò chuyện" → chấm đỏ biến mất ngay (không cần đợi F5).
   - `trangdt` gửi thêm 2 tin liên tiếp trong khi `hiendc` **đang mở sẵn**
     tab Trò chuyện → tin hiện ra bình thường (polling 3s) và chấm đỏ
     **không** hiện lên (vì đang xem, tính là đã đọc ngay).
   - Đăng nhập tài khoản mới tinh (chưa từng mở Trò chuyện, nếu nhà đã có
     lịch sử chat) → chấm đỏ hiện đúng (không phải bug, xem mục Context).
   - Responsive: chấm đỏ không vỡ layout nav ở mobile (< 400px).

Sau khi triển khai xong và verify đủ các bước trên, cập nhật dòng
**Trạng thái** ở đầu file này thành `Đã triển khai`.
