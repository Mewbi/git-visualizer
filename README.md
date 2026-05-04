# Git History Visualizer

Visualizes the commit DAG of any public GitHub repository in the browser. Enter an `owner/repo` and get an interactive graph with branch lanes, merge connections, and live polling for new commits.

```
Frontend (React + ReactFlow)
        ↓
Backend API (Go + Gin + Fx)
        ↓
Redis (TTL cache, sliding expiration)
        ↓
Git (partial clones, incremental fetches)
```

## Repository Structure

```
git-visualizer/
├── backend/        # Go REST API
├── website/        # React frontend
└── docker-compose.yml
```

## Quick Start

### With Docker Compose

```bash
docker compose up
```

The app is available at `http://localhost:80`. Set `PORT` to use a different host port:

```bash
PORT=3000 docker compose up
```

### Without Docker

**Prerequisites:** Go 1.21+, Node.js 18+, Redis, git

```bash
# 1. Start Redis
docker run -d -p 6379:6379 redis:alpine

# 2. Start the backend (port 8080)
cd backend
go run .

# 3. Start the frontend (port 5173, proxies /repo → :8080)
cd website
npm install
npm run dev
```

Open `http://localhost:5173`.

## Components

### `backend/` — Go API

Clones GitHub repositories using a partial clone (`--filter=blob:none --no-checkout`), builds the commit DAG from `git log`, caches the result in Redis, and serves it over HTTP. Incremental updates use `git fetch` + `git log <since>..HEAD` to return only new commits.

See [`backend/README.md`](backend/README.md) for the full API reference, configuration options, and data model.

### `website/` — React Frontend

Renders the commit graph using ReactFlow with a dagre-computed layout. Commits are displayed as cards in branch lanes with color-coded edges. Clicking a node opens a detail panel. The app polls for updates every 20 seconds.

See [`website/README.md`](website/README.md) for the project structure and development commands.