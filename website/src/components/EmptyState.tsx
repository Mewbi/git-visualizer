interface EmptyStateProps {
  onLoad: (owner: string, name: string) => void
}

const EXAMPLES = [
  { owner: 'torvalds', name: 'linux', desc: 'Linux kernel' },
  { owner: 'facebook', name: 'react', desc: 'React.js' },
  { owner: 'golang', name: 'go', desc: 'Go language' },
]

export default function EmptyState({ onLoad }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 select-none">
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
        <div className="text-[#7d8590] text-[13px] font-mono mb-6">
          Enter a GitHub repository above to visualize its commit graph
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          {EXAMPLES.map(({ owner, name, desc }) => (
            <button
              key={`${owner}/${name}`}
              onClick={() => onLoad(owner, name)}
              className="px-3 py-1.5 text-[12px] font-mono text-[#7d8590] hover:text-[#e6edf3] bg-[#161b22] hover:bg-[#21262d] border border-[#21262d] rounded-md transition-colors"
            >
              {owner}/{name}
              <span className="text-[#484f58] ml-1.5">{desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
