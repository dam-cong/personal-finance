package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/store"
)

const maxAvatarSize = 2 << 20 // 2MB

var allowedAvatarExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
}

type ProfileHandler struct {
	Store     *store.Store
	AvatarDir string
}

func avatarURL(filename string) string {
	if filename == "" {
		return ""
	}
	return "/avatars/" + filename
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
		"avatar_url":   avatarURL(u.AvatarFilename),
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
		"avatar_url":   avatarURL(u.AvatarFilename),
	})
}

func (h *ProfileHandler) UploadAvatar(c *gin.Context) {
	fh, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu file ảnh"})
		return
	}
	if fh.Size > maxAvatarSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ảnh tối đa 2MB"})
		return
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if !allowedAvatarExt[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Chỉ hỗ trợ JPG, PNG, WEBP"})
		return
	}

	username, _ := c.Get("username")
	uname := fmt.Sprint(username)
	filename := fmt.Sprintf("%s-%d%s", uname, time.Now().UnixNano(), ext)

	if err := os.MkdirAll(h.AvatarDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu ảnh"})
		return
	}
	if err := c.SaveUploadedFile(fh, filepath.Join(h.AvatarDir, filename)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu ảnh"})
		return
	}

	old, newUser, err := h.Store.UpdateUserAvatar(uname, filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
		return
	}
	if old != nil && old.AvatarFilename != "" && old.AvatarFilename != filename {
		_ = os.Remove(filepath.Join(h.AvatarDir, old.AvatarFilename)) // ảnh cũ, bỏ qua lỗi nếu đã mất
	}

	c.JSON(http.StatusOK, gin.H{
		"username":     newUser.Username,
		"display_name": newUser.DisplayName,
		"avatar_url":   avatarURL(newUser.AvatarFilename),
	})
}
