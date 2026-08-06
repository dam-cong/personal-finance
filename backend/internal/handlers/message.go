package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/models"
	"personal-finance/backend/internal/store"
)

const maxMessageLength = 2000
const maxChatImageSize = 5 << 20 // 5MB

// Khai báo riêng, không tái dùng allowedAvatarExt/maxAvatarSize bên
// profile.go — tách biệt 2 tính năng avatar/chat-image, chấp nhận lặp nhỏ.
var allowedChatImageExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
}

type MessageHandler struct {
	Store    *store.Store
	ImageDir string
}

func (h *MessageHandler) List(c *gin.Context) {
	householdID, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"})
		return
	}
	msgs, err := h.Store.ListMessagesByHousehold(householdID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": msgs})
}

type createMessageRequest struct {
	Content string `json:"content"`
}

func (h *MessageHandler) Create(c *gin.Context) {
	var req createMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}
	content := strings.TrimSpace(req.Content)
	if content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tin nhắn không được để trống"})
		return
	}
	if len(content) > maxMessageLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tin nhắn quá dài (tối đa 2000 ký tự)"})
		return
	}

	username, _ := c.Get("username")
	uname := fmt.Sprint(username)
	u, err := h.Store.FindUser(uname)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được người dùng"})
		return
	}
	householdID, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"})
		return
	}

	m := &models.Message{
		HouseholdID: householdID,
		Username:    u.Username,
		DisplayName: u.DisplayName,
		AvatarURL:   avatarURL(u.AvatarFilename),
		Content:     content,
	}
	if err := h.Store.CreateMessage(m); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": m})
}

func (h *MessageHandler) UploadImage(c *gin.Context) {
	fh, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu file ảnh"})
		return
	}
	if fh.Size > maxChatImageSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ảnh tối đa 5MB"})
		return
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if !allowedChatImageExt[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Chỉ hỗ trợ JPG, PNG, WEBP"})
		return
	}

	username, _ := c.Get("username")
	uname := fmt.Sprint(username)
	u, err := h.Store.FindUser(uname)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được người dùng"})
		return
	}
	householdID, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"})
		return
	}

	filename := fmt.Sprintf("%s-%d%s", uname, time.Now().UnixNano(), ext)
	if err := os.MkdirAll(h.ImageDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu ảnh"})
		return
	}
	if err := c.SaveUploadedFile(fh, filepath.Join(h.ImageDir, filename)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu ảnh"})
		return
	}

	m := &models.Message{
		HouseholdID: householdID,
		Username:    u.Username,
		DisplayName: u.DisplayName,
		AvatarURL:   avatarURL(u.AvatarFilename),
		ImageURL:    "/chat-images/" + filename,
	}
	if err := h.Store.CreateMessage(m); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": m})
}

func (h *MessageHandler) UnreadCount(c *gin.Context) {
	username, _ := c.Get("username")
	uname := fmt.Sprint(username)
	householdID, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"})
		return
	}
	count, err := h.Store.CountUnreadMessages(householdID, uname)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *MessageHandler) MarkRead(c *gin.Context) {
	username, _ := c.Get("username")
	uname := fmt.Sprint(username)
	householdID, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"})
		return
	}
	latest := h.Store.LatestMessageID(householdID)
	if err := h.Store.MarkMessagesRead(uname, latest); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"last_read_message_id": latest})
}
