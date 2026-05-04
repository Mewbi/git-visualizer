# Git Visualizer — Backend

Go REST API that clones GitHub repositories, builds their commit DAG, and serves it with Redis-backed caching.

## Stack

- **Go** with [Fx](https://github.com/uber-go/fx) (dependency injection) and [Gin](https://github.com/gin-gonic/gin) (HTTP)
- **Redis** for TTL-based graph caching (sliding expiration)
- **git** CLI for partial clones and incremental fetches

## Project Structure

```
backend/
├── main.go
├── config/
│   ├── config.go         # YAML loader with env var overrides
│   ├── config.yaml       # Default (development) configuration
│   └── logger.go         # Zap logger factory
└── internal/
    ├── controller/
    │   ├── server.go     # Gin router setup and Fx lifecycle hooks
    │   ├── handler.go    # HTTP handlers
    │   └── middleware.go # CORS and request logging
    ├── service/
    │   ├── service.go    # Service struct and Fx wiring
    │   ├── graph.go      # Business logic: GetGraph, GetUpdates, RefreshGraph, GetCommitDiff
    │   └── errors.go     # Sentinel errors
    └── repository/
        ├── repository.go # Types, interfaces, and errors
        ├── git.go        # git clone/fetch/log via exec
        ├── redis.go      # Redis cache with TTL
        └── locker.go     # Per-repository mutex
```

## Configuration

Settings are loaded from `config/config.yaml`. The following environment variables override their YAML counterparts:

| Variable        | YAML key               | Default           |
|-----------------|------------------------|-------------------|
| `REDIS_ADDR`    | `redis.addr`           | `localhost:6379`  |
| `REDIS_PASSWORD`| `redis.password`       | *(empty)*         |
| `REPOS_PATH`    | `storage.repos_path`   | `/tmp/repos`      |
| `APP_ENV`       | —                      | *(development)*   |

Set `APP_ENV=production` to load `config/config_prod.yaml` instead (if present) and switch Gin to release mode.

## Running

**Prerequisites:** Go 1.21+, Redis, git

```bash
# Start Redis (example with Docker)
docker run -d -p 6379:6379 redis:alpine

# Run the API
cd backend
go run .
```

The server starts on port `8080` by default.

## API

All endpoints accept `application/json` and return `application/json`.

---

### `GET /repo` — Fetch full commit graph

Returns the complete DAG for a GitHub repository. On a cache hit the TTL is refreshed; on a miss the repository is cloned/fetched, the graph is built, and the result is stored in Redis.

**Query parameters**

| Parameter | Type   | Required | Description              |
|-----------|--------|----------|--------------------------|
| `owner`   | string | yes      | GitHub username or org   |
| `name`    | string | yes      | Repository name          |

**Example request**

```
GET /repo?owner=torvalds&name=linux
```

**Response `200 OK`**

```json
{
  "repo": "torvalds/linux",
  "head": "a3c2ba531d0d8e6e4c6d2c3d4c8c7e3f1a2b4c5d",
  "nodes": [
    {
      "hash": "a3c2ba531d0d8e6e4c6d2c3d4c8c7e3f1a2b4c5d",
      "parents": ["f1e2d3c4b5a6978869504132241516171819202"],
      "author": "Linus Torvalds",
      "timestamp": 1710000000,
      "message": "Merge pull request #1234 from user/branch",
      "pr_link": "https://github.com/torvalds/linux/pull/1234"
    }
  ]
}
```

`pr_link` is only present on commits whose message matches a GitHub PR merge pattern (standard merges: `Merge pull request #N`, or squash merges with `(#N)` at the end). It is omitted for regular commits.

---

### `GET /repo/updates` — Fetch incremental updates

Returns only commits that appeared after a known commit hash. Use this to poll for new commits without re-fetching the entire graph.

**Query parameters**

| Parameter | Type   | Required | Description                                     |
|-----------|--------|----------|-------------------------------------------------|
| `owner`   | string | yes      | GitHub username or org                          |
| `name`    | string | yes      | Repository name                                 |
| `since`   | string | yes      | Last known commit hash (4–40 hex characters)    |

**Example request**

```
GET /repo/updates?owner=torvalds&name=linux&since=a3c2ba531d0d8e6e4c6d2c3d4c8c7e3f1a2b4c5d
```

**Response `200 OK`**

```json
{
  "newNodes": [
    {
      "hash": "b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
      "parents": ["a3c2ba531d0d8e6e4c6d2c3d4c8c7e3f1a2b4c5d"],
      "author": "Linus Torvalds",
      "timestamp": 1710086400,
      "message": "fix: handle edge case (#42)",
      "pr_link": "https://github.com/torvalds/linux/pull/42"
    }
  ],
  "head": "b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3"
}
```

`newNodes` is an empty array `[]` when there are no new commits since `since`. `pr_link` follows the same rules as in `GET /repo`.

---

### `POST /repo/refresh` — Force refresh

Forces a `git fetch`, rebuilds the full graph, and overwrites the Redis cache. Useful after a force-push or to trigger an immediate update outside the normal TTL cycle.

**Query parameters**

| Parameter | Type   | Required | Description            |
|-----------|--------|----------|------------------------|
| `owner`   | string | yes      | GitHub username or org |
| `name`    | string | yes      | Repository name        |

**Example request**

```
POST /repo/refresh?owner=torvalds&name=linux
```

**Response `200 OK`** — same shape as `GET /repo`.

---

### `GET /repo/commit` — Fetch commit diff

Returns the file-level diff for a single commit. The repository must have been fetched at least once via `GET /repo` before calling this endpoint.

**Query parameters**

| Parameter | Type   | Required | Description                                  |
|-----------|--------|----------|----------------------------------------------|
| `owner`   | string | yes      | GitHub username or org                       |
| `name`    | string | yes      | Repository name                              |
| `hash`    | string | yes      | Commit hash to inspect (4–40 hex characters) |

**Example request**

```
GET /repo/commit?owner=torvalds&name=linux&hash=a3c2ba531d0d8e6e4c6d2c3d4c8c7e3f1a2b4c5d
```

**Response `200 OK`**

```json
{
  "hash": "a3c2ba531d0d8e6e4c6d2c3d4c8c7e3f1a2b4c5d",
  "files": [
    { "path": "kernel/sched/core.c", "additions": 12, "deletions": 3 },
    { "path": "include/linux/sched.h", "additions": 2, "deletions": 0 }
  ],
  "diff": "diff --git a/kernel/sched/core.c b/kernel/sched/core.c\n..."
}
```

- `files` — per-file change counts. Binary files report `0` for both additions and deletions.
- `diff` — raw unified diff produced by `git show`. For merge commits this is the combined diff against all parents.

---

### Error responses

All endpoints return errors in the following shape:

```json
{ "error": "description" }
```

| Status | Condition                                                   |
|--------|-------------------------------------------------------------|
| `400`  | Missing required parameters or invalid hash format (`since`, `hash`) |
| `404`  | Repository not found on GitHub, or commit hash not found in local clone |
| `500`  | Unexpected server error                                               |

## Data model

### Commit node

| Field       | Type       | Description                                                        |
|-------------|------------|--------------------------------------------------------------------|
| `hash`      | string     | Full 40-character SHA-1 commit hash                                |
| `parents`   | []string   | Parent commit hashes (empty for root commits)                      |
| `author`    | string     | Author name                                                        |
| `timestamp` | number     | Unix timestamp (seconds)                                           |
| `message`   | string     | Commit subject line                                                |
| `pr_link`   | string     | GitHub PR URL — present only on commits detected as PR merges      |

PR detection covers two GitHub merge styles:
- **Standard merge**: message matches `Merge pull request #N from …`
- **Squash merge**: message ends with `(#N)`

### Commit diff

| Field   | Type       | Description                              |
|---------|------------|------------------------------------------|
| `hash`  | string     | The requested commit hash                |
| `files` | []FileStat | Per-file change counts (see below)       |
| `diff`  | string     | Raw unified diff from `git show`         |

### FileStat

| Field       | Type   | Description                         |
|-------------|--------|-------------------------------------|
| `path`      | string | File path relative to repo root     |
| `additions` | number | Lines added (0 for binary files)    |
| `deletions` | number | Lines deleted (0 for binary files)  |

## Caching

Graphs are stored in Redis under the key `repo:{owner}:{name}:graph` with a configurable TTL (default 30 minutes). Every read refreshes the TTL (sliding expiration). `POST /repo/refresh` resets the TTL by overwriting the key.

## Security

- `owner` and `name` are validated against `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$` before any shell execution.
- `since` and `hash` are validated against `^[0-9a-f]{4,40}$`.
- Only GitHub HTTPS URLs are constructed (`https://github.com/{owner}/{name}.git`).
