import { getCurrentUserWithRole } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserPlus, Calendar, Heart } from 'lucide-react'

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  member: { ar: 'عضو', en: 'Member' },
  group_leader: { ar: 'قائد مجموعة', en: 'Group Leader' },
  ministry_leader: { ar: 'قائد خدمة', en: 'Ministry Leader' },
  super_admin: { ar: 'مشرف', en: 'Super Admin' },
}

export default async function DashboardPage() {
  const { profile, church } = await getCurrentUserWithRole()

  const firstName = profile.first_name_ar || profile.first_name || 'مستخدم'
  const roleLabel = ROLE_LABELS[profile.role]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          أهلاً، {firstName} 👋
        </h1>
        <p className="text-muted-foreground">
          {church.name_ar ?? church.name}
        </p>
      </div>

      {/* Role Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm">
          {roleLabel?.ar ?? profile.role}
        </Badge>
      </div>

      {/* Quick Stats (placeholder for Phase 7 dashboard) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الأعضاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">سيُكمل في الطور 7</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الزوار</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">سيُكمل في الطور 2</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفعاليات</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">سيُكمل في الطور 4</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الخدام</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">سيُكمل في الطور 5</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>البدء / Getting Started</CardTitle>
          <CardDescription>الخطوات الأولى لإعداد كنيستك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✅ تم تسجيل الدخول وإعداد الملف الشخصي</p>
            <p>⬜ إضافة أعضاء الكنيسة — /admin/members</p>
            <p>⬜ إنشاء المجموعات — /admin/groups (الطور 2)</p>
            <p>⬜ مشاركة رمز QR للزوار — /admin/settings/qr (الطور 2)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
