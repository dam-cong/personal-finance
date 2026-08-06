package models

type Household struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	CreatedAt     string `json:"created_at"`
	DefaultBudget *int64 `json:"default_budget,omitempty"` // nil = dùng DEFAULT_BUDGET env
	Slogan        string `json:"slogan,omitempty"`         // "" = chưa có khẩu hiệu
}

// Budget là hạn mức chi tiêu tháng (YYYY-MM) của một nhà.
type Budget struct {
	ID           int    `json:"id"`
	HouseholdID  int    `json:"household_id"`
	Month        string `json:"month"`
	Amount       int64  `json:"amount"`
	CreatedAt    string `json:"created_at"`
}

type User struct {
	ID                int    `json:"id"`
	Username          string `json:"username"`
	PasswordHash      string `json:"password_hash"`
	HouseholdID       int    `json:"household_id"`
	CreatedAt         string `json:"created_at"`
	DisplayName       string `json:"display_name,omitempty"`          // "" = chưa đặt, FE fallback về username
	AvatarFilename    string `json:"avatar_filename,omitempty"`       // tên file trong data/avatars/, "" = chưa có
	LastReadMessageID int    `json:"last_read_message_id,omitempty"` // 0 = chưa đọc gì trong phòng chat chung
}

type Transaction struct {
	ID        int    `json:"id"`
	Content   string `json:"content"`
	Amount    int64  `json:"amount"`
	CreatedAt string `json:"created_at"`
	Username  string `json:"username"`
}

// Message là tin nhắn trong phòng chat chung của một nhà (khác Transaction —
// không phải chi tiêu). DisplayName/AvatarURL được lưu kèm (denormalize)
// tại thời điểm gửi, giống cách Transaction lưu thẳng Username.
type Message struct {
	ID          int    `json:"id"`
	HouseholdID int    `json:"household_id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
	Content     string `json:"content"`
	ImageURL    string `json:"image_url,omitempty"` // "" = tin text thường
	CreatedAt   string `json:"created_at"`
}
