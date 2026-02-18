import type { UserRole } from '@/types'

export interface NavItem {
  label: string
  label_ar: string
  href: string
  iconName: string
  roles: UserRole[]
  section?: string
  section_ar?: string
}

export const NAV_ITEMS: NavItem[] = [
  // ─── Main ───────────────────────────────────────────────
  {
    label: 'Dashboard',
    label_ar: 'لوحة التحكم',
    href: '/admin',
    iconName: 'LayoutDashboard',
    roles: ['ministry_leader', 'super_admin'],
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
    href: '/groups',
    iconName: 'Users',
    roles: ['group_leader', 'ministry_leader', 'super_admin'],
    section: 'Groups',
    section_ar: 'المجموعات',
  },
  {
    label: 'All Groups',
    label_ar: 'جميع المجموعات',
    href: '/admin/groups',
    iconName: 'Network',
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
    roles: ['ministry_leader', 'super_admin'],
    section: 'People',
    section_ar: 'الأشخاص',
  },
  {
    label: 'Visitors',
    label_ar: 'الزوار',
    href: '/visitors',
    iconName: 'UserPlus',
    roles: ['group_leader', 'ministry_leader', 'super_admin'],
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

  // ─── Resources ──────────────────────────────────────────
  {
    label: 'Songs',
    label_ar: 'الترانيم',
    href: '/admin/songs',
    iconName: 'Music',
    roles: ['group_leader', 'ministry_leader', 'super_admin'],
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
    label: 'Reports',
    label_ar: 'التقارير',
    href: '/admin/reports',
    iconName: 'BarChart3',
    roles: ['ministry_leader', 'super_admin'],
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
]

export function getNavForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(item => item.roles.includes(role))
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
