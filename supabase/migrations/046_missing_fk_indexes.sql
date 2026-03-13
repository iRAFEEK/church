-- Add missing FK indexes for columns that lack them
-- Scale trigger: 500+ members per church causes slow JOINs on unindexed FKs
--
-- Audit of all 14 FK columns listed in P3-14:
--
-- Already indexed (no action needed):
--   group_members.profile_id   → idx_group_members_profile (022)
--   attendance.profile_id      → idx_attendance_profile (022)
--   attendance.gathering_id    → idx_attendance_gathering_id (005)
--   donations.donor_id         → idx_donations_donor (030)
--   donations.fund_id          → idx_donations_fund (030)
--   donations.campaign_id      → idx_donations_campaign (030)
--   notifications_log.profile_id → idx_notifications_profile_status (006)
--   serving_signups.profile_id → idx_serving_signups_profile (009)
--   serving_signups.slot_id    → idx_serving_signups_slot (022)
--   event_registrations.profile_id → idx_event_registrations_profile (007)
--   event_service_assignments.profile_id → idx_event_service_assignments_profile (022)
--   pledges.donor_id           → idx_pledges_donor (030)
--   expense_requests.requested_by → idx_expense_req_requester (030)
--
-- Missing (adding now):
--   ministry_members.profile_id — no index exists

CREATE INDEX IF NOT EXISTS idx_ministry_members_profile
  ON ministry_members (profile_id);
