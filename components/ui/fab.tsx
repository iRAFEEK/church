'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Plus, X, Calendar, Users, Heart, Music, Megaphone, BookOpen, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFABActions } from '@/lib/hooks/useFABActions'
import type { Profile } from '@/types'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar, Users, Heart, Music, Megaphone, BookOpen, UserPlus,
}

interface FABProps {
  profile: Profile
}

export function FAB({ profile }: FABProps) {
  const [open, setOpen] = useState(false)
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const actions = useFABActions(profile.role)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Don't render if no actions for this page
  if (actions.length === 0) return null

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        ref={containerRef}
        className={cn(
          'fixed z-50',
          'end-4',
        )}
        style={{
          bottom: 'calc(var(--bottom-nav-height, 0px) + 1rem)',
        }}
      >
        {/* Action items */}
        <div
          className={cn(
            'flex flex-col-reverse gap-2 mb-3 transition-all duration-200',
            open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          )}
        >
          {actions.map((action, i) => {
            const Icon = ICON_MAP[action.icon] ?? Plus
            return (
              <button
                key={i}
                onClick={() => {
                  setOpen(false)
                  router.push(action.href)
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl bg-white shadow-lg border border-zinc-100',
                  'hover:bg-zinc-50 active:scale-95 transition-all duration-150',
                  'min-w-[180px]',
                  'text-start'
                )}
                style={{
                  transitionDelay: open ? `${i * 50}ms` : '0ms',
                }}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-zinc-800">
                  {isRTL ? action.labelAr : action.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* FAB button */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl',
            'flex items-center justify-center',
            'hover:bg-primary/90 active:scale-90 transition-all duration-200',
            'ms-auto'
          )}
          aria-label={open ? 'Close' : 'Quick actions'}
        >
          {open ? (
            <X className="h-6 w-6 transition-transform duration-200" />
          ) : (
            <Plus className="h-6 w-6 transition-transform duration-200" />
          )}
        </button>
      </div>
    </>
  )
}
