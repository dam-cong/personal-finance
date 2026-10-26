package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                        string
	JWTSecret                   string
	DataFile                    string
	SeedUsers                   string
	AppName                     string
	HouseholdName               string
	DefaultBudget               int64
	DataBackend                 string
	GoogleSheetsID              string
	GoogleServiceAccountJSONB64 string
	SheetsCacheTTL              string
	AppLocation                 string
	AppEnv                      string
	InitSecret                  string
	ServeFrontend               string
}

func Load() *Config {
	godotenv.Load()
	return &Config{
		Port:                        getEnv("PORT", "8080"),
		JWTSecret:                   getEnv("JWT_SECRET", "dev-secret-change-me"),
		DataFile:                    getEnv("DATA_FILE", "data/data.json"),
		SeedUsers:                   getEnv("SEED_USERS", "hiendc:1998,trangdt:1999"),
		AppName:                     getEnv("APP_NAME", "Personal Finance Chat"),
		HouseholdName:               getEnv("HOUSEHOLD_NAME", "Gia đình Trang - Hiến"),
		DefaultBudget:               getEnvInt64("DEFAULT_BUDGET", 10000000),
		DataBackend:                 getEnv("DATA_BACKEND", "file"),
		GoogleSheetsID:              getEnv("GOOGLE_SHEETS_ID", ""),
		GoogleServiceAccountJSONB64: getEnv("GOOGLE_SERVICE_ACCOUNT_JSON_B64", ""),
		SheetsCacheTTL:              getEnv("SHEETS_CACHE_TTL", "10s"),
		AppLocation:                 getEnv("APP_LOCATION", "Asia/Ho_Chi_Minh"),
		AppEnv:                      getEnv("APP_ENV", ""),
		InitSecret:                  getEnv("INIT_SECRET", ""),
		ServeFrontend:               getEnv("SERVE_FRONTEND", "false"),
	}
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvInt64(key string, def int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return def
}
