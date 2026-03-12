-- ============================================================
-- Reassign church_needs and responses to the correct new admin users
-- so cross-church communication can be tested properly
-- ============================================================

DO $$
DECLARE
  v_church1_id UUID;
  v_church2_id UUID;
  v_church3_id UUID;
  v_admin1_id  UUID; -- pastor@gracechurch.test
  v_admin2_id  UUID := 'c0000000-0000-0000-0000-000000000002'; -- admin@gracecairo.org
  v_admin3_id  UUID := 'c0000000-0000-0000-0000-000000000003'; -- admin@hopebeirut.org
BEGIN
  SELECT id INTO v_church1_id FROM churches ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_church2_id FROM churches WHERE name = 'Grace Church Cairo' LIMIT 1;
  SELECT id INTO v_church3_id FROM churches WHERE name = 'Hope Church Beirut' LIMIT 1;
  SELECT id INTO v_admin1_id FROM auth.users WHERE email = 'pastor@gracechurch.test' LIMIT 1;

  -- Fix created_by on needs: each church's needs should be created by that church's admin
  UPDATE church_needs SET created_by = v_admin1_id WHERE church_id = v_church1_id;
  UPDATE church_needs SET created_by = v_admin2_id WHERE church_id = v_church2_id;
  UPDATE church_needs SET created_by = v_admin3_id WHERE church_id = v_church3_id;

  -- Fix responder_user_id on responses: each response should be from the responding church's admin
  UPDATE church_need_responses SET responder_user_id = v_admin2_id WHERE responder_church_id = v_church2_id;
  UPDATE church_need_responses SET responder_user_id = v_admin3_id WHERE responder_church_id = v_church3_id;
  UPDATE church_need_responses SET responder_user_id = v_admin1_id WHERE responder_church_id = v_church1_id;

  RAISE NOTICE 'Reassigned needs and responses:';
  RAISE NOTICE '  Church 1 (%) needs → pastor@gracechurch.test (%)', v_church1_id, v_admin1_id;
  RAISE NOTICE '  Church 2 (%) needs → admin@gracecairo.org (%)', v_church2_id, v_admin2_id;
  RAISE NOTICE '  Church 3 (%) needs → admin@hopebeirut.org (%)', v_church3_id, v_admin3_id;
END $$;
