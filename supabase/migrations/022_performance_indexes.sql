-- Performance indexes for common query patterns
-- These indexes target the most frequently filtered columns across all queries

-- Profiles: filtered by church_id + status in dashboard, audience resolution, member lists
CREATE INDEX IF NOT EXISTS idx_profiles_church_status ON profiles (church_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_church_role ON profiles (church_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_church_onboarding ON profiles (church_id, onboarding_completed);

-- Visitors: filtered by church_id + status in dashboard, visitor queue, audience
CREATE INDEX IF NOT EXISTS idx_visitors_church_status ON visitors (church_id, status);
CREATE INDEX IF NOT EXISTS idx_visitors_church_visited_at ON visitors (church_id, visited_at);

-- Groups: filtered by church_id + is_active, ministry_id
CREATE INDEX IF NOT EXISTS idx_groups_church_active ON groups (church_id, is_active);
CREATE INDEX IF NOT EXISTS idx_groups_ministry ON groups (ministry_id) WHERE ministry_id IS NOT NULL;

-- Group members: filtered by church_id + group_id + is_active in audience, member lists
CREATE INDEX IF NOT EXISTS idx_group_members_group_active ON group_members (group_id, is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_church_active ON group_members (church_id, is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_profile ON group_members (profile_id);

-- Attendance: heavily queried in dashboards with gatherings join
CREATE INDEX IF NOT EXISTS idx_attendance_church_group ON attendance (church_id, group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_profile ON attendance (profile_id);
CREATE INDEX IF NOT EXISTS idx_attendance_profile_status ON attendance (profile_id, status);

-- Gatherings: filtered by church_id + status + scheduled_at in dashboard
CREATE INDEX IF NOT EXISTS idx_gatherings_church_status_date ON gatherings (church_id, status, scheduled_at);

-- Events: filtered by church_id + status + starts_at
CREATE INDEX IF NOT EXISTS idx_events_church_status ON events (church_id, status);
CREATE INDEX IF NOT EXISTS idx_events_church_starts_at ON events (church_id, starts_at);

-- Event service needs/assignments: filtered by event_id
CREATE INDEX IF NOT EXISTS idx_event_service_needs_event ON event_service_needs (event_id);
CREATE INDEX IF NOT EXISTS idx_event_service_assignments_church ON event_service_assignments (church_id);
CREATE INDEX IF NOT EXISTS idx_event_service_assignments_need ON event_service_assignments (need_id);
CREATE INDEX IF NOT EXISTS idx_event_service_assignments_profile ON event_service_assignments (profile_id);

-- Notifications: filtered by recipient + read status
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_church ON notifications (church_id);

-- Serving: filtered by church_id + date
CREATE INDEX IF NOT EXISTS idx_serving_slots_church_date ON serving_slots (church_id, date);
CREATE INDEX IF NOT EXISTS idx_serving_signups_slot ON serving_signups (slot_id);

-- Songs: filtered by church_id + is_active
CREATE INDEX IF NOT EXISTS idx_songs_church_active ON songs (church_id, is_active);

-- Announcements: filtered by church_id + status
CREATE INDEX IF NOT EXISTS idx_announcements_church_status ON announcements (church_id, status);

-- Ministries: filtered by church_id + is_active
CREATE INDEX IF NOT EXISTS idx_ministries_church_active ON ministries (church_id, is_active);

-- Bible highlights/bookmarks: filtered by profile_id + church_id
CREATE INDEX IF NOT EXISTS idx_bible_highlights_profile ON bible_highlights (profile_id, church_id);
CREATE INDEX IF NOT EXISTS idx_bible_bookmarks_profile ON bible_bookmarks (profile_id, church_id);

-- Profile milestones
CREATE INDEX IF NOT EXISTS idx_profile_milestones_profile ON profile_milestones (profile_id);

-- Event templates
CREATE INDEX IF NOT EXISTS idx_event_templates_church ON event_templates (church_id, is_active);
CREATE INDEX IF NOT EXISTS idx_event_template_needs_template ON event_template_needs (template_id);
CREATE INDEX IF NOT EXISTS idx_event_template_segments_template ON event_template_segments (template_id);

-- Event segments
CREATE INDEX IF NOT EXISTS idx_event_segments_event ON event_segments (event_id);
