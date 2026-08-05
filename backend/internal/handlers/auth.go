package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"personal-finance/backend/internal/config"
	"personal-finance/backend/internal/models"
	"personal-finance/backend/internal/store"
)

type AuthHandler struct {
	Store  *store.Store
	Config *config.Config
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type registerRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}
	u, err := h.Store.FindUser(req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sai tên đăng nhập hoặc mật khẩu"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sai tên đăng nhập hoặc mật khẩu"})
		return
	}
	h.respondToken(c, http.StatusOK, u)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}
	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tên đăng nhập và mật khẩu không được bỏ trống"})
		return
	}
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mật khẩu phải có ít nhất 6 ký tự"})
		return
	}
	if _, err := h.Store.FindUser(req.Username); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Tên đăng nhập đã tồn tại"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi tạo tài khoản"})
		return
	}
	u := &models.User{Username: req.Username, PasswordHash: string(hash)}
	if hh, err := h.Store.DefaultHousehold(); err == nil {
		u.HouseholdID = hh.ID
	}
	if err := h.Store.CreateUser(u); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu tài khoản"})
		return
	}
	h.respondToken(c, http.StatusCreated, u)
}

func (h *AuthHandler) respondToken(c *gin.Context, status int, u *models.User) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": u.Username,
		"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
	})
	tokenStr, err := token.SignedString([]byte(h.Config.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi tạo token"})
		return
	}
	householdName := ""
	if hh, err := h.Store.FindHousehold(u.HouseholdID); err == nil {
		householdName = hh.Name
	}
	c.JSON(status, gin.H{
		"token":          tokenStr,
		"username":       u.Username,
		"household_id":   u.HouseholdID,
		"household_name": householdName,
		"display_name":   u.DisplayName,
		"avatar_url":     avatarURL(u.AvatarFilename),
	})
}
