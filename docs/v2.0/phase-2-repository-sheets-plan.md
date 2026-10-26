> **Trạng thái:** Đang triển khai — Repository/FileStore/Admin stub done, building Sheets store.

# Phase 2 — Repository + Google Sheets + init + timezone

**Version:** 2.0  
**Ngày lập:** 2026-10-26  
**Tài liệu tham khảo:**
- [`vercel-google-sheets-plan.md`](vercel-google-sheets-plan.md)
- [`implementation-plan.md`](implementation-plan.md)

## Mục tiêu
Tách store thành interface, thêm Google Sheets store, endpoint init một lần, chuẩn hoá timezone VN, giữ FileStore cho local/Docker.

## Phạm vi
### Backend
- [ ] Tách `backend/internal/store/repository.go` — interface `Repository`
- [ ] Chuyển logic file store hiện tại sang `backend/internal/store/file_store.go` implement `Repository`
- [ ] Thêm `backend/internal/store/sheets_client.go` — Google Sheets API client (service account, base64 JSON)
- [ ] Thêm `backend/internal/store/sheets_store.go` — implement `Repository` cho Sheets
- [ ] Thêm `backend/internal/handlers/admin.go` — `POST /api/admin/init` bảo vệ bằng `X-Init-Secret` (constant-time, 404 nếu rỗng)
- [ ] Cập nhật `backend/internal/config/config.go` — thêm `DATA_BACKEND`, `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON_B64`, `SHEETS_CACHE_TTL`, `APP_LOCATION`, `APP_ENV`, `INIT_SECRET`, `SERVE_FRONTEND`
- [ ] Cập nhật `backend/cmd/server/main.go` — chọn store theo `DATA_BACKEND`; với `sheets` không seed user tự động; với `file` giữ seed; thêm `time/tzdata`
- [ ] Thêm `backend/internal/store/cache.go` — cache ngắn hạn cho Sheets
- [ ] Thêm `Transaction.HouseholdID` vào model nếu cần
- [ ] Dùng `time.Now().In(cfg.AppLocation)` khi ghi dữ liệu
- [ ] Dashboard dùng timezone config
- [ ] Bỏ CORS hoàn toàn (đảm bảo)

### Tests
- [ ] Unit test parser/sheets fake client
- [ ] FileStore tests vẫn pass
- [ ] Test `POST /api/admin/init` trả 404 khi `INIT_SECRET` rỗng hoặc sai

### Điều kiện ra
- [ ] `go test ./...`, `go vet ./...` pass
- [ ] FileStore hoạt động như cũ
- [ ] API tương đương với bản file
- [ ] Sẵn sàng deploy preview + init sheet

## Rollback
Revert Phase 2, giữ Phase 1.
