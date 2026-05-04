package controller

import (
	"context"
	"fmt"
	"net/http"

	"git-visualizer/backend/config"
	"git-visualizer/backend/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

type Controller struct {
	service *service.Service
	config  *config.Config
	logger  *zap.Logger
	server  *http.Server
}

type Params struct {
	fx.In
	Service   *service.Service
	Config    *config.Config
	Logger    *zap.Logger
	Lifecycle fx.Lifecycle
}

func New(p Params) {
	ct := &Controller{
		service: p.Service,
		config:  p.Config,
		logger:  p.Logger,
	}

	if !p.Config.Development {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(ct.loggerMiddleware())
	router.Use(ct.corsMiddleware())

	router.GET("/repo", ct.getGraph)
	router.GET("/repo/updates", ct.getUpdates)
	router.GET("/repo/commit", ct.getCommitDiff)
	router.POST("/repo/refresh", ct.refreshGraph)

	addr := fmt.Sprintf("%s:%d", p.Config.Server.Host, p.Config.Server.Port)
	ct.server = &http.Server{
		Addr:    addr,
		Handler: router,
	}

	p.Lifecycle.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			p.Logger.Info("starting HTTP server", zap.String("addr", addr))
			go func() {
				if err := ct.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					p.Logger.Error("server error", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			p.Logger.Info("shutting down HTTP server")
			return ct.server.Shutdown(ctx)
		},
	})
}
