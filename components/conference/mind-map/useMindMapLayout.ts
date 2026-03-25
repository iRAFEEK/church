import { useMemo } from 'react'
import type { Node, Edge } from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import type { ConferenceArea, ConferenceTeam } from '@/types'

export interface TeamWithCard {
  id: string
  name: string
  name_ar: string | null
  area_id: string
  target_headcount: number | null
  cardStatus?: string
  ministryName?: string | null
  ministryNameAr?: string | null
  assignedLeaderName?: string | null
}

const NODE_WIDTH_ROOT = 240
const NODE_HEIGHT_ROOT = 80
const NODE_WIDTH_AREA = 200
const NODE_HEIGHT_AREA = 72
const NODE_WIDTH_TEAM = 180
const NODE_HEIGHT_TEAM = 80

const AREA_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#f43f5e', // rose-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
]

export function getAreaColor(index: number): string {
  return AREA_COLORS[index % AREA_COLORS.length]
}

export function useMindMapLayout(
  eventId: string,
  eventTitle: string,
  areas: ConferenceArea[],
  teams: TeamWithCard[]
): { nodes: Node[]; edges: Edge[] } {
  return useMemo(() => {
    const g = new dagre.graphlib.Graph()
    g.setGraph({
      rankdir: 'TB',
      nodesep: 48,
      ranksep: 64,
      marginx: 40,
      marginy: 40,
    })
    g.setDefaultEdgeLabel(() => ({}))

    // Root node
    const rootId = `root-${eventId}`
    g.setNode(rootId, { width: NODE_WIDTH_ROOT, height: NODE_HEIGHT_ROOT })

    // Area nodes
    const rootAreas = areas.filter((a) => !a.parent_area_id)
    rootAreas.forEach((area) => {
      g.setNode(`area-${area.id}`, { width: NODE_WIDTH_AREA, height: NODE_HEIGHT_AREA })
      g.setEdge(rootId, `area-${area.id}`)
    })

    // Sub-areas
    areas.filter((a) => a.parent_area_id).forEach((area) => {
      g.setNode(`area-${area.id}`, { width: NODE_WIDTH_AREA, height: NODE_HEIGHT_AREA })
      g.setEdge(`area-${area.parent_area_id}`, `area-${area.id}`)
    })

    // Team nodes
    teams.forEach((team) => {
      g.setNode(`team-${team.id}`, { width: NODE_WIDTH_TEAM, height: NODE_HEIGHT_TEAM })
      g.setEdge(`area-${team.area_id}`, `team-${team.id}`)
    })

    dagre.layout(g)

    // Build area color map
    const areaColorMap = new Map<string, string>()
    rootAreas.forEach((area, i) => {
      const color = getAreaColor(i)
      areaColorMap.set(area.id, color)
      // Sub-areas inherit parent color
      areas.filter((a) => a.parent_area_id === area.id).forEach((sub) => {
        areaColorMap.set(sub.id, color)
      })
    })

    const nodes: Node[] = []
    const edges: Edge[] = []

    // Root node
    const rootPos = g.node(rootId)
    nodes.push({
      id: rootId,
      type: 'rootNode',
      position: { x: rootPos.x - NODE_WIDTH_ROOT / 2, y: rootPos.y - NODE_HEIGHT_ROOT / 2 },
      data: { eventTitle },
      draggable: false,
      selectable: false,
    })

    // Area nodes
    areas.forEach((area) => {
      const nodeId = `area-${area.id}`
      const pos = g.node(nodeId)
      if (!pos) return
      const areaTeams = teams.filter((t) => t.area_id === area.id)
      const readyCount = areaTeams.filter((t) => t.cardStatus === 'ready').length
      const color = areaColorMap.get(area.id) || AREA_COLORS[0]

      nodes.push({
        id: nodeId,
        type: 'areaNode',
        position: { x: pos.x - NODE_WIDTH_AREA / 2, y: pos.y - NODE_HEIGHT_AREA / 2 },
        data: {
          area,
          color,
          teamCount: areaTeams.length,
          readyCount,
        },
        draggable: false,
      })

      // Edge from root or parent area
      const sourceId = area.parent_area_id ? `area-${area.parent_area_id}` : rootId
      edges.push({
        id: `e-${sourceId}-${nodeId}`,
        source: sourceId,
        target: nodeId,
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 2 },
        animated: false,
      })
    })

    // Team nodes
    teams.forEach((team) => {
      const nodeId = `team-${team.id}`
      const pos = g.node(nodeId)
      if (!pos) return
      const color = areaColorMap.get(team.area_id) || AREA_COLORS[0]

      nodes.push({
        id: nodeId,
        type: 'teamNode',
        position: { x: pos.x - NODE_WIDTH_TEAM / 2, y: pos.y - NODE_HEIGHT_TEAM / 2 },
        data: { team, color },
        draggable: false,
      })

      edges.push({
        id: `e-area-${team.area_id}-${nodeId}`,
        source: `area-${team.area_id}`,
        target: nodeId,
        type: 'straight',
        style: { stroke: color, strokeWidth: 1.5, opacity: 0.6 },
        animated: false,
      })
    })

    return { nodes, edges }
  }, [eventId, eventTitle, areas, teams])
}
