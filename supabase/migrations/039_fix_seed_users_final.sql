-- ============================================================
-- Final fix: verify seed user data + reload PostgREST schema cache
-- ============================================================

-- Force PostgREST to reload schema (picks up new tables from 035)
NOTIFY pgrst, 'reload schema';

-- Verify and fix profiles for seed users
-- The handle_new_user trigger may have set wrong church_id (defaults to first church)
DO $$
DECLARE
  v_church2_id UUID;
  v_church3_id UUID;
  v_admin2_id  UUID;
  v_admin3_id  UUID;
BEGIN
  SELECT id INTO v_church2_id FROM churches WHERE name = 'Grace Church Cairo' LIMIT 1;
  SELECT id INTO v_church3_id FROM churches WHERE name = 'Hope Church Beirut' LIMIT 1;
  SELECT id INTO v_admin2_id FROM auth.users WHERE email = 'admin@gracecairo.org' LIMIT 1;
  SELECT id INTO v_admin3_id FROM auth.users WHERE email = 'admin@hopebeirut.org' LIMIT 1;

  IF v_admin2_id IS NULL OR v_admin3_id IS NULL THEN
    RAISE NOTICE 'Seed users not found — skipping';
    RETURN;
  END IF;

  IF v_church2_id IS NULL OR v_church3_id IS NULL THEN
    RAISE NOTICE 'Seed churches not found — skipping';
    RETURN;
  END IF;

  -- Ensure profiles have correct church_id, role, and onboarding status
  UPDATE profiles SET
    church_id = v_church2_id,
    first_name = COALESCE(NULLIF(first_name, ''), 'Mina'),
    last_name = COALESCE(NULLIF(last_name, ''), 'Gerges'),
    first_name_ar = COALESCE(first_name_ar, 'مينا'),
    last_name_ar = COALESCE(last_name_ar, 'جرجس'),
    email = 'admin@gracecairo.org',
    role = 'super_admin',
    status = 'active',
    onboarding_completed = true,
    preferred_language = 'ar'
  WHERE id = v_admin2_id;

  UPDATE profiles SET
    church_id = v_church3_id,
    first_name = COALESCE(NULLIF(first_name, ''), 'Georges'),
    last_name = COALESCE(NULLIF(last_name, ''), 'Haddad'),
    first_name_ar = COALESCE(first_name_ar, 'جورج'),
    last_name_ar = COALESCE(last_name_ar, 'حداد'),
    email = 'admin@hopebeirut.org',
    role = 'super_admin',
    status = 'active',
    onboarding_completed = true,
    preferred_language = 'ar'
  WHERE id = v_admin3_id;

  -- Ensure user_churches entries exist
  INSERT INTO user_churches (user_id, church_id, role) VALUES
    (v_admin2_id, v_church2_id, 'super_admin'),
    (v_admin3_id, v_church3_id, 'super_admin')
  ON CONFLICT DO NOTHING;

  -- Log current state for debugging
  RAISE NOTICE 'admin@gracecairo.org (%) → church %', v_admin2_id, v_church2_id;
  RAISE NOTICE 'admin@hopebeirut.org (%) → church %', v_admin3_id, v_church3_id;

  -- Verify profile state
  PERFORM 1 FROM profiles WHERE id = v_admin2_id AND church_id = v_church2_id AND role = 'super_admin' AND onboarding_completed = true;
  IF NOT FOUND THEN
    RAISE WARNING 'Profile for admin@gracecairo.org is NOT correct!';
  ELSE
    RAISE NOTICE 'Profile for admin@gracecairo.org verified OK';
  END IF;

  PERFORM 1 FROM profiles WHERE id = v_admin3_id AND church_id = v_church3_id AND role = 'super_admin' AND onboarding_completed = true;
  IF NOT FOUND THEN
    RAISE WARNING 'Profile for admin@hopebeirut.org is NOT correct!';
  ELSE
    RAISE NOTICE 'Profile for admin@hopebeirut.org verified OK';
  END IF;
END $$;
