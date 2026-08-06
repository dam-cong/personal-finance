package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/config"
	"personal-finance/backend/internal/models"
	"personal-finance/backend/internal/store"
)

type HouseholdHandler struct {
	Store     *store.Store
	Config    *config.Config
	AvatarDir string
}

// householdJSON dựng response trả về client — dùng image_url tính từ
// avatarURL() thay vì lộ image_filename thô, giống cách profile.go làm
// với User.
func householdJSON(hh *models.Household) gin.H {
	return gin.H{
		"id":             hh.ID,
		"name":           hh.Name,
		"created_at":     hh.CreatedAt,
		"default_budget": hh.DefaultBudget,
		"slogan":         hh.Slogan,
		"image_url":      avatarURL(hh.ImageFilename),
	}
}

func (h *HouseholdHandler) Get(c *gin.Context) {
	householdID, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"})
		return
	}
	hh, err := h.Store.FindHousehold(householdID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhà"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"household": householdJSON(hh)})
}

type updateHouseholdRequest struct {
	Name          string `json:"name"`
	DefaultBudget *int64 `json:"default_budget"` // null/omit = xóa override, dùng lại DEFAULT_BUDGET hệ thống
	Slogan        string `json:"slogan"`          // "" = xóa khẩu hiệu
}

func (h *HouseholdHandler) Update(c *gin.Context) {
	var req updateHouseholdRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}
	householdID, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"})
		return
	}
	hh, err := h.Store.UpdateHousehold(householdID, req.Name, req.DefaultBudget, req.Slogan)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"household": householdJSON(hh)})
}

func (h *HouseholdHandler) UploadImage(c *gin.Context) {
	fh, err := c.FormFile("image")
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

	householdID, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Không xác định được nhà"})
		return
	}

	filename := fmt.Sprintf("household-%d-%d%s", householdID, time.Now().UnixNano(), ext)
	if err := os.MkdirAll(h.AvatarDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu ảnh"})
		return
	}
	if err := c.SaveUploadedFile(fh, filepath.Join(h.AvatarDir, filename)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu ảnh"})
		return
	}

	hh, err := h.Store.UpdateHouseholdImage(householdID, filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"household": householdJSON(hh)})
}
