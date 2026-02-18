// ============================================================
// EKKLESIA — Core TypeScript Types
// Mirrors the database schema exactly
// ============================================================

export type UserRole = 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
export type UserStatus = 'active' | 'inactive' | 'at_risk' | 'visitor'
export type NotificationPref = 'whatsapp' | 'sms' | 'email' | 'all' | 'none'
export type GenderType = 'male' | 'female'
export type MilestoneType = 'baptism' | 'salvation' | 'bible_plan_completed' | 'leadership_training' | 'marriage' | 'other'

// ============================================================
// CHURCH
// ============================================================

export interface Church {
  id: string
  name: string
  name_ar: string | null
  country: string
  timezone: string
  primary_language: string
  welcome_message: string | null
  welcome_message_ar: string | null
  visitor_sla_hours: number
  logo_url: string | null
  primary_color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// PROFILE
// ============================================================

export interface Profile {
  id: string
  church_id: string

  // Names
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null

  // Contact
  phone: string | null
  email: string | null

  // Personal
  date_of_birth: string | null
  gender: GenderType | null
  occupation: string | null
  occupation_ar: string | null

  // Profile
  photo_url: string | null
  role: UserRole
  status: UserStatus

  // Church relationship
  joined_church_at: string | null
  invited_by: string | null

  // Preferences
  notification_pref: NotificationPref
  preferred_language: string

  // Onboarding
  onboarding_completed: boolean

  // Timestamps
  created_at: string
  updated_at: string
}

// ============================================================
// PROFILE MILESTONE
// ============================================================

export interface ProfileMilestone {
  id: string
  profile_id: string
  church_id: string
  type: MilestoneType
  title: string
  title_ar: string | null
  date: string | null
  notes: string | null
  created_at: string
}

// ============================================================
// PHASE 2 TYPES (forward declarations, filled in Phase 2)
// ============================================================

export interface Ministry {
  id: string
  church_id: string
  name: string
  name_ar: string | null
  leader_id: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Group {
  id: string
  church_id: string
  ministry_id: string | null
  name: string
  name_ar: string | null
  type: string
  leader_id: string | null
  co_leader_id: string | null
  meeting_day: string | null
  meeting_time: string | null
  meeting_location: string | null
  meeting_frequency: string | null
  max_members: number | null
  is_open: boolean
  is_active: boolean
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  profile_id: string
  church_id: string
  joined_at: string
  role_in_group: string | null
  is_active: boolean
}

// ============================================================
// VISITOR (forward declaration)
// ============================================================

export interface Visitor {
  id: string
  church_id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  age_range: string | null
  occupation: string | null
  how_heard: string | null
  visited_at: string
  status: 'new' | 'assigned' | 'contacted' | 'converted' | 'inactive'
  assigned_to: string | null
  contacted_at: string | null
  contact_notes: string | null
  escalated_at: string | null
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  error: string
  message: string
  status: number
}

// ============================================================
// AUTH TYPES
// ============================================================

export interface AuthUser {
  id: string
  email: string
  profile: Profile
  church: Church
}

// ============================================================
// NAVIGATION
// ============================================================

export interface NavItem {
  label: string
  label_ar: string
  href: string
  icon: string
  roles: UserRole[]
  badge?: number
}
