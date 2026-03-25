'use client'

import { useState, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

interface LabelData {
  text: string
  text_ar?: string
  onUpdateText?: (text: string) => void
}

export function LabelNode({ data, selected }: NodeProps) {
  const d = data as unknown as LabelData
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(d.text || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
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
        relative px-3 py-1.5 border-b-2 border-zinc-400 min-w-[200px]
        ${selected ? 'border-blue-400' : ''}
      `}
      style={{ width: 280 }}
      onDoubleClick={() => setEditing(true)}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') commitEdit()
          }}
          className="w-full bg-transparent text-sm font-bold text-zinc-700 outline-none"
          dir="auto"
        />
      ) : (
        <span className="text-sm font-bold text-zinc-600 uppercase tracking-wide" dir="auto">
          {d.text || <span className="text-zinc-400 font-normal normal-case tracking-normal italic">Double-click to add label</span>}
        </span>
      )}

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
