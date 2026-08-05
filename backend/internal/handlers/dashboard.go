package handlers

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/config"
	"personal-finance/backend/internal/services"
	"personal-finance/backend/internal/store"
)

type DashboardHandler struct {
	Store  *store.Store
	Config *config.Config
}

func (h *DashboardHandler) Month(c *gin.Context) {
	now := time.Now()
	year := queryInt(c, "year", now.Year())
	month := queryInt(c, "month", int(now.Month()))
	if month < 1 || month > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "month phải từ 1 đến 12"})
		return
	}

	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 1, 0)
	labels := dayLabels(start, end)

	st, members, householdName, householdID, err := h.summarize(c, start, end, labels, func(t time.Time) string {
		return t.Format("2006-01-02")
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc dữ liệu"})
		return
	}
	monthKey := fmt.Sprintf("%04d-%02d", year, month)
	c.JSON(http.StatusOK, gin.H{
		"period":       "month",
		"year":         year,
		"month":        month,
		"total":        st.Total,
		"count":        st.Count,
		"daily":        st.Buckets,
		"transactions": st.Transactions,
		"household":    householdName,
		"members":      members,
		"budget":       budgetBlock(h.Store, householdID, monthKey, st.Total, h.Config.DefaultBudget),
	})
}

func (h *DashboardHandler) Quarter(c *gin.Context) {
	now := time.Now()
	year := queryInt(c, "year", now.Year())
	quarter := queryInt(c, "quarter", (int(now.Month())-1)/3+1)
	if quarter < 1 || quarter > 4 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "quarter phải từ 1 đến 4"})
		return
	}

	firstMonth := (quarter-1)*3 + 1
	start := time.Date(year, time.Month(firstMonth), 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 3, 0)
	labels := monthLabels(year, firstMonth, 3)

	st, members, householdName, _, err := h.summarize(c, start, end, labels, func(t time.Time) string {
		return t.Format("2006-01")
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"period":       "quarter",
		"year":         year,
		"quarter":      quarter,
		"total":        st.Total,
		"count":        st.Count,
		"monthly":      st.Buckets,
		"transactions": st.Transactions,
		"household":    householdName,
		"members":      members,
	})
}

func (h *DashboardHandler) Year(c *gin.Context) {
	now := time.Now()
	year := queryInt(c, "year", now.Year())

	start := time.Date(year, 1, 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(1, 0, 0)
	labels := monthLabels(year, 1, 12)

	st, members, householdName, _, err := h.summarize(c, start, end, labels, func(t time.Time) string {
		return t.Format("2006-01")
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc dữ liệu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"period":       "year",
		"year":         year,
		"total":        st.Total,
		"count":        st.Count,
		"monthly":      st.Buckets,
		"transactions": st.Transactions,
		"household":    householdName,
		"members":      members,
	})
}

func (h *DashboardHandler) summarize(c *gin.Context, start, end time.Time, labels []string, key func(time.Time) string) (*services.Stats, []string, string, int, error) {
	householdID, err := currentHouseholdID(c, h.Store)
	if err != nil {
		return nil, nil, "", 0, err
	}
	items, err := h.Store.ListTransactionsByHousehold(householdID)
	if err != nil {
		return nil, nil, "", 0, err
	}
	st := services.Summarize(items, start, end, labels, key)
	members := h.Store.ListUsersInHousehold(householdID)
	householdName := ""
	if hh, err := h.Store.FindHousehold(householdID); err == nil {
		householdName = hh.Name
	}
	return st, members, householdName, householdID, nil
}

// budgetBlock trả về thông tin hạn mức tháng. Nếu chưa đặt hạn mức riêng cho
// tháng thì dùng hạn mức mặc định (default=true); DEFAULT_BUDGET=0 tắt mặc định
// và trả nil khi chưa đặt.
func budgetBlock(st *store.Store, householdID int, month string, spent, defaultBudget int64) gin.H {
	b, err := st.GetBudget(householdID, month)
	amount := defaultBudget
	isDefault := true
	if err == nil && b != nil {
		amount = b.Amount
		isDefault = false
	}
	if amount <= 0 {
		return nil
	}
	percent := float64(spent) * 100 / float64(amount)
	status := "ok"
	switch {
	case percent >= 100:
		status = "over"
	case percent >= 70:
		status = "near"
	}
	return gin.H{
		"month":     month,
		"amount":    amount,
		"spent":     spent,
		"percent":   round1(percent),
		"remaining": amount - spent,
		"status":    status,
		"default":   isDefault,
	}
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}

func queryInt(c *gin.Context, key string, def int) int {
	v := c.Query(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func dayLabels(start, end time.Time) []string {
	var labels []string
	for d := start; d.Before(end); d = d.AddDate(0, 0, 1) {
		labels = append(labels, d.Format("2006-01-02"))
	}
	return labels
}

func monthLabels(year, firstMonth, count int) []string {
	labels := make([]string, 0, count)
	for i := 0; i < count; i++ {
		m := firstMonth + i
		labels = append(labels, fmt.Sprintf("%04d-%02d", year, m))
	}
	return labels
}
