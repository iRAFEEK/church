'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Send, Archive, Trash2 } from 'lucide-react'
import type { Announcement } from '@/types'

interface AnnouncementActionsProps {
  announcement: Announcement
}

export function AnnouncementActions({ announcement }: AnnouncementActionsProps) {
  const router = useRouter()
  const t = useTranslations('announcements')
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (action: 'publish' | 'archive' | 'delete') => {
    if (action === 'delete' && !confirm(t('confirmDelete'))) return

    setLoading(action)
    try {
      if (action === 'delete') {
        const res = await fetch(`/api/announcements/${announcement.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed')
        toast.success(t('deleted'))
        router.push('/admin/announcements')
        router.refresh()
      } else {
        const status = action === 'publish' ? 'published' : 'archived'
        const res = await fetch(`/api/announcements/${announcement.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (!res.ok) throw new Error('Failed')
        toast.success(action === 'publish' ? t('publishedSuccess') : t('archivedSuccess'))
        router.refresh()
      }
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {announcement.status !== 'published' && (
        <Button
          size="sm"
          onClick={() => handleAction('publish')}
          disabled={loading !== null}
        >
          <Send className="h-4 w-4 me-2" />
          {loading === 'publish' ? t('saving') : t('publish')}
        </Button>
      )}
      {announcement.status !== 'archived' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('archive')}
          disabled={loading !== null}
        >
          <Archive className="h-4 w-4 me-2" />
          {loading === 'archive' ? t('saving') : t('archive')}
        </Button>
      )}
      <Button
        size="sm"
        variant="destructive"
        onClick={() => handleAction('delete')}
        disabled={loading !== null}
      >
        <Trash2 className="h-4 w-4 me-2" />
        {loading === 'delete' ? t('saving') : t('delete')}
      </Button>
    </div>
  )
}
