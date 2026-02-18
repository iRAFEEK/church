// ============================================================
// EKKLESIA — Core TypeScript Types
// Mirrors the database schema exactly
// ============================================================

export type UserRole = 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'
export type UserStatus = 'active' | 'inactive' | 'at_risk' | 'visitor'
export type NotificationPref = 'whatsapp' | 'sms' | 'email' | 'all' | 'none'
export type GenderType = 'male' | 'female'
export type MilestoneType = 'baptism' | 'salvation' | 'bible_plan_completed' | 'leadership_training' | 'marriage' | 'other'
export type VisitorStatus = 'new' | 'assigned' | 'contacted' | 'converted' | 'lost'
export type AgeRange = 'under_18' | '18_25' | '26_35' | '36_45' | '46_55' | '56_plus'
export type HowHeard = 'friend' | 'social_media' | 'website' | 'event' | 'walk_in' | 'other'
export type GroupType = 'small_group' | 'youth' | 'women' | 'men' | 'family' | 'prayer' | 'other'
export type MeetingFrequency = 'weekly' | 'biweekly' | 'monthly' | 'irregular'
export type GroupMemberRole = 'member' | 'leader' | 'co_leader'
export type GatheringStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late'
export type PrayerStatus = 'active' | 'answered' | 'archived'

// ============================================================
// PHASE 3 TYPES
// ============================================================

export interface Gathering {
  id: string
  group_id: string
  church_id: string
  scheduled_at: string
  actual_start: string | null
  location: string | null
  location_ar: string | null
  topic: string | null
  topic_ar: string | null
  notes: string | null
  status: GatheringStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  gathering_id: string
  group_id: string
  profile_id: string
  church_id: string
  status: AttendanceStatus
  excuse_reason: string | null
  marked_by: string | null
  marked_at: string
}

export interface PrayerRequest {
  id: string
  gathering_id: string | null
  group_id: string
  church_id: string
  submitted_by: string
  content: string
  is_private: boolean
  status: PrayerStatus
  resolved_at: string | null
  resolved_notes: string | null
  created_at: string
  updated_at: string
}

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
// PHASE 2 TYPES
// ============================================================

export interface Visitor {
  id: string
  church_id: string
  first_name: string
  last_name: string
  first_name_ar: string | null
  last_name_ar: string | null
  phone: string | null
  email: string | null
  age_range: AgeRange | null
  occupation: string | null
  how_heard: HowHeard | null
  visited_at: string
  status: VisitorStatus
  assigned_to: string | null
  contacted_at: string | null
  contact_notes: string | null
  escalated_at: string | null
  converted_to: string | null
  created_at: string
  updated_at: string
}

export interface Ministry {
  id: string
  church_id: string
  name: string
  name_ar: string | null
  leader_id: string | null
  description: string | null
  description_ar: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  church_id: string
  ministry_id: string | null
  name: string
  name_ar: string | null
  type: GroupType
  leader_id: string | null
  co_leader_id: string | null
  meeting_day: string | null
  meeting_time: string | null
  meeting_location: string | null
  meeting_location_ar: string | null
  meeting_frequency: MeetingFrequency
  max_members: number | null
  is_open: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  profile_id: string
  church_id: string
  role_in_group: GroupMemberRole
  joined_at: string
  is_active: boolean
}

// ============================================================
// PHASE 6: SONGS
// ============================================================

export interface SongDisplaySettings {
  bg_color: string
  bg_image: string | null
  text_color: string
  font_family: 'sans' | 'serif' | 'mono' | 'arabic'
  font_size: number
}

export interface Song {
  id: string
  church_id: string
  created_by: string | null
  title: string
  title_ar: string | null
  artist: string | null
  artist_ar: string | null
  lyrics: string | null
  lyrics_ar: string | null
  tags: string[]
  display_settings: SongDisplaySettings
  is_active: boolean
  created_at: string
  updated_at: string
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
