package config

import "go.uber.org/zap"

func NewLogger(cfg *Config) (*zap.Logger, error) {
	if cfg.Development {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
