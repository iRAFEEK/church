'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeSearch, useDebounce } from '@/lib/utils/search'

interface Member {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
  email: string | null
}

interface Props {
  prayerId: string
  onAssigned: () => void
}

export function PrayerAssignDialog({ prayerId, onAssigned }: Props) {
  const t = useTranslations('churchPrayer')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200)
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)

  // Load all members once when dialog opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function loadMembers() {
      setLoading(true)
      try {
        const res = await fetch('/api/church-prayers/members')
        if (res.ok && !cancelled) {
          const json = await res.json()
          setAllMembers(json.data || [])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadMembers()
    return () => { cancelled = true }
  }, [open])

  function getDisplayName(m: Member) {
    if (isAr) {
      const ar = `${m.first_name_ar || ''} ${m.last_name_ar || ''}`.trim()
      if (ar) return ar
    }
    const en = `${m.first_name || ''} ${m.last_name || ''}`.trim()
    return en || m.email || '—'
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  // Client-side filtering with Arabic normalization
  const filteredMembers = useMemo(() => {
    if (!debouncedSearch) return allMembers
    const q = normalizeSearch(debouncedSearch)
    return allMembers.filter(m => {
      const fields = [
        m.first_name_ar,
        m.last_name_ar,
        m.first_name,
        m.last_name,
        m.email,
        // Also match against full display name
        `${m.first_name_ar || ''} ${m.last_name_ar || ''}`,
        `${m.first_name || ''} ${m.last_name || ''}`,
      ]
      return fields.some(f => f && normalizeSearch(f).includes(q))
    })
  }, [allMembers, debouncedSearch])

  async function handleAssign(memberId: string) {
    setAssigning(memberId)
    try {
      const res = await fetch(`/api/church-prayers/${prayerId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: memberId }),
      })
      if (res.ok) {
        toast.success(t('assignSuccess'))
        setOpen(false)
        setSearch('')
        onAssigned()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to assign')
      }
    } finally {
      setAssigning(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-600 hover:text-blue-700">
          <UserPlus className="h-3.5 w-3.5 me-1" />
          <span className="text-xs">{t('assign')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('assignDialogTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchMembers')}
              className="ps-9"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('noMembersFound')}</p>
            ) : (
              filteredMembers.map(member => {
                const name = getDisplayName(member)
                const initials = getInitials(name)
                const isAssigning = assigning === member.id

                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={isAssigning}
                    onClick={() => handleAssign(member.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-start transition-colors hover:bg-muted/50 disabled:opacity-50"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={member.photo_url || undefined} />
                      <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      {member.email && (
                        <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{member.email}</p>
                      )}
                    </div>
                    {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
