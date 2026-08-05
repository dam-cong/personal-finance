.PHONY: build run test lint dev-backend dev-frontend clean

# Build frontend + backend thành 1 binary: bin/pf-server
build:
	cd frontend && npm install && npm run build
	cd backend && go build -o ../bin/pf-server ./cmd/server
	@echo "Đã build xong: bin/pf-server"

# Build rồi chạy (server tự phục vụ cả API + frontend trên :8080)
run: build
	cd backend && ../bin/pf-server

# Chạy toàn bộ test + kiểm tra tĩnh
test:
	cd backend && go test ./... && go vet ./...
	cd frontend && npm run lint && npm run build

# Dev: backend hot-reload (go run)
dev-backend:
	cd backend && go run ./cmd/server

# Dev: frontend hot-reload (Vite, proxy /api -> :8080)
dev-frontend:
	cd frontend && npm run dev

clean:
	rm -rf bin
