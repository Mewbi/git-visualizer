import { useCallback, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Header from './components/Header'
import GitGraph from './components/GitGraph'
import EmptyState from './components/EmptyState'
import { useGitGraph } from './hooks/useGitGraph'

export default function App() {
  const { state, status, error, load, isPolling } = useGitGraph()
  const [currentRepo, setCurrentRepo] = useState<{ owner: string; name: string } | null>(null)

  const handleLoad = useCallback(
    (owner: string, name: string) => {
      setCurrentRepo({ owner, name })
      load(owner, name)
    },
    [load]
  )

  return (
    <div className="flex flex-col h-full bg-[#0a0c10]">
      <Header
        onLoad={handleLoad}
        isLoading={status === 'loading'}
        isPolling={isPolling}
        commitCount={state?.nodes.size ?? 0}
      />

      <main className="flex-1 overflow-hidden relative">
        {status === 'idle' && <EmptyState onLoad={handleLoad} />}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{ animationDelay: `${i * 150}ms` }}
                  className="w-2 h-2 rounded-full bg-[#3fb950] animate-bounce"
                />
              ))}
            </div>
            <span className="text-[12px] font-mono text-[#7d8590]">Cloning repository…</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-[#f85149] font-mono text-[13px]">
              <span className="mr-2">✗</span>
              {error}
            </div>
            <p className="text-[#7d8590] text-[12px] font-mono">Check the repository name and try again.</p>
          </div>
        )}

        {status === 'success' && state && (
          state.nodes.size === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#7d8590] font-mono text-[13px]">No commits found in this repository.</p>
            </div>
          ) : (
            <ReactFlowProvider>
              <GitGraph
                commits={state.nodes}
                head={state.head}
                owner={currentRepo!.owner}
                name={currentRepo!.name}
              />
            </ReactFlowProvider>
          )
        )}
      </main>
    </div>
  )
}
