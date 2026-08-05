package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/models"
	"personal-finance/backend/internal/services"
	"personal-finance/backend/internal/store"
)

type TransactionHandler struct {
	Store *store.Store
}

type createTransactionRequest struct {
	Message string `json:"message"`
}

func (h *TransactionHandler) Create(c *gin.Context) {
	var req createTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Dữ liệu không hợp lệ",
			"reply": "Tin nhắn không hợp lệ, chưa được lưu. Vd: Cafe 45000",
			"valid": false,
			"saved": false,
		})
		return
	}
	parsed, err := services.Parse(req.Message)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"reply": "Tin nhắn không hợp lệ, chưa được lưu. Vd: Cafe 45000",
			"valid": false,
			"saved": false,
		})
		return
	}

	username, _ := c.Get("username")
	tx := &models.Transaction{
		Content:   parsed.Content,
		Amount:    parsed.Amount,
		CreatedAt: time.Now().Format(time.RFC3339),
		Username:  fmt.Sprint(username),
	}
	if err := h.Store.CreateTransaction(tx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Lỗi lưu dữ liệu",
			"reply": "Đã xảy ra lỗi khi lưu, chưa được lưu. Thử lại sau.",
			"valid": true,
			"saved": false,
		})
		return
	}

	reply := fmt.Sprintf("Đã lưu thành công: %s — %sđ", tx.Content, formatVND(tx.Amount))
	c.JSON(http.StatusOK, gin.H{
		"transaction": tx,
		"reply":       reply,
		"valid":       true,
		"saved":       true,
	})
}

func (h *TransactionHandler) List(c *gin.Context) {
	username, _ := c.Get("username")
	items, err := h.Store.ListTransactionsByUser(fmt.Sprint(username))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *TransactionHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}
	tx, err := h.Store.GetTransaction(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy giao dịch"})
		return
	}
	username, _ := c.Get("username")
	if tx.Username != fmt.Sprint(username) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ chủ giao dịch mới được xóa"})
		return
	}
	if err := h.Store.DeleteTransaction(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy giao dịch"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa"})
}

func formatVND(n int64) string {
	s := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	return b.String()
}
