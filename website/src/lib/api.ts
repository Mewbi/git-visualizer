import type { GraphResponse, UpdatesResponse, CommitDiff } from '../types'

const BASE = ''

export async function fetchGraph(owner: string, name: string): Promise<GraphResponse> {
  const res = await fetch(`${BASE}/repo?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Failed to fetch graph: ${text}`)
  }
  return res.json()
}

export async function fetchUpdates(owner: string, name: string, since: string): Promise<UpdatesResponse> {
  const res = await fetch(
    `${BASE}/repo/updates?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}&since=${encodeURIComponent(since)}`
  )
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Failed to fetch updates: ${text}`)
  }
  return res.json()
}

export async function fetchCommitDiff(owner: string, name: string, hash: string): Promise<CommitDiff> {
  const res = await fetch(
    `${BASE}/repo/commit?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}&hash=${encodeURIComponent(hash)}`
  )
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Failed to fetch diff: ${text}`)
  }
  return res.json()
}
