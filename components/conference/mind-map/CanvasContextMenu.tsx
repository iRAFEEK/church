'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ExternalLink, Trash2, Maximize2 } from 'lucide-react'
import Link from 'next/link'

export type ContextMenuTarget =
  | { kind: 'area'; nodeId: string; areaId: string; eventId: string }
  | { kind: 'team'; nodeId: string; teamId: string; eventId: string }
  | { kind: 'sticky'; nodeId: string }
  | { kind: 'label'; nodeId: string }
  | { kind: 'pane'; position: { x: number; y: number } }

interface Props {
  target: ContextMenuTarget
  screenPosition: { x: number; y: number }
  onClose: () => void
  onDelete: (nodeId: string) => void
  onFitView: () => void
  onAddNoteAt?: (position: { x: number; y: number }) => void
  onAddLabelAt?: (position: { x: number; y: number }) => void
}

export function CanvasContextMenu({
  target,
  screenPosition,
  onClose,
  onDelete,
  onFitView,
  onAddNoteAt,
  onAddLabelAt,
}: Props) {
  const t = useTranslations('conference')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') { onClose(); return }
      if (e instanceof MouseEvent && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [onClose])

  const menuStyle = {
    position: 'fixed' as const,
    top: screenPosition.y,
    left: screenPosition.x,
    zIndex: 1000,
  }

  const Item = ({ icon, label, onClick, href, danger }: {
    icon?: React.ReactNode
    label: string
    onClick?: () => void
    href?: string
    danger?: boolean
  }) => {
    const cls = `flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-100 cursor-pointer rounded transition-colors ${danger ? 'text-red-600 hover:bg-red-50' : 'text-zinc-700'}`
    if (href) return (
      <Link href={href} className={cls} onClick={onClose}>
        {icon}
        {label}
      </Link>
    )
    return (
      <div className={cls} onClick={() => { onClick?.(); onClose() }}>
        {icon}
        {label}
      </div>
    )
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-white border border-zinc-200 rounded-xl shadow-xl py-1 min-w-[160px]"
    >
      {target.kind === 'team' && (
        <>
          <Item
            icon={<ExternalLink className="h-3 w-3" />}
            label={t('canvas.openPlan')}
            href={`/admin/events/${target.eventId}/conference/teams/${target.teamId}/plan`}
          />
          <div className="h-px bg-zinc-100 my-1" />
          <Item
            icon={<Trash2 className="h-3 w-3" />}
            label={t('canvas.deleteNode')}
            onClick={() => onDelete(target.nodeId)}
            danger
          />
        </>
      )}

      {target.kind === 'area' && (
        <>
          <Item
            icon={<Trash2 className="h-3 w-3" />}
            label={t('canvas.deleteNode')}
            onClick={() => onDelete(target.nodeId)}
            danger
          />
        </>
      )}

      {(target.kind === 'sticky' || target.kind === 'label') && (
        <>
          <Item
            icon={<Trash2 className="h-3 w-3" />}
            label={t('canvas.deleteNode')}
            onClick={() => onDelete(target.nodeId)}
            danger
          />
        </>
      )}

      {target.kind === 'pane' && (
        <>
          <Item
            label={t('canvas.addNoteHere')}
            onClick={() => onAddNoteAt?.(target.position)}
          />
          <Item
            label={t('canvas.addLabelHere')}
            onClick={() => onAddLabelAt?.(target.position)}
          />
          <div className="h-px bg-zinc-100 my-1" />
          <Item
            icon={<Maximize2 className="h-3 w-3" />}
            label={t('canvas.resetView')}
            onClick={onFitView}
          />
        </>
      )}
    </div>
  )
}
