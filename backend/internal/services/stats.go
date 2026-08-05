package services

import (
	"time"

	"personal-finance/backend/internal/models"
)

type Bucket struct {
	Label string `json:"label"`
	Total int64  `json:"total"`
}

type Stats struct {
	Total        int64                `json:"total"`
	Count        int                  `json:"count"`
	Buckets      []Bucket             `json:"buckets"`
	Transactions []models.Transaction `json:"transactions"`
}

// Summarize lọc giao dịch trong [start, end), tính tổng, số lượng
// và gom theo bucket (key trả về nhãn bucket). Giao dịch trả về giữ thứ tự đầu vào.
func Summarize(items []models.Transaction, start, end time.Time, labels []string, key func(time.Time) string) *Stats {
	idx := make(map[string]int, len(labels))
	buckets := make([]Bucket, len(labels))
	for i, l := range labels {
		idx[l] = i
		buckets[i] = Bucket{Label: l}
	}

	st := &Stats{Buckets: buckets, Transactions: []models.Transaction{}}
	for _, t := range items {
		ts, err := time.Parse(time.RFC3339, t.CreatedAt)
		if err != nil {
			continue
		}
		if ts.Before(start) || !ts.Before(end) {
			continue
		}
		st.Total += t.Amount
		st.Count++
		st.Transactions = append(st.Transactions, t)
		if i, ok := idx[key(ts)]; ok {
			st.Buckets[i].Total += t.Amount
		}
	}
	return st
}
