'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Node, Edge, Viewport } from '@xyflow/react'
import type { CanvasCustomNode, CanvasCustomEdge } from './useCanvasState'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 1500

export function useCanvasPersistence(
  eventId: string,
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport,
  isDirty: boolean,
  onSaved: () => void
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const save = useCallback(async () => {
    if (!isMountedRef.current) return

    setSaveStatus('saving')

    // Extract node positions for DB-backed nodes
    const nodePositions: Record<string, { x: number; y: number }> = {}
    const customNodes: CanvasCustomNode[] = []
    const customEdges: CanvasCustomEdge[] = []

    nodes.forEach((n) => {
      if (n.type === 'stickyNote' || n.type === 'label') {
        customNodes.push({
          id: n.id,
          type: n.type as 'stickyNote' | 'label',
          position: n.position,
          data: n.data as CanvasCustomNode['data'],
        })
      } else {
        nodePositions[n.id] = n.position
      }
    })

    // Separate custom (non-hierarchy) edges — hierarchy edges have IDs starting with 'e-'
    edges.forEach((e) => {
      // Hierarchy edges are always prefixed 'e-area-' or 'e-root-'
      if (!e.id.startsWith('e-')) {
        customEdges.push({
          id: e.id,
          source: e.source,
          target: e.target,
          label: typeof e.label === 'string' ? e.label : undefined,
          animated: e.animated ?? false,
        })
      }
    })

    try {
      const res = await fetch(`/api/events/${eventId}/conference`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conference_settings: {
            canvas: {
              viewport,
              nodePositions,
              customNodes,
              customEdges,
            },
          },
        }),
      })

      if (!isMountedRef.current) return

      if (!res.ok) {
        setSaveStatus('error')
        return
      }

      setSaveStatus('saved')
      setLastSaved(new Date())
      onSaved()
    } catch {
      if (isMountedRef.current) setSaveStatus('error')
    }
  }, [eventId, nodes, edges, viewport, onSaved])

  const retry = useCallback(() => {
    save()
  }, [save])

  // Debounce save on changes
  useEffect(() => {
    if (!isDirty) return

    setSaveStatus('saving') // optimistic while waiting
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      save()
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isDirty, nodes, edges, viewport, save])

  return { saveStatus, lastSaved, retry }
}
