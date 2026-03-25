'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
  type Node,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useCanvasState, type CanvasState } from './mind-map/useCanvasState'
import { useCanvasPersistence } from './mind-map/useCanvasPersistence'
import { RootNode } from './mind-map/RootNode'
import { AreaNodeMindMap } from './mind-map/AreaNodeMindMap'
import { TeamNodeMindMap } from './mind-map/TeamNodeMindMap'
import { StickyNoteNode } from './mind-map/StickyNoteNode'
import { LabelNode } from './mind-map/LabelNode'
import { MindMapSidebar } from './mind-map/MindMapSidebar'
import { MindMapToolbar } from './mind-map/MindMapToolbar'
import { CanvasContextMenu, type ContextMenuTarget } from './mind-map/CanvasContextMenu'
import { CanvasToolbar } from './mind-map/CanvasToolbar'
import { MinistryCardSheet } from './MinistryCardSheet'
import { AreaTree } from './AreaTree'
import type {
  ConferenceArea,
  ConferenceBoardCardWithDetails,
  ConferenceAreaWithChildren,
  ConferenceTeam,
} from '@/types'
import type { TeamWithCard } from './mind-map/useMindMapLayout'

// ─── Tree builder for mobile AreaTree fallback ────────────────────────────────

function buildAreaTree(
  areas: ConferenceArea[],
  teams: TeamWithCard[],
  parentId: string | null = null
): ConferenceAreaWithChildren[] {
  return areas
    .filter((a) => a.parent_area_id === parentId)
    .map((a) => ({
      ...a,
      children: buildAreaTree(areas, teams, a.id),
      teams: teams
        .filter((t) => t.area_id === a.id)
        .map((t) => ({
          id: t.id,
          church_id: a.church_id,
          event_id: a.event_id,
          area_id: t.area_id,
          name: t.name,
          name_ar: t.name_ar,
          description: null,
          description_ar: null,
          muster_point: null,
          muster_point_ar: null,
          target_headcount: t.target_headcount,
          sort_order: 0,
          created_at: '',
          updated_at: '',
        })) as ConferenceTeam[],
    }))
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ministry {
  id: string
  name: string
  name_ar: string | null
}

export interface ConferenceMindMapProps {
  eventId: string
  churchId: string
  eventTitle: string
  initialAreas: ConferenceArea[]
  initialTeams: TeamWithCard[]
  ministries: Ministry[]
  // For MinistryCardSheet — we need existing cards if any
  initialCards: ConferenceBoardCardWithDetails[]
  locale: string
  initialCanvas?: CanvasState | null
}

// ─── Node type registry ────────────────────────────────────────────────────────

// Built outside component to avoid re-registration on each render
const buildNodeTypes = (
  locale: string,
  dropTargetTeamId: string | null,
  onTeamClick: (teamId: string) => void,
  onTeamAdded: (areaId: string, team: TeamWithCard) => void
): NodeTypes => ({
  rootNode: (props) => <RootNode {...props} data={props.data as { eventTitle: string }} />,
  areaNode: (props) => (
    <AreaNodeMindMap
      {...props}
      data={{
        ...(props.data as Parameters<typeof AreaNodeMindMap>[0]['data']),
        locale,
        onTeamAdded,
      }}
    />
  ),
  teamNode: (props) => (
    <TeamNodeMindMap
      {...props}
      data={{
        ...(props.data as Parameters<typeof TeamNodeMindMap>[0]['data']),
        locale,
        isDropTarget: dropTargetTeamId === (props.data as { team: TeamWithCard }).team?.id,
        onTeamClick,
      }}
    />
  ),
  stickyNote: (props) => <StickyNoteNode {...props} />,
  label: (props) => <LabelNode {...props} />,
})

// ─── Inner component (needs ReactFlowProvider context) ────────────────────────

function MindMapInner({
  eventId,
  churchId,
  eventTitle,
  initialAreas,
  initialTeams,
  ministries,
  initialCards,
  locale,
  initialCanvas = null,
}: ConferenceMindMapProps) {
  const t = useTranslations('conference')
  const { fitView, screenToFlowPosition } = useReactFlow()

  // ── State ──
  const [areas, setAreas] = useState<ConferenceArea[]>(initialAreas)
  const [teams, setTeams] = useState<TeamWithCard[]>(initialTeams)
  const [cards, setCards] = useState<ConferenceBoardCardWithDetails[]>(initialCards)
  const [dragMinistry, setDragMinistry] = useState<Ministry | null>(null)
  const [dropTargetTeamId, setDropTargetTeamId] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [contextMenu, setContextMenu] = useState<{
    target: ContextMenuTarget
    pos: { x: number; y: number }
  } | null>(null)

  // ── Canvas state (positions, custom nodes, dirty tracking) ──
  const {
    nodes: canvasNodes,
    edges,
    isDirty,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addCustomNode,
    removeNode,
    clearDirty,
  } = useCanvasState(eventId, eventTitle, areas, teams, initialCanvas)

  // ── Persistence (debounced auto-save) ──
  const { saveStatus, lastSaved, retry } = useCanvasPersistence(
    eventId,
    canvasNodes,
    edges,
    viewport,
    isDirty,
    clearDirty
  )

  // ── Derived: selected card for sheet ──
  const selectedCard = useMemo(
    () =>
      cards.find((c) => {
        const team = teams.find((t) => t.id === selectedTeamId)
        if (!team) return false
        return (
          c.team_id === selectedTeamId ||
          (team.cardStatus && c.status === team.cardStatus && c.id)
        )
      }) ?? null,
    [cards, selectedTeamId, teams]
  )

  // ── Callbacks ──
  const handleTeamClick = useCallback((teamId: string) => {
    setSelectedTeamId(teamId)
  }, [])

  const handleTeamAdded = useCallback(
    (areaId: string, newTeam: TeamWithCard) => {
      setTeams((prev) => [...prev, { ...newTeam, area_id: areaId }])
      setTimeout(() => fitView({ duration: 400, padding: 0.15 }), 100)
    },
    [fitView]
  )

  const handleAreaAdded = useCallback(
    (newArea: ConferenceArea) => {
      setAreas((prev) => [...prev, newArea])
      setTimeout(() => fitView({ duration: 400, padding: 0.15 }), 100)
    },
    [fitView]
  )

  // ── Ministry drag → drop onto team node ──
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dragMinistry) return
      e.preventDefault()
    },
    [dragMinistry]
  )

  // Assign ministry to team (called on drop)
  const handleAssignMinistry = useCallback(
    async (teamId: string, ministry: Ministry) => {
      setDropTargetTeamId(null)
      setDragMinistry(null)

      // Optimistic update
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? {
                ...t,
                ministryName: ministry.name,
                ministryNameAr: ministry.name_ar,
                cardStatus: t.cardStatus || 'planning',
              }
            : t
        )
      )

      try {
        const res = await fetch(`/api/events/${eventId}/conference/board/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: teamId,
            ministry_id: ministry.id,
            status: 'planning',
          }),
        })
        if (!res.ok) throw new Error()
        const { data } = await res.json()
        setCards((prev) => {
          const existing = prev.findIndex((c) => c.team_id === teamId)
          if (existing >= 0) {
            const next = [...prev]
            next[existing] = data
            return next
          }
          return [...prev, data]
        })
      } catch {
        // Rollback
        setTeams((prev) =>
          prev.map((t) =>
            t.id === teamId
              ? { ...t, ministryName: undefined, ministryNameAr: undefined }
              : t
          )
        )
        toast.error(t('errorSaving'))
      }
    },
    [eventId, t]
  )

  // ── Node types (memoised — only rebuilt when handlers change) ──
  const nodeTypes = useMemo(
    () => buildNodeTypes(locale, dropTargetTeamId, handleTeamClick, handleTeamAdded),
    [locale, dropTargetTeamId, handleTeamClick, handleTeamAdded]
  )

  // Inject runtime handlers into node data
  const nodes: Node[] = useMemo(
    () =>
      canvasNodes.map((n) => {
        if (n.type === 'areaNode') {
          return {
            ...n,
            data: {
              ...n.data,
              eventId,
              locale,
              onTeamAdded: handleTeamAdded,
            },
          }
        }
        if (n.type === 'teamNode') {
          return {
            ...n,
            data: {
              ...n.data,
              locale,
              eventId,
              isDropTarget:
                dropTargetTeamId === (n.data as { team: TeamWithCard }).team?.id,
              onTeamClick: handleTeamClick,
            },
          }
        }
        return n
      }),
    [canvasNodes, eventId, locale, handleTeamAdded, dropTargetTeamId, handleTeamClick]
  )

  // ── Canvas drop handler — finalise ministry assignment ──
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!dragMinistry || !dropTargetTeamId) {
        setDragMinistry(null)
        setDropTargetTeamId(null)
        return
      }
      handleAssignMinistry(dropTargetTeamId, dragMinistry)
    },
    [dragMinistry, dropTargetTeamId, handleAssignMinistry]
  )

  // ── Node mouse enter/leave for drop targeting ──
  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (dragMinistry && node.type === 'teamNode') {
        setDropTargetTeamId((node.data as { team: TeamWithCard }).team.id)
      }
    },
    [dragMinistry]
  )

  const onNodeMouseLeave = useCallback(() => {
    if (dragMinistry) setDropTargetTeamId(null)
  }, [dragMinistry])

  // ── Context menu handlers ──
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      event.stopPropagation()

      let target: ContextMenuTarget

      if (node.type === 'teamNode') {
        target = {
          kind: 'team',
          nodeId: node.id,
          teamId: (node.data as { team: TeamWithCard }).team.id,
          eventId,
        }
      } else if (node.type === 'areaNode') {
        target = {
          kind: 'area',
          nodeId: node.id,
          areaId: (node.data as { area: ConferenceArea }).area.id,
          eventId,
        }
      } else if (node.type === 'stickyNote') {
        target = { kind: 'sticky', nodeId: node.id }
      } else if (node.type === 'label') {
        target = { kind: 'label', nodeId: node.id }
      } else {
        return
      }

      setContextMenu({ target, pos: { x: event.clientX, y: event.clientY } })
    },
    [eventId]
  )

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault()
      const canvasPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const target: ContextMenuTarget = { kind: 'pane', position: canvasPos }
      setContextMenu({ target, pos: { x: event.clientX, y: event.clientY } })
    },
    [screenToFlowPosition]
  )

  const handleContextMenuDelete = useCallback(
    (nodeId: string) => {
      removeNode(nodeId)
      setContextMenu(null)
    },
    [removeNode]
  )

  const handleContextMenuAddNoteAt = useCallback(
    (position: { x: number; y: number }) => {
      addCustomNode({
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'stickyNote',
        position,
        data: { text: '', color: 'yellow' },
      })
      setContextMenu(null)
    },
    [addCustomNode]
  )

  const handleContextMenuAddLabelAt = useCallback(
    (position: { x: number; y: number }) => {
      addCustomNode({
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'label',
        position,
        data: { text: '' },
      })
      setContextMenu(null)
    },
    [addCustomNode]
  )

  // ── Empty state ──
  const isEmpty = areas.length === 0

  // ── Sheet card shim (create a minimal card if none found) ──
  const selectedTeam = teams.find((t) => t.id === selectedTeamId)
  const sheetCard: ConferenceBoardCardWithDetails | null = selectedCard
    ? selectedCard
    : selectedTeam
    ? {
        id: `virtual-${selectedTeam.id}`,
        church_id: churchId,
        event_id: eventId,
        column_id: '',
        team_id: null,
        ministry_id: null,
        custom_name: selectedTeam.name,
        custom_name_ar: selectedTeam.name_ar,
        assigned_leader_id: null,
        assigned_leader_external_phone: null,
        headcount_target: selectedTeam.target_headcount,
        status:
          (selectedTeam.cardStatus as ConferenceBoardCardWithDetails['status']) || 'planning',
        sort_order: 0,
        leader_notified_at: null,
        created_at: '',
        updated_at: '',
        ministry: selectedTeam.ministryName
          ? {
              id: '',
              name: selectedTeam.ministryName,
              name_ar: selectedTeam.ministryNameAr ?? null,
            }
          : null,
        assigned_leader: null,
        task_count: 0,
        done_task_count: 0,
        resource_count: 0,
      }
    : null

  return (
    <div className="flex flex-col h-full">
      <MindMapToolbar
        eventId={eventId}
        eventTitle={eventTitle}
        locale={locale}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
        onRetrySave={retry}
      />

      {/* Mobile fallback */}
      <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          {t('mindMap.desktopOnly')}
        </div>
        <AreaTree
          eventId={eventId}
          churchId={churchId}
          locale={locale}
          initialAreas={buildAreaTree(areas, teams)}
        />
      </div>

      {/* Desktop canvas */}
      <div className="hidden md:flex flex-1 min-h-0">
        <MindMapSidebar
          ministries={ministries}
          teams={teams}
          areaCount={areas.length}
          locale={locale}
          eventId={eventId}
          churchId={churchId}
          onDragMinistry={setDragMinistry}
          onAreaAdded={handleAreaAdded as Parameters<typeof MindMapSidebar>[0]['onAreaAdded']}
        />

        <div
          className="flex-1 relative"
          onDragOver={handleDragOver}
          onDrop={onDrop}
          onDragLeave={() => {
            if (dragMinistry) setDropTargetTeamId(null)
          }}
        >
          {/* Empty state overlay — rendered above the canvas so CanvasToolbar
              (which calls useReactFlow internally) is always inside ReactFlow */}
          {isEmpty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8 pointer-events-none z-10">
              <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center">
                <span className="text-3xl">🏛</span>
              </div>
              <div>
                <p className="font-semibold text-zinc-800">{t('mindMap.noAreasYet')}</p>
                <p className="text-sm text-zinc-500 mt-1">{t('mindMap.addFirstArea')}</p>
              </div>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            nodesDraggable
            nodesConnectable
            elementsSelectable
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onMoveEnd={(_, vp) => setViewport(vp)}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e4e4e7" gap={24} size={1} />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'rootNode') return '#18181b'
                if (n.type === 'areaNode')
                  return (n.data as { color?: string }).color ?? '#e4e4e7'
                return '#f4f4f5'
              }}
              className="!rounded-xl !border !border-zinc-200 !shadow-lg"
              style={{ bottom: 16, right: 16 }}
            />
            <Controls
              showInteractive={false}
              className="!rounded-xl !border !border-zinc-200 !shadow-sm"
              style={{ bottom: 152, right: 16 }}
            />
            <CanvasToolbar
              eventId={eventId}
              locale={locale}
              onAddCustomNode={addCustomNode}
              onAreaAdded={
                handleAreaAdded as Parameters<typeof CanvasToolbar>[0]['onAreaAdded']
              }
              onTeamAdded={handleTeamAdded}
            />
          </ReactFlow>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <CanvasContextMenu
          target={contextMenu.target}
          screenPosition={contextMenu.pos}
          onClose={() => setContextMenu(null)}
          onDelete={handleContextMenuDelete}
          onFitView={() => {
            fitView({ duration: 400, padding: 0.15 })
            setContextMenu(null)
          }}
          onAddNoteAt={handleContextMenuAddNoteAt}
          onAddLabelAt={handleContextMenuAddLabelAt}
        />
      )}

      {/* Ministry card detail sheet */}
      {sheetCard && selectedTeamId && (
        <MinistryCardSheet
          card={sheetCard}
          eventId={eventId}
          churchId={churchId}
          ministries={ministries}
          locale={locale}
          onClose={() => setSelectedTeamId(null)}
          onUpdate={(updated) => {
            setCards((prev) =>
              prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
            )
            if (updated.status) {
              setTeams((prev) =>
                prev.map((t) =>
                  t.id === selectedTeamId ? { ...t, cardStatus: updated.status } : t
                )
              )
            }
          }}
        />
      )}
    </div>
  )
}

// ─── Public export (wrapped in ReactFlowProvider) ─────────────────────────────

export function ConferenceMindMap(props: ConferenceMindMapProps) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  )
}
