'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { UserRole } from '@/types'

interface MemberRoleEditorProps {
  memberId: string
  currentRole: UserRole
  currentUserRole: UserRole
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'member', label: 'عضو' },
  { value: 'group_leader', label: 'قائد مجموعة' },
  { value: 'ministry_leader', label: 'قائد خدمة' },
  { value: 'super_admin', label: 'مشرف' },
]

export function MemberRoleEditor({ memberId, currentRole, currentUserRole }: MemberRoleEditorProps) {
  const [role, setRole] = useState<UserRole>(currentRole)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const canAssignSuperAdmin = currentUserRole === 'super_admin'

  async function handleSave() {
    if (role === currentRole) return

    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', memberId)

    if (error) {
      setIsLoading(false)
      toast.error('فشل تغيير الدور', { description: error.message })
      return
    }

    toast.success('تم تغيير الدور بنجاح')
    setIsLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.filter(opt =>
            canAssignSuperAdmin ? true : opt.value !== 'super_admin'
          ).map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleSave}
        disabled={role === currentRole || isLoading}
        size="sm"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
      </Button>
    </div>
  )
}
