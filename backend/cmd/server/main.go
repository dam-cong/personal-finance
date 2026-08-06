package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"personal-finance/backend/internal/config"
	"personal-finance/backend/internal/handlers"
	"personal-finance/backend/internal/models"
	"personal-finance/backend/internal/store"
)

func main() {
	cfg := config.Load()

	st, err := store.New(cfg.DataFile, cfg.HouseholdName)
	if err != nil {
		log.Fatalf("mở store: %v", err)
	}
	seedUsers(st, cfg)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	handlers.RegisterRoutes(r, st, cfg)
	serveUploadDir(r, cfg, "avatars", "/avatars")
	serveUploadDir(r, cfg, "chat-images", "/chat-images")
	serveFrontend(r)

	log.Printf("server chạy trên :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func seedUsers(st *store.Store, cfg *config.Config) {
	hh, err := st.DefaultHousehold()
	if err != nil {
		log.Printf("chưa có nhà, bỏ qua seed user: %v", err)
		return
	}
	for _, pair := range strings.Split(cfg.SeedUsers, ",") {
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) != 2 {
			log.Printf("bỏ qua seed user không hợp lệ: %q", pair)
			continue
		}
		username := strings.TrimSpace(parts[0])
		password := parts[1]
		if username == "" || password == "" {
			log.Printf("bỏ qua seed user thiếu username/password: %q", pair)
			continue
		}
		if _, err := st.FindUser(username); err == nil {
			continue
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("seed user %s thất bại: %v", username, err)
			continue
		}
		if err := st.CreateUser(&models.User{
			Username:     username,
			PasswordHash: string(hash),
			HouseholdID:  hh.ID,
		}); err != nil {
			log.Printf("seed user %s thất bại: %v", username, err)
			continue
		}
		log.Printf("đã tạo user: %s", username)
	}
}

// serveUploadDir đảm bảo thư mục upload (avatars, chat-images...) tồn tại
// và serve tĩnh tại urlPrefix.
func serveUploadDir(r *gin.Engine, cfg *config.Config, subdir, urlPrefix string) {
	dir := filepath.Join(filepath.Dir(cfg.DataFile), subdir)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Printf("không tạo được thư mục %s: %v", subdir, err)
		return
	}
	r.Static(urlPrefix, dir)
}

func serveFrontend(r *gin.Engine) {
	const dist = "../frontend/dist"
	if _, err := os.Stat(dist); err != nil {
		log.Printf("không tìm thấy %s, chỉ chạy API", dist)
		return
	}
	r.Static("/assets", dist+"/assets")
	r.NoRoute(func(c *gin.Context) {
		reqPath := c.Request.URL.Path
		if strings.HasPrefix(reqPath, "/api") {
			c.JSON(404, gin.H{"error": "Not found"})
			return
		}
		// File tĩnh ở root dist/ (favicon.png, favicon.svg...) do Vite copy
		// thẳng từ frontend/public/, không nằm trong /assets — phục vụ trực
		// tiếp nếu tồn tại, còn lại mới fallback về index.html cho SPA routing.
		if !strings.Contains(reqPath, "..") {
			if file := filepath.Join(dist, reqPath); isFile(file) {
				c.File(file)
				return
			}
		}
		c.File(dist + "/index.html")
	})
}

func isFile(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
