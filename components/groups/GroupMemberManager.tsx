'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
  status: string
}

type Member = {
  id: string
  role_in_group: string
  joined_at: string
  is_active: boolean
  profile: Profile | null
}

const ROLE_AR: Record<string, string> = {
  member: 'عضو',
  leader: 'قائد',
  co_leader: 'مساعد',
}

export function GroupMemberManager({
  groupId,
  members: initialMembers,
  allMembers,
  canManage,
}: {
  groupId: string
  members: Member[]
  allMembers: Profile[]
  canManage: boolean
}) {
  const [members, setMembers] = useState(initialMembers)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const memberIds = new Set(members.map(m => m.profile?.id))
  const available = allMembers.filter(p => {
    if (memberIds.has(p.id)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.first_name_ar?.includes(search) ||
      p.last_name_ar?.includes(search)
    )
  })

  async function addMember(profile: Profile) {
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile.id }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setMembers(prev => [...prev, { ...data, profile }])
      toast.success('تم إضافة العضو')
      setSearch('')
    } catch {
      toast.error('حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  async function removeMember(member: Member) {
    if (!member.profile) return
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: member.profile.id }),
      })
      if (!res.ok) throw new Error()
      setMembers(prev => prev.filter(m => m.id !== member.id))
      toast.success('تم إزالة العضو')
    } catch {
      toast.error('حدث خطأ')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">الأعضاء ({members.length})</h2>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>إضافة عضو</Button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="text-center py-10 text-zinc-400 rounded-xl border border-zinc-200">
          <p className="font-medium">لا يوجد أعضاء في هذه المجموعة</p>
          <p className="text-sm mt-1">أضف أعضاء لتبدأ</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
          {members.map(m => {
            const p = m.profile
            if (!p) return null
            const name = `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
            const initials = (p.first_name_ar || p.first_name || '?')[0].toUpperCase()

            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={p.photo_url || undefined} />
                  <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 text-sm">{name}</span>
                    {m.role_in_group !== 'member' && (
                      <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                        {ROLE_AR[m.role_in_group]}
                      </span>
                    )}
                    {p.status === 'at_risk' && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">في خطر</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/admin/members/${p.id}`} className="text-xs text-zinc-500 hover:text-zinc-700">
                    عرض
                  </Link>
                  {canManage && (
                    <button
                      onClick={() => removeMember(m)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      إزالة
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={() => { setAddOpen(false); setSearch('') }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة عضو للمجموعة</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="ابحث عن عضو..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-center text-sm text-zinc-400 py-4">
                {search ? 'لا توجد نتائج' : 'جميع الأعضاء في المجموعة'}
              </p>
            ) : (
              available.slice(0, 20).map(p => {
                const name = `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
                return (
                  <button
                    key={p.id}
                    onClick={() => addMember(p)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 transition-colors text-right"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={p.photo_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(p.first_name_ar || p.first_name || '?')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-zinc-900">{name}</span>
                  </button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
