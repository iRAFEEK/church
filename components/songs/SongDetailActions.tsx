'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddToServiceDialog } from '@/components/events/AddToServiceDialog'

type SongDetailActionsProps = {
  songId: string
  title: string
  titleAr: string | null
}

export function SongDetailActions({ songId, title, titleAr }: SongDetailActionsProps) {
  const t = useTranslations('addToService')
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4 me-2" />
        {t('button')}
      </Button>
      <AddToServiceDialog
        open={open}
        onOpenChange={setOpen}
        payload={{ kind: 'song', title, title_ar: titleAr, song_id: songId }}
      />
    </>
  )
}
