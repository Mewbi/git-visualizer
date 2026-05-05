import { type FormEvent } from 'react'

interface HeaderProps {
  onLoad: (owner: string, name: string) => void
  onHome: () => void
  isLoading: boolean
  isPolling: boolean
  commitCount: number
  currentRepo: { owner: string; name: string } | null
  inputValue: string
  onInputChange: (value: string) => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  )
}

export default function Header({ onLoad, onHome, isLoading, isPolling, commitCount, currentRepo, inputValue, onInputChange, theme, onToggleTheme }: HeaderProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parts = inputValue.trim().split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return
    onLoad(parts[0], parts[1])
  }

  return (
    <header className="flex items-center gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
      {/* logo — clicking goes home */}
      <button
        onClick={onHome}
        className="flex items-center gap-2.5 shrink-0 hover:opacity-75 transition-opacity"
        title="Go to home"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[var(--color-accent)]">
          <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="5" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="19" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12" y1="7.5" x2="5" y2="16.5" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12" y1="7.5" x2="19" y2="16.5" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="5" y1="19" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span className="text-[13px] font-bold text-[var(--color-text)] tracking-wider uppercase font-mono">
          git<span className="text-[var(--color-accent)]">·</span>vis
        </span>
      </button>

      <div className="w-px h-5 bg-[var(--color-border)]" />

      {/* search form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 max-w-md">
        <div className="flex items-center gap-1.5 flex-1 bg-[var(--color-panel)] border border-[var(--color-border-2)] rounded-md px-3 py-1.5 focus-within:border-[var(--color-info)] transition-colors">
          <span className="text-[var(--color-muted)] text-[12px] font-mono shrink-0">github.com/</span>
          <input
            type="text"
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            placeholder="owner/repo"
            className="bg-transparent text-[var(--color-text)] text-[13px] font-mono outline-none flex-1 min-w-0 placeholder:text-[var(--color-muted-dim)]"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-3 py-1.5 text-[12px] font-mono font-bold bg-[var(--color-accent-dim)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-opacity shrink-0 border border-[var(--color-accent-alpha)]"
        >
          {isLoading ? 'Loading…' : 'Fetch'}
        </button>
      </form>

      {/* status indicators */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        {commitCount > 0 && (
          <span className="text-[11px] font-mono text-[var(--color-muted)]">
            <span className="text-[var(--color-text)]">{commitCount}</span> commits
          </span>
        )}
        {isPolling && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="text-[11px] font-mono text-[var(--color-muted)]">live</span>
          </div>
        )}

        {/* GitHub link to watched repo */}
        {currentRepo && (
          <a
            href={`https://github.com/${currentRepo.owner}/${currentRepo.name}`}
            target="_blank"
            rel="noreferrer"
            title={`Open ${currentRepo.owner}/${currentRepo.name} on GitHub`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono text-[var(--color-muted)] hover:text-[var(--color-text)] bg-[var(--color-panel)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-md transition-colors"
          >
            <GitHubIcon />
            <span className="hidden sm:inline">{currentRepo.owner}/{currentRepo.name}</span>
          </a>
        )}

        {/* theme toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] border border-[var(--color-border)] transition-colors"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}
