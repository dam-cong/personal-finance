package handlers

import (
	"path/filepath"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/config"
	"personal-finance/backend/internal/middleware"
	"personal-finance/backend/internal/store"
)

func RegisterRoutes(r *gin.Engine, s *store.Store, cfg *config.Config) {
	api := r.Group("/api")

	auth := &AuthHandler{Store: s, Config: cfg}
	api.POST("/auth/register", auth.Register)
	api.POST("/auth/login", auth.Login)

	cfgHandler := &ConfigHandler{Config: cfg}
	api.GET("/config", cfgHandler.Get)

	protected := api.Group("")
	protected.Use(middleware.Auth(cfg.JWTSecret))
	tx := &TransactionHandler{Store: s}
	protected.GET("/transactions", tx.List)
	protected.POST("/transactions", tx.Create)
	protected.DELETE("/transactions/:id", tx.Delete)

	budget := &BudgetHandler{Store: s}
	protected.PUT("/budgets", budget.Set)
	protected.DELETE("/budgets", budget.Delete)

	avatarDir := filepath.Join(filepath.Dir(cfg.DataFile), "avatars")

	household := &HouseholdHandler{Store: s, Config: cfg, AvatarDir: avatarDir}
	protected.GET("/household", household.Get)
	protected.PUT("/household", household.Update)
	protected.POST("/household/image", household.UploadImage)

	profile := &ProfileHandler{Store: s, AvatarDir: avatarDir}
	protected.GET("/me", profile.Get)
	protected.PUT("/me", profile.UpdateName)
	protected.POST("/me/avatar", profile.UploadAvatar)

	chatImageDir := filepath.Join(filepath.Dir(cfg.DataFile), "chat-images")
	msg := &MessageHandler{Store: s, ImageDir: chatImageDir}
	protected.GET("/messages", msg.List)
	protected.POST("/messages", msg.Create)
	protected.GET("/messages/unread-count", msg.UnreadCount)
	protected.POST("/messages/read", msg.MarkRead)
	protected.POST("/messages/image", msg.UploadImage)

	dash := &DashboardHandler{Store: s, Config: cfg}
	protected.GET("/dashboard/month", dash.Month)
	protected.GET("/dashboard/quarter", dash.Quarter)
	protected.GET("/dashboard/year", dash.Year)
}
