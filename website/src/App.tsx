import { useCallback, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Header from './components/Header'
import GitGraph from './components/GitGraph'
import EmptyState from './components/EmptyState'
import { useGitGraph } from './hooks/useGitGraph'

export default function App() {
  const { state, status, error, load, reset, isPolling } = useGitGraph()
  const [currentRepo, setCurrentRepo] = useState<{ owner: string; name: string } | null>(null)
  const [repoInput, setRepoInput] = useState('charmbracelet/bubbletea')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  })

  const handleLoad = useCallback(
    (owner: string, name: string) => {
      setCurrentRepo({ owner, name })
      setRepoInput(`${owner}/${name}`)
      load(owner, name)
    },
    [load]
  )

  const handleHome = useCallback(() => {
    reset()
    setCurrentRepo(null)
  }, [reset])

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return next
    })
  }, [])

  return (
    <div data-theme={theme} className="flex flex-col h-full bg-[var(--color-bg)]">
      <Header
        onLoad={handleLoad}
        onHome={handleHome}
        isLoading={status === 'loading'}
        isPolling={isPolling}
        commitCount={state?.nodes.size ?? 0}
        currentRepo={currentRepo}
        inputValue={repoInput}
        onInputChange={setRepoInput}
        theme={theme}
        onToggleTheme={toggleTheme}
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
                  className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce"
                />
              ))}
            </div>
            <span className="text-[12px] font-mono text-[var(--color-muted)]">Cloning repository…</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-[var(--color-danger)] font-mono text-[13px]">
              <span className="mr-2">✗</span>
              {error}
            </div>
            <p className="text-[var(--color-muted)] text-[12px] font-mono">Check the repository name and try again.</p>
          </div>
        )}

        {status === 'success' && state && (
          state.nodes.size === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[var(--color-muted)] font-mono text-[13px]">No commits found in this repository.</p>
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
