package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Name        string  `yaml:"name"`
	Development bool    `yaml:"development"`
	Server      Server  `yaml:"server"`
	Redis       Redis   `yaml:"redis"`
	Storage     Storage `yaml:"storage"`
}

type Server struct {
	Host        string   `yaml:"host"`
	Port        int      `yaml:"port"`
	CORSOrigins []string `yaml:"cors_origins"`
}

type Redis struct {
	Addr       string `yaml:"addr"`
	Password   string `yaml:"password"`
	DB         int    `yaml:"db"`
	TTLMinutes int    `yaml:"ttl_minutes"`
}

type Storage struct {
	ReposPath string `yaml:"repos_path"`
}

func NewConfig() (*Config, error) {
	path := "config/config.yaml"
	if os.Getenv("APP_ENV") == "production" {
		if _, err := os.Stat("config/config_prod.yaml"); err == nil {
			path = "config/config_prod.yaml"
		}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	if addr := os.Getenv("REDIS_ADDR"); addr != "" {
		cfg.Redis.Addr = addr
	}
	if pass := os.Getenv("REDIS_PASSWORD"); pass != "" {
		cfg.Redis.Password = pass
	}
	if reposPath := os.Getenv("REPOS_PATH"); reposPath != "" {
		cfg.Storage.ReposPath = reposPath
	}

	return &cfg, nil
}
