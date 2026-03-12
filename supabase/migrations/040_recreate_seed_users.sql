-- ============================================================
-- Nuclear fix: delete and recreate seed users from scratch
-- using the exact same pattern as the working gracechurch.test accounts
-- ============================================================

DO $$
DECLARE
  v_church2_id UUID;
  v_church3_id UUID;
  v_old_admin2 UUID;
  v_old_admin3 UUID;
  v_new_admin2 UUID := 'c0000000-0000-0000-0000-000000000002';
  v_new_admin3 UUID := 'c0000000-0000-0000-0000-000000000003';
  v_fallback_admin UUID;
BEGIN
  SELECT id INTO v_church2_id FROM churches WHERE name = 'Grace Church Cairo' LIMIT 1;
  SELECT id INTO v_church3_id FROM churches WHERE name = 'Hope Church Beirut' LIMIT 1;
  SELECT id INTO v_old_admin2 FROM auth.users WHERE email = 'admin@gracecairo.org' LIMIT 1;
  SELECT id INTO v_old_admin3 FROM auth.users WHERE email = 'admin@hopebeirut.org' LIMIT 1;

  -- Get the existing working admin to temporarily hold FK references
  SELECT id INTO v_fallback_admin FROM auth.users WHERE email = 'pastor@gracechurch.test' LIMIT 1;

  IF v_old_admin2 IS NULL AND v_old_admin3 IS NULL THEN
    RAISE NOTICE 'No old users found — creating fresh';
  END IF;

  -- Step 1: Reassign church_needs.created_by to fallback admin temporarily
  IF v_old_admin2 IS NOT NULL THEN
    UPDATE church_needs SET created_by = v_fallback_admin WHERE created_by = v_old_admin2;
    UPDATE church_need_responses SET responder_user_id = v_fallback_admin WHERE responder_user_id = v_old_admin2;
  END IF;
  IF v_old_admin3 IS NOT NULL THEN
    UPDATE church_needs SET created_by = v_fallback_admin WHERE created_by = v_old_admin3;
    UPDATE church_need_responses SET responder_user_id = v_fallback_admin WHERE responder_user_id = v_old_admin3;
  END IF;

  -- Step 2: Delete old user_churches, profiles, identities, then auth.users
  DELETE FROM user_churches WHERE user_id IN (v_old_admin2, v_old_admin3);
  DELETE FROM profiles WHERE id IN (v_old_admin2, v_old_admin3);
  DELETE FROM auth.identities WHERE user_id IN (v_old_admin2, v_old_admin3);
  DELETE FROM auth.users WHERE id IN (v_old_admin2, v_old_admin3);

  -- Step 3: Create fresh auth.users (exact same pattern as seed_data.sql)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
  VALUES
    (v_new_admin2, '00000000-0000-0000-0000-000000000000',
     'admin@gracecairo.org',
     '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
     now(), 'authenticated', 'authenticated',
     now() - interval '1 year', now(),
     '{"provider":"email","providers":["email"]}',
     '{"email_verified":true}',
     '', '', '', '', '', '', '', ''),
    (v_new_admin3, '00000000-0000-0000-0000-000000000000',
     'admin@hopebeirut.org',
     '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
     now(), 'authenticated', 'authenticated',
     now() - interval '1 year', now(),
     '{"provider":"email","providers":["email"]}',
     '{"email_verified":true}',
     '', '', '', '', '', '', '', '');

  -- Step 4: Create auth.identities (exact same pattern as seed_data.sql)
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  SELECT gen_random_uuid(), id, id::text, 'email',
    jsonb_build_object('sub', id::text, 'email', email, 'email_verified', false, 'phone_verified', false),
    now(), now(), now()
  FROM auth.users
  WHERE email IN ('admin@gracecairo.org', 'admin@hopebeirut.org');

  -- Step 5: Update auto-created profiles (handle_new_user trigger fires on insert)
  UPDATE profiles SET
    church_id = v_church2_id, first_name = 'Mina', last_name = 'Gerges',
    first_name_ar = 'مينا', last_name_ar = 'جرجس',
    role = 'super_admin', status = 'active', onboarding_completed = true, preferred_language = 'ar'
  WHERE id = v_new_admin2;

  UPDATE profiles SET
    church_id = v_church3_id, first_name = 'Georges', last_name = 'Haddad',
    first_name_ar = 'جورج', last_name_ar = 'حداد',
    role = 'super_admin', status = 'active', onboarding_completed = true, preferred_language = 'ar'
  WHERE id = v_new_admin3;

  -- Step 6: Create user_churches entries
  INSERT INTO user_churches (user_id, church_id, role) VALUES
    (v_new_admin2, v_church2_id, 'super_admin'),
    (v_new_admin3, v_church3_id, 'super_admin')
  ON CONFLICT DO NOTHING;

  -- Step 7: Reassign church_needs and responses back to the new users
  UPDATE church_needs SET created_by = v_new_admin2 WHERE church_id = v_church2_id AND created_by = v_fallback_admin;
  UPDATE church_needs SET created_by = v_new_admin3 WHERE church_id = v_church3_id AND created_by = v_fallback_admin;
  UPDATE church_need_responses SET responder_user_id = v_new_admin2 WHERE responder_church_id = v_church2_id AND responder_user_id = v_fallback_admin;
  UPDATE church_need_responses SET responder_user_id = v_new_admin3 WHERE responder_church_id = v_church3_id AND responder_user_id = v_fallback_admin;

  RAISE NOTICE 'Recreated seed users:';
  RAISE NOTICE '  admin@gracecairo.org (%) → church %', v_new_admin2, v_church2_id;
  RAISE NOTICE '  admin@hopebeirut.org (%) → church %', v_new_admin3, v_church3_id;
END $$;

NOTIFY pgrst, 'reload schema';
