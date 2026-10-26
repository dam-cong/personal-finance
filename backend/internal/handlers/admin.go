package handlers

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/config"
	"personal-finance/backend/internal/store"
)

type AdminHandler struct {
	Store  store.Repository
	Config *config.Config
}

func (h *AdminHandler) Init(c *gin.Context) {
	if h.Config.InitSecret == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	header := c.GetHeader("X-Init-Secret")
	if subtle.ConstantTimeCompare([]byte(header), []byte(h.Config.InitSecret)) != 1 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
