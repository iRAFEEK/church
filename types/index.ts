// ============================================================
// EKKLESIA — Core TypeScript Types
// Mirrors the database schema exactly
// ============================================================

export type UserRole = 'member' | 'group_leader' | 'ministry_leader' | 'super_admin'

// ============================================================
// PERMISSIONS
// ============================================================

export type PermissionKey =
  | 'can_view_members'
  | 'can_manage_members'
  | 'can_view_visitors'
  | 'can_manage_visitors'
  | 'can_manage_events'
  | 'can_manage_templates'
  | 'can_manage_serving'
  | 'can_manage_announcements'
  | 'can_view_reports'
  | 'can_manage_songs'
  | 'can_view_prayers'
  | 'can_manage_outreach'

export type PermissionMap = Partial<Record<PermissionKey, boolean>>
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
  group_id: string | null
  church_id: string
  submitted_by: string
  content: string
  is_private: boolean
  is_anonymous: boolean
  status: PrayerStatus
  resolved_at: string | null
  resolved_notes: string | null
  assigned_to: string | null
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
  denomination: string | null
  welcome_message: string | null
  welcome_message_ar: string | null
  visitor_sla_hours: number
  logo_url: string | null
  primary_color: string
  default_bible_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// CHURCH LEADERS
// ============================================================

export interface ChurchLeader {
  id: string
  church_id: string
  name: string
  name_ar: string | null
  title: string
  title_ar: string | null
  photo_url: string | null
  bio: string | null
  bio_ar: string | null
  display_order: number
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

  // Address
  address: string | null
  address_ar: string | null
  city: string | null
  city_ar: string | null
  address_notes: string | null

  // Preferences
  notification_pref: NotificationPref
  preferred_language: string
  preferred_bible_id: string | null

  // Onboarding
  onboarding_completed: boolean

  // Permissions (JSONB — null means use role defaults)
  permissions: PermissionMap | null

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
  photo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MinistryMember {
  id: string
  ministry_id: string
  profile_id: string
  church_id: string
  role_in_ministry: GroupMemberRole
  joined_at: string
  is_active: boolean
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
// PHASE 5: ANNOUNCEMENTS & SERVING
// ============================================================

export type AnnouncementStatus = 'draft' | 'published' | 'archived'
export type ServingSignupStatus = 'signed_up' | 'confirmed' | 'cancelled'

export interface Announcement {
  id: string
  church_id: string
  created_by: string | null
  title: string
  title_ar: string | null
  body: string | null
  body_ar: string | null
  status: AnnouncementStatus
  is_pinned: boolean
  expires_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ServingArea {
  id: string
  church_id: string
  ministry_id: string | null
  name: string
  name_ar: string | null
  description: string | null
  description_ar: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServingSlot {
  id: string
  serving_area_id: string
  church_id: string
  title: string
  title_ar: string | null
  date: string
  start_time: string | null
  end_time: string | null
  max_volunteers: number | null
  notes: string | null
  notes_ar: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ServingSignup {
  id: string
  slot_id: string
  church_id: string
  profile_id: string
  status: ServingSignupStatus
  signed_up_at: string
  cancelled_at: string | null
}

// ============================================================
// PHASE 7: BIBLE READER
// ============================================================

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange'

export interface BibleBookmark {
  id: string
  profile_id: string
  church_id: string
  bible_id: string
  book_id: string
  chapter_id: string
  verse_id: string | null
  reference_label: string
  reference_label_ar: string | null
  note: string | null
  created_at: string
}

export interface BibleHighlight {
  id: string
  profile_id: string
  church_id: string
  bible_id: string
  book_id: string
  chapter_id: string
  verse_id: string
  reference_label: string
  reference_label_ar: string | null
  color: HighlightColor
  created_at: string
}

export interface ApiBible {
  id: string
  name: string
  nameLocal: string
  language: { id: string; name: string; nameLocal: string }
  abbreviation: string
  abbreviationLocal: string
  description: string
  descriptionLocal: string
}

export interface ApiBibleBook {
  id: string
  bibleId: string
  abbreviation: string
  name: string
  nameLong: string
}

export interface ApiBibleChapter {
  id: string
  bibleId: string
  bookId: string
  number: string
  reference: string
}

export interface ApiBibleChapterContent {
  id: string
  bibleId: string
  bookId: string
  number: string
  reference: string
  content: string
  verseCount: number
  copyright: string
}

export interface ApiBibleVerse {
  id: string
  orgId: string
  bibleId: string
  bookId: string
  chapterId: string
  reference: string
  content: string
  copyright: string
}

// ============================================================
// EVENT SERVICE PLANNING
// ============================================================

export type EventAssignmentStatus = 'assigned' | 'confirmed' | 'declined'

export interface RolePreset {
  role: string
  role_ar: string
  count: number
}

export interface CustomFieldDefinition {
  id: string
  label: string
  label_ar: string
  type: 'text' | 'number' | 'select' | 'boolean'
  options?: string[]
  required: boolean
}

export interface EventServiceNeed {
  id: string
  event_id: string
  church_id: string
  ministry_id: string | null
  group_id: string | null
  volunteers_needed: number
  notes: string | null
  notes_ar: string | null
  role_presets: RolePreset[] | null
  created_at: string
  updated_at: string
}

export interface EventServiceAssignment {
  id: string
  service_need_id: string
  church_id: string
  profile_id: string
  assigned_by: string | null
  status: EventAssignmentStatus
  status_changed_at: string | null
  notes: string | null
  role: string | null
  role_ar: string | null
  created_at: string
  updated_at: string
}

export interface EventServiceNeedWithDetails extends EventServiceNeed {
  ministry?: { id: string; name: string; name_ar: string | null; leader_id: string | null }
  group?: { id: string; name: string; name_ar: string | null; leader_id: string | null; co_leader_id: string | null }
  assignments: EventServiceAssignmentWithProfile[]
  assigned_count: number
}

export interface EventServiceAssignmentWithProfile extends EventServiceAssignment {
  profile: {
    id: string
    first_name: string | null
    last_name: string | null
    first_name_ar: string | null
    last_name_ar: string | null
    photo_url: string | null
    phone: string | null
  }
}

// ============================================================
// EVENT TEMPLATES & SEGMENTS
// ============================================================

export interface EventTemplate {
  id: string
  church_id: string
  name: string
  name_ar: string | null
  event_type: string
  title: string
  title_ar: string | null
  description: string | null
  description_ar: string | null
  location: string | null
  capacity: number | null
  is_public: boolean
  registration_required: boolean
  notes: string | null
  notes_ar: string | null
  is_active: boolean
  created_by: string | null
  recurrence_type: 'none' | 'weekly' | 'biweekly' | 'monthly'
  recurrence_day: number | null
  default_start_time: string | null
  default_end_time: string | null
  custom_fields: CustomFieldDefinition[]
  created_at: string
  updated_at: string
}

export interface EventTemplateNeed {
  id: string
  template_id: string
  church_id: string
  ministry_id: string | null
  group_id: string | null
  volunteers_needed: number
  notes: string | null
  notes_ar: string | null
  role_presets: RolePreset[] | null
}

export interface EventTemplateSegment {
  id: string
  template_id: string
  church_id: string
  title: string
  title_ar: string | null
  duration_minutes: number | null
  ministry_id: string | null
  assigned_to: string | null
  notes: string | null
  notes_ar: string | null
  sort_order: number
}

export interface EventSegment {
  id: string
  event_id: string
  church_id: string
  title: string
  title_ar: string | null
  duration_minutes: number | null
  ministry_id: string | null
  assigned_to: string | null
  notes: string | null
  notes_ar: string | null
  sort_order: number
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
  resolvedPermissions: Record<PermissionKey, boolean>
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

// ============================================================
// INVOLVEMENT TRACKING
// ============================================================

export interface InvolvementStats {
  totalEventsServed: number
  totalConfirmed: number
  totalDeclined: number
  totalServingSignups: number
  activeGroups: number
  activeMinistries: number
  eventsRegistered: number
}

export interface InvolvementServiceAssignment {
  id: string
  status: EventAssignmentStatus
  role: string | null
  role_ar: string | null
  created_at: string
  status_changed_at: string | null
  event_title: string
  event_title_ar: string | null
  event_starts_at: string
  event_ends_at: string | null
  event_location: string | null
  event_status: string
  event_id: string
  ministry_name: string | null
  ministry_name_ar: string | null
  group_name: string | null
  group_name_ar: string | null
}

export interface InvolvementServingSignup {
  id: string
  status: ServingSignupStatus
  signed_up_at: string
  cancelled_at: string | null
  slot_title: string
  slot_title_ar: string | null
  slot_date: string
  slot_start_time: string | null
  slot_end_time: string | null
  area_name: string | null
  area_name_ar: string | null
}

export interface InvolvementGroupMembership {
  id: string
  role_in_group: GroupMemberRole
  joined_at: string
  is_active: boolean
  group_id: string
  group_name: string
  group_name_ar: string | null
  group_type: GroupType
  ministry_name: string | null
  ministry_name_ar: string | null
}

export interface InvolvementMinistryMembership {
  id: string
  role_in_ministry: GroupMemberRole
  joined_at: string
  is_active: boolean
  ministry_id: string
  ministry_name: string
  ministry_name_ar: string | null
}

export interface InvolvementEventRegistration {
  id: string
  status: string
  registered_at: string
  check_in_at: string | null
  event_id: string
  event_title: string
  event_title_ar: string | null
  event_starts_at: string
  event_location: string | null
}

export interface MemberInvolvementData {
  stats: InvolvementStats
  serviceAssignments: InvolvementServiceAssignment[]
  servingSignups: InvolvementServingSignup[]
  groupMemberships: InvolvementGroupMembership[]
  ministryMemberships: InvolvementMinistryMembership[]
  eventRegistrations: InvolvementEventRegistration[]
}

// ============================================================
// PERMISSION MANAGEMENT
// ============================================================

export interface RolePermissionDefaults {
  id: string
  church_id: string
  role: UserRole
  permissions: PermissionMap
  updated_at: string
  updated_by: string | null
}

export interface PermissionAuditLog {
  id: string
  church_id: string
  changed_by: string
  target_id: string | null
  target_role: UserRole | null
  change_type: 'user_override' | 'role_default'
  old_value: PermissionMap | null
  new_value: PermissionMap
  created_at: string
}

export interface ServingAreaLeader {
  id: string
  serving_area_id: string
  profile_id: string
  church_id: string
  created_at: string
}

export interface EventVisibilityTarget {
  id: string
  event_id: string
  target_type: 'ministry' | 'group'
  target_id: string
}

// ============================================================
// OUTREACH
// ============================================================

export interface OutreachVisit {
  id: string
  church_id: string
  profile_id: string
  visited_by: string
  visit_date: string
  notes: string | null
  needs_followup: boolean
  followup_date: string | null
  followup_notes: string | null
  created_at: string
  updated_at: string
}

export interface OutreachMemberSummary {
  profile_id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  phone: string | null
  address: string | null
  address_ar: string | null
  city: string | null
  city_ar: string | null
  photo_url: string | null
  last_visit_date: string | null
  needs_followup: boolean
  total_visits: number
}
