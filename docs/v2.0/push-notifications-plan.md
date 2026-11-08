> **Trạng thái:** Đã triển khai code — 19 test pass; đã kiểm tra bằng Chrome giả lập (khối Thông báo ẩn trên máy tính, hiện trên điện thoại; bật thông báo gửi đăng ký lên server; service worker nhận sự kiện push). **Chưa thử gửi/nhận thật:** cần dán `Code.gs` mới, tạo khoá VAPID, đặt biến môi trường trên Vercel rồi thử trên điện thoại thật.

# Thông báo đẩy: khoản chi mới + nhắc việc hằng ngày 20:00

## Context

Người dùng muốn (1) nhận thông báo khi có **khoản chi mới**, (2) được **nhắc việc hằng ngày
lúc 20:00**. Đã chốt:

- Thông báo khoản chi mới gửi cho **người khác trong nhà** (người ghi không tự nhận).
- Nhắc 20:00 **chỉ gửi khi còn việc chưa tích** trong ngày.
- Đang dùng Vercel **Hobby** → cron chỉ chạy 1 lần/ngày, có thể lệch trong vòng 1 giờ
  (20:00–20:59). Nếu cần đúng giờ hơn thì gọi cùng endpoint từ dịch vụ cron ngoài (xem mục Rủi ro).

Cách làm: **Web Push** (VAPID) qua service worker `sw.js` đã có. Không cần app native.
iOS chỉ nhận được khi app đã **Thêm vào MH chính** và iOS ≥ 16.4.

**Chỉ dành cho điện thoại/máy tính bảng** (người dùng yêu cầu: website trên máy tính không cần thông báo):
khối "Thông báo" trong màn Tài khoản chỉ hiện trên thiết bị di động (Android, iPhone, iPad). Trên máy tính
không có nút bật nên không có đăng ký nào được tạo, server cũng không gửi gì tới máy tính.

## Thiết kế

### Lưu đăng ký thông báo (Google Sheet, tab `push_subs` tự tạo)

`id | username | endpoint | p256dh | auth | spend | habit | created_at | last_habit_date`

- Mỗi thiết bị một dòng (upsert theo `endpoint`); `spend`/`habit` = 1/0 là lựa chọn của người dùng.
- `last_habit_date` (yyyy-MM-dd) để mỗi ngày chỉ nhắc một lần, kể cả khi cron bị gọi hai lần.
- Đăng ký chết (push service trả 404/410) thì tự xoá dòng.

### Apps Script (`apps-script/Code.gs`) — action mới, chỉ gọi từ server (có TOKEN)

`push_save`, `push_remove`, `push_list` (tất cả đăng ký), `push_mark` (ghi `last_habit_date`),
`habit_all` (việc + lượt tích của mọi người từ N ngày trước, dùng cho nhắc nhở).

### Proxy (`api/pf.js`) — cần phiên đăng nhập, username lấy từ session

- `push_key` → trả VAPID public key.
- `push_subscribe {subscription, spend, habit}` → lưu/cập nhật cho **chính user đó**.
- `push_unsubscribe {endpoint}`; `push_test` → gửi thử về các thiết bị của chính user.
- Trong `add`: sau khi ghi thành công, chạy nền `notifySpend(user, item)` bằng `waitUntil`
  (`@vercel/functions`) để **không làm chậm** phản hồi. Gửi tới mọi đăng ký có `spend=1`
  và `username ≠ người ghi`. Nội dung: "Hiền vừa chi 45.000đ — Cafe".

### Cron nhắc việc (`api/remind.js`, mới)

- `vercel.json`: `crons: [{ "path": "/api/remind", "schedule": "0 13 * * *" }]`
  (13:00 UTC = 20:00 giờ Việt Nam).
- Chỉ nhận `Authorization: Bearer $CRON_SECRET` (Vercel tự gửi khi có biến `CRON_SECRET`), sai → 401.
- Luồng: `push_list` + `habit_all` → với mỗi đăng ký `habit=1` chưa nhắc hôm nay, dùng
  `habits.js` (`appliesOn`, `dayStats`; đã chạy được trong Node) tính việc chưa tích của user đó
  → nếu còn việc: gửi "Hôm nay còn 2 việc chưa xong: Đọc sách, Thiền" → `push_mark`.

### Logic dùng chung (`api/_push.js`, mới; tiền tố `_` để Vercel không coi là route)

Gói `web-push`: khởi tạo VAPID, `sendTo(sub, payload)`, dọn đăng ký chết, giới hạn thời gian gửi.

### Service worker (`sw.js`) và giao diện

- `push` → `showNotification` (icon `/icons/icon-192.png`, `tag` để gộp, `data.url`);
  đồng thời `postMessage` cho các tab đang mở để gọi `refresh()` ngay.
- `notificationclick` → focus tab đang mở hoặc mở `/?go=chat` (khoản chi) / `/?go=habit` (nhắc việc).
  Thêm xử lý `go=habit` lúc khởi động trong `index.html` (hiện mới có `go=dash`).
- Màn **Tài khoản**: khối "Thông báo" gồm nút **Bật thông báo** (xin quyền khi người dùng bấm),
  2 công tắc *Khoản chi mới của người khác* và *Nhắc việc hằng ngày 20:00*, nút **Gửi thử**,
  dòng trạng thái và hướng dẫn riêng cho iOS. **Ẩn khối này** khi không phải thiết bị di động
  (`/Android|iPhone|iPad|iPod/i` trong user agent, hoặc iPadOS giả Mac có `maxTouchPoints > 1`) hoặc
  trình duyệt không hỗ trợ push. Server cũng từ chối `push_subscribe` nếu client không khai `mobile: true`
  (chỉ là lớp phòng thủ nhẹ, không phải bảo mật).

### Biến môi trường và phụ thuộc

- Vercel + `.env.local`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:...`), `CRON_SECRET`.
  Tạo khoá bằng `npx web-push generate-vapid-keys` (người dùng tự chạy, **không dán khoá vào chat/commit**).
- `package.json`: thêm `web-push`, `@vercel/functions`. Vercel tự cài khi deploy; máy dev chạy `npm install`.
- `dev-server.js`: gắn thêm `/api/remind` để thử cục bộ.

## Phạm vi thay đổi

`apps-script/Code.gs`, `api/pf.js`, `api/_push.js` (mới), `api/remind.js` (mới), `habits.js` (dùng lại, không đổi
logic), `sw.js`, `index.html`, `vercel.json`, `package.json`, `dev-server.js`, `tests/push.test.js` (mới),
`README.md`, `docs/v2.0/simple-sheets-guide.md`.

## Các bước

1. Lập file plan này, người dùng duyệt.
2. Apps Script: 5 action mới + tab `push_subs` (tự tạo).
3. `api/_push.js`, `api/remind.js`, mở rộng `api/pf.js` + test bằng `web-push` và Apps Script giả.
4. `sw.js` (push, click) + khối Thông báo trong màn Tài khoản + xử lý `go=habit`.
5. `vercel.json` cron, `package.json`, `dev-server.js`, tài liệu.
6. Verify, cập nhật trạng thái plan.

## Kiểm thử

- `node --test tests/*.test.js`, trong đó `push.test.js` kiểm tra:
  - thông báo chi tiêu **không** gửi cho người ghi, tôn trọng công tắc `spend`;
  - nhắc việc chỉ gửi khi còn việc chưa tích, **mỗi ngày một lần** (gọi `/api/remind` hai lần chỉ nhắc một);
  - `/api/remind` thiếu/sai `CRON_SECRET` → 401; đăng ký trả 410 bị xoá;
  - `push_subscribe` luôn gắn với user trong session, không nhận username từ client.
- Thử cục bộ bằng Chrome DevTools ở chế độ giả lập điện thoại (đổi user agent nên khối Thông báo hiện ra) trên
  `http://localhost:8000` (localhost là secure context): bật thông báo, dùng 2 tài khoản trên 2 cửa sổ,
  ghi khoản chi và thấy thông báo ở bên kia; trên máy tính thường khối này **không hiện**;
  gọi `curl -H "Authorization: Bearer <CRON_SECRET>" localhost:8000/api/remind` để thử nhắc việc.
- Trên điện thoại thật (sau deploy): Android Chrome và iPhone (đã Thêm vào MH chính, iOS ≥ 16.4);
  nhận thông báo khi app đóng, chạm vào mở đúng tab.

## Việc người dùng cần làm

1. Dán `Code.gs` mới và deploy phiên bản mới của Apps Script.
2. Tạo khoá VAPID, đặt 4 biến môi trường trên Vercel rồi **Redeploy** (và vào `.env.local` nếu muốn thử cục bộ).
3. Mở app, vào **Tài khoản → Bật thông báo** trên từng thiết bị.

## Rủi ro / lưu ý

- **Hobby:** cron 1 lần/ngày và có thể lệch tới ~59 phút. Cần đúng 20:00 thì dùng dịch vụ cron ngoài
  miễn phí (vd. cron-job.org) gọi `/api/remind` với header `Authorization: Bearer <CRON_SECRET>` lúc 20:00;
  nhờ cơ chế `last_habit_date` nên dùng song song với cron của Vercel cũng **không bị nhắc hai lần**.
- iOS chỉ nhận push khi đã cài ra màn hình chính; nếu người dùng từ chối quyền thì phải bật lại trong Cài đặt máy.
- Nội dung thông báo hiện cả số tiền ở màn hình khoá; có công tắc tắt cho từng loại.
- Apps Script chậm (1–2 giây/lần): mọi việc gửi chạy nền, không chặn thao tác ghi chi tiêu.
- Ngoài phạm vi: nhắc theo giờ riêng cho từng việc, thông báo khi sửa/xoá khoản chi.

## Ghi chú triển khai

- Thêm `api/_gas.js` (dùng chung việc gọi Apps Script) để `pf.js`, `remind.js`, `_push.js` không trùng mã.
- Thêm action Apps Script `push_get` (đọc lựa chọn của thiết bị khi mở màn Tài khoản) ngoài các action đã nêu.
- Đăng xuất sẽ gỡ đăng ký thông báo của thiết bị đó để không nhận thông báo của người đã thoát.
- Cron Vercel `0 13 * * *` (20:00 giờ VN; Hobby có thể lệch tới ~59 phút).
