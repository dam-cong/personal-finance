package services

import (
	"testing"
	"time"

	"personal-finance/backend/internal/models"
)

func txAt(id int64, content string, amount int64, t time.Time) models.Transaction {
	return models.Transaction{
		ID:        int(id),
		Content:   content,
		Amount:    amount,
		CreatedAt: t.Format(time.RFC3339),
	}
}

func TestSummarize(t *testing.T) {
	aug5 := time.Date(2026, 8, 5, 10, 0, 0, 0, time.Local)
	aug6 := time.Date(2026, 8, 6, 8, 30, 0, 0, time.Local)
	sep1 := time.Date(2026, 9, 1, 0, 1, 0, 0, time.Local)

	items := []models.Transaction{
		txAt(3, "Ăn sáng", 35000, sep1),
		txAt(2, "Cafe", 45000, aug6),
		txAt(1, "Cafe Highland", 45000, aug5),
		txAt(0, "Đi chợ", 10000, aug5),
	}

	start := time.Date(2026, 8, 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 1, 0)

	var labels []string
	for d := start; d.Before(end); d = d.AddDate(0, 0, 1) {
		labels = append(labels, d.Format("2006-01-02"))
	}

	st := Summarize(items, start, end, labels, func(t time.Time) string {
		return t.Format("2006-01-02")
	})

	if st.Total != 100000 {
		t.Errorf("total = %d, want 100000", st.Total)
	}
	if st.Count != 3 {
		t.Errorf("count = %d, want 3", st.Count)
	}
	if len(st.Buckets) != 31 {
		t.Fatalf("buckets = %d, want 31", len(st.Buckets))
	}
	for _, b := range st.Buckets {
		switch b.Label {
		case "2026-08-05":
			if b.Total != 55000 {
				t.Errorf("bucket %s total = %d, want 55000", b.Label, b.Total)
			}
		case "2026-08-06":
			if b.Total != 45000 {
				t.Errorf("bucket %s total = %d, want 45000", b.Label, b.Total)
			}
		default:
			if b.Total != 0 {
				t.Errorf("bucket %s total = %d, want 0", b.Label, b.Total)
			}
		}
	}
	if len(st.Transactions) != 3 {
		t.Fatalf("transactions = %d, want 3", len(st.Transactions))
	}
}

func TestSummarizeEmpty(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.Local)
	st := Summarize(nil, start, start.AddDate(1, 0, 0), []string{"2026-01", "2026-02"}, func(t time.Time) string {
		return t.Format("2006-01")
	})
	if st.Total != 0 || st.Count != 0 || len(st.Transactions) != 0 {
		t.Fatalf("expected empty stats, got %+v", st)
	}
	if len(st.Buckets) != 2 {
		t.Fatalf("buckets = %d, want 2", len(st.Buckets))
	}
}

func TestSummarizeIgnoresCorruptDate(t *testing.T) {
	start := time.Date(2026, 8, 1, 0, 0, 0, 0, time.Local)
	items := []models.Transaction{
		{ID: 1, Content: "bad date", Amount: 5000, CreatedAt: "không-phải-ngày"},
		{ID: 2, Content: "ok", Amount: 2000, CreatedAt: time.Date(2026, 8, 5, 0, 0, 0, 0, time.Local).Format(time.RFC3339)},
	}
	st := Summarize(items, start, start.AddDate(0, 1, 0), []string{"2026-08"}, func(t time.Time) string {
		return t.Format("2006-01")
	})
	if st.Total != 2000 || st.Count != 1 {
		t.Fatalf("expected to ignore corrupt date, got %+v", st)
	}
}
