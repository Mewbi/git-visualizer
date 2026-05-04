package repository

import "sync"

type RepoLocker struct {
	mu    sync.Mutex
	locks map[string]*sync.Mutex
}

func NewRepoLocker() *RepoLocker {
	return &RepoLocker{locks: make(map[string]*sync.Mutex)}
}

func (l *RepoLocker) Lock(key string) {
	l.mu.Lock()
	if _, ok := l.locks[key]; !ok {
		l.locks[key] = &sync.Mutex{}
	}
	mu := l.locks[key]
	l.mu.Unlock()
	mu.Lock()
}

func (l *RepoLocker) Unlock(key string) {
	l.mu.Lock()
	mu := l.locks[key]
	l.mu.Unlock()
	mu.Unlock()
}
