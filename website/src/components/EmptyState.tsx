import { useState, useEffect } from 'react'

interface EmptyStateProps {
  onLoad: (owner: string, name: string) => void
}

const EXAMPLES = [
  { owner: 'charmbracelet', name: 'bubbletea', desc: 'Terminal UI framework' },
  { owner: 'Mewbi', name: 'git-visualizer', desc: 'Git DAG visualizer' },
  { owner: 'uber-go', name: 'fx', desc: 'Dependency injection framework' },
  { owner: 'boltdb', name: 'bolt', desc: 'Embedded key/value database' },
  { owner: 'joho', name: 'godotenv', desc: 'Go dotenv loader' },
  { owner: 'fatih', name: 'color', desc: 'Terminal color for Go' },
]

const CAROUSEL_INTERVAL = 4000

export default function EmptyState({ onLoad }: EmptyStateProps) {
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx(i => (i + 1) % EXAMPLES.length)
    }, CAROUSEL_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  const prev = () => setActiveIdx(i => (i - 1 + EXAMPLES.length) % EXAMPLES.length)
  const next = () => setActiveIdx(i => (i + 1) % EXAMPLES.length)

  const example = EXAMPLES[activeIdx]

  return (
    <div className="flex flex-col h-full">
      {/* centered main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 select-none">
        {/* ASCII art git graph */}
        <pre className="text-[var(--lane-0)] text-[13px] leading-relaxed font-mono opacity-40 pointer-events-none">
{`*  a1b2c3d  feat: add graph updates
|\\
| * f1e2d3c  feat: auth module
* | c3d4e5f  refactor: extract DAG
|/
*  d4e5f6a  chore: deps`}
        </pre>

        <div className="text-center">
          <div className="text-[var(--color-muted)] text-[13px] font-mono mb-6">
            Enter a GitHub repository above to visualize its commit graph
          </div>

          {/* carousel */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={prev}
                className="w-6 h-6 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                aria-label="Previous example"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M9.78 12.78a.75.75 0 01-1.06 0L4.47 8.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L6.56 8l3.22 3.22a.75.75 0 010 1.06z"/>
                </svg>
              </button>

              <button
                onClick={() => onLoad(example.owner, example.name)}
                className="px-4 py-2 text-[13px] font-mono text-[var(--color-muted)] hover:text-[var(--color-text)] bg-[var(--color-panel)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-md transition-colors min-w-[260px]"
              >
                <span className="text-[var(--color-text)]">{example.owner}/{example.name}</span>
                <span className="text-[var(--color-muted-dim)] ml-2 text-[11px]">{example.desc}</span>
              </button>

              <button
                onClick={next}
                className="w-6 h-6 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                aria-label="Next example"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.44 8 6.22 4.78a.75.75 0 010-1.06z"/>
                </svg>
              </button>
            </div>

            {/* dot indicators */}
            <div className="flex gap-1.5">
              {EXAMPLES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === activeIdx
                      ? 'bg-[var(--color-accent)]'
                      : 'bg-[var(--color-border)]'
                  }`}
                  aria-label={`Example ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* footer */}
      <footer className="py-4 flex justify-center items-center">
        <a
          href="https://github.com/Mewbi/git-visualizer"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Mewbi/git-visualizer
        </a>
      </footer>
    </div>
  )
}
