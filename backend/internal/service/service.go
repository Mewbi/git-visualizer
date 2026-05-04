package service

import (
	"git-visualizer/backend/config"
	"git-visualizer/backend/internal/repository"

	"go.uber.org/fx"
	"go.uber.org/zap"
)

type Service struct {
	cache  repository.CacheRepository
	git    repository.GitRepository
	locker *repository.RepoLocker
	config *config.Config
	logger *zap.Logger
}

type Params struct {
	fx.In
	Cache  repository.CacheRepository
	Git    repository.GitRepository
	Config *config.Config
	Logger *zap.Logger
}

func New(p Params) *Service {
	return &Service{
		cache:  p.Cache,
		git:    p.Git,
		locker: repository.NewRepoLocker(),
		config: p.Config,
		logger: p.Logger,
	}
}
