'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Plus, X, HelpCircle, type LucideIcon } from 'lucide-react'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/utils'
import { getHelpItems, type HelpItem, type DriverStep } from '@/lib/help/registry'
import dynamic from 'next/dynamic'
import { HelpCard } from './HelpCard'

const TeachMeWalkthrough = dynamic(
  () => import('./TeachMeWalkthrough').then(m => ({ default: m.TeachMeWalkthrough })),
  { ssr: false }
)
import type { UserRole } from '@/types'

interface TeachMeButtonProps {
  role: UserRole
}

export function TeachMeButton({ role }: TeachMeButtonProps) {
  const pathname = usePathname()
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const [open, setOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<HelpItem | null>(null)
  const [walkthroughSteps, setWalkthroughSteps] = useState<DriverStep[] | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const items = getHelpItems(pathname, role)

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

  // Close menu when navigating
  useEffect(() => {
    setOpen(false)
    setSelectedItem(null)
  }, [pathname])

  const handleWalkthrough = useCallback((steps: DriverStep[]) => {
    setSelectedItem(null)
    setOpen(false)
    // Small delay to let modals close
    setTimeout(() => setWalkthroughSteps(steps), 100)
  }, [])

  // Don't render if no help items for this page
  if (items.length === 0) return null

  function getIcon(iconName: string): LucideIcon {
    return (Icons as unknown as Record<string, LucideIcon>)[iconName] ?? HelpCircle
  }

  return (
    <>
      {/* Backdrop when menu is open */}
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
        {/* Help items menu */}
        <div
          className={cn(
            'flex flex-col-reverse gap-2 mb-3 transition-all duration-200',
            open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          )}
        >
          {items.map((item, i) => {
            const Icon = getIcon(item.icon)
            return (
              <button
                key={item.id}
                onClick={() => {
                  setOpen(false)
                  setSelectedItem(item)
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl bg-white shadow-lg border border-zinc-100',
                  'hover:bg-zinc-50 active:scale-95 transition-all duration-150',
                  'min-w-[200px]',
                  'text-start'
                )}
                style={{
                  transitionDelay: open ? `${i * 50}ms` : '0ms',
                }}
              >
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-zinc-800">
                  {isAr ? item.titleAr : item.title}
                </span>
              </button>
            )
          })}
        </div>

        {/* Floating + button */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-12 h-12 rounded-full bg-blue-600 text-white shadow-xl',
            'flex items-center justify-center',
            'hover:bg-blue-700 active:scale-90 transition-all duration-200',
          )}
          aria-label={open ? 'Close help' : 'Teach me'}
        >
          {open ? (
            <X className="h-5 w-5 transition-transform duration-200" />
          ) : (
            <HelpCircle className="h-5 w-5 transition-transform duration-200" />
          )}
        </button>
      </div>

      {/* Help Card Modal */}
      {selectedItem && (
        <HelpCard
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onWalkthrough={
            selectedItem.driverSteps && selectedItem.driverSteps.length > 0
              ? () => handleWalkthrough(selectedItem.driverSteps!)
              : undefined
          }
        />
      )}

      {/* Interactive Walkthrough */}
      {walkthroughSteps && (
        <TeachMeWalkthrough
          steps={walkthroughSteps}
          isAr={isAr}
          onComplete={() => setWalkthroughSteps(null)}
        />
      )}
    </>
  )
}
