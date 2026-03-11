import type { UserRole, PermissionKey } from '@/types'

export interface NavItem {
  label: string
  label_ar: string
  href: string
  iconName: string
  roles: UserRole[]
  permission?: PermissionKey
  section?: string
  section_ar?: string
}

export const NAV_ITEMS: NavItem[] = [
  // ─── Main ───────────────────────────────────────────────
  {
    label: 'Dashboard',
    label_ar: 'لوحة التحكم',
    href: '/dashboard',
    iconName: 'LayoutDashboard',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Main',
    section_ar: 'الرئيسية',
  },
  {
    label: 'My Profile',
    label_ar: 'ملفي الشخصي',
    href: '/profile',
    iconName: 'User',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Main',
    section_ar: 'الرئيسية',
  },

  // ─── Groups ─────────────────────────────────────────────
  {
    label: 'My Group',
    label_ar: 'مجموعتي',
    href: '/my-group',
    iconName: 'Users',
    roles: ['group_leader'],
    section: 'Groups',
    section_ar: 'المجموعات',
  },
  {
    label: 'Groups',
    label_ar: 'المجموعات',
    href: '/admin/groups',
    iconName: 'Users',
    roles: ['super_admin'],
    section: 'Groups',
    section_ar: 'المجموعات',
  },
  {
    label: 'Ministries',
    label_ar: 'الخدمات',
    href: '/admin/ministries',
    iconName: 'Building2',
    roles: ['ministry_leader', 'super_admin'],
    section: 'Groups',
    section_ar: 'المجموعات',
  },

  // ─── People ─────────────────────────────────────────────
  {
    label: 'Members',
    label_ar: 'الأعضاء',
    href: '/admin/members',
    iconName: 'UserCheck',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_members',
    section: 'People',
    section_ar: 'الأشخاص',
  },
  {
    label: 'Visitors Queue',
    label_ar: 'قائمة الزوار',
    href: '/admin/visitors',
    iconName: 'UserPlus',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_visitors',
    section: 'People',
    section_ar: 'الأشخاص',
  },
  {
    label: 'My Visitors',
    label_ar: 'زواري',
    href: '/visitors',
    iconName: 'UserRound',
    roles: ['group_leader'],
    section: 'People',
    section_ar: 'الأشخاص',
  },

  // ─── Ministry ───────────────────────────────────────────
  {
    label: 'Events',
    label_ar: 'الفعاليات',
    href: '/events',
    iconName: 'Calendar',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Ministry',
    section_ar: 'الخدمة',
  },
  {
    label: 'Templates',
    label_ar: 'القوالب',
    href: '/admin/templates',
    iconName: 'LayoutTemplate',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_manage_templates',
    section: 'Ministry',
    section_ar: 'الخدمة',
  },
  {
    label: 'Serving',
    label_ar: 'الخدمة',
    href: '/serving',
    iconName: 'Heart',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Ministry',
    section_ar: 'الخدمة',
  },
  {
    label: 'Announcements',
    label_ar: 'الإعلانات',
    href: '/announcements',
    iconName: 'Megaphone',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Ministry',
    section_ar: 'الخدمة',
  },
  {
    label: 'Prayer Requests',
    label_ar: 'طلبات الصلاة',
    href: '/prayer',
    iconName: 'HandHeart',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Ministry',
    section_ar: 'الخدمة',
  },
  // ─── Notifications ─────────────────────────────────
  {
    label: 'Notifications',
    label_ar: 'الإشعارات',
    href: '/notifications',
    iconName: 'Bell',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Main',
    section_ar: 'الرئيسية',
  },

  // ─── Resources ──────────────────────────────────────────
  {
    label: 'Songs',
    label_ar: 'الترانيم',
    href: '/admin/songs',
    iconName: 'Music',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_manage_songs',
    section: 'Resources',
    section_ar: 'الموارد',
  },
  {
    label: 'Bible',
    label_ar: 'الكتاب المقدس',
    href: '/bible',
    iconName: 'BookOpen',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Resources',
    section_ar: 'الموارد',
  },

  // ─── Admin ──────────────────────────────────────────────
  {
    label: 'Prayer Management',
    label_ar: 'إدارة الصلوات',
    href: '/admin/prayers',
    iconName: 'HeartHandshake',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_prayers',
    section: 'Admin',
    section_ar: 'الإدارة',
  },
  {
    label: 'Outreach',
    label_ar: 'التواصل',
    href: '/admin/outreach',
    iconName: 'MapPin',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_manage_outreach',
    section: 'People',
    section_ar: 'الأشخاص',
  },
  {
    label: 'Reports',
    label_ar: 'التقارير',
    href: '/admin/reports',
    iconName: 'BarChart3',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_reports',
    section: 'Admin',
    section_ar: 'الإدارة',
  },
  {
    label: 'QR Code',
    label_ar: 'رمز QR',
    href: '/admin/settings/qr',
    iconName: 'QrCode',
    roles: ['ministry_leader', 'super_admin'],
    section: 'Admin',
    section_ar: 'الإدارة',
  },
  {
    label: 'Role Permissions',
    label_ar: 'صلاحيات الأدوار',
    href: '/admin/settings/roles',
    iconName: 'ShieldCheck',
    roles: ['super_admin'],
    section: 'Admin',
    section_ar: 'الإدارة',
  },
  {
    label: 'Permissions',
    label_ar: 'الصلاحيات',
    href: '/admin/permissions',
    iconName: 'Lock',
    roles: ['super_admin'],
    section: 'Admin',
    section_ar: 'الإدارة',
  },
  {
    label: 'Settings',
    label_ar: 'الإعدادات',
    href: '/admin/settings',
    iconName: 'Settings',
    roles: ['super_admin'],
    section: 'Admin',
    section_ar: 'الإدارة',
  },

  // ─── Finance ────────────────────────────────────────────────
  {
    label: 'Financial Dashboard',
    label_ar: 'لوحة المالية',
    href: '/admin/finance',
    iconName: 'DollarSign',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_finances',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'Donations',
    label_ar: 'التبرعات',
    href: '/admin/finance/donations',
    iconName: 'HandCoins',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_manage_donations',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'Transactions',
    label_ar: 'المعاملات المالية',
    href: '/admin/finance/transactions',
    iconName: 'ArrowLeftRight',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_manage_finances',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'Budgets',
    label_ar: 'الميزانيات',
    href: '/admin/finance/budgets',
    iconName: 'PieChart',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_manage_budgets',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'Expense Requests',
    label_ar: 'طلبات المصروفات',
    href: '/admin/finance/expenses',
    iconName: 'Receipt',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_submit_expenses',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'Campaigns',
    label_ar: 'الحملات',
    href: '/admin/finance/campaigns',
    iconName: 'Target',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_manage_campaigns',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'Funds',
    label_ar: 'الصناديق',
    href: '/admin/finance/funds',
    iconName: 'Wallet',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_finances',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'Financial Reports',
    label_ar: 'التقارير المالية',
    href: '/admin/finance/reports',
    iconName: 'FileSpreadsheet',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_finances',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'My Giving',
    label_ar: 'تبرعاتي',
    href: '/finance/my-giving',
    iconName: 'HeartHandshake',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_own_giving',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'Finance Settings',
    label_ar: 'إعدادات المالية',
    href: '/admin/finance/settings',
    iconName: 'Settings',
    roles: ['super_admin'],
    permission: 'can_manage_finances',
    section: 'Finance',
    section_ar: 'المالية',
  },
]

/** Paths that appear in the mobile bottom tab bar */
export const PRIMARY_MOBILE_PATHS = ['/dashboard', '/admin/ministries', '/events', '/bible']

/** @deprecated Use getNavForUser() instead for permission-aware filtering */
export function getNavForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(item => item.roles.includes(role))
}

/** Permission-aware navigation filter */
export function getNavForUser(
  role: UserRole,
  resolvedPermissions: Record<PermissionKey, boolean>
): NavItem[] {
  return NAV_ITEMS.filter(item => {
    if (!item.roles.includes(role)) return false
    if (item.permission && !resolvedPermissions[item.permission]) return false
    return true
  })
}

/** Items NOT shown in the bottom tab bar — displayed in the "More" sheet */
export function getSecondaryNavItems(items: NavItem[]): NavItem[] {
  return items.filter(item => !PRIMARY_MOBILE_PATHS.includes(item.href))
}

export function getNavSections(items: NavItem[], lang: 'en' | 'ar' = 'ar'): { section: string; items: NavItem[] }[] {
  const sections: Map<string, NavItem[]> = new Map()

  for (const item of items) {
    const section = lang === 'ar' ? (item.section_ar ?? item.section ?? '') : (item.section ?? '')
    if (!sections.has(section)) sections.set(section, [])
    sections.get(section)!.push(item)
  }

  return Array.from(sections.entries()).map(([section, items]) => ({ section, items }))
}
