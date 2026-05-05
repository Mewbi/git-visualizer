package repository

import (
	"context"
	"errors"
	"time"
)

var (
	ErrCacheMiss    = errors.New("cache miss")
	ErrInvalidInput = errors.New("invalid input")
)

type Commit struct {
	Hash      string   `json:"hash"`
	Parents   []string `json:"parents"`
	Author    string   `json:"author"`
	Timestamp int64    `json:"timestamp"`
	Message   string   `json:"message"`
	PRLink    string   `json:"pr_link,omitempty"`
}

type FileStat struct {
	Path      string `json:"path"`
	Additions int    `json:"additions"`
	Deletions int    `json:"deletions"`
}

type CommitDiff struct {
	Hash  string     `json:"hash"`
	Files []FileStat `json:"files"`
	Diff  string     `json:"diff"`
}

type Graph struct {
	Repo  string   `json:"repo"`
	Head  string   `json:"head"`
	Nodes []Commit `json:"nodes"`
}

type UpdatesResponse struct {
	NewNodes []Commit `json:"newNodes"`
	Head     string   `json:"head"`
}

type CacheRepository interface {
	GetGraph(ctx context.Context, owner, name string) (*Graph, error)
	SetGraph(ctx context.Context, owner, name string, graph *Graph, ttl time.Duration) error
	RefreshTTL(ctx context.Context, owner, name string, ttl time.Duration) error
}

type GitRepository interface {
	EnsureRepo(ctx context.Context, owner, name string) (string, error)
	FetchRepo(ctx context.Context, localPath string) error
	BuildFullGraph(ctx context.Context, owner, name, localPath string, limit int) (*Graph, error)
	BuildIncrementalGraph(ctx context.Context, owner, name, localPath, since string) ([]Commit, string, error)
	GetCommitDiff(ctx context.Context, localPath, hash string) (*CommitDiff, error)
}
