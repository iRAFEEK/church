'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, GripVertical, X, Check, Edit2, Loader2, Users, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MinistryCardSheet } from './MinistryCardSheet'
import { createClient } from '@/lib/supabase/client'
import type { ConferenceBoardColumnWithCards, ConferenceBoardCardWithDetails } from '@/types'

interface Props {
  eventId: string
  churchId: string
  initialColumns: ConferenceBoardColumnWithCards[]
  ministries: Array<{ id: string; name: string; name_ar: string | null }>
  locale: string
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-zinc-100 text-zinc-700',
  leader_notified: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  ready: 'bg-green-100 text-green-700',
}

export function ConferencePlanningBoard({
  eventId,
  churchId,
  initialColumns,
  ministries,
  locale,
}: Props) {
  const t = useTranslations('conference')
  const isRTL = locale.startsWith('ar')

  const [columns, setColumns] = useState<ConferenceBoardColumnWithCards[]>(initialColumns)
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [draggingOverColumnId, setDraggingOverColumnId] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<ConferenceBoardCardWithDetails | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [savingColumn, setSavingColumn] = useState(false)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState('')

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`board-cards-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conference_board_cards',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Refetch columns on any card change
          fetchColumns()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const fetchColumns = useCallback(async () => {
    const supabase = createClient()
    const { data: cols } = await supabase
      .from('conference_board_columns')
      .select('id, name, name_ar, sort_order')
      .eq('event_id', eventId)
      .eq('church_id', churchId)
      .order('sort_order')

    if (!cols) return

    const colIds = cols.map((c) => c.id)
    const { data: cards } = colIds.length > 0
      ? await supabase
          .from('conference_board_cards')
          .select('id, column_id, ministry_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order, leader_notified_at')
          .in('column_id', colIds)
          .eq('church_id', churchId)
          .order('sort_order')
      : { data: [] }

    setColumns(cols.map((col) => ({
      ...col,
      church_id: churchId,
      event_id: eventId,
      created_at: '',
      updated_at: '',
      cards: (cards || [])
        .filter((c) => c.column_id === col.id)
        .map((c) => ({
          ...c,
          church_id: churchId,
          event_id: eventId,
          assigned_leader_external_phone: null,
          created_at: '',
          updated_at: '',
          task_count: 0,
          done_task_count: 0,
          resource_count: 0,
          ministry: ministries.find((m) => m.id === c.ministry_id) || null,
          assigned_leader: null,
        })),
    })) as ConferenceBoardColumnWithCards[])
  }, [eventId, churchId, ministries])

  // --- Drag and drop ---
  const handleDragStart = (cardId: string) => {
    setDraggingCardId(cardId)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDraggingOverColumnId(columnId)
  }

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    if (!draggingCardId || draggingCardId === targetColumnId) {
      setDraggingCardId(null)
      setDraggingOverColumnId(null)
      return
    }

    // Find source column and card
    let sourceColumnId: string | null = null
    let card: ConferenceBoardCardWithDetails | null = null
    for (const col of columns) {
      const found = col.cards.find((c) => c.id === draggingCardId)
      if (found) {
        sourceColumnId = col.id
        card = found
        break
      }
    }

    if (!card || sourceColumnId === targetColumnId) {
      setDraggingCardId(null)
      setDraggingOverColumnId(null)
      return
    }

    // Optimistic update
    const targetCol = columns.find((c) => c.id === targetColumnId)
    const newSortOrder = targetCol ? targetCol.cards.length : 0

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === sourceColumnId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== draggingCardId) }
        }
        if (col.id === targetColumnId) {
          return { ...col, cards: [...col.cards, { ...card!, column_id: targetColumnId, sort_order: newSortOrder }] }
        }
        return col
      })
    )

    setDraggingCardId(null)
    setDraggingOverColumnId(null)

    // Persist to API
    try {
      const res = await fetch(
        `/api/events/${eventId}/conference/board/cards/${draggingCardId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column_id: targetColumnId, sort_order: newSortOrder }),
        }
      )
      if (!res.ok) {
        toast.error('Failed to move card')
        fetchColumns()
      }
    } catch {
      toast.error('Failed to move card')
      fetchColumns()
    }
  }

  const handleDragEnd = () => {
    setDraggingCardId(null)
    setDraggingOverColumnId(null)
  }

  // --- Add column ---
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return
    setSavingColumn(true)
    try {
      const res = await fetch(`/api/events/${eventId}/conference/board/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newColumnName.trim(),
          sort_order: columns.length,
        }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setColumns((prev) => [...prev, { ...data, cards: [] }])
      setNewColumnName('')
      setAddingColumn(false)
    } catch {
      toast.error('Failed to add column')
    } finally {
      setSavingColumn(false)
    }
  }

  // --- Edit column name ---
  const handleSaveColumnName = async (colId: string) => {
    if (!editingColumnName.trim()) return
    try {
      const res = await fetch(
        `/api/events/${eventId}/conference/board/columns/${colId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editingColumnName.trim() }),
        }
      )
      if (!res.ok) throw new Error()
      setColumns((prev) =>
        prev.map((c) => (c.id === colId ? { ...c, name: editingColumnName.trim() } : c))
      )
      setEditingColumnId(null)
    } catch {
      toast.error('Failed to save')
    }
  }

  // --- Delete column ---
  const handleDeleteColumn = async (colId: string) => {
    try {
      const res = await fetch(
        `/api/events/${eventId}/conference/board/columns/${colId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
      setColumns((prev) => prev.filter((c) => c.id !== colId))
    } catch {
      toast.error('Failed to delete column')
    }
  }

  // --- Add card to column ---
  const handleAddCard = async (columnId: string) => {
    try {
      const col = columns.find((c) => c.id === columnId)
      const res = await fetch(`/api/events/${eventId}/conference/board/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column_id: columnId,
          custom_name: 'New Ministry',
          sort_order: col ? col.cards.length : 0,
        }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setColumns((prev) =>
        prev.map((c) =>
          c.id === columnId
            ? { ...c, cards: [...c.cards, { ...data, ministry: null, assigned_leader: null }] }
            : c
        )
      )
      // Open the sheet for the new card
      setSelectedCard({ ...data, ministry: null, assigned_leader: null })
    } catch {
      toast.error('Failed to add card')
    }
  }

  const getCardName = (card: ConferenceBoardCardWithDetails) => {
    if (isRTL) {
      return card.custom_name_ar || card.ministry?.name_ar || card.custom_name || card.ministry?.name || ''
    }
    return card.custom_name || card.ministry?.name || card.custom_name_ar || card.ministry?.name_ar || ''
  }

  const getColumnName = (col: ConferenceBoardColumnWithCards) => {
    if (isRTL) return col.name_ar || col.name
    return col.name
  }

  return (
    <div className="space-y-4">
      {/* Board: horizontal scroll container */}
      <div
        className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0"
        style={{ minHeight: '60vh' }}
      >
        {columns.map((col) => (
          <div
            key={col.id}
            className={cn(
              'shrink-0 w-72 flex flex-col rounded-xl border bg-muted/30 transition-colors',
              draggingOverColumnId === col.id && draggingCardId && 'border-primary bg-primary/5'
            )}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              {editingColumnId === col.id ? (
                <div className="flex-1 flex gap-1">
                  <Input
                    className="h-7 text-sm"
                    value={editingColumnName}
                    onChange={(e) => setEditingColumnName(e.target.value)}
                    dir="auto"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveColumnName(col.id)
                      if (e.key === 'Escape') setEditingColumnId(null)
                    }}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveColumnName(col.id)}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingColumnId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold truncate">{getColumnName(col)}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{col.cards.length}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingColumnId(col.id)
                      setEditingColumnName(col.name)
                    }}
                    aria-label={t('editColumn')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteColumn(col.id)}
                    aria-label={t('deleteColumn')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto">
              {col.cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'rounded-lg border bg-background p-3 cursor-grab active:cursor-grabbing shadow-sm transition-opacity',
                    draggingCardId === card.id && 'opacity-40'
                  )}
                  onClick={() => setSelectedCard(card)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedCard(card)
                  }}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getCardName(card)}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn('text-xs', STATUS_COLORS[card.status] || '')}
                        >
                          {t(`status${card.status.charAt(0).toUpperCase()}${card.status.slice(1).replace(/_([a-z])/g, (_, l: string) => l.toUpperCase())}` as keyof ReturnType<typeof useTranslations>)}
                        </Badge>
                        {card.headcount_target && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span dir="ltr">{card.headcount_target}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add card button */}
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground h-9"
                onClick={() => handleAddCard(col.id)}
              >
                <Plus className="h-4 w-4 me-1" />
                {t('addCard')}
              </Button>
            </div>
          </div>
        ))}

        {/* Add column */}
        <div className="shrink-0 w-72">
          {addingColumn ? (
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <Input
                placeholder={t('columnName')}
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                dir="auto"
                className="text-base"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn()
                  if (e.key === 'Escape') {
                    setAddingColumn(false)
                    setNewColumnName('')
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddColumn}
                  disabled={savingColumn || !newColumnName.trim()}
                  className="flex-1"
                >
                  {savingColumn ? <Loader2 className="h-4 w-4 animate-spin" /> : t('saveColumn')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingColumn(false)
                    setNewColumnName('')
                  }}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-12 border-dashed text-muted-foreground"
              onClick={() => setAddingColumn(true)}
            >
              <Plus className="h-4 w-4 me-1" />
              {t('addRoom')}
            </Button>
          )}
        </div>

        {/* Empty state */}
        {columns.length === 0 && !addingColumn && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
            <p className="font-medium text-muted-foreground">{t('emptyBoard')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('emptyBoardDesc')}</p>
          </div>
        )}
      </div>

      {/* Card detail sheet */}
      {selectedCard && (
        <MinistryCardSheet
          card={selectedCard}
          eventId={eventId}
          churchId={churchId}
          ministries={ministries}
          locale={locale}
          onClose={() => setSelectedCard(null)}
          onUpdate={(updatedCard) => {
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                cards: col.cards.map((c) =>
                  c.id === updatedCard.id ? { ...c, ...updatedCard } : c
                ),
              }))
            )
            setSelectedCard(null)
          }}
        />
      )}
    </div>
  )
}
