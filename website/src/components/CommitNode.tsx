import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CommitNodeData } from '../lib/layout'
import { relativeTime } from '../lib/time'

type Props = NodeProps & { data: CommitNodeData }

function CommitNode({ data, selected }: Props) {
  const { commit, isHead, laneColor, isMerge } = data
  const shortHash = commit.hash.slice(0, 7)
  const message = commit.message.length > 48 ? commit.message.slice(0, 48) + '…' : commit.message
  const prNumber = commit.pr_link?.match(/\/pull\/(\d+)$/)?.[1]

  return (
    <div
      style={{
        borderColor: selected ? laneColor : isHead ? laneColor : 'var(--color-border)',
        boxShadow: selected
          ? `0 0 0 2px ${laneColor}40`
          : isHead
          ? `0 0 12px ${laneColor}30`
          : 'none',
      }}
      className="relative w-[280px] h-[80px] rounded-md border bg-[var(--color-surface)] px-3 py-2 cursor-default select-none transition-all duration-150"
    >
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ background: laneColor, border: 'none', width: 8, height: 8 }}
      />

      {/* row 1: hash + status badges */}
      <div className="flex items-center gap-1.5 mb-1">
        <span
          style={{ color: laneColor, borderColor: `${laneColor}40` }}
          className="font-mono text-[11px] font-bold border rounded px-1.5 py-0.5 leading-none shrink-0"
        >
          {shortHash}
        </span>
        {isHead && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-head-bg)] text-[var(--color-head-text)] leading-none border border-[var(--color-accent-alpha)] shrink-0">
            HEAD
          </span>
        )}
        {isMerge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-merge-bg)] text-[var(--color-muted)] leading-none border border-[var(--color-border)] shrink-0">
            merge
          </span>
        )}
      </div>

      {/* row 2: message */}
      <div className="text-[12px] text-[var(--color-text)] leading-tight mb-1.5 font-mono truncate">
        {message}
      </div>

      {/* row 3: author | pr link | time */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-[var(--color-muted)] font-mono truncate min-w-0">{commit.author}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {prNumber && commit.pr_link && (
            <a
              href={commit.pr_link}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-pr-bg)] text-[var(--color-info)] leading-none border border-[var(--color-info-alpha)] hover:bg-[var(--color-pr-hover)] transition-colors"
            >
              #{prNumber}
            </a>
          )}
          <span className="text-[10px] text-[var(--color-muted)] font-mono">{relativeTime(commit.timestamp)}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Top}
        style={{ background: laneColor, border: 'none', width: 8, height: 8 }}
      />
    </div>
  )
}

export default memo(CommitNode)
