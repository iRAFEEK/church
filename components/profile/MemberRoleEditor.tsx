'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

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

const ROLE_KEYS: { value: UserRole; key: string }[] = [
  { value: 'member', key: 'roleMember' },
  { value: 'group_leader', key: 'roleGroupLeader' },
  { value: 'ministry_leader', key: 'roleMinistryLeader' },
  { value: 'super_admin', key: 'roleSuperAdmin' },
]

export function MemberRoleEditor({ memberId, currentRole, currentUserRole }: MemberRoleEditorProps) {
  const [role, setRole] = useState<UserRole>(currentRole)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations('roleEditor')

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
      toast.error(t('toastError'), { description: error.message })
      return
    }

    toast.success(t('toastSuccess'))
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
          {ROLE_KEYS.filter(opt =>
            canAssignSuperAdmin ? true : opt.value !== 'super_admin'
          ).map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {t(opt.key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleSave}
        disabled={role === currentRole || isLoading}
        size="sm"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('saveButton')}
      </Button>
    </div>
  )
}
