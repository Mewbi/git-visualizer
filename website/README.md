# git·vis — Frontend

React frontend for the Git History Visualizer. Renders a commit DAG for any public GitHub repository, with live incremental updates.

## Stack

| Tool | Purpose |
|------|---------|
| Vite + React + TypeScript | Build tooling and UI framework |
| `@xyflow/react` | Interactive DAG canvas (pan, zoom, click) |
| `@dagrejs/dagre` | Automatic graph layout |
| Tailwind CSS v4 | Styling |
| JetBrains Mono | Monospace font (loaded via Google Fonts) |

## Getting Started

```bash
npm install
npm run dev
```

The dev server starts on `http://localhost:5173` and proxies `/repo` requests to the backend at `http://localhost:8080`.

### Other commands

```bash
npm run build     # production build → dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

## Project Structure

```
src/
  types.ts                  # Shared types: Commit, GraphResponse, GraphState
  lib/
    api.ts                  # fetchGraph / fetchUpdates API calls
    layout.ts               # dagre layout → ReactFlow nodes + lane-colored edges
    time.ts                 # Relative timestamp formatting
    mock.ts                 # Mock commits for local testing
  hooks/
    useGitGraph.ts          # Load graph + poll for updates every 20s
  components/
    Header.tsx              # Repo input bar + live polling indicator
    CommitNode.tsx          # Custom ReactFlow node (hash, message, author, time)
    GitGraph.tsx            # ReactFlow canvas, minimap, commit detail panel
    EmptyState.tsx          # Idle landing screen with example repos
  App.tsx                   # Root layout and status orchestration
```

## API Contract

The frontend expects the backend running at `:8080` to expose:

### `GET /repo?owner=&name=`

Returns the full commit graph.

```json
{
  "head": "<commit-hash>",
  "nodes": [
    {
      "hash": "a1b2c3d...",
      "parents": ["b2c3d4e..."],
      "author": "Alice",
      "timestamp": 1710000000,
      "message": "feat: add incremental updates"
    }
  ]
}
```

### `GET /repo/updates?owner=&name=&since=<hash>`

Returns only commits newer than `since`.

```json
{
  "head": "<new-hash>",
  "newNodes": []
}
```

## Features

- **DAG visualization** — commits laid out top-to-bottom by time, branches in parallel lanes
- **Lane colors** — 8 distinct colors cycling across branch lanes; edges inherit the lane color
- **Commit detail panel** — click any node to see full hash, message, author, date, and parent hashes
- **HEAD badge** — the current HEAD commit is highlighted and labeled
- **Merge badge** — merge commits (2+ parents) are visually tagged
- **Live polling** — fetches incremental updates every 20 seconds; a pulsing indicator appears in the header
- **Zoom / pan** — standard ReactFlow controls; minimap in the bottom-right corner
