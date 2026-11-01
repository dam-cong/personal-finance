package store

import (
	"fmt"

	"personal-finance/backend/internal/config"
	"personal-finance/backend/internal/models"
)

type SheetsStore struct{}

func NewSheetsStore(cfg *config.Config) (*SheetsStore, error) {
	return &SheetsStore{}, nil
}

func (s *SheetsStore) DefaultHousehold() (*models.Household, error) { return nil, fmt.Errorf("not implemented") }
func (s *SheetsStore) FindHousehold(id int) (*models.Household, error)  { return nil, fmt.Errorf("not found") }
func (s *SheetsStore) UpdateHousehold(id int, name string, defaultBudget *int64, slogan string, primaryColor string) (*models.Household, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *SheetsStore) FindUser(username string) (*models.User, error) { return nil, fmt.Errorf("user not found") }
func (s *SheetsStore) CreateUser(u *models.User) error                { return fmt.Errorf("not implemented") }
func (s *SheetsStore) UpdateUserDisplayName(username, displayName string) (*models.User, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *SheetsStore) ListUsersInHousehold(householdID int) []string { return []string{} }
func (s *SheetsStore) UserCount() int                               { return 0 }
func (s *SheetsStore) ListTransactions() ([]models.Transaction, error) {
	return []models.Transaction{}, nil
}
func (s *SheetsStore) ListTransactionsByUser(username string) ([]models.Transaction, error) {
	return []models.Transaction{}, nil
}
func (s *SheetsStore) ListTransactionsByHousehold(householdID int) ([]models.Transaction, error) {
	return []models.Transaction{}, nil
}
func (s *SheetsStore) GetTransaction(id int) (*models.Transaction, error) { return nil, fmt.Errorf("not found") }
func (s *SheetsStore) CreateTransaction(t *models.Transaction) error      { return fmt.Errorf("not implemented") }
func (s *SheetsStore) DeleteTransaction(id int) error                    { return fmt.Errorf("not implemented") }
func (s *SheetsStore) SetBudget(householdID int, month string, amount int64) (*models.Budget, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *SheetsStore) GetBudget(householdID int, month string) (*models.Budget, error) {
	return nil, fmt.Errorf("not found")
}
func (s *SheetsStore) DeleteBudget(householdID int, month string) error { return fmt.Errorf("not implemented") }
