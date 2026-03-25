'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  addEdge,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import type { ConferenceArea } from '@/types'
import { getAreaColor, type TeamWithCard } from './useMindMapLayout'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CanvasCustomNode {
  id: string
  type: 'stickyNote' | 'label'
  position: { x: number; y: number }
  data: { text: string; text_ar?: string; color?: string; fontSize?: number }
}

export interface CanvasCustomEdge {
  id: string
  source: string
  target: string
  label?: string
  label_ar?: string
  animated?: boolean
}

export interface CanvasState {
  viewport?: { x: number; y: number; zoom: number }
  nodePositions?: Record<string, { x: number; y: number }>
  customNodes?: CanvasCustomNode[]
  customEdges?: CanvasCustomEdge[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_WIDTH_ROOT = 240
const NODE_HEIGHT_ROOT = 80
const NODE_WIDTH_AREA = 200
const NODE_HEIGHT_AREA = 72
const NODE_WIDTH_TEAM = 180
const NODE_HEIGHT_TEAM = 80

// ── Dagre seed positions (used only when no saved positions exist) ────────────

function computeDagrePositions(
  eventId: string,
  eventTitle: string,
  areas: ConferenceArea[],
  teams: TeamWithCard[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 64, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  const rootId = `root-${eventId}`
  g.setNode(rootId, { width: NODE_WIDTH_ROOT, height: NODE_HEIGHT_ROOT })

  const rootAreas = areas.filter((a) => !a.parent_area_id)
  rootAreas.forEach((area) => {
    g.setNode(`area-${area.id}`, { width: NODE_WIDTH_AREA, height: NODE_HEIGHT_AREA })
    g.setEdge(rootId, `area-${area.id}`)
  })
  areas.filter((a) => a.parent_area_id).forEach((area) => {
    g.setNode(`area-${area.id}`, { width: NODE_WIDTH_AREA, height: NODE_HEIGHT_AREA })
    g.setEdge(`area-${area.parent_area_id}`, `area-${area.id}`)
  })
  teams.forEach((team) => {
    g.setNode(`team-${team.id}`, { width: NODE_WIDTH_TEAM, height: NODE_HEIGHT_TEAM })
    g.setEdge(`area-${team.area_id}`, `team-${team.id}`)
  })

  dagre.layout(g)

  const areaColorMap = new Map<string, string>()
  rootAreas.forEach((area, i) => {
    const color = getAreaColor(i)
    areaColorMap.set(area.id, color)
    areas.filter((a) => a.parent_area_id === area.id).forEach((sub) => {
      areaColorMap.set(sub.id, color)
    })
  })

  const nodes: Node[] = []
  const edges: Edge[] = []

  const rootPos = g.node(rootId)
  nodes.push({
    id: rootId,
    type: 'rootNode',
    position: { x: rootPos.x - NODE_WIDTH_ROOT / 2, y: rootPos.y - NODE_HEIGHT_ROOT / 2 },
    data: { eventTitle },
  })

  areas.forEach((area) => {
    const nodeId = `area-${area.id}`
    const pos = g.node(nodeId)
    if (!pos) return
    const color = areaColorMap.get(area.id) || '#3b82f6'
    const areaTeams = teams.filter((t) => t.area_id === area.id)
    const readyCount = areaTeams.filter((t) => t.cardStatus === 'ready').length

    nodes.push({
      id: nodeId,
      type: 'areaNode',
      position: { x: pos.x - NODE_WIDTH_AREA / 2, y: pos.y - NODE_HEIGHT_AREA / 2 },
      data: { area, color, teamCount: areaTeams.length, readyCount },
    })

    const sourceId = area.parent_area_id ? `area-${area.parent_area_id}` : rootId
    edges.push({
      id: `e-${sourceId}-${nodeId}`,
      source: sourceId,
      target: nodeId,
      type: 'smoothstep',
      style: { stroke: color, strokeWidth: 2 },
    })
  })

  teams.forEach((team) => {
    const nodeId = `team-${team.id}`
    const pos = g.node(nodeId)
    if (!pos) return
    const color = areaColorMap.get(team.area_id) || '#3b82f6'

    nodes.push({
      id: nodeId,
      type: 'teamNode',
      position: { x: pos.x - NODE_WIDTH_TEAM / 2, y: pos.y - NODE_HEIGHT_TEAM / 2 },
      data: { team, color },
    })

    edges.push({
      id: `e-area-${team.area_id}-${nodeId}`,
      source: `area-${team.area_id}`,
      target: nodeId,
      type: 'smoothstep',
      style: { stroke: color, strokeWidth: 1.5, opacity: 0.6 },
    })
  })

  return { nodes, edges }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCanvasState(
  eventId: string,
  eventTitle: string,
  areas: ConferenceArea[],
  teams: TeamWithCard[],
  initialCanvas: CanvasState | null
) {
  // Build initial nodes from dagre, then apply saved positions if they exist
  const initialState = useMemo(() => {
    const { nodes: dagreNodes, edges: dagreEdges } = computeDagrePositions(eventId, eventTitle, areas, teams)
    const saved = initialCanvas?.nodePositions || {}

    const nodes = dagreNodes.map((n) => ({
      ...n,
      position: saved[n.id] || n.position,
    }))

    // Append custom (JSONB-only) nodes
    const customNodes: Node[] = (initialCanvas?.customNodes || []).map((cn) => ({
      id: cn.id,
      type: cn.type,
      position: cn.position,
      data: cn.data,
    }))

    // Merge DB hierarchy edges with custom edges
    const customEdges: Edge[] = (initialCanvas?.customEdges || []).map((ce) => ({
      id: ce.id,
      source: ce.source,
      target: ce.target,
      label: ce.label,
      animated: ce.animated ?? false,
      type: 'smoothstep',
      style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
    }))

    return {
      nodes: [...nodes, ...customNodes],
      edges: [...dagreEdges, ...customEdges],
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally computed only once — areas/teams/canvas are server props

  const [nodes, setNodes] = useState<Node[]>(initialState.nodes)
  const [edges, setEdges] = useState<Edge[]>(initialState.edges)
  const [isDirty, setIsDirty] = useState(false)

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
    // Mark dirty only for position changes (not selection)
    if (changes.some((c) => c.type === 'position' && c.dragging === false)) {
      setIsDirty(true)
    }
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
    setIsDirty(true)
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          type: 'smoothstep',
          style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
          animated: false,
        },
        eds
      )
    )
    setIsDirty(true)
  }, [])

  const addCustomNode = useCallback((node: Node) => {
    setNodes((nds) => [...nds, node])
    setIsDirty(true)
  }, [])

  const removeNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setIsDirty(true)
  }, [])

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    )
    setIsDirty(true)
  }, [])

  const clearDirty = useCallback(() => setIsDirty(false), [])

  return {
    nodes,
    edges,
    isDirty,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addCustomNode,
    removeNode,
    updateNodeData,
    clearDirty,
  }
}
