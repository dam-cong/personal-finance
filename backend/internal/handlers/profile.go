package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/store"
)

type ProfileHandler struct {
	Store store.Repository
}

func (h *ProfileHandler) Get(c *gin.Context) {
	username, _ := c.Get("username")
	u, err := h.Store.FindUser(fmt.Sprint(username))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"username":     u.Username,
		"display_name": u.DisplayName,
	})
}

type updateNameRequest struct {
	DisplayName string `json:"display_name"`
}

func (h *ProfileHandler) UpdateName(c *gin.Context) {
	var req updateNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}
	username, _ := c.Get("username")
	u, err := h.Store.UpdateUserDisplayName(fmt.Sprint(username), strings.TrimSpace(req.DisplayName))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"username":     u.Username,
		"display_name": u.DisplayName,
	})
}
