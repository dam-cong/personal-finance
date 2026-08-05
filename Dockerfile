FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
WORKDIR /app/backend
RUN go build -o ../bin/pf-server ./cmd/server

FROM alpine:3.21
RUN apk --no-cache add ca-certificates
WORKDIR /app/backend
COPY --from=backend-builder /app/bin/pf-server pf-server
COPY --from=backend-builder /app/frontend/dist ../frontend/dist
COPY backend/data ./data
COPY backend/.env.example .env
EXPOSE 8080
CMD ["./pf-server"]