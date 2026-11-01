---
name: commit-push
description: Commit các thay đổi hiện tại và push lên nhánh main của repo Personal Finance (FamFin). Dùng khi người dùng gọi /commit-push hoặc nói "commit và push", "đẩy code lên main", "commit lên git".
---

# Commit và push lên `main`

Người dùng gọi skill này tức là **đã cho phép** commit + push cho lần này
(CLAUDE.md mục 7). Không mở rộng phép sang thao tác git khác.

## Quy trình

1. **Xem hiện trạng** (chạy song song):
   - `git branch --show-current`
   - `git status --short`
   - `git diff --stat` và `git log --oneline -5` (để theo văn phong commit cũ)
2. **Kiểm tra nhánh:** phải đang ở `main`.
   - Đang ở nhánh khác → dừng, hỏi người dùng (không tự `checkout`/đổi nhánh).
   - Nhánh `master` cũ → báo là repo đã đổi sang `main`, hỏi trước khi làm gì.
3. **Không có thay đổi** → báo "không có gì để commit", dừng.
4. **Kiểm tra an toàn trước khi add:**
   - Không commit secret: `.env*`, key JSON, token, mật khẩu, URL Apps Script
     thật kèm mã chung, `data/*.json` dữ liệu thật.
   - Thấy file đáng ngờ → bỏ ra và báo người dùng.
   - Nếu sửa `index.html` / `parser.js`: chạy `node tests/parser.test.js`; lỗi
     thì dừng và báo, không commit.
5. **Stage có chọn lọc:** `git add <từng file hoặc thư mục>` — không dùng
   `git add -A` / `git add .` khi chưa rà danh sách. Thư mục ảnh/tạm
   (`.claude/settings.local.json`...) không đưa vào nếu không liên quan.
6. **Viết commit message tiếng Việt** (CLAUDE.md mục 1):
   - Dòng đầu ≤ ~70 ký tự, nói **làm gì/vì sao**, không liệt kê file.
   - Thân (nếu cần): gạch đầu dòng ngắn.
   - Cuối message thêm đúng dòng attribution của hệ thống
     (`Co-Authored-By: ...`).
   - Dùng heredoc để giữ định dạng nhiều dòng.
7. **Commit** rồi **push**: `git push origin main`
   - Lần đầu nhánh chưa có upstream: `git push -u origin main`.
   - **Không** `--force`, `--force-with-lease`, `--no-verify`, `--amend`.
   - Push bị từ chối (non-fast-forward) → dừng, báo người dùng; không tự
     `pull --rebase`/reset.
8. **Báo kết quả:** hash commit, số file, nhánh đã push. Nhắc nếu repo nối
   Vercel thì sẽ tự deploy, và trên iPhone nên đóng hẳn app rồi mở lại để
   tải bản mới.

## Không làm

- Không xoá nhánh (local hoặc remote), không `reset --hard`, `clean`,
  `checkout --`, `rebase`, `git rm` file người dùng chưa nói.
- Không tạo tag/PR trừ khi được yêu cầu.
- Không sửa git config.
