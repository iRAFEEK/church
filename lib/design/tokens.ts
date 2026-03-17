// ARCH: Design system tokens — single source of truth for semantic colors.
// All components that render status badges, role labels, or category indicators
// should import from here instead of hardcoding color classes.
// This ensures consistency across the app and makes theme changes trivial.

export const STATUS_COLORS = {
  active:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  inactive: { bg: 'bg-zinc-50',    text: 'text-zinc-500',    border: 'border-zinc-200',    dot: 'bg-zinc-400' },
  visitor:  { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  at_risk:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
} as const

export const ROLE_COLORS = {
  super_admin:     { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  ministry_leader: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  group_leader:    { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  member:          { bg: 'bg-zinc-50',   text: 'text-zinc-600',   border: 'border-zinc-200' },
} as const

export const VISITOR_STATUS_COLORS = {
  new:       { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  assigned:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  contacted: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  converted: { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
  lost:      { bg: 'bg-zinc-50',    text: 'text-zinc-500',    border: 'border-zinc-200' },
} as const

export const ATTENDANCE_COLORS = {
  present: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  absent:  { bg: 'bg-red-50',     text: 'text-red-700' },
  excused: { bg: 'bg-amber-50',   text: 'text-amber-700' },
  late:    { bg: 'bg-blue-50',    text: 'text-blue-700' },
} as const

export const PRAYER_STATUS_COLORS = {
  active:   { bg: 'bg-blue-50',    text: 'text-blue-700' },
  answered: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  archived: { bg: 'bg-zinc-50',    text: 'text-zinc-500' },
} as const

export const NEED_URGENCY_COLORS = {
  low:      'bg-green-100 text-green-800',
  medium:   'bg-yellow-100 text-yellow-800',
  high:     'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
} as const

export const NEED_STATUS_COLORS = {
  open:        'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  fulfilled:   'bg-purple-100 text-purple-800',
  closed:      'bg-zinc-100 text-zinc-600',
} as const

export const NEED_CATEGORY_COLORS = {
  furniture:   'bg-amber-50 text-amber-700',
  electronics: 'bg-blue-50 text-blue-700',
  supplies:    'bg-slate-50 text-slate-700',
  food:        'bg-green-50 text-green-700',
  clothing:    'bg-pink-50 text-pink-700',
  building:    'bg-orange-50 text-orange-700',
  vehicle:     'bg-indigo-50 text-indigo-700',
  educational: 'bg-purple-50 text-purple-700',
  medical:     'bg-red-50 text-red-700',
  financial:   'bg-emerald-50 text-emerald-700',
  volunteer:   'bg-cyan-50 text-cyan-700',
  other:       'bg-zinc-50 text-zinc-700',
} as const

export const NEED_RESPONSE_STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-800',
  accepted:  'bg-green-100 text-green-800',
  declined:  'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
} as const

export const CALENDAR_TYPE_COLORS = {
  event:     { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  serving:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  gathering: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
} as const

export type StatusKey = keyof typeof STATUS_COLORS
export type RoleKey = keyof typeof ROLE_COLORS
export type VisitorStatusKey = keyof typeof VISITOR_STATUS_COLORS
export type AttendanceStatusKey = keyof typeof ATTENDANCE_COLORS

// ARCH: Spacing contract for consistent visual rhythm across all components.
// xs: p-2 (8px) — dense items, table cells, badges
// sm: p-3 (12px) — compact cards, list items
// md: p-4 (16px) — standard cards, form fields
// lg: p-6 (24px) — page sections, modal bodies
// xl: p-8 (32px) — page padding, hero sections
