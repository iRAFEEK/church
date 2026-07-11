import type { UserRole, PermissionKey } from '@/types'
import { isFeatureEnabled, type FeatureFlag } from '@/lib/features'

export interface NavItem {
  label: string
  label_ar: string
  href: string
  iconName: string
  roles: UserRole[]
  permission?: PermissionKey
  /** When set, the item is only shown if this feature flag is enabled. */
  feature?: FeatureFlag
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
    iconName: 'UsersRound',
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
  {
    label: 'Join Requests',
    label_ar: 'طلبات الانضمام',
    href: '/admin/join-requests',
    iconName: 'UserPlus',
    roles: ['ministry_leader', 'super_admin'],
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
    label: 'Calendar',
    label_ar: 'التقويم',
    href: '/admin/calendar',
    iconName: 'CalendarDays',
    roles: ['ministry_leader', 'super_admin'],
    permission: 'can_manage_events',
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
    label: 'Room Booking',
    label_ar: 'حجز المواقع',
    href: '/bookings',
    iconName: 'DoorOpen',
    roles: ['group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_book_locations',
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
  {
    label: 'Liturgy',
    label_ar: 'الطقوس',
    href: '/liturgy',
    iconName: 'Church',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Resources',
    section_ar: 'الموارد',
  },
  {
    label: 'How to Use',
    label_ar: 'دليل الاستخدام',
    href: '/help',
    iconName: 'GraduationCap',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    section: 'Resources',
    section_ar: 'الموارد',
  },

  // ─── Community ─────────────────────────────────────────
  {
    label: 'Church Needs',
    label_ar: 'احتياجات الكنائس',
    href: '/community/needs',
    iconName: 'HandHelping',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_church_needs',
    section: 'Community',
    section_ar: 'المجتمع',
  },

  // ─── Admin ──────────────────────────────────────────────
  {
    label: 'Locations',
    label_ar: 'المواقع',
    href: '/admin/locations',
    iconName: 'Building',
    roles: ['ministry_leader', 'super_admin'],
    permission: 'can_manage_locations',
    section: 'Admin',
    section_ar: 'الإدارة',
  },
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
    href: '/admin/finance/reports',
    iconName: 'BarChart3',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_reports',
    feature: 'finance',
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
    label: 'Finance',
    label_ar: 'المالية',
    href: '/admin/finance',
    iconName: 'DollarSign',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_finances',
    feature: 'finance',
    section: 'Finance',
    section_ar: 'المالية',
  },
  {
    label: 'My Giving',
    label_ar: 'تبرعاتي',
    href: '/finance/my-giving',
    iconName: 'HandCoins',
    roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
    permission: 'can_view_own_giving',
    feature: 'finance',
    section: 'Finance',
    section_ar: 'المالية',
  },
]

/** Paths that appear in the mobile bottom tab bar */
export const PRIMARY_MOBILE_PATHS = ['/dashboard', '/admin/groups', '/my-group', '/admin/ministries', '/notifications']

/**
 * Nav hrefs a PENDING church (awaiting platform approval) may reach. Its founder can set
 * up their profile, edit church info (settings), and watch the tutorial lessons — but
 * nothing operational until approved. Enforced server-side in the (app) layout too.
 */
export const PENDING_CHURCH_ALLOWED_HREFS = ['/dashboard', '/profile', '/help', '/admin/settings']

/**
 * Ekklesia platform-operator entry. Not role-based — appended only when the caller is a
 * platform admin (email allowlist, see lib/platform.ts), so it never leaks to church roles.
 */
export const PLATFORM_NAV_ITEM: NavItem = {
  label: 'Ekklesia Admin',
  label_ar: 'إدارة إكليسيا',
  href: '/platform',
  iconName: 'ShieldCheck',
  roles: ['member', 'group_leader', 'ministry_leader', 'super_admin'],
  section: 'Ekklesia',
  section_ar: 'إكليسيا',
}

export interface NavFilterOptions {
  /** Church is awaiting platform approval — restrict to PENDING_CHURCH_ALLOWED_HREFS. */
  isPendingChurch?: boolean
  /** Caller is a platform operator — append the Ekklesia Admin entry. */
  isPlatformAdmin?: boolean
}

/** @deprecated Use getNavForUser() instead for permission-aware filtering */
export function getNavForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(item => item.roles.includes(role))
}

/** Permission-aware navigation filter */
export function getNavForUser(
  role: UserRole,
  resolvedPermissions: Record<PermissionKey, boolean>,
  opts: NavFilterOptions = {}
): NavItem[] {
  let items = NAV_ITEMS.filter(item => {
    if (!item.roles.includes(role)) return false
    if (item.permission && !resolvedPermissions[item.permission]) return false
    if (item.feature && !isFeatureEnabled(item.feature)) return false
    return true
  })

  // Pending church: only church info + tutorials + own profile, nothing operational.
  if (opts.isPendingChurch) {
    items = items.filter(item => PENDING_CHURCH_ALLOWED_HREFS.includes(item.href))
  }

  // Platform operators get the Ekklesia Admin entry (independent of church role).
  if (opts.isPlatformAdmin) {
    items = [...items, PLATFORM_NAV_ITEM]
  }

  return items
}

/** Items NOT shown in the bottom tab bar — displayed in the "More" sheet */
export function getSecondaryNavItems(items: NavItem[]): NavItem[] {
  return items.filter(item => !PRIMARY_MOBILE_PATHS.includes(item.href))
}

export function getNavSections(items: NavItem[], lang: 'en' | 'ar' = 'ar'): { section: string; items: NavItem[] }[] {
  const sections: Map<string, NavItem[]> = new Map()

  for (const item of items) {
    const section = lang.startsWith('ar') ? (item.section_ar ?? item.section ?? '') : (item.section ?? '')
    if (!sections.has(section)) sections.set(section, [])
    sections.get(section)!.push(item)
  }

  return Array.from(sections.entries()).map(([section, items]) => ({ section, items }))
}
