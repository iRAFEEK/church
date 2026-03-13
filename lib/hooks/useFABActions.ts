'use client'

import { usePathname } from 'next/navigation'
import type { UserRole } from '@/types'

export interface FABAction {
  label: string
  labelAr: string
  icon: string
  href: string
}

const LEADER_ROLES: UserRole[] = ['group_leader', 'ministry_leader', 'super_admin']
const ADMIN_ROLES: UserRole[] = ['ministry_leader', 'super_admin']

export function useFABActions(role: UserRole): FABAction[] {
  const pathname = usePathname()

  // Group detail page
  if (/^\/groups\/[^/]+$/.test(pathname)) {
    return [
      { label: 'New Gathering', labelAr: 'اجتماع جديد', icon: 'Calendar', href: `${pathname}/gathering/new` },
      { label: 'Prayer Request', labelAr: 'طلب صلاة', icon: 'Heart', href: pathname },
    ]
  }

  // Admin groups page
  if (pathname === '/admin/groups') {
    return [
      { label: 'New Group', labelAr: 'مجموعة جديدة', icon: 'Users', href: '/admin/groups/new' },
    ]
  }

  // Admin events
  if (pathname.startsWith('/admin/events') || pathname === '/events') {
    if (ADMIN_ROLES.includes(role)) {
      return [
        { label: 'New Event', labelAr: 'حدث جديد', icon: 'Calendar', href: '/admin/events/new' },
      ]
    }
    return []
  }

  // Admin songs
  if (pathname.startsWith('/admin/songs')) {
    return [
      { label: 'New Song', labelAr: 'ترنيمة جديدة', icon: 'Music', href: '/admin/songs/new' },
    ]
  }

  // Admin serving
  if (pathname.startsWith('/admin/serving')) {
    return [
      { label: 'New Area', labelAr: 'مجال جديد', icon: 'Heart', href: '/admin/serving/areas/new' },
      { label: 'New Slot', labelAr: 'فترة جديدة', icon: 'Calendar', href: '/admin/serving/slots/new' },
    ]
  }

  // Announcements
  if (pathname.startsWith('/announcements') || pathname.startsWith('/admin/announcements')) {
    if (ADMIN_ROLES.includes(role)) {
      return [
        { label: 'New Announcement', labelAr: 'إعلان جديد', icon: 'Megaphone', href: '/admin/announcements/new' },
      ]
    }
    return []
  }

  // Bible
  if (pathname.startsWith('/bible')) {
    return [
      { label: 'Bookmarks', labelAr: 'العلامات', icon: 'BookOpen', href: '/bible/bookmarks' },
    ]
  }

  // Visitors page — no FAB
  if (pathname.startsWith('/admin/visitors') || pathname === '/visitors') {
    return []
  }

  // Dashboard / home — role-based defaults
  if (pathname === '/' || pathname === '/admin') {
    if (ADMIN_ROLES.includes(role)) {
      return [
        { label: 'New Event', labelAr: 'حدث جديد', icon: 'Calendar', href: '/admin/events/new' },
        { label: 'Announcement', labelAr: 'إعلان', icon: 'Megaphone', href: '/admin/announcements/new' },
        { label: 'New Song', labelAr: 'ترنيمة جديدة', icon: 'Music', href: '/admin/songs/new' },
      ]
    }
    if (LEADER_ROLES.includes(role)) {
      return [
        { label: 'View Events', labelAr: 'عرض الأحداث', icon: 'Calendar', href: '/events' },
        { label: 'My Visitors', labelAr: 'زواري', icon: 'UserPlus', href: '/visitors' },
      ]
    }
    return [
      { label: 'Events', labelAr: 'الأحداث', icon: 'Calendar', href: '/events' },
      { label: 'Bible', labelAr: 'الكتاب المقدس', icon: 'BookOpen', href: '/bible' },
    ]
  }

  // Default — minimal
  return []
}
