---
name: commit-push
description: Commit các thay đổi hiện tại và push lên nhánh main của repo Personal Finance (FamFin). Dùng khi người dùng gọi /commit-push hoặc nói "commit và push", "đẩy code lên main", "commit lên git". Nếu người dùng chỉ nói "commit" (tự push) thì chỉ commit.
---

# Commit và push lên `main`

Người dùng gọi skill này tức là **đã cho phép** commit + push cho lần này
(CLAUDE.md mục 7). Không mở rộng phép sang thao tác git khác.

**Phạm vi theo lời người dùng:**
- "commit và push" / `/commit-push` → commit rồi push.
- "chỉ commit" / "tôi sẽ push" → **chỉ commit**, không push; in sẵn lệnh
  `git push origin main` để họ tự chạy.

## Quy trình

Chạy **từng bước nhỏ, tách lệnh** (xem `add`, kiểm tra secret, `commit`,
`push` là các lệnh riêng). Gộp tất cả vào một lệnh dài dễ bị bộ phân loại
quyền chặn.

1. **Xem hiện trạng** (chạy song song):
   - `git branch --show-current`
   - `git status --short`
   - `git diff --stat` và `git log --oneline -5` (để theo văn phong commit cũ)
2. **Kiểm tra nhánh:** phải đang ở `main`.
   - Đang ở nhánh khác → dừng, hỏi người dùng (không tự `checkout`/đổi nhánh).
   - Nhánh `master` cũ → báo là repo đã đổi sang `main`, hỏi trước khi làm gì.
3. **Không có thay đổi** → báo "không có gì để commit", dừng.
4. **Kiểm tra trước khi add:**
   - Chạy test: `node tests/parser.test.js`; nếu sửa `api/` hoặc `tests/proxy`
     thì thêm `node tests/proxy.test.js`. Lỗi → dừng, báo, không commit.
   - `.env.local` / `.env*` phải bị ignore (`git check-ignore -v .env.local`)
     và **không** xuất hiện trong `git status`.
   - Không commit: key JSON, token, mật khẩu, URL Apps Script thật,
     `data/*.json`, ảnh chụp màn hình/tạm (`.claude/settings.local.json`...).
   - Thấy file đáng ngờ → bỏ ra và báo người dùng.
5. **Stage có chọn lọc:** `git add <từng file hoặc thư mục>` — không dùng
   `git add -A` / `git add .`. Sau đó `git diff --cached --name-only` để đối
   chiếu danh sách.
6. **Dò secret trong nội dung đã stage** (không in giá trị ra màn hình):
   lấy giá trị thật trong `.env.local` (độ dài > 3) ghi vào file tạm, rồi
   `git diff --cached | grep -F -q -f <file tạm>`; xoá file tạm ngay sau đó.
   - Có khớp → **dừng**, bỏ file đó khỏi stage, báo người dùng (không in giá
     trị).
   - Không có `.env.local` → bỏ qua bước này.
7. **Viết commit message tiếng Việt** (CLAUDE.md mục 1):
   - Dòng đầu ≤ ~70 ký tự, nói **làm gì/vì sao**, không liệt kê file.
   - Thân (nếu cần): gạch đầu dòng ngắn.
   - Cuối message thêm đúng dòng attribution của hệ thống
     (`Co-Authored-By: ...`).
   - Dùng heredoc để giữ định dạng nhiều dòng.
8. **Commit** (lệnh riêng), rồi nếu được phép push: `git push origin main`
   - Lần đầu nhánh chưa có upstream: `git push -u origin main`.
   - **Không** `--force`, `--force-with-lease`, `--no-verify`, `--amend`.
   - Push bị từ chối (non-fast-forward) → dừng, báo người dùng; không tự
     `pull --rebase`/reset.
9. **Nếu lệnh bị chặn bởi quyền** (auto mode / hook):
   - **Không lách** bằng cách đổi cách gọi, không tự sửa cài đặt quyền.
   - Làm được đến đâu thì làm (ví dụ đã stage xong), dừng lại, nói rõ bước
     nào bị chặn.
   - Đưa cho người dùng 2 lựa chọn: tự chạy lệnh đó, hoặc tự thêm quy tắc
     `Bash(git commit:*)` / `Bash(git push origin main)` ở `/permissions`.
10. **Báo kết quả:** hash commit, số file, đã push hay chưa (và lệnh push nếu
    chưa). Nhắc khi push xong: Vercel tự deploy nếu Production Branch là
    `main`; thiếu env `APPS_SCRIPT_URL` / `APPS_TOKEN` thì app báo chưa cấu
    hình; trên iPhone đóng hẳn app rồi mở lại để tải bản mới.

## Không làm

- Không xoá nhánh (local hoặc remote), không `reset --hard`, `clean`,
  `checkout --`, `rebase`, `git rm` file người dùng chưa nói.
- Không tạo tag/PR trừ khi được yêu cầu.
- Không sửa git config và không sửa file cài đặt quyền của Claude Code.
