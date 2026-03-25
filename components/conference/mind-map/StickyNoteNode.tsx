'use client'

import { useState, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

const COLORS: Record<string, { bg: string; border: string }> = {
  yellow:  { bg: 'bg-yellow-100',  border: 'border-yellow-300' },
  pink:    { bg: 'bg-pink-100',    border: 'border-pink-300' },
  blue:    { bg: 'bg-blue-100',    border: 'border-blue-300' },
  green:   { bg: 'bg-green-100',   border: 'border-green-300' },
  purple:  { bg: 'bg-purple-100',  border: 'border-purple-300' },
}

interface StickyNoteData {
  text: string
  text_ar?: string
  color?: string
  onUpdateText?: (text: string) => void
}

export function StickyNoteNode({ data, selected }: NodeProps) {
  const d = data as unknown as StickyNoteData
  const colorKey = d.color || 'yellow'
  const { bg, border } = COLORS[colorKey] || COLORS.yellow

  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(d.text || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  const commitEdit = () => {
    setEditing(false)
    d.onUpdateText?.(text)
  }

  const handles = [Position.Top, Position.Bottom, Position.Left, Position.Right]

  return (
    <div
      className={`
        relative min-w-[180px] min-h-[140px] rounded-lg border-2 shadow-md
        ${bg} ${border}
        ${selected ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
      `}
      style={{ width: 200, minHeight: 160 }}
    >
      {/* Drag handle bar */}
      <div className={`h-5 rounded-t-md cursor-grab active:cursor-grabbing ${border} border-b-2 ${bg}`} />

      {/* Content */}
      <div className="p-2" onDoubleClick={() => setEditing(true)}>
        {editing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') commitEdit()
            }}
            className={`w-full min-h-[100px] resize-none bg-transparent text-sm text-zinc-800 outline-none`}
            dir="auto"
          />
        ) : (
          <p
            className="text-sm text-zinc-800 whitespace-pre-wrap break-words min-h-[80px]"
            dir="auto"
          >
            {d.text || <span className="text-zinc-400 italic">Double-click to edit</span>}
          </p>
        )}
      </div>

      {/* Handles */}
      {handles.map((pos) => (
        <>
          <Handle
            key={`source-${pos}`}
            type="source"
            position={pos}
            id={`source-${pos}`}
            className="!w-2 !h-2 !border !border-zinc-400 !bg-white opacity-0 hover:opacity-100 transition-opacity"
          />
          <Handle
            key={`target-${pos}`}
            type="target"
            position={pos}
            id={`target-${pos}`}
            className="!w-2 !h-2 !border !border-zinc-400 !bg-white opacity-0 hover:opacity-100 transition-opacity"
          />
        </>
      ))}
    </div>
  )
}
