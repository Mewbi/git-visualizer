import { useState, type FormEvent } from 'react'

interface HeaderProps {
  onLoad: (owner: string, name: string) => void
  isLoading: boolean
  isPolling: boolean
  commitCount: number
}

export default function Header({ onLoad, isLoading, isPolling, commitCount }: HeaderProps) {
  const [input, setInput] = useState('torvalds/linux')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parts = input.trim().split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return
    onLoad(parts[0], parts[1])
  }

  return (
    <header className="flex items-center gap-4 px-5 py-3 border-b border-[#21262d] bg-[#0d1117] shrink-0">
      {/* logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[#3fb950]">
          <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="5" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="19" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12" y1="7.5" x2="5" y2="16.5" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12" y1="7.5" x2="19" y2="16.5" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="5" y1="19" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span className="text-[13px] font-bold text-[#e6edf3] tracking-wider uppercase font-mono">
          git<span className="text-[#3fb950]">·</span>vis
        </span>
      </div>

      <div className="w-px h-5 bg-[#21262d]" />

      {/* search form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 max-w-md">
        <div className="flex items-center gap-1.5 flex-1 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 focus-within:border-[#388bfd] transition-colors">
          <span className="text-[#7d8590] text-[12px] font-mono shrink-0">github.com/</span>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="owner/repo"
            className="bg-transparent text-[#e6edf3] text-[13px] font-mono outline-none flex-1 min-w-0 placeholder:text-[#484f58]"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-3 py-1.5 text-[12px] font-mono font-bold bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors shrink-0 border border-[#3fb95040]"
        >
          {isLoading ? 'Loading…' : 'Fetch'}
        </button>
      </form>

      {/* status indicators */}
      <div className="flex items-center gap-3 ml-auto shrink-0">
        {commitCount > 0 && (
          <span className="text-[11px] font-mono text-[#7d8590]">
            <span className="text-[#e6edf3]">{commitCount}</span> commits
          </span>
        )}
        {isPolling && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
            <span className="text-[11px] font-mono text-[#7d8590]">live</span>
          </div>
        )}
      </div>
    </header>
  )
}
