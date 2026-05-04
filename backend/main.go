package main

import (
	"git-visualizer/backend/config"
	"git-visualizer/backend/internal/controller"
	"git-visualizer/backend/internal/repository"
	"git-visualizer/backend/internal/service"

	"go.uber.org/fx"
)

func main() {
	fx.New(
		fx.Provide(
			config.NewConfig,
			config.NewLogger,
			repository.NewRedis,
			repository.NewGit,
			service.New,
		),
		fx.Invoke(
			controller.New,
		),
	).Run()
}
