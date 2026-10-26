package handlers

import (
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/config"
	"personal-finance/backend/internal/store"
)

func TestRemovedFeatureRoutesNotRegistered(t *testing.T) {
	st, err := store.NewFileStore(filepath.Join(t.TempDir(), "data.json"), "Nhà test")
	if err != nil {
		t.Fatalf("store.New: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	RegisterRoutes(r, st, &config.Config{JWTSecret: "test-secret"})

	removed := map[string]bool{
		"GET /api/messages":              true,
		"POST /api/messages":             true,
		"GET /api/messages/unread-count": true,
		"POST /api/messages/read":        true,
		"POST /api/messages/image":       true,
		"POST /api/household/image":      true,
		"POST /api/me/avatar":            true,
	}
	for _, route := range r.Routes() {
		key := route.Method + " " + route.Path
		if removed[key] {
			t.Errorf("route đã bị bỏ vẫn còn đăng ký: %s", key)
		}
	}
}
