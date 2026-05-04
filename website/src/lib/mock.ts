import type { Commit } from '../types'

export function generateMockCommits(): Commit[] {
  const now = Math.floor(Date.now() / 1000)
  const day = 86400

  return [
    { hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', parents: ['b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3'], author: 'Alice', timestamp: now, message: 'feat: add incremental graph updates' },
    { hash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', parents: ['c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', 'f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2'], author: 'Bob', timestamp: now - day, message: 'Merge branch feature/auth into main' },
    { hash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', parents: ['d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5'], author: 'Alice', timestamp: now - day * 2, message: 'refactor: extract graph builder module' },
    { hash: 'f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2', parents: ['d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5'], author: 'Carol', timestamp: now - day * 2 - 3600, message: 'feat: implement JWT authentication' },
    { hash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5', parents: ['e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6'], author: 'Bob', timestamp: now - day * 3, message: 'chore: update dependencies' },
    { hash: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', parents: ['g6a7b8c9d0e1f6a7b8c9d0e1f2a3b4c5d6e7f8a9'], author: 'Alice', timestamp: now - day * 4, message: 'fix: resolve race condition in cache layer' },
    { hash: 'g6a7b8c9d0e1f6a7b8c9d0e1f2a3b4c5d6e7f8a9', parents: ['h7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6'], author: 'Carol', timestamp: now - day * 5, message: 'docs: add API documentation' },
    { hash: 'h7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6', parents: [], author: 'Alice', timestamp: now - day * 6, message: 'Initial commit' },
  ]
}
