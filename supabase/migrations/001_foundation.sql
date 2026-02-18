-- ============================================================
-- EKKLESIA — Phase 1 Foundation Migration (idempotent)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS (idempotent via DO block)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('member','group_leader','ministry_leader','super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active','inactive','at_risk','visitor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_pref AS ENUM ('whatsapp','sms','email','all','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male','female');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE milestone_type AS ENUM ('baptism','salvation','bible_plan_completed','leadership_training','marriage','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- CHURCHES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS churches (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  name_ar             TEXT,
  country             TEXT NOT NULL DEFAULT 'Lebanon',
  timezone            TEXT NOT NULL DEFAULT 'Asia/Beirut',
  primary_language    TEXT NOT NULL DEFAULT 'ar',
  welcome_message     TEXT,
  welcome_message_ar  TEXT,
  visitor_sla_hours   INTEGER NOT NULL DEFAULT 48,
  logo_url            TEXT,
  primary_color       TEXT DEFAULT '#18181b',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  church_id             UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  first_name            TEXT,
  last_name             TEXT,
  first_name_ar         TEXT,
  last_name_ar          TEXT,
  phone                 TEXT,
  email                 TEXT,
  date_of_birth         DATE,
  gender                gender_type,
  occupation            TEXT,
  occupation_ar         TEXT,
  photo_url             TEXT,
  role                  user_role NOT NULL DEFAULT 'member',
  status                user_status NOT NULL DEFAULT 'active',
  joined_church_at      DATE,
  invited_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notification_pref     notification_pref NOT NULL DEFAULT 'whatsapp',
  preferred_language    TEXT NOT NULL DEFAULT 'ar',
  onboarding_completed  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILE MILESTONES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS profile_milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  type        milestone_type NOT NULL DEFAULT 'other',
  title       TEXT NOT NULL,
  title_ar    TEXT,
  date        DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_churches_updated_at ON churches;
CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON AUTH USER CREATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, church_id, email, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'church_id')::UUID,
      (SELECT id FROM public.churches WHERE is_active = true ORDER BY created_at LIMIT 1)
    ),
    NEW.email,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_milestones ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED: CREATE INITIAL CHURCH (only if none exists)
-- ============================================================

INSERT INTO churches (name, name_ar, country, timezone, primary_language, welcome_message, welcome_message_ar, visitor_sla_hours)
SELECT
  'My Church',
  'كنيستي',
  'Lebanon',
  'Asia/Beirut',
  'ar',
  'Welcome to our church family! Someone from our team will reach out to you soon.',
  'أهلاً وسهلاً في عائلتنا الكنسية! سيتواصل معك أحد أعضاء فريقنا قريباً.',
  48
WHERE NOT EXISTS (SELECT 1 FROM churches LIMIT 1);

-- ============================================================
-- STORAGE BUCKETS (idempotent)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('church-assets', 'church-assets', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('profile-photos', 'profile-photos', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
