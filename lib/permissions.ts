import type { UserRole, PermissionKey, PermissionMap } from '@/types'

// ============================================================
// All permission keys
// ============================================================

export const ALL_PERMISSIONS: PermissionKey[] = [
  'can_view_members',
  'can_manage_members',
  'can_view_visitors',
  'can_manage_visitors',
  'can_manage_events',
  'can_manage_templates',
  'can_manage_serving',
  'can_manage_announcements',
  'can_view_reports',
  'can_manage_songs',
  'can_view_prayers',
  'can_manage_outreach',
  // Church Needs
  'can_view_church_needs',
  'can_manage_church_needs',
  // Finance
  'can_view_finances',
  'can_manage_finances',
  'can_manage_donations',
  'can_view_own_giving',
  'can_manage_budgets',
  'can_approve_expenses',
  'can_submit_expenses',
  'can_manage_campaigns',
  'can_reconcile_bank',
  // Liturgy
  'can_manage_liturgy',
  // Locations
  'can_manage_locations',
  'can_book_locations',
]

// ============================================================
// Permission labels for UI
// ============================================================

export const PERMISSION_LABELS: Record<PermissionKey, { en: string; ar: string }> = {
  can_view_members:        { en: 'View Members',          ar: 'عرض الأعضاء' },
  can_manage_members:      { en: 'Manage Members',        ar: 'إدارة الأعضاء' },
  can_view_visitors:       { en: 'View Visitors',         ar: 'عرض الزوار' },
  can_manage_visitors:     { en: 'Manage Visitors',       ar: 'إدارة الزوار' },
  can_manage_events:       { en: 'Manage Events',         ar: 'إدارة الفعاليات' },
  can_manage_templates:    { en: 'Manage Templates',      ar: 'إدارة القوالب' },
  can_manage_serving:      { en: 'Manage Serving',        ar: 'إدارة الخدمة' },
  can_manage_announcements:{ en: 'Manage Announcements',  ar: 'إدارة الإعلانات' },
  can_view_reports:        { en: 'View Reports',          ar: 'عرض التقارير' },
  can_manage_songs:        { en: 'Manage Songs',          ar: 'إدارة الترانيم' },
  can_view_prayers:        { en: 'View Prayer Requests',  ar: 'عرض طلبات الصلاة' },
  can_manage_outreach:     { en: 'Manage Outreach',       ar: 'إدارة التواصل' },
  // Church Needs
  can_view_church_needs:   { en: 'View Church Needs',     ar: 'عرض احتياجات الكنائس' },
  can_manage_church_needs: { en: 'Manage Church Needs',   ar: 'إدارة احتياجات الكنائس' },
  // Finance
  can_view_finances:       { en: 'View Finances',         ar: 'عرض المالية' },
  can_manage_finances:     { en: 'Manage Finances',       ar: 'إدارة المالية' },
  can_manage_donations:    { en: 'Manage Donations',      ar: 'إدارة التبرعات' },
  can_view_own_giving:     { en: 'View Own Giving',       ar: 'عرض تبرعاتي' },
  can_manage_budgets:      { en: 'Manage Budgets',        ar: 'إدارة الميزانيات' },
  can_approve_expenses:    { en: 'Approve Expenses',      ar: 'اعتماد المصروفات' },
  can_submit_expenses:     { en: 'Submit Expenses',       ar: 'تقديم طلبات المصروفات' },
  can_manage_campaigns:    { en: 'Manage Campaigns',      ar: 'إدارة الحملات' },
  can_reconcile_bank:      { en: 'Reconcile Bank',        ar: 'تسوية الحسابات البنكية' },
  // Liturgy
  can_manage_liturgy:      { en: 'Manage Liturgy',        ar: 'إدارة الطقوس' },
  // Locations
  can_manage_locations:    { en: 'Manage Locations',      ar: 'إدارة المواقع' },
  can_book_locations:      { en: 'Book Locations',        ar: 'حجز المواقع' },
}

// ============================================================
// Hardcoded role defaults (fallback when no church-level config)
// ============================================================

export const HARDCODED_ROLE_DEFAULTS: Record<UserRole, Record<PermissionKey, boolean>> = {
  member: {
    can_view_members: false, can_manage_members: false,
    can_view_visitors: false, can_manage_visitors: false,
    can_manage_events: false, can_manage_templates: false,
    can_manage_serving: false, can_manage_announcements: false,
    can_view_reports: false, can_manage_songs: false,
    can_view_prayers: false, can_manage_outreach: false,
    can_view_church_needs: false, can_manage_church_needs: false,
    can_view_finances: false, can_manage_finances: false,
    can_manage_donations: false, can_view_own_giving: true,
    can_manage_budgets: false, can_approve_expenses: false,
    can_submit_expenses: false, can_manage_campaigns: false, can_reconcile_bank: false,
    can_manage_liturgy: false,
    can_manage_locations: false, can_book_locations: false,
  },
  group_leader: {
    can_view_members: false, can_manage_members: false,
    can_view_visitors: true, can_manage_visitors: false,
    can_manage_events: false, can_manage_templates: false,
    can_manage_serving: false, can_manage_announcements: false,
    can_view_reports: true, can_manage_songs: false,
    can_view_prayers: false, can_manage_outreach: false,
    can_view_church_needs: true, can_manage_church_needs: false,
    can_view_finances: false, can_manage_finances: false,
    can_manage_donations: false, can_view_own_giving: true,
    can_manage_budgets: false, can_approve_expenses: false,
    can_submit_expenses: true, can_manage_campaigns: false, can_reconcile_bank: false,
    can_manage_liturgy: false,
    can_manage_locations: false, can_book_locations: true,
  },
  ministry_leader: {
    can_view_members: false, can_manage_members: false,
    can_view_visitors: true, can_manage_visitors: true,
    can_manage_events: true, can_manage_templates: true,
    can_manage_serving: true, can_manage_announcements: false,
    can_view_reports: true, can_manage_songs: false,
    can_view_prayers: false, can_manage_outreach: false,
    can_view_church_needs: true, can_manage_church_needs: false,
    can_view_finances: false, can_manage_finances: false,
    can_manage_donations: false, can_view_own_giving: true,
    can_manage_budgets: false, can_approve_expenses: true,
    can_submit_expenses: true, can_manage_campaigns: false, can_reconcile_bank: false,
    can_manage_liturgy: false,
    can_manage_locations: true, can_book_locations: true,
  },
  super_admin: {
    can_view_members: true, can_manage_members: true,
    can_view_visitors: true, can_manage_visitors: true,
    can_manage_events: true, can_manage_templates: true,
    can_manage_serving: true, can_manage_announcements: true,
    can_view_reports: true, can_manage_songs: true,
    can_view_prayers: true, can_manage_outreach: true,
    can_view_church_needs: true, can_manage_church_needs: true,
    can_view_finances: true, can_manage_finances: true,
    can_manage_donations: true, can_view_own_giving: true,
    can_manage_budgets: true, can_approve_expenses: true,
    can_submit_expenses: true, can_manage_campaigns: true, can_reconcile_bank: true,
    can_manage_liturgy: true,
    can_manage_locations: true, can_book_locations: true,
  },
}

// ============================================================
// Permission resolution
// ============================================================

/**
 * Merge permissions in order: hardcoded → church defaults → user overrides.
 * Additive model: user overrides can only set true, never false.
 * super_admin always gets everything.
 */
export function resolvePermissions(
  role: UserRole,
  churchDefaults: PermissionMap | null | undefined,
  userOverrides: PermissionMap | null | undefined
): Record<PermissionKey, boolean> {
  // super_admin always gets everything
  if (role === 'super_admin') {
    return { ...HARDCODED_ROLE_DEFAULTS.super_admin }
  }

  const base = { ...HARDCODED_ROLE_DEFAULTS[role] }

  // Layer church-level role defaults
  if (churchDefaults) {
    for (const [key, value] of Object.entries(churchDefaults)) {
      if (key in base && typeof value === 'boolean') {
        base[key as PermissionKey] = value
      }
    }
  }

  // Layer user-specific overrides (additive: can only add true, not remove)
  if (userOverrides) {
    for (const [key, value] of Object.entries(userOverrides)) {
      if (key in base && value === true) {
        base[key as PermissionKey] = true
      }
    }
  }

  return base
}

// ============================================================
// Permission check helpers
// ============================================================

export function hasPermission(
  resolved: Record<PermissionKey, boolean>,
  key: PermissionKey
): boolean {
  return resolved[key] === true
}

export function hasAnyPermission(
  resolved: Record<PermissionKey, boolean>,
  ...keys: PermissionKey[]
): boolean {
  return keys.some(key => resolved[key] === true)
}
