package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/config"
)

type ConfigHandler struct {
	Config *config.Config
}

func (h *ConfigHandler) Get(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"app_name":       h.Config.AppName,
		"household_name": h.Config.HouseholdName,
	})
}
