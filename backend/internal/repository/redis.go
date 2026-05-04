package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"git-visualizer/backend/config"

	"github.com/redis/go-redis/v9"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

type RedisRepo struct {
	client *redis.Client
	logger *zap.Logger
}

type RedisParams struct {
	fx.In
	Config    *config.Config
	Logger    *zap.Logger
	Lifecycle fx.Lifecycle
}

func NewRedis(p RedisParams) (CacheRepository, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     p.Config.Redis.Addr,
		Password: p.Config.Redis.Password,
		DB:       p.Config.Redis.DB,
	})

	p.Lifecycle.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if err := client.Ping(ctx).Err(); err != nil {
				return fmt.Errorf("redis ping failed: %w", err)
			}
			p.Logger.Info("connected to redis", zap.String("addr", p.Config.Redis.Addr))
			return nil
		},
		OnStop: func(ctx context.Context) error {
			return client.Close()
		},
	})

	return &RedisRepo{client: client, logger: p.Logger}, nil
}

func graphKey(owner, name string) string {
	return fmt.Sprintf("repo:%s:%s:graph", owner, name)
}

func (r *RedisRepo) GetGraph(ctx context.Context, owner, name string) (*Graph, error) {
	data, err := r.client.Get(ctx, graphKey(owner, name)).Bytes()
	if err == redis.Nil {
		return nil, ErrCacheMiss
	}
	if err != nil {
		return nil, fmt.Errorf("redis get: %w", err)
	}

	var graph Graph
	if err := json.Unmarshal(data, &graph); err != nil {
		return nil, fmt.Errorf("unmarshal graph: %w", err)
	}
	return &graph, nil
}

func (r *RedisRepo) SetGraph(ctx context.Context, owner, name string, graph *Graph, ttl time.Duration) error {
	data, err := json.Marshal(graph)
	if err != nil {
		return fmt.Errorf("marshal graph: %w", err)
	}
	return r.client.Set(ctx, graphKey(owner, name), data, ttl).Err()
}

func (r *RedisRepo) RefreshTTL(ctx context.Context, owner, name string, ttl time.Duration) error {
	return r.client.Expire(ctx, graphKey(owner, name), ttl).Err()
}
