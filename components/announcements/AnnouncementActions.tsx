'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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

  const handleAction = async (action: 'publish' | 'archive') => {
    setLoading(action)
    try {
      const status = action === 'publish' ? 'published' : 'archived'
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(action === 'publish' ? t('publishedSuccess') : t('archivedSuccess'))
      router.refresh()
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async () => {
    setLoading('delete')
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('deleted'))
      router.push('/admin/announcements')
      router.refresh()
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
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="destructive"
            disabled={loading !== null}
          >
            <Trash2 className="h-4 w-4 me-2" />
            {loading === 'delete' ? t('saving') : t('delete')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelDelete')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
