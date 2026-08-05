package store

import (
	"os"
	"path/filepath"
	"testing"

	"personal-finance/backend/internal/models"
)

const testHousehold = "Nhà test"

func TestCreateAndFindUser(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	u := &models.User{Username: "bo", PasswordHash: "hash", HouseholdID: 1}
	if err := s.CreateUser(u); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if u.ID != 1 {
		t.Fatalf("expected ID 1, got %d", u.ID)
	}

	got, err := s.FindUser("bo")
	if err != nil {
		t.Fatalf("FindUser: %v", err)
	}
	if got.Username != "bo" || got.PasswordHash != "hash" || got.ID != 1 {
		t.Fatalf("unexpected user: %+v", got)
	}

	if _, err := s.FindUser("missing"); err == nil {
		t.Fatal("expected error for missing user")
	}
}

func TestPersistAcrossReload(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if err := s.CreateUser(&models.User{Username: "me", PasswordHash: "h", HouseholdID: 1}); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	s2, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("reload New: %v", err)
	}
	got, err := s2.FindUser("me")
	if err != nil {
		t.Fatalf("FindUser after reload: %v", err)
	}
	if got.ID != 1 {
		t.Fatalf("expected ID 1 after reload, got %d", got.ID)
	}

	// id must keep incrementing
	u2 := &models.User{Username: "bro", PasswordHash: "h2", HouseholdID: 1}
	if err := s2.CreateUser(u2); err != nil {
		t.Fatalf("CreateUser 2: %v", err)
	}
	if u2.ID != 2 {
		t.Fatalf("expected ID 2, got %d", u2.ID)
	}
}

func TestAutoCreateFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "data.json")
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("file should not exist yet")
	}
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if s.UserCount() != 0 {
		t.Fatalf("expected empty users, got %d", s.UserCount())
	}
	hh, err := s.DefaultHousehold()
	if err != nil {
		t.Fatalf("DefaultHousehold: %v", err)
	}
	if hh.Name != testHousehold {
		t.Fatalf("expected household %q, got %q", testHousehold, hh.Name)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("file should be created: %v", err)
	}
}

func TestMigrateOldFileAssignsDefaultHousehold(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	// file cũ (không có trường households/household_id)
	old := `{
  "users": [
    {"id": 1, "username": "hiendc", "password_hash": "h1", "created_at": "2026-01-01T00:00:00+07:00"},
    {"id": 2, "username": "trangdt", "password_hash": "h2", "created_at": "2026-01-01T00:00:00+07:00"}
  ],
  "transactions": [{"id": 1, "content": "Cafe", "amount": 45000, "created_at": "2026-01-02T00:00:00+07:00", "username": "hiendc"}],
  "next_user_id": 3,
  "next_transaction_id": 2
}`
	if err := os.WriteFile(path, []byte(old), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	hh, err := s.DefaultHousehold()
	if err != nil {
		t.Fatalf("DefaultHousehold: %v", err)
	}
	if hh.Name != testHousehold {
		t.Fatalf("expected household %q, got %q", testHousehold, hh.Name)
	}
	for _, name := range []string{"hiendc", "trangdt"} {
		u, err := s.FindUser(name)
		if err != nil {
			t.Fatalf("FindUser(%s): %v", name, err)
		}
		if u.HouseholdID != hh.ID {
			t.Fatalf("user %s should be in household %d, got %d", name, hh.ID, u.HouseholdID)
		}
	}

	// file cũ không có next_budget_id → id budget phải bắt đầu từ 1
	b, err := s.SetBudget(hh.ID, "2026-08", 10000000)
	if err != nil {
		t.Fatalf("SetBudget: %v", err)
	}
	if b.ID != 1 {
		t.Fatalf("expected budget id 1 after migrate, got %d", b.ID)
	}
}

func TestCorruptFileReturnsError(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	if err := os.WriteFile(path, []byte("{invalid"), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if _, err := New(path, testHousehold); err == nil {
		t.Fatal("expected error for corrupt file")
	}
}

func TestCreateAndListTransactions(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	a := &models.Transaction{Content: "Cafe", Amount: 45000, Username: "hiendc"}
	b := &models.Transaction{Content: "Đi chợ", Amount: 250000, Username: "trangdt"}
	if err := s.CreateTransaction(a); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}
	if err := s.CreateTransaction(b); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}
	if a.ID != 1 || b.ID != 2 {
		t.Fatalf("expected IDs 1,2 got %d,%d", a.ID, b.ID)
	}

	items, err := s.ListTransactions()
	if err != nil {
		t.Fatalf("ListTransactions: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].ID != 2 || items[1].ID != 1 {
		t.Fatalf("expected newest first, got %d,%d", items[0].ID, items[1].ID)
	}
	if items[0].Username != "trangdt" {
		t.Fatalf("expected username preserved, got %q", items[0].Username)
	}
}

func TestListTransactionsByUser(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if err := s.CreateTransaction(&models.Transaction{Content: "A", Amount: 1000, Username: "hiendc"}); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}
	if err := s.CreateTransaction(&models.Transaction{Content: "B", Amount: 2000, Username: "trangdt"}); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}
	if err := s.CreateTransaction(&models.Transaction{Content: "C", Amount: 3000, Username: "hiendc"}); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}

	items, err := s.ListTransactionsByUser("hiendc")
	if err != nil {
		t.Fatalf("ListTransactionsByUser: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items for hiendc, got %d", len(items))
	}
	if items[0].Content != "C" || items[1].Content != "A" {
		t.Fatalf("expected [C, A] newest first, got %+v", items)
	}
}

func TestListTransactionsByHousehold(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	// 2 user cùng nhà 1, 1 user nhà 2
	if err := s.CreateUser(&models.User{Username: "hiendc", PasswordHash: "h", HouseholdID: 1}); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if err := s.CreateUser(&models.User{Username: "trangdt", PasswordHash: "h", HouseholdID: 1}); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if err := s.CreateUser(&models.User{Username: "ngoai", PasswordHash: "h", HouseholdID: 2}); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if err := s.CreateTransaction(&models.Transaction{Content: "A", Amount: 1000, Username: "hiendc"}); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}
	if err := s.CreateTransaction(&models.Transaction{Content: "B", Amount: 2000, Username: "trangdt"}); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}
	if err := s.CreateTransaction(&models.Transaction{Content: "C", Amount: 3000, Username: "ngoai"}); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}

	items, err := s.ListTransactionsByHousehold(1)
	if err != nil {
		t.Fatalf("ListTransactionsByHousehold: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items in household 1, got %d", len(items))
	}
	if items[0].Username == "ngoai" || items[1].Username == "ngoai" {
		t.Fatalf("household 1 should not contain ngoai's tx: %+v", items)
	}

	members := s.ListUsersInHousehold(1)
	if len(members) != 2 {
		t.Fatalf("expected 2 members in household 1, got %v", members)
	}
}

func TestDeleteTransaction(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if err := s.CreateTransaction(&models.Transaction{Content: "A", Amount: 1000}); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}
	if err := s.CreateTransaction(&models.Transaction{Content: "B", Amount: 2000}); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}

	if err := s.DeleteTransaction(1); err != nil {
		t.Fatalf("DeleteTransaction: %v", err)
	}
	items, _ := s.ListTransactions()
	if len(items) != 1 || items[0].ID != 2 {
		t.Fatalf("expected only tx 2, got %+v", items)
	}

	if err := s.DeleteTransaction(99); err == nil {
		t.Fatal("expected error deleting missing transaction")
	}
}

func TestBudgetSetGetDelete(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}

	// chưa đặt → GetBudget trả nil, không lỗi
	b, err := s.GetBudget(1, "2026-08")
	if err != nil {
		t.Fatalf("GetBudget (empty): %v", err)
	}
	if b != nil {
		t.Fatalf("expected nil budget, got %+v", b)
	}

	b, err = s.SetBudget(1, "2026-08", 10000000)
	if err != nil {
		t.Fatalf("SetBudget: %v", err)
	}
	if b.ID != 1 || b.Amount != 10000000 || b.Month != "2026-08" {
		t.Fatalf("unexpected budget: %+v", b)
	}

	// upsert: đặt lại tháng đó → cùng id, amount đổi
	b2, err := s.SetBudget(1, "2026-08", 12000000)
	if err != nil {
		t.Fatalf("SetBudget upsert: %v", err)
	}
	if b2.ID != 1 || b2.Amount != 12000000 {
		t.Fatalf("expected upsert to same id, got %+v", b2)
	}

	// tháng khác → budget riêng
	b3, err := s.SetBudget(1, "2026-09", 9000000)
	if err != nil {
		t.Fatalf("SetBudget sep month: %v", err)
	}
	if b3.ID != 2 {
		t.Fatalf("expected id 2, got %d", b3.ID)
	}

	// nhà khác → không thấy budget của nhà 1
	if got, _ := s.GetBudget(2, "2026-08"); got != nil {
		t.Fatalf("household 2 should not see budget, got %+v", got)
	}

	got, err := s.GetBudget(1, "2026-08")
	if err != nil || got == nil || got.Amount != 12000000 {
		t.Fatalf("unexpected GetBudget: %+v err=%v", got, err)
	}

	if err := s.DeleteBudget(1, "2026-08"); err != nil {
		t.Fatalf("DeleteBudget: %v", err)
	}
	if got, _ := s.GetBudget(1, "2026-08"); got != nil {
		t.Fatalf("budget should be deleted, got %+v", got)
	}
	// tháng 9 vẫn còn
	if got, _ := s.GetBudget(1, "2026-09"); got == nil {
		t.Fatal("budget 2026-09 should remain")
	}
}

func TestBudgetPersistAcrossReload(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if _, err := s.SetBudget(1, "2026-08", 10000000); err != nil {
		t.Fatalf("SetBudget: %v", err)
	}
	s2, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("reload New: %v", err)
	}
	got, err := s2.GetBudget(1, "2026-08")
	if err != nil || got == nil || got.Amount != 10000000 {
		t.Fatalf("budget after reload: %+v err=%v", got, err)
	}
}

func TestTransactionsPersistAcrossReload(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if err := s.CreateTransaction(&models.Transaction{Content: "Cafe", Amount: 45000}); err != nil {
		t.Fatalf("CreateTransaction: %v", err)
	}

	s2, err := New(path, testHousehold)
	if err != nil {
		t.Fatalf("reload New: %v", err)
	}
	items, err := s2.ListTransactions()
	if err != nil {
		t.Fatalf("ListTransactions: %v", err)
	}
	if len(items) != 1 || items[0].Content != "Cafe" || items[0].Amount != 45000 {
		t.Fatalf("unexpected after reload: %+v", items)
	}
}
