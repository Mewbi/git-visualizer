import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchGraph, fetchUpdates } from '../lib/api'
import type { Commit, GraphState } from '../types'

const POLL_INTERVAL = 20_000

type Status = 'idle' | 'loading' | 'success' | 'error'

interface UseGitGraphResult {
  state: GraphState | null
  status: Status
  error: string | null
  load: (owner: string, name: string) => void
  isPolling: boolean
}

export function useGitGraph(): UseGitGraphResult {
  const [state, setState] = useState<GraphState | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const ownerRef = useRef<string>('')
  const nameRef = useRef<string>('')
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
    setIsPolling(false)
  }, [])

  const poll = useCallback(async () => {
    const owner = ownerRef.current
    const name = nameRef.current

    setState(prev => {
      if (!prev) return prev
      const run = async () => {
        try {
          const data = await fetchUpdates(owner, name, prev.head)
          if (data.newNodes.length > 0) {
            setState(curr => {
              if (!curr) return curr
              const next = new Map(curr.nodes)
              for (const c of data.newNodes) next.set(c.hash, c)
              return { nodes: next, head: data.head }
            })
          }
        } catch {
          // silently ignore poll errors
        } finally {
          pollTimer.current = setTimeout(poll, POLL_INTERVAL)
        }
      }
      run()
      return prev
    })
  }, [])

  const load = useCallback(
    async (owner: string, name: string) => {
      stopPolling()
      if (abortRef.current) abortRef.current.abort()

      ownerRef.current = owner
      nameRef.current = name

      setStatus('loading')
      setError(null)
      setState(null)

      try {
        const data = await fetchGraph(owner, name)
        const nodeMap = new Map<string, Commit>()
        for (const c of data.nodes) nodeMap.set(c.hash, c)

        setState({ nodes: nodeMap, head: data.head })
        setStatus('success')
        setIsPolling(true)
        pollTimer.current = setTimeout(poll, POLL_INTERVAL)
      } catch (e) {
        setStatus('error')
        setError(e instanceof Error ? e.message : 'Unknown error')
      }
    },
    [stopPolling, poll]
  )

  useEffect(() => () => stopPolling(), [stopPolling])

  return { state, status, error, load, isPolling }
}
