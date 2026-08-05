#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Deploy Personal Finance Chat trong 1 bước (chạy trên server Linux)
#
# Cách dùng:
#   1. Upload code mới lên server (ghi đè vào thư mục dự án, GIỮ NGUYÊN
#      backend/data/data.json — không xóa file dữ liệu).
#   2. cd vào thư mục dự án trên server.
#   3. Chạy: ./deploy.sh
#
# Script an toàn:
#   - Tự di trú dữ liệu cũ nếu volume trước đó mount sai (chống mất dữ liệu).
#   - Tự backup data.json trước khi rebuild.
#   - Kiểm tra sức khỏe sau khi chạy, báo lỗi nếu server không phản hồi.
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$ROOT/backups"
DATA_FILE="$ROOT/backend/data/data.json"
CONTAINER_NAME="pf-server"

step() { printf "\n==> [%d/5] %s\n" "$1" "$2"; }
fail() { printf "LỖI: %s\n" "$1" >&2; exit 1; }

# ---------- [1/5] Kiểm tra môi trường ----------
step 1 "Kiểm tra môi trường (docker, docker compose)"

command -v docker >/dev/null 2>&1 || fail "thiếu docker trên server"
[ -f "$ROOT/docker-compose.yml" ] || fail "chạy script từ thư mục gốc dự án (nơi có docker-compose.yml)"

COMPOSE=()
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  fail "thiếu docker compose (bản v2 hoặc v1)"
fi

# ---------- [2/5] Di trú dữ liệu cũ nếu volume trước đây mount sai ----------
step 2 "Kiểm tra dữ liệu cũ (di trú nếu cần)"

if [ ! -f "$DATA_FILE" ]; then
  CID="$(docker ps -aqf "name=^/pf-server$" | head -n 1)"
  if [ -n "$CID" ]; then
    mkdir -p "$ROOT/backend/data"
    if docker cp "$CID:/app/backend/data/data.json" "$DATA_FILE" 2>/dev/null; then
      echo "Đã di trú dữ liệu cũ từ container ($CID) ra host: $DATA_FILE"
    else
      rm -f "$DATA_FILE"
      echo "Container cũ không có dữ liệu tại /app/backend/data, bỏ qua di trú."
    fi
  else
    echo "Không có container cũ nào, bỏ qua di trú."
  fi
else
  echo "Đã có $DATA_FILE, không cần di trú."
fi

# ---------- [3/5] Backup dữ liệu ----------
step 3 "Backup dữ liệu trước khi rebuild"

mkdir -p "$BACKUP_DIR"
if [ -f "$DATA_FILE" ]; then
  cp "$DATA_FILE" "$BACKUP_DIR/data_$STAMP.json"
  echo "Đã backup: backups/data_$STAMP.json"
else
  echo "Chưa có file dữ liệu, bỏ qua backup."
fi

# ---------- [4/5] Build + chạy ----------
step 4 "Rebuild image và khởi động lại container"

"${COMPOSE[@]}" up -d --build

# ---------- [5/5] Kiểm tra sức khỏe ----------
step 5 "Kiểm tra sức khỏe"

PORT="$("${COMPOSE[@]}" port "$CONTAINER_NAME" 8080 2>/dev/null | head -n 1 | awk -F: '{print $NF}')"
[ -z "$PORT" ] && PORT="8080"
URL="http://127.0.0.1:$PORT/api/config"

echo "Đang kiểm tra $URL ..."
for i in $(seq 1 12); do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    echo "OK: server phản hồi thành công (sau ${i}x5s)."
    break
  fi
  [ "$i" -eq 12 ] && fail "server chưa phản hồi sau 60s — xem log: ${COMPOSE[*]} logs"
  sleep 5
done

if [ -f "$DATA_FILE" ]; then
  SIZE="$(wc -c < "$DATA_FILE" | tr -d ' ')"
  echo "Dữ liệu còn nguyên: $DATA_FILE ($SIZE bytes)."
else
  echo "CẢNH BÁO: chưa thấy file dữ liệu tại $DATA_FILE."
fi

echo ""
echo "Deploy hoàn tất. Kiểm tra trang web: https://personal-finance.com.vn"
