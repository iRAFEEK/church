import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { UserCheck, Search } from 'lucide-react'
import type { Profile } from '@/types'

const ROLE_LABELS: Record<string, { ar: string; color: string }> = {
  member: { ar: 'عضو', color: 'secondary' },
  group_leader: { ar: 'قائد مجموعة', color: 'default' },
  ministry_leader: { ar: 'قائد خدمة', color: 'default' },
  super_admin: { ar: 'مشرف', color: 'default' },
}

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  inactive: 'secondary',
  at_risk: 'warning',
  visitor: 'outline',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
  at_risk: 'يحتاج متابعة',
  visitor: 'زائر',
}

interface SearchParams {
  q?: string
  role?: string
  status?: string
  page?: string
}

const PAGE_SIZE = 25

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { profile } = await getCurrentUserWithRole()
  const params = await searchParams

  if (!isAdmin(profile)) {
    redirect('/')
  }

  const supabase = await createClient()

  const page = parseInt(params.page ?? '1') - 1
  const search = params.q?.trim() ?? ''
  const roleFilter = params.role
  const statusFilter = params.status

  // Build query
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (search) {
    query = query.or(
      `first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }
  if (roleFilter) {
    query = query.eq('role', roleFilter)
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: members, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const currentPage = page + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الأعضاء</h1>
          <p className="text-muted-foreground text-sm">{count ?? 0} عضو في الكنيسة</p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4">
          <form className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={search}
                placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                className="ps-9"
              />
            </div>

            <select
              name="role"
              defaultValue={roleFilter ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">كل الأدوار</option>
              <option value="member">عضو</option>
              <option value="group_leader">قائد مجموعة</option>
              <option value="ministry_leader">قائد خدمة</option>
              <option value="super_admin">مشرف</option>
            </select>

            <select
              name="status"
              defaultValue={statusFilter ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="at_risk">يحتاج متابعة</option>
            </select>

            <Button type="submit" variant="outline">بحث</Button>
          </form>
        </CardContent>
      </Card>

      {/* Members Table */}
      {members && members.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-start">
                  <th className="ps-6 py-3 text-sm font-medium text-muted-foreground">العضو</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">الدور</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">الحالة</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">الهاتف</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">تاريخ الانضمام</th>
                  <th className="pe-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((member: Profile) => {
                  const nameAr = `${member.first_name_ar ?? ''} ${member.last_name_ar ?? ''}`.trim()
                  const nameEn = `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()
                  const displayName = nameAr || nameEn || member.email || '—'
                  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      <td className="ps-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={member.photo_url ?? undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{displayName}</p>
                            <p className="text-xs text-muted-foreground truncate" dir="ltr">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[member.role]?.ar ?? member.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={STATUS_COLORS[member.status] as 'default' | 'secondary' | 'destructive' | 'outline' ?? 'default'}
                          className="text-xs"
                        >
                          {STATUS_LABELS[member.status] ?? member.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">
                        {member.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {member.joined_church_at
                          ? new Date(member.joined_church_at).toLocaleDateString('ar')
                          : '—'}
                      </td>
                      <td className="pe-6 py-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/members/${member.id}`}>عرض</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                صفحة {currentPage} من {totalPages}
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?q=${search}&page=${currentPage - 1}`}>السابق</Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`?q=${search}&page=${currentPage + 1}`}>التالي</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">لا يوجد أعضاء</h3>
            <p className="text-muted-foreground text-sm">
              {search ? 'لا توجد نتائج لهذا البحث' : 'لم يتم إضافة أعضاء بعد'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
