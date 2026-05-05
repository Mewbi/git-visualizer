package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"git-visualizer/backend/internal/repository"

	"go.uber.org/zap"
)

func (s *Service) ttl() time.Duration {
	return time.Duration(s.config.Redis.TTLMinutes) * time.Minute
}

func (s *Service) repoKey(owner, name string) string {
	return owner + "/" + name
}

func (s *Service) GetGraph(ctx context.Context, owner, name string, limit int) (*repository.Graph, error) {
	graph, err := s.cache.GetGraph(ctx, owner, name)
	if err == nil {
		if terr := s.cache.RefreshTTL(ctx, owner, name, s.ttl()); terr != nil {
			s.logger.Warn("refresh TTL failed", zap.Error(terr))
		}
		return graph, nil
	}
	if !errors.Is(err, repository.ErrCacheMiss) {
		return nil, fmt.Errorf("cache get: %w", err)
	}

	key := s.repoKey(owner, name)
	s.locker.Lock(key)
	defer s.locker.Unlock(key)

	// Double-check after acquiring lock (another goroutine may have populated cache)
	graph, err = s.cache.GetGraph(ctx, owner, name)
	if err == nil {
		if terr := s.cache.RefreshTTL(ctx, owner, name, s.ttl()); terr != nil {
			s.logger.Warn("refresh TTL failed", zap.Error(terr))
		}
		return graph, nil
	}

	return s.fetchAndCache(ctx, owner, name, limit)
}

func (s *Service) GetUpdates(ctx context.Context, owner, name, since string) (*repository.UpdatesResponse, error) {
	key := s.repoKey(owner, name)
	s.locker.Lock(key)
	defer s.locker.Unlock(key)

	localPath, err := s.git.EnsureRepo(ctx, owner, name)
	if err != nil {
		return nil, s.wrapRepoError(err)
	}

	if err := s.git.FetchRepo(ctx, localPath); err != nil {
		s.logger.Warn("fetch failed, using existing data", zap.Error(err))
	}

	newNodes, head, err := s.git.BuildIncrementalGraph(ctx, owner, name, localPath, since)
	if err != nil {
		if errors.Is(err, repository.ErrInvalidInput) {
			return nil, fmt.Errorf("%w: %v", ErrBadRequest, err)
		}
		return nil, fmt.Errorf("build incremental graph: %w", err)
	}

	if len(newNodes) > 0 {
		graph, berr := s.git.BuildFullGraph(ctx, owner, name, localPath, 0)
		if berr == nil {
			if cerr := s.cache.SetGraph(ctx, owner, name, graph, s.ttl()); cerr != nil {
				s.logger.Warn("cache update failed", zap.Error(cerr))
			}
		}
	} else {
		if terr := s.cache.RefreshTTL(ctx, owner, name, s.ttl()); terr != nil {
			s.logger.Warn("refresh TTL failed", zap.Error(terr))
		}
	}

	return &repository.UpdatesResponse{
		NewNodes: newNodes,
		Head:     head,
	}, nil
}

func (s *Service) RefreshGraph(ctx context.Context, owner, name string) (*repository.Graph, error) {
	key := s.repoKey(owner, name)
	s.locker.Lock(key)
	defer s.locker.Unlock(key)

	localPath, err := s.git.EnsureRepo(ctx, owner, name)
	if err != nil {
		return nil, s.wrapRepoError(err)
	}

	if err := s.git.FetchRepo(ctx, localPath); err != nil {
		return nil, fmt.Errorf("git fetch: %w", err)
	}

	graph, err := s.git.BuildFullGraph(ctx, owner, name, localPath, 0)
	if err != nil {
		return nil, fmt.Errorf("build graph: %w", err)
	}

	if err := s.cache.SetGraph(ctx, owner, name, graph, s.ttl()); err != nil {
		s.logger.Warn("cache set failed", zap.Error(err))
	}

	return graph, nil
}

func (s *Service) fetchAndCache(ctx context.Context, owner, name string, limit int) (*repository.Graph, error) {
	localPath, err := s.git.EnsureRepo(ctx, owner, name)
	if err != nil {
		return nil, s.wrapRepoError(err)
	}

	if err := s.git.FetchRepo(ctx, localPath); err != nil {
		s.logger.Warn("fetch failed, building from existing", zap.Error(err))
	}

	graph, err := s.git.BuildFullGraph(ctx, owner, name, localPath, limit)
	if err != nil {
		return nil, fmt.Errorf("build graph: %w", err)
	}

	if err := s.cache.SetGraph(ctx, owner, name, graph, s.ttl()); err != nil {
		s.logger.Warn("cache set failed", zap.Error(err))
	}

	return graph, nil
}

func (s *Service) GetCommitDiff(ctx context.Context, owner, name, hash string) (*repository.CommitDiff, error) {
	localPath, err := s.git.EnsureRepo(ctx, owner, name)
	if err != nil {
		return nil, s.wrapRepoError(err)
	}

	diff, err := s.git.GetCommitDiff(ctx, localPath, hash)
	if err != nil {
		if errors.Is(err, repository.ErrInvalidInput) {
			return nil, fmt.Errorf("%w: %v", ErrBadRequest, err)
		}
		return nil, fmt.Errorf("get commit diff: %w", err)
	}

	return diff, nil
}

func (s *Service) wrapRepoError(err error) error {
	if errors.Is(err, repository.ErrInvalidInput) {
		return fmt.Errorf("%w: %v", ErrBadRequest, err)
	}
	return fmt.Errorf("%w: %v", ErrNotFound, err)
}
