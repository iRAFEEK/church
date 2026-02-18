'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function SongDeleteButton({ songId, songTitle }: { songId: string; songTitle: string }) {
  const router = useRouter()
  const t = useTranslations('songs')
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(t('confirmDelete', { title: songTitle }))) return

    setLoading(true)
    try {
      const res = await fetch(`/api/songs/${songId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success(t('songDeleted'))
      router.push('/admin/songs')
      router.refresh()
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="destructive" size="icon" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
