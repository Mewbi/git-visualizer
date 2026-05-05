import { useMemo, useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react'
import CommitNode from './CommitNode'
import { buildFlowGraph } from '../lib/layout'
import type { CommitNodeData } from '../lib/layout'
import type { Commit, CommitDiff, FileStat } from '../types'
import { fetchCommitDiff } from '../lib/api'
import { relativeTime } from '../lib/time'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = { commitNode: CommitNode as any }

// ── Diff viewer ────────────────────────────────────────────────────────────

const MAX_DIFF_LINES = 600

function classifyLine(line: string): string {
  if (line.startsWith('diff --git') || line.startsWith('index ')) return 'header'
  if (line.startsWith('--- ') || line.startsWith('+++ ')) return 'meta'
  if (line.startsWith('@@')) return 'hunk'
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'del'
  return 'ctx'
}

const lineStyle: Record<string, string> = {
  header: 'text-[#7d8590] bg-transparent',
  meta:   'text-[#7d8590] bg-transparent',
  hunk:   'text-[#79c0ff] bg-[#1c2d3a]',
  add:    'text-[#3fb950] bg-[#0d2b1a]',
  del:    'text-[#f85149] bg-[#2b0d0d]',
  ctx:    'text-[#c9d1d9] bg-transparent',
}

function DiffViewer({ diff }: { diff: string }) {
  const lines = diff.split('\n')
  const truncated = lines.length > MAX_DIFF_LINES
  const visible = truncated ? lines.slice(0, MAX_DIFF_LINES) : lines

  return (
    <div className="font-mono text-[11px] leading-[1.6]">
      {visible.map((line, i) => {
        const cls = classifyLine(line)
        return (
          <div key={i} className={`px-3 whitespace-pre ${lineStyle[cls]}`}>
            {line || ' '}
          </div>
        )
      })}
      {truncated && (
        <div className="px-3 py-1.5 text-[#7d8590] italic">
          … {lines.length - MAX_DIFF_LINES} more lines omitted
        </div>
      )}
    </div>
  )
}

// ── File stats ─────────────────────────────────────────────────────────────

function FileStatRow({ file }: { file: FileStat }) {
  const total = file.additions + file.deletions
  const addPct = total > 0 ? Math.round((file.additions / total) * 100) : 0

  return (
    <div className="flex items-center gap-2 py-1 px-3 hover:bg-[#1c2128] group">
      <span className="text-[#e6edf3] font-mono text-[11px] truncate flex-1 min-w-0">{file.path}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {file.additions > 0 && (
          <span className="text-[#3fb950] text-[10px] font-mono">+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span className="text-[#f85149] text-[10px] font-mono">−{file.deletions}</span>
        )}
        <div className="flex w-12 h-1.5 rounded-full overflow-hidden bg-[#f85149]">
          <div
            className="h-full bg-[#3fb950] rounded-full"
            style={{ width: `${addPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Detail panel ───────────────────────────────────────────────────────────

type DiffStatus = 'idle' | 'loading' | 'success' | 'error'

interface DetailPanelProps {
  commit: Commit
  diff: CommitDiff | null
  diffStatus: DiffStatus
  diffError: string | null
  onClose: () => void
}

function DetailPanel({ commit, diff, diffStatus, diffError, onClose }: DetailPanelProps) {
  const prNumber = commit.pr_link?.match(/\/pull\/(\d+)$/)?.[1]
  const [isExpanded, setIsExpanded] = useState(false)

  // Reset expanded state when a different commit is selected
  useEffect(() => { setIsExpanded(false) }, [commit.hash])

  return (
    <div
      style={{ width: isExpanded ? '780px' : '460px' }}
      className="absolute top-0 right-0 h-full bg-[#0d1117] border-l border-[#21262d] flex flex-col z-10 shadow-2xl transition-[width] duration-200 ease-in-out"
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono text-[#7d8590] shrink-0">commit</span>
          <span className="text-[12px] font-mono text-[#79c0ff] truncate">{commit.hash}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {prNumber && commit.pr_link && (
            <a
              href={commit.pr_link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 rounded bg-[#1c2d3a] text-[#388bfd] border border-[#388bfd40] hover:bg-[#1f3550] transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
              </svg>
              PR #{prNumber}
            </a>
          )}
          {/* expand / collapse toggle */}
          <button
            onClick={() => setIsExpanded(e => !e)}
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
            className="text-[#7d8590] hover:text-[#e6edf3] w-6 h-6 flex items-center justify-center rounded hover:bg-[#21262d] transition-colors"
          >
            {isExpanded ? (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.854 9.854a.5.5 0 00-.708 0L7.5 11.5l-1.646-1.646a.5.5 0 00-.708.708l2 2a.5.5 0 00.708 0l2-2a.5.5 0 000-.708zM6.146 6.146a.5.5 0 00.708 0L8.5 4.5l1.646 1.646a.5.5 0 00.708-.708l-2-2a.5.5 0 00-.708 0l-2 2a.5.5 0 000 .708z"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5.828 10.172a.5.5 0 00-.707 0l-4.096 4.096V11.5a.5.5 0 00-1 0v3.975a.5.5 0 00.5.5H4.5a.5.5 0 000-1H1.732l4.096-4.096a.5.5 0 000-.707zm4.344 0a.5.5 0 01.707 0l4.096 4.096V11.5a.5.5 0 011 0v3.975a.5.5 0 01-.5.5H11.5a.5.5 0 010-1h2.768l-4.096-4.096a.5.5 0 010-.707zm0-4.344a.5.5 0 00.707 0l4.096-4.096V4.5a.5.5 0 001 0V.525a.5.5 0 00-.5-.5H11.5a.5.5 0 000 1h2.768l-4.096 4.096a.5.5 0 000 .707zM5.828 5.828a.5.5 0 01-.707 0L1.025 1.732V4.5a.5.5 0 01-1 0V.525a.5.5 0 01.5-.5H4.5a.5.5 0 010 1H1.732l4.096 4.096a.5.5 0 010 .707z"/>
              </svg>
            )}
          </button>
          <button
            onClick={onClose}
            className="text-[#7d8590] hover:text-[#e6edf3] text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-[#21262d] transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* commit meta */}
      <div className="px-4 py-3 border-b border-[#21262d] shrink-0">
        <div className="text-[13px] text-[#e6edf3] leading-relaxed mb-2">{commit.message}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-mono text-[#7d8590]">
          <span><span className="text-[#484f58]">author</span> {commit.author}</span>
          <span><span className="text-[#484f58]">date</span> {new Date(commit.timestamp * 1000).toLocaleString()}</span>
          <span><span className="text-[#484f58]">age</span> {relativeTime(commit.timestamp)}</span>
        </div>
        {commit.parents.length > 0 && (
          <div className="mt-1 text-[11px] font-mono text-[#7d8590]">
            <span className="text-[#484f58]">parents</span>{' '}
            {commit.parents.map(p => (
              <span key={p} className="text-[#ffa657] mr-2">{p.slice(0, 7)}</span>
            ))}
          </div>
        )}
      </div>

      {/* diff area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {diffStatus === 'loading' && (
          <div className="flex items-center gap-2 px-4 py-3 text-[12px] font-mono text-[#7d8590]">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{ animationDelay: `${i * 150}ms` }}
                  className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-bounce"
                />
              ))}
            </div>
            Fetching diff…
          </div>
        )}

        {diffStatus === 'error' && (
          <div className="px-4 py-3 text-[12px] font-mono text-[#f85149]">
            ✗ {diffError}
          </div>
        )}

        {diffStatus === 'success' && diff && (
          <>
            {/* file stats */}
            <div className="border-b border-[#21262d] shrink-0">
              <div className="px-3 py-1.5 text-[10px] font-mono text-[#7d8590] uppercase tracking-wider">
                {diff.files.length} file{diff.files.length !== 1 ? 's' : ''} changed
              </div>
              <div className="max-h-36 overflow-y-auto">
                {diff.files.map(f => (
                  <FileStatRow key={f.path} file={f} />
                ))}
              </div>
            </div>

            {/* diff content */}
            <div className="flex-1 overflow-y-auto overflow-x-auto bg-[#0a0c10]">
              {diff.diff ? (
                <DiffViewer diff={diff.diff} />
              ) : (
                <div className="px-4 py-3 text-[12px] font-mono text-[#7d8590] italic">
                  No textual changes (binary or empty diff)
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

interface GitGraphProps {
  commits: Map<string, Commit>
  head: string
  owner: string
  name: string
}

export default function GitGraph({ commits, head, owner, name }: GitGraphProps) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildFlowGraph(commits, head),
    [commits, head]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)

  useEffect(() => { setNodes(initNodes) }, [initNodes, setNodes])
  useEffect(() => { setEdges(initEdges) }, [initEdges, setEdges])

  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null)
  const [diff, setDiff] = useState<CommitDiff | null>(null)
  const [diffStatus, setDiffStatus] = useState<DiffStatus>('idle')
  const [diffError, setDiffError] = useState<string | null>(null)

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = node.data as CommitNodeData
      const commit = data.commit
      setSelectedCommit(commit)
      setDiff(null)
      setDiffStatus('loading')
      setDiffError(null)

      fetchCommitDiff(owner, name, commit.hash)
        .then(d => { setDiff(d); setDiffStatus('success') })
        .catch(e => { setDiffError(e instanceof Error ? e.message : 'Unknown error'); setDiffStatus('error') })
    },
    [owner, name]
  )

  const handleClose = useCallback(() => {
    setSelectedCommit(null)
    setDiff(null)
    setDiffStatus('idle')
    setDiffError(null)
  }, [])

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handleClose}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#21262d" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as CommitNodeData
            return d?.laneColor ?? '#7d8590'
          }}
          nodeStrokeWidth={0}
          pannable
          zoomable
        />
      </ReactFlow>

      {selectedCommit && (
        <DetailPanel
          commit={selectedCommit}
          diff={diff}
          diffStatus={diffStatus}
          diffError={diffError}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
