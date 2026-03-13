'use client'

import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface NeedsTabsProps {
  activeTab: string
  unreadCount?: number
}

export function NeedsTabs({ activeTab, unreadCount }: NeedsTabsProps) {
  const t = useTranslations('churchNeeds')
  const router = useRouter()
  const searchParams = useSearchParams()

  const setTab = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'all') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    params.delete('page')
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  const tabClass = (tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === tab
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-muted'
    }`

  return (
    <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
      <button className={tabClass('all')} onClick={() => setTab('all')}>
        {t('allNeeds')}
      </button>
      <button className={tabClass('mine')} onClick={() => setTab('mine')}>
        {t('yourNeeds')}
      </button>
      <button className={tabClass('messages')} onClick={() => setTab('messages')}>
        {t('messagesTab')}
        {unreadCount != null && unreadCount > 0 && (
          <span className="ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs px-1.5">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
