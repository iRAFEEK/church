'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface SlotDeleteButtonProps {
  slotId: string
  slotTitle: string
}

export function SlotDeleteButton({ slotId, slotTitle }: SlotDeleteButtonProps) {
  const router = useRouter()
  const t = useTranslations('serving')
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(t('confirmDeleteSlot'))) return

    setLoading(true)
    try {
      const res = await fetch(`/api/serving/slots/${slotId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('slotDeleted'))
      router.push('/admin/serving?tab=slots')
      router.refresh()
    } catch {
      toast.error(t('errorGeneral'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-4 w-4 me-2" />
      {loading ? t('saving') : t('delete')}
    </Button>
  )
}
