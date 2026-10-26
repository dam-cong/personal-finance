# Kế hoạch triển khai Version 2.0

> **Trạng thái:** Đang triển khai — Phase 1 code xong, backend/frontend checks
> pass; Phase 0 xong phần local, đang làm tài khoản Google Cloud/Vercel.
>
> **Version:** 2.0
>
> **Ngày lập:** 2026-10-25
>
> **Tài liệu thiết kế chi tiết:**
> [`vercel-google-sheets-plan.md`](vercel-google-sheets-plan.md)
>
> File này là **kế hoạch thực thi theo phase**. Khi có khác biệt giữa file này
> và tài liệu thiết kế, ưu tiên tài liệu thiết kế; nếu vẫn chưa rõ, dừng lại
> và hỏi người dùng.

---

## 1. Mục đích

Chia việc triển khai Version 2.0 thành các phase có thứ tự, điều kiện vào,
điều kiện ra và cách kiểm tra riêng. Mỗi phase phải xong và verify trước khi
sang phase tiếp theo.

Kết quả cuối cùng:

- Frontend Vite + backend Go chạy trên **một Vercel project**.
- Dữ liệu nằm trong **Google Sheets**.
- Không còn family chat, unread badge, upload ảnh/avatar/ảnh nhà.
- Dữ liệu mới, không migrate bản 1.0.
- Có rollback về bản Docker 1.0 trong thời gian chuyển đổi.
- Bảo mật git/secret là phase riêng, cần duyệt lại trước khi thực hiện.

---

## 2. Nguyên tắc thực thi

1. **Đúng thứ tự phase.** Không nhảy sang Sheets/Vercel khi Phase 1 chưa xong.
2. **Không migrate dữ liệu cũ.** Bản 2.0 bắt đầu bằng sheet mới + user seed.
3. **Không commit secret** dưới mọi hình thức.
4. **Không xoá file/dữ liệu/git history** khi chưa xin phép rõ ràng.
5. **Giữ bản 1.0 chạy được** cho đến khi bản 2.0 pass checklist.
6. **Mỗi phase có verify riêng.** Không báo xong nếu chưa chạy kiểm tra.
7. **Không mở rộng scope.** Không thêm lại chat/ảnh, không thêm tính năng mới.
8. **Dừng khi Vercel Go runtime/Services không đáp ứng.** Báo người dùng, không
   tự đổi nhà cung cấp.

---

## 3. Tổng quan các phase

| Phase | Kết quả | Phụ thuộc | Gate |
|---|---|---|---|
| 0 | Môi trường + tài khoản + backup sẵn sàng | — | Có đủ Go, GCP, Vercel, sheet preview |
| 1 | Bỏ family chat + toàn bộ ảnh | Phase 0 | App vẫn chạy với FileStore |
| 2 | Repository + Google Sheets + init + timezone | Phase 1 | API tương đương bản file |
| 3 | Vercel Services chạy preview | Phase 2 | Preview pass smoke test |
| 4 | Verify đầy đủ + production + bàn giao | Phase 3 | Checklist pass, rollback sẵn |
| 5 | Bảo mật git/secret | Phase 4 + duyệt riêng | Repo private, history sạch |

> Phase 4 có thể deploy lên `*.vercel.app` để kiểm tra. **Chưa chuyển domain
> production** cho đến khi Phase 5 hoàn tất hoặc người dùng chấp nhận rủi ro
> công khai.

---

## 4. Phase 0 — Chuẩn bị

### Mục tiêu

Có đủ công cụ, quyền truy cập, dữ liệu backup và môi trường thử nghiệm trước
khi sửa code.

### Công việc

- [x] Cài **Go 1.25+**; chạy `go version` thành công.
      Đã cài Go 1.27.0 bằng winget.
- [x] Kiểm tra **Node.js 20+**, `npm`, `npx`.
      Đã có Node 26.1.0, npm/npx 11.13.0.
- [x] Backup `backend/data/data.json`, `data/data.json`, `data/test-e2e.json`
      và thư mục upload ra ngoài repo; ghi lại checksum.
      Đã lưu tại `C:\Users\Admin\Desktop\personal-finance-backup-2026-10-25`
      kèm `SHA256SUMS.txt`; đã verify checksum.
- [ ] Xác nhận bản Docker 1.0 đang chạy được và có đường rollback.
      Chưa xác nhận: Docker engine local không chạy, domain
      `personal-finance.com.vn` không resolve từ máy này.
- [ ] Tạo Google Cloud project.
- [ ] Bật **Google Sheets API**.
- [ ] Tạo service account `pf-sheets`; tải key JSON.
- [ ] Tạo spreadsheet **preview** `Personal Finance Data (Preview)`.
- [ ] Share spreadsheet cho email service account, quyền **Editor**.
- [ ] Lưu Spreadsheet ID của preview.
- [ ] Tạo Vercel project; link repo; chưa deploy production.
- [ ] Chuẩn bị bộ user seed mới; mật khẩu lưu ngoài repo.
- [ ] Tạo `JWT_SECRET` mới (≥ 32 bytes) và `INIT_SECRET` tạm.
- [ ] Xác nhận không đưa key JSON, mật khẩu, secret vào file/thông báo.

### Điều kiện ra

- `go test ./...` chạy được trên code hiện tại.
- Có Spreadsheet ID preview + service account key hoạt động.
- Có Vercel project + env preview.
- Có backup bản 1.0 và checksum.

### Rollback

Không thay đổi gì để rollback. Chỉ cần dừng trước Phase 1.

---

## 5. Phase 1 — Bỏ family chat và toàn bộ ảnh

### Mục tiêu

Loại bỏ hoàn toàn tính năng không thuộc 2.0, nhưng vẫn giữ app chạy với
FileStore để kiểm tra regression trước khi đổi store.

### Phase 1A — Backend

- [x] Xoá `backend/internal/handlers/message.go` (xin phép trước khi xoá file).
- [x] Xoá `models.Message`, `LastReadMessageID`, `AvatarFilename`,
      `Household.ImageFilename`.
- [x] Xoá field `Messages`, `NextMessageID` khỏi file data.
- [x] Xoá method store liên quan message/ảnh:
      `CreateMessage`, `ListMessagesByHousehold`, `LatestMessageID`,
      `MarkMessagesRead`, `CountUnreadMessages`,
      `UpdateHouseholdImage`, `UpdateUserAvatar`.
- [x] Xoá route `/api/messages*`, `/api/household/image`,
      `/api/me/avatar`.
- [x] Xoá upload dir, `serveUploadDir`, giới hạn file ảnh, `avatarURL`.
- [x] Bỏ CORS middleware và dependency `gin-contrib/cors`.
- [x] Cập nhật handler/response: không trả `image_url`, `avatar_url`.
- [x] Cập nhật test: bỏ test message/ảnh; thêm test xác nhận route đã bị bỏ.
- [x] Chạy:
      `cd backend; go test ./...; go vet ./...`
- [x] Chạy `go mod tidy`; kiểm tra `gin-contrib/cors` không còn trong `go.mod`.

### Phase 1B — Frontend

- [x] Xoá `frontend/src/pages/FamilyChatPage.tsx` (xin phép trước khi xoá file).
- [x] Xoá `frontend/src/components/familychat/FamilyChatWindow.tsx`.
- [x] Xoá `frontend/src/components/familychat/FamilyMessageBubble.tsx`.
- [x] Xoá `frontend/src/api/messages.ts`.
- [x] `App.tsx`: bỏ lazy import + route `/family-chat`.
- [x] `AppLayout.tsx`: bỏ unread query, badge, nav family chat, ảnh nhà,
      `avatarUrl`.
- [x] `BottomNav.tsx`: bỏ tab Gia đình + badge; thay bằng tab **Chat** để giữ
      5 cột đối xứng; FAB giữa vẫn hoạt động.
- [x] `BottomNavIcons.tsx`: bỏ icon family, thêm icon Chat.
- [x] `Avatar.tsx`: chỉ còn chữ cái đầu; bỏ prop `avatarUrl`.
- [x] `ProfileModal.tsx`: bỏ upload/preview avatar; chỉ sửa `display_name`.
- [x] `HouseholdInfoModal.tsx`: bỏ upload/preview ảnh nhà.
- [x] `ChatInput.tsx`: bỏ paperclip, file input, `onSendImage`.
- [x] `ChatWindow.tsx`: bỏ `backgroundImageUrl`.
- [x] `ChatPage.tsx`: bỏ query household chỉ dùng cho ảnh nền.
- [x] `MessageBubble.tsx`: bỏ auth/avatar URL; dùng `Avatar label`.
- [x] `LoginPage.tsx`, `stores/auth.ts`: bỏ `avatarUrl` khỏi `setAuth`,
      `setProfile`.
- [x] `types/index.ts`: bỏ `FamilyMessage`, `image_url`, `avatar_url`.
- [x] `api/profile.ts`: bỏ `uploadAvatar`, `avatar_url`.
- [x] `api/household.ts`: bỏ `uploadHouseholdImage`.
- [x] `vite.config.ts`: proxy chỉ còn `/api`; bỏ `/avatars`, `/chat-images`.
- [x] Grep sạch các chuỗi:
      `family-chat`, `FamilyChat`, `messages`, `unread-messages`,
      `avatar_url`, `image_url`, `uploadAvatar`,
      `uploadHouseholdImage`, `/avatars`, `/chat-images`.
      (Ngoại lệ: biến `messages` của chat chi tiêu trong `ChatPage` là hợp lệ.)
- [x] Chạy:
      `cd frontend; npm run lint; npm run build`.
- [ ] Kiểm tra tay desktop ≥ 1024px và mobile < 400px:
      login, chat, dashboard, bottom nav, FAB, avatar chữ cái đầu.

> **Ghi chú Phase 1:** backend verify bằng Go portable 1.25.0 trong temp
> (không cài vào máy). `go test ./...` và `go vet ./...` pass; `go mod tidy`
> đã bỏ `gin-contrib/cors`. Smoke test với `DATA_FILE` tạm: server khởi động,
> `/api/messages` trả 404. Frontend `npm run lint` + `npm run build` pass.

### Điều kiện ra

- App chạy với `DATA_BACKEND=file`.
- Không còn route/API/UI family chat hoặc ảnh.
- Backend test/vet pass; frontend lint/build pass.
- Không có thay đổi ngoài phạm vi bỏ tính năng.

### Rollback

- Revert code Phase 1 (khi được phép dùng git).
- Dữ liệu JSON 1.0 vẫn còn; không xoá.

---

## 6. Phase 2 — Repository, Google Sheets, init, timezone

### Mục tiêu

Tách store thành interface, thêm SheetsStore, init dữ liệu mới, chuẩn hoá
timezone, giữ FileStore cho local/Docker.

### Phase 2A — Repository + FileStore

- [ ] Tạo `backend/internal/store/repository.go` với interface `Repository`.
- [ ] Đổi `store.Store` → `store.FileStore`; constructor `NewFileStore`.
- [ ] Đổi handler từ `*store.Store` sang `store.Repository`.
- [ ] Đổi `currentHouseholdID` và handler budget sang interface.
- [ ] Thêm `HouseholdID` vào `models.Transaction`.
- [ ] Handler tạo transaction set `HouseholdID` trước khi gọi store.
- [ ] `CreateTransaction` từ chối `household_id=0` hoặc amount ≤ 0.
- [ ] `ListTransactionsByHousehold` dùng `HouseholdID`; fallback username cho
      dữ liệu file cũ nếu cần.
- [ ] Cập nhật test FileStore; thêm test soft delete/transaction household.
- [ ] Chạy `go test ./...` + `go vet ./...`.

### Phase 2B — SheetsStore + init

- [ ] Thêm dependency:
      `go get google.golang.org/api/sheets/v4 golang.org/x/oauth2/google`.
- [ ] Tạo `sheets_client.go`: auth, batchGet, append, update, retry 429/5xx.
- [ ] Tạo `sheets_store.go`: parse/serialize 5 tab theo tài liệu thiết kế.
- [ ] Sinh ID bằng `UnixMilli()*1000 + random`; không dùng `next_id`.
- [ ] Cache đọc TTL 10s; write invalidate cache.
- [ ] Soft delete giao dịch/budget; giữ row number ổn định.
- [ ] Thêm endpoint `POST /api/admin/init` + `INIT_SECRET`.
- [ ] Init idempotent: tạo tab/header/household/user seed nếu thiếu; header sai
      thì báo lỗi, không ghi đè.
- [ ] Không seed user tự động trong `main` khi `DATA_BACKEND=sheets`.
- [ ] Thêm config: `DATA_BACKEND`, `GOOGLE_SHEETS_ID`,
      `GOOGLE_SERVICE_ACCOUNT_JSON_B64`, `SHEETS_CACHE_TTL`, `INIT_SECRET`,
      `APP_LOCATION`.
- [ ] `main.go`: chọn FileStore/SheetsStore; bỏ CORS/upload; chỉ serve frontend
      khi `SERVE_FRONTEND=true`.
- [ ] Import `_ "time/tzdata"`; thay `time.Local` bằng `APP_LOCATION`.
- [ ] Unit test parser Sheets, cache, retry, ID, init bằng fake client.
- [ ] Test local với sheet preview; kiểm tra dữ liệu đúng cột/tab.
- [ ] Chạy `go test ./...` + `go vet ./...`.

### Điều kiện ra

- `DATA_BACKEND=file` vẫn hoạt động như Phase 1.
- `DATA_BACKEND=sheets` chạy được với preview sheet.
- Init tạo đúng dữ liệu, gọi lại không nhân đôi.
- API login/transaction/budget/dashboard tương đương bản file.
- Không lộ secret trong log/response.

### Rollback

- Đổi `DATA_BACKEND=file` để quay lại JSON store.
- Không xoá sheet preview; có thể bỏ và tạo lại.

---

## 7. Phase 3 — Vercel Services (preview)

### Mục tiêu

Chạy cả frontend và backend trên Vercel bằng một project, dùng sheet preview.

### Công việc

- [ ] Tạo `vercel.json` theo tài liệu thiết kế:
      services `web` + `api`, rewrite `/api/*` → api, còn lại → web.
- [ ] Tạo `.vercelignore`; loại dữ liệu local, log, `.env`, `dist`.
- [ ] Giữ **Root Directory = repo root** trên Vercel.
- [ ] Set env preview theo bảng trong tài liệu thiết kế.
- [ ] Deploy preview: `npx vercel`.
- [ ] Gọi init preview bằng `POST /api/admin/init` + `X-Init-Secret`.
- [ ] Kiểm tra sheet preview có đủ tab + user seed.
- [ ] Xoá `INIT_SECRET` khỏi Preview; redeploy.
- [ ] Kiểm tra:
      - `/` và `/login`, `/chat`, `/dashboard` không 404.
      - `/api/config` trả đúng; không lộ secret.
      - Login, chat, transaction, budget, dashboard hoạt động.
      - Ngày/tháng đúng timezone Việt Nam.
      - Không có request `/avatars`, `/chat-images`, `/messages`.
      - Function log sạch lỗi credential/quota.
- [ ] Chạy `npx vercel build` nếu cần kiểm tra cấu hình trước deploy.

### Điều kiện ra

- Preview pass smoke test.
- Không ghi nhầm sang sheet production.
- Không có lỗi build/routing nghiêm trọng.

### Rollback

- Rollback deployment trên Vercel dashboard.
- Xoá preview project nếu cần; không ảnh hưởng bản 1.0.

---

## 8. Phase 4 — Verify đầy đủ, production, bàn giao

### Mục tiêu

Chạy checklist đầy đủ, deploy production trên Vercel, chuẩn bị bàn giao và
đường rollback.

### Công việc

- [ ] Tạo spreadsheet production riêng; share cho service account.
- [ ] Set env production; dùng secret mới, không dùng lại preview.
- [ ] Deploy production: `npx vercel --prod`.
- [ ] Gọi init production một lần; kiểm tra dữ liệu.
- [ ] Xoá `INIT_SECRET` khỏi Production; redeploy.
- [ ] Backup sheet production ngay sau init.
- [ ] Chạy checklist chức năng đầy đủ trong tài liệu thiết kế:
      đăng nhập/đăng ký, chat, xoá giao dịch, dashboard 4 kỳ, budget,
      household, profile, SPA routing, responsive, timezone.
- [ ] Kiểm tra quyền: user không xoá được giao dịch người khác.
- [ ] Kiểm tra quota/429 khi thao tác liên tục.
- [ ] Cập nhật `README.md` sang hướng dẫn 2.0.
- [ ] Cập nhật `backend/.env.example`; không chứa secret thật.
- [ ] Ghi chú rollback và domain.
- [ ] Cập nhật trạng thái plan thành `Đã triển khai` sau khi verify.

### Điều kiện ra

- Checklist pass.
- Production chạy trên `*.vercel.app`.
- Bản 1.0 vẫn có thể bật lại.
- Không còn secret init.
- Có backup sheet production.

### Rollback

- Rollback Vercel deployment hoặc trỏ domain về VPS 1.0.
- Không xoá sheet/JSON cũ trong thời gian chuyển đổi.

> Chưa chuyển domain `personal-finance.com.vn` nếu Phase 5 chưa xong, trừ khi
> người dùng chấp nhận rủi ro public.

---

## 9. Phase 5 — Bảo mật git và secret

> **Cần người dùng duyệt lại trước khi bắt đầu.** Không tự chạy các lệnh
> git nguy hiểm.

### Mục tiêu

Loại bỏ secret khỏi repo/history và giảm rủi ro repo public.

### Công việc

- [ ] Chuyển repository sang **private**.
- [ ] Xoá `data/data.json`, `data/test-e2e.json`, `backend/server.log` khỏi
      git history bằng `git filter-repo`.
- [ ] Rotate toàn bộ:
      - mật khẩu seed,
      - `JWT_SECRET`,
      - Google service account key,
      - `INIT_SECRET` nếu còn.
- [ ] Cập nhật env Vercel + local sau rotate.
- [ ] Force-push history đã rewrite (chỉ sau khi được duyệt rõ ràng).
- [ ] Kiểm tra lại repo không còn secret; deploy lại và test login/Sheets.
- [ ] Thông báo cho thành viên repo cũ clone lại.

### Điều kiện ra

- Repo private.
- History không còn file/secret nhạy cảm.
- Secret cũ không còn hiệu lực.
- Production vẫn hoạt động sau rotate.

### Rollback

- Khôi phục repo từ backup trước khi rewrite nếu cần.
- Rotate lại secret nếu nghi ngờ lộ.

---

## 10. Thứ tự phụ thuộc

```text
Phase 0 (chuẩn bị)
   |
   v
Phase 1 (bỏ chat/ảnh, vẫn FileStore)
   |
   v
Phase 2 (Repository + Sheets + init + timezone)
   |
   v
Phase 3 (Vercel preview)
   |
   v
Phase 4 (verify + production + bàn giao)
   |
   v
Phase 5 (bảo mật git/secret — cần duyệt riêng)
```

Không bắt đầu Phase 2 khi Phase 1 chưa pass test. Không deploy production khi
Phase 3 preview chưa ổn định.

---

## 11. Gate checklist

### Gate A — Sau Phase 0

- [ ] Go/Node chạy được.
- [ ] Có backup 1.0 + checksum.
- [ ] Có GCP service account + spreadsheet preview.
- [ ] Có Vercel project + env preview.

### Gate B — Sau Phase 1

- [ ] Không còn family chat/ảnh ở backend và frontend.
- [ ] `go test ./...`, `go vet ./...` pass.
- [ ] `npm run lint`, `npm run build` pass.
- [ ] App vẫn chạy với FileStore.

### Gate C — Sau Phase 2

- [ ] FileStore và SheetsStore cùng pass test.
- [ ] Init idempotent.
- [ ] API parity.
- [ ] Timezone đúng.

### Gate D — Sau Phase 3

- [ ] Preview routing đúng.
- [ ] Preview login/CRUD/dashboard đúng.
- [ ] Không lỗi quota/credential kéo dài.
- [ ] `INIT_SECRET` preview đã xoá.

### Gate E — Sau Phase 4

- [ ] Checklist chức năng đầy đủ pass.
- [ ] Production chạy trên Vercel.
- [ ] Backup production có.
- [ ] Rollback 1.0 sẵn sàng.

### Gate F — Sau Phase 5

- [ ] Repo private.
- [ ] History sạch secret.
- [ ] Secret cũ đã rotate.
- [ ] Production vẫn hoạt động.

---

## 12. Lệnh kiểm thử chính

```powershell
# Backend
cd backend
go test ./...
go vet ./...

# Frontend
cd ../frontend
npm run lint
npm run build

# Vercel
cd ..
npx vercel build
npx vercel
npx vercel --prod
```

Với thao tác git ở Phase 5, chỉ chạy sau khi được người dùng cho phép rõ ràng.

---

## 13. Điều kiện dừng và báo người dùng

Dừng ngay, không tự xử lý tiếp, nếu gặp một trong các trường hợp:

- Vercel báo Go runtime/Services không hỗ trợ `go 1.25`.
- Không thể tạo/đọc/ghi Google Sheet do quyền hoặc quota.
- Phát hiện service account key hoặc secret bị lộ.
- Dữ liệu production/preview bị ghi nhầm hoặc mất.
- Cần xoá file, xoá dữ liệu, rewrite git history hoặc force-push.
- Cần đổi nhà cung cấp/kiến trúc ngoài kế hoạch.
- Có khác biệt lớn giữa code thực tế và tài liệu thiết kế.

---

## 14. Bàn giao

Dev tiếp nhận cần đọc theo thứ tự:

1. [`vercel-google-sheets-plan.md`](vercel-google-sheets-plan.md) — thiết kế,
   schema, API, cấu hình, checklist.
2. File này — thứ tự phase, gate và điều kiện dừng.
3. [`../v1.0/README.md`](../v1.0/README.md) — bối cảnh bản 1.0.

Không tự ý mở rộng scope, không migrate dữ liệu cũ, không commit secret.
