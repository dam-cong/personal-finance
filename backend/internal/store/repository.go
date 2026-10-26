package store

import (
	"personal-finance/backend/internal/models"
)

type Repository interface {
	DefaultHousehold() (*models.Household, error)
	FindHousehold(id int) (*models.Household, error)
	UpdateHousehold(id int, name string, defaultBudget *int64, slogan string, primaryColor string) (*models.Household, error)

	FindUser(username string) (*models.User, error)
	CreateUser(u *models.User) error
	UpdateUserDisplayName(username, displayName string) (*models.User, error)
	ListUsersInHousehold(householdID int) []string
	UserCount() int

	ListTransactions() ([]models.Transaction, error)
	ListTransactionsByUser(username string) ([]models.Transaction, error)
	ListTransactionsByHousehold(householdID int) ([]models.Transaction, error)
	GetTransaction(id int) (*models.Transaction, error)
	CreateTransaction(t *models.Transaction) error
	DeleteTransaction(id int) error

	SetBudget(householdID int, month string, amount int64) (*models.Budget, error)
	GetBudget(householdID int, month string) (*models.Budget, error)
	DeleteBudget(householdID int, month string) error
}
