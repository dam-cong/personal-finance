package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"personal-finance/backend/internal/config"
	"personal-finance/backend/internal/store"
)

type HouseholdHandler struct {
	Store  *store.Store
	Config *config.Config
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
	c.JSON(http.StatusOK, gin.H{"household": hh})
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
	c.JSON(http.StatusOK, gin.H{"household": hh})
}
