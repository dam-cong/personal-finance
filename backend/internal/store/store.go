package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"personal-finance/backend/internal/models"
)

type dataFile struct {
	Households        []models.Household    `json:"households"`
	Users             []models.User         `json:"users"`
	Transactions      []models.Transaction  `json:"transactions"`
	Budgets           []models.Budget       `json:"budgets"`
	NextHouseholdID   int                   `json:"next_household_id"`
	NextUserID        int                   `json:"next_user_id"`
	NextTransactionID int                   `json:"next_transaction_id"`
	NextBudgetID      int                   `json:"next_budget_id"`
}

type Store struct {
	mu   sync.RWMutex
	path string
	data dataFile
}

func New(path, householdName string) (*Store, error) {
	s := &Store{path: path}
	if err := s.load(); err != nil {
		return nil, err
	}
	if err := s.migrate(householdName); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) load() error {
	b, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			s.data = dataFile{
				Households:        []models.Household{},
				Users:             []models.User{},
				Transactions:      []models.Transaction{},
				Budgets:           []models.Budget{},
				NextHouseholdID:   1,
				NextUserID:        1,
				NextTransactionID: 1,
				NextBudgetID:      1,
			}
			return s.saveLocked()
		}
		return err
	}
	if err := json.Unmarshal(b, &s.data); err != nil {
		return fmt.Errorf("data file %s is invalid JSON: %w", s.path, err)
	}
	return nil
}

// migrate đảm bảo luôn có ít nhất 1 nhà mặc định và gán user cũ (household_id=0)
// vào nhà mặc định đó.
func (s *Store) migrate(householdName string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.data.Households) == 0 {
		if s.data.NextHouseholdID < 1 {
			s.data.NextHouseholdID = 1
		}
		h := &models.Household{Name: householdName}
		h.ID = s.data.NextHouseholdID
		s.data.NextHouseholdID++
		if h.CreatedAt == "" {
			h.CreatedAt = time.Now().Format(time.RFC3339)
		}
		s.data.Households = append(s.data.Households, *h)
		if err := s.saveLocked(); err != nil {
			return err
		}
	}

	defaultID := s.data.Households[0].ID
	changed := false
	if s.data.NextBudgetID < 1 {
		s.data.NextBudgetID = 1
		changed = true
	}
	for i := range s.data.Users {
		if s.data.Users[i].HouseholdID == 0 {
			s.data.Users[i].HouseholdID = defaultID
			changed = true
		}
	}
	if changed {
		return s.saveLocked()
	}
	return nil
}

func (s *Store) Save() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.saveLocked()
}

func (s *Store) saveLocked() error {
	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func (s *Store) FindUser(username string) (*models.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.data.Users {
		if s.data.Users[i].Username == username {
			u := s.data.Users[i]
			return &u, nil
		}
	}
	return nil, fmt.Errorf("user %q not found", username)
}

func (s *Store) DefaultHousehold() (*models.Household, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.data.Households) == 0 {
		return nil, fmt.Errorf("no household")
	}
	h := s.data.Households[0]
	return &h, nil
}

func (s *Store) FindHousehold(id int) (*models.Household, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.data.Households {
		if s.data.Households[i].ID == id {
			h := s.data.Households[i]
			return &h, nil
		}
	}
	return nil, fmt.Errorf("household %d not found", id)
}

func (s *Store) ListUsersInHousehold(householdID int) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var names []string
	for i := range s.data.Users {
		if s.data.Users[i].HouseholdID == householdID {
			names = append(names, s.data.Users[i].Username)
		}
	}
	return names
}

func (s *Store) UserCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.data.Users)
}

func (s *Store) CreateUser(u *models.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u.ID = s.data.NextUserID
	s.data.NextUserID++
	if u.CreatedAt == "" {
		u.CreatedAt = time.Now().Format(time.RFC3339)
	}
	s.data.Users = append(s.data.Users, *u)
	return s.saveLocked()
}

func (s *Store) ListTransactions() ([]models.Transaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return newestFirst(s.data.Transactions), nil
}

// ListTransactionsByUser trả về giao dịch của một user (chat riêng).
func (s *Store) ListTransactionsByUser(username string) ([]models.Transaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var filtered []models.Transaction
	for i := range s.data.Transactions {
		if s.data.Transactions[i].Username == username {
			filtered = append(filtered, s.data.Transactions[i])
		}
	}
	return newestFirst(filtered), nil
}

// ListTransactionsByHousehold trả về giao dịch của mọi thành viên trong nhà (dashboard chung).
func (s *Store) ListTransactionsByHousehold(householdID int) ([]models.Transaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	members := map[string]bool{}
	for i := range s.data.Users {
		if s.data.Users[i].HouseholdID == householdID {
			members[s.data.Users[i].Username] = true
		}
	}
	var filtered []models.Transaction
	for i := range s.data.Transactions {
		if members[s.data.Transactions[i].Username] {
			filtered = append(filtered, s.data.Transactions[i])
		}
	}
	return newestFirst(filtered), nil
}

func (s *Store) GetTransaction(id int) (*models.Transaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.data.Transactions {
		if s.data.Transactions[i].ID == id {
			t := s.data.Transactions[i]
			return &t, nil
		}
	}
	return nil, fmt.Errorf("transaction %d not found", id)
}

func newestFirst(items []models.Transaction) []models.Transaction {
	out := make([]models.Transaction, 0, len(items))
	for i := len(items) - 1; i >= 0; i-- {
		out = append(out, items[i])
	}
	return out
}

func (s *Store) CreateTransaction(t *models.Transaction) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	t.ID = s.data.NextTransactionID
	s.data.NextTransactionID++
	if t.CreatedAt == "" {
		t.CreatedAt = time.Now().Format(time.RFC3339)
	}
	s.data.Transactions = append(s.data.Transactions, *t)
	return s.saveLocked()
}

func (s *Store) DeleteTransaction(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.data.Transactions {
		if s.data.Transactions[i].ID == id {
			s.data.Transactions = append(s.data.Transactions[:i], s.data.Transactions[i+1:]...)
			return s.saveLocked()
		}
	}
	return fmt.Errorf("transaction %d not found", id)
}

// SetBudget đặt (hoặc cập nhật) hạn mức tháng của một nhà — upsert theo (household, month).
func (s *Store) SetBudget(householdID int, month string, amount int64) (*models.Budget, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.data.Budgets {
		if s.data.Budgets[i].HouseholdID == householdID && s.data.Budgets[i].Month == month {
			s.data.Budgets[i].Amount = amount
			s.data.Budgets[i].CreatedAt = time.Now().Format(time.RFC3339)
			if err := s.saveLocked(); err != nil {
				return nil, err
			}
			b := s.data.Budgets[i]
			return &b, nil
		}
	}
	b := &models.Budget{
		HouseholdID: householdID,
		Month:       month,
		Amount:      amount,
		CreatedAt:   time.Now().Format(time.RFC3339),
	}
	b.ID = s.data.NextBudgetID
	s.data.NextBudgetID++
	s.data.Budgets = append(s.data.Budgets, *b)
	if err := s.saveLocked(); err != nil {
		return nil, err
	}
	return b, nil
}

func (s *Store) GetBudget(householdID int, month string) (*models.Budget, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for i := range s.data.Budgets {
		if s.data.Budgets[i].HouseholdID == householdID && s.data.Budgets[i].Month == month {
			b := s.data.Budgets[i]
			return &b, nil
		}
	}
	return nil, nil
}

func (s *Store) DeleteBudget(householdID int, month string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.data.Budgets {
		if s.data.Budgets[i].HouseholdID == householdID && s.data.Budgets[i].Month == month {
			s.data.Budgets = append(s.data.Budgets[:i], s.data.Budgets[i+1:]...)
			return s.saveLocked()
		}
	}
	return nil
}
