export interface Commit {
  hash: string
  parents: string[]
  author: string
  timestamp: number
  message: string
  pr_link?: string
}

export interface FileStat {
  path: string
  additions: number
  deletions: number
}

export interface CommitDiff {
  hash: string
  files: FileStat[]
  diff: string
}

export interface GraphResponse {
  repo?: string
  head: string
  nodes: Commit[]
}

export interface UpdatesResponse {
  head: string
  newNodes: Commit[]
}

export type GraphState = {
  nodes: Map<string, Commit>
  head: string
}
