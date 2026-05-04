import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { Commit } from '../types'

export const NODE_WIDTH = 280
export const NODE_HEIGHT = 80

const LANE_COLORS = [
  'var(--lane-0)',
  'var(--lane-1)',
  'var(--lane-2)',
  'var(--lane-3)',
  'var(--lane-4)',
  'var(--lane-5)',
  'var(--lane-6)',
  'var(--lane-7)',
]

export function getLaneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length]
}

export interface CommitNodeData extends Record<string, unknown> {
  commit: Commit
  isHead: boolean
  lane: number
  laneColor: string
  isMerge: boolean
}

export function buildFlowGraph(
  commits: Map<string, Commit>,
  head: string
): { nodes: Node<CommitNodeData>[]; edges: Edge[] } {
  if (commits.size === 0) return { nodes: [], edges: [] }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'BT',
    nodesep: 30,
    ranksep: 40,
    marginx: 20,
    marginy: 20,
  })

  for (const [hash] of commits) {
    g.setNode(hash, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  const edges: Edge[] = []
  const laneMap = new Map<string, number>()
  let nextLane = 0

  // Topological sort: newest first (by timestamp)
  const sorted = [...commits.values()].sort((a, b) => b.timestamp - a.timestamp)

  for (const commit of sorted) {
    for (const parent of commit.parents) {
      if (commits.has(parent)) {
        // Edge goes from parent to child (parent is older, child is newer)
        g.setEdge(parent, commit.hash)
      }
    }
  }

  dagre.layout(g)

  // Assign lanes based on x position from dagre
  const xValues = [...commits.keys()]
    .map(h => g.node(h)?.x ?? 0)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b)

  const xToLane = new Map<number, number>()
  xValues.forEach((x, i) => xToLane.set(x, i))

  if (nextLane === 0) nextLane = xValues.length

  const flowNodes: Node<CommitNodeData>[] = []

  for (const [hash, commit] of commits) {
    const nodeData = g.node(hash)
    if (!nodeData) continue

    const x = nodeData.x
    let lane = xToLane.get(x) ?? 0
    if (!laneMap.has(hash)) {
      laneMap.set(hash, lane)
    } else {
      lane = laneMap.get(hash)!
    }

    flowNodes.push({
      id: hash,
      type: 'commitNode',
      position: { x: nodeData.x - NODE_WIDTH / 2, y: nodeData.y - NODE_HEIGHT / 2 },
      data: {
        commit,
        isHead: hash === head,
        lane,
        laneColor: getLaneColor(lane),
        isMerge: commit.parents.length > 1,
      },
    })
  }

  // Build edges with lane-based colors
  for (const commit of sorted) {
    for (const parent of commit.parents) {
      if (!commits.has(parent)) continue
      const parentNode = g.node(parent)
      const childNode = g.node(commit.hash)
      if (!parentNode || !childNode) continue

      const parentX = parentNode.x
      const lane = xToLane.get(parentX) ?? 0

      edges.push({
        id: `${parent}->${commit.hash}`,
        source: parent,
        target: commit.hash,
        style: {
          stroke: getLaneColor(lane),
          strokeWidth: 2,
          opacity: 0.7,
        },
        animated: false,
      })
    }
  }

  return { nodes: flowNodes, edges }
}
