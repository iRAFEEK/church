-- ============================================================
-- EKKLESIA — Test Data Seed
-- Run AFTER 001 and 002 migrations
-- ⚠️ Only run in development — do NOT run in production
-- ============================================================

-- NOTE: To create test users, use Supabase Dashboard > Authentication > Users
-- Add users with these emails, then update the profile rows below with their UUIDs.

-- After creating users in Supabase Auth, update their profiles:
-- Replace 'REPLACE_WITH_SUPER_ADMIN_UUID', 'REPLACE_WITH_LEADER_UUID', 'REPLACE_WITH_MEMBER_UUID'
-- with the actual UUIDs from Supabase Auth.

-- Get the church ID
DO $$
DECLARE
  v_church_id UUID;
BEGIN
  SELECT id INTO v_church_id FROM churches LIMIT 1;

  -- Update super_admin profile (create user in Supabase Auth first)
  -- UPDATE profiles SET
  --   first_name = 'Admin',
  --   last_name = 'User',
  --   first_name_ar = 'مدير',
  --   last_name_ar = 'النظام',
  --   role = 'super_admin',
  --   status = 'active',
  --   onboarding_completed = true,
  --   joined_church_at = CURRENT_DATE
  -- WHERE id = 'REPLACE_WITH_SUPER_ADMIN_UUID';

  -- Add a sample milestone
  -- INSERT INTO profile_milestones (profile_id, church_id, type, title, title_ar, date, notes)
  -- VALUES (
  --   'REPLACE_WITH_MEMBER_UUID',
  --   v_church_id,
  --   'baptism',
  --   'Water Baptism',
  --   'معمودية الماء',
  --   '2024-01-15',
  --   'Baptized at Sunday service'
  -- );

  RAISE NOTICE 'Church ID: %', v_church_id;
  RAISE NOTICE 'Seed script ready. Create users in Supabase Auth dashboard, then uncomment and update the UUIDs above.';
END $$;
