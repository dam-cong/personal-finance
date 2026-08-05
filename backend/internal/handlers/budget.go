package handlers

import (
	"fmt"
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/store"
)

var monthRe = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

type BudgetHandler struct {
	Store *store.Store
}

type setBudgetRequest struct {
	Month  string `json:"month"`
	Amount int64  `json:"amount"`
}

func (h *BudgetHandler) Set(c *gin.Context) {
	var req setBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}
	if !monthRe.MatchString(req.Month) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "month phải có dạng YYYY-MM"})
		return
	}
	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount phải lớn hơn 0"})
		return
	}
	hid, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhà"})
		return
	}
	b, err := h.Store.SetBudget(hid, req.Month, req.Amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"budget": b})
}

func (h *BudgetHandler) Delete(c *gin.Context) {
	month := c.Query("month")
	if !monthRe.MatchString(month) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "month phải có dạng YYYY-MM"})
		return
	}
	hid, err := currentHouseholdID(c, h.Store)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhà"})
		return
	}
	if err := h.Store.DeleteBudget(hid, month); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa hạn mức"})
}

// currentHouseholdID lấy household của user đang đăng nhập (qua JWT).
func currentHouseholdID(c *gin.Context, st *store.Store) (int, error) {
	username, _ := c.Get("username")
	u, err := st.FindUser(fmt.Sprint(username))
	if err != nil {
		return 0, err
	}
	return u.HouseholdID, nil
}
