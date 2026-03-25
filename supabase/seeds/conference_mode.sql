-- ============================================================
-- Seed: Conference Mode — Feature Testing Data
-- Run:  supabase db execute --file supabase/seeds/conference_mode.sql
-- Or:   psql $DATABASE_URL -f supabase/seeds/conference_mode.sql
--
-- Creates a full "Grace Annual Conference 2026" on Grace Church
-- (the first/primary test church). Covers:
--   - Conference event with conference_mode = true
--   - 7 board columns (rooms/stages)
--   - 15 board cards (ministry units per room)
--   - 3-level area hierarchy (3 L1 → 8 L2 → 12 L3 teams)
--   - Team members assigned from existing profiles
--   - Tasks: open, in_progress, blocked, done, overdue, critical
--   - Resources: equipment, supply, food, transport — all statuses
--   - Broadcasts: urgent, team-scoped, all-event + read receipts
-- ============================================================

-- ── Safety guard ────────────────────────────────────────────
DO $$
DECLARE
  v_church_id UUID;
BEGIN
  SELECT id INTO v_church_id FROM churches ORDER BY created_at ASC LIMIT 1;
  IF v_church_id IS NULL THEN
    RAISE EXCEPTION 'No church found. Run base seed migrations first.';
  END IF;
END $$;

-- ── Main seed block ─────────────────────────────────────────
DO $$
DECLARE
  -- ── Church & admin ─────────────────────────────────────
  v_church_id       UUID;
  v_admin_id        UUID;    -- super_admin of the primary church
  v_leader_id       UUID;    -- first ministry_leader
  v_leader2_id      UUID;    -- second ministry_leader (if exists)
  v_gl1_id          UUID;    -- group_leader 1
  v_gl2_id          UUID;    -- group_leader 2
  v_m1_id           UUID;    -- member 1
  v_m2_id           UUID;    -- member 2
  v_m3_id           UUID;    -- member 3
  v_m4_id           UUID;    -- member 4
  v_m5_id           UUID;    -- member 5

  -- ── Event ──────────────────────────────────────────────
  v_event_id        UUID;

  -- ── Board columns ──────────────────────────────────────
  v_col_main        UUID;
  v_col_prayer      UUID;
  v_col_kids        UUID;
  v_col_sports      UUID;
  v_col_reg         UUID;
  v_col_media       UUID;
  v_col_hosp        UUID;

  -- ── Board cards ────────────────────────────────────────
  v_card_worship    UUID;
  v_card_preaching  UUID;
  v_card_sound      UUID;
  v_card_interc     UUID;
  v_card_prayer_min UUID;
  v_card_children   UUID;
  v_card_nursery    UUID;
  v_card_sports     UUID;
  v_card_recreation UUID;
  v_card_regteam    UUID;
  v_card_ushers     UUID;
  v_card_mediatech  UUID;
  v_card_social     UUID;
  v_card_hospteam   UUID;
  v_card_catering   UUID;

  -- ── Areas L1 ───────────────────────────────────────────
  v_area_main_bld   UUID;
  v_area_outdoor    UUID;
  v_area_support    UUID;

  -- ── Areas L2 ───────────────────────────────────────────
  v_area_main_hall  UUID;
  v_area_chapel_e   UUID;
  v_area_chapel_w   UUID;
  v_area_sports_fld UUID;
  v_area_parking_a  UUID;
  v_area_parking_b  UUID;
  v_area_reg_zone   UUID;
  v_area_hosp_hub   UUID;

  -- ── Teams (L3 under each L2 area) ──────────────────────
  v_team_ushers_mh  UUID;
  v_team_sound_mh   UUID;
  v_team_prayer_e   UUID;
  v_team_kids_e     UUID;
  v_team_sports_v   UUID;
  v_team_firstaid   UUID;
  v_team_parking_a  UUID;
  v_team_parking_b  UUID;
  v_team_checkin    UUID;
  v_team_infoDesk   UUID;
  v_team_food_dist  UUID;
  v_team_vol_care   UUID;

  -- ── Tasks ──────────────────────────────────────────────
  v_task1           UUID;
  v_task2           UUID;
  v_task3           UUID;
  v_task4           UUID;
  v_task_blocked1   UUID;
  v_task_blocked2   UUID;

  -- ── Broadcasts ─────────────────────────────────────────
  v_bc_urgent       UUID;
  v_bc_team         UUID;
  v_bc_welcome      UUID;

  -- ── Helpers ────────────────────────────────────────────
  v_conf_start      TIMESTAMPTZ;
  v_conf_end        TIMESTAMPTZ;

BEGIN

  -- ── 1. Resolve church & profiles ───────────────────────
  SELECT id INTO v_church_id FROM churches ORDER BY created_at ASC LIMIT 1;

  SELECT id INTO v_admin_id
    FROM profiles
    WHERE church_id = v_church_id AND role = 'super_admin'
    ORDER BY created_at ASC
    LIMIT 1;

  SELECT id INTO v_leader_id
    FROM profiles
    WHERE church_id = v_church_id AND role = 'ministry_leader'
    ORDER BY created_at ASC
    LIMIT 1;

  SELECT id INTO v_leader2_id
    FROM profiles
    WHERE church_id = v_church_id AND role = 'ministry_leader'
    ORDER BY created_at ASC
    OFFSET 1
    LIMIT 1;

  -- Fall back to admin if no second leader exists
  IF v_leader2_id IS NULL THEN
    v_leader2_id := v_admin_id;
  END IF;

  SELECT id INTO v_gl1_id
    FROM profiles
    WHERE church_id = v_church_id AND role = 'group_leader'
    ORDER BY created_at ASC
    LIMIT 1;

  SELECT id INTO v_gl2_id
    FROM profiles
    WHERE church_id = v_church_id AND role = 'group_leader'
    ORDER BY created_at ASC
    OFFSET 1
    LIMIT 1;

  -- Fall back gracefully if church has few users
  IF v_gl1_id IS NULL THEN v_gl1_id := v_leader_id; END IF;
  IF v_leader_id IS NULL THEN v_leader_id := v_admin_id; END IF;
  IF v_gl2_id IS NULL THEN v_gl2_id := v_gl1_id; END IF;

  -- Pick up to 5 members (any role, newest first to get variety)
  SELECT id INTO v_m1_id
    FROM profiles WHERE church_id = v_church_id ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_m2_id
    FROM profiles WHERE church_id = v_church_id ORDER BY created_at DESC OFFSET 1 LIMIT 1;
  SELECT id INTO v_m3_id
    FROM profiles WHERE church_id = v_church_id ORDER BY created_at DESC OFFSET 2 LIMIT 1;
  SELECT id INTO v_m4_id
    FROM profiles WHERE church_id = v_church_id ORDER BY created_at DESC OFFSET 3 LIMIT 1;
  SELECT id INTO v_m5_id
    FROM profiles WHERE church_id = v_church_id ORDER BY created_at DESC OFFSET 4 LIMIT 1;

  IF v_m1_id IS NULL THEN v_m1_id := v_admin_id; END IF;
  IF v_m2_id IS NULL THEN v_m2_id := v_admin_id; END IF;
  IF v_m3_id IS NULL THEN v_m3_id := v_admin_id; END IF;
  IF v_m4_id IS NULL THEN v_m4_id := v_admin_id; END IF;
  IF v_m5_id IS NULL THEN v_m5_id := v_admin_id; END IF;

  -- Conference date anchors
  v_conf_start := '2026-04-10 07:00:00+02'::TIMESTAMPTZ;
  v_conf_end   := '2026-04-12 22:00:00+02'::TIMESTAMPTZ;

  -- ── 2. Idempotency guard ────────────────────────────────
  -- If the conference event already exists, skip everything.
  IF EXISTS (
    SELECT 1 FROM events
    WHERE church_id = v_church_id
      AND title = 'Grace Annual Conference 2026'
  ) THEN
    RAISE NOTICE 'Conference seed already applied for church %. Skipping.', v_church_id;
    RETURN;
  END IF;

  -- ── 3. Conference Event ─────────────────────────────────
  INSERT INTO events (
    id, church_id, created_by,
    title, title_ar,
    description, description_ar,
    event_type, starts_at, ends_at,
    location, capacity,
    is_public, registration_required,
    status,
    conference_mode, conference_settings
  ) VALUES (
    gen_random_uuid(),
    v_church_id,
    v_admin_id,
    'Grace Annual Conference 2026',
    'مؤتمر النعمة السنوي 2026',
    'Three days of worship, community and growth bringing together 25,000 believers from across Egypt.',
    'ثلاثة أيام من العبادة والمجتمع والنمو تجمع ٢٥,٠٠٠ مؤمن من جميع أنحاء مصر.',
    'conference',
    v_conf_start,
    v_conf_end,
    'Grace Church Main Campus, Cairo',
    25000,
    false,
    false,
    'published',
    true,
    jsonb_build_object(
      'show_ministries',              true,
      'show_schedule',                true,
      'allow_public',                 false,
      'public_tagline',               'Three days of worship, community and growth',
      'public_tagline_ar',            'ثلاثة أيام من العبادة والمجتمع والنمو',
      'checkin_open_minutes_before',  60,
      'show_volunteer_qr',            true
    )
  )
  RETURNING id INTO v_event_id;

  RAISE NOTICE 'Created conference event: % (%)', 'Grace Annual Conference 2026', v_event_id;

  -- ── 4. Board Columns (rooms / stages) ───────────────────

  INSERT INTO conference_board_columns (id, church_id, event_id, name, name_ar, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, 'Main Stage',        'المسرح الرئيسي',   1),
    (gen_random_uuid(), v_church_id, v_event_id, 'Prayer Room',       'غرفة الصلاة',       2),
    (gen_random_uuid(), v_church_id, v_event_id, 'Kids Area',         'منطقة الأطفال',     3),
    (gen_random_uuid(), v_church_id, v_event_id, 'Sports Zone',       'منطقة الرياضة',     4),
    (gen_random_uuid(), v_church_id, v_event_id, 'Registration Hall', 'قاعة التسجيل',      5),
    (gen_random_uuid(), v_church_id, v_event_id, 'Media Center',      'مركز الإعلام',      6),
    (gen_random_uuid(), v_church_id, v_event_id, 'Hospitality Zone',  'منطقة الضيافة',     7);

  -- Re-select all column IDs by name after the multi-row INSERT
  SELECT id INTO v_col_main   FROM conference_board_columns WHERE event_id = v_event_id AND name = 'Main Stage'        LIMIT 1;
  SELECT id INTO v_col_prayer FROM conference_board_columns WHERE event_id = v_event_id AND name = 'Prayer Room'       LIMIT 1;
  SELECT id INTO v_col_kids   FROM conference_board_columns WHERE event_id = v_event_id AND name = 'Kids Area'         LIMIT 1;
  SELECT id INTO v_col_sports FROM conference_board_columns WHERE event_id = v_event_id AND name = 'Sports Zone'       LIMIT 1;
  SELECT id INTO v_col_reg    FROM conference_board_columns WHERE event_id = v_event_id AND name = 'Registration Hall' LIMIT 1;
  SELECT id INTO v_col_media  FROM conference_board_columns WHERE event_id = v_event_id AND name = 'Media Center'      LIMIT 1;
  SELECT id INTO v_col_hosp   FROM conference_board_columns WHERE event_id = v_event_id AND name = 'Hospitality Zone'  LIMIT 1;

  RAISE NOTICE 'Created 7 board columns';

  -- ── 5. Board Cards (ministry units per column) ──────────

  -- Main Stage cards
  INSERT INTO conference_board_cards (id, church_id, event_id, column_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_col_main, 'Worship & Music',    'فريق العبادة والموسيقى', v_leader_id,  80, 'in_progress',     1),
    (gen_random_uuid(), v_church_id, v_event_id, v_col_main, 'Preaching & Teaching','الوعظ والتعليم',        v_admin_id,   10, 'leader_notified', 2),
    (gen_random_uuid(), v_church_id, v_event_id, v_col_main, 'Sound & Lighting',   'الصوت والإضاءة',        v_leader2_id, 30, 'ready',           3);

  SELECT id INTO v_card_worship   FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Worship & Music'     LIMIT 1;
  SELECT id INTO v_card_preaching FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Preaching & Teaching' LIMIT 1;
  SELECT id INTO v_card_sound     FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Sound & Lighting'    LIMIT 1;

  -- Prayer Room cards
  INSERT INTO conference_board_cards (id, church_id, event_id, column_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_col_prayer, 'Intercession Team', 'فريق الشفاعة',    v_gl1_id, 40, 'in_progress', 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_col_prayer, 'Prayer Ministry',   'خدمة الصلاة',     v_gl2_id, 20, 'planning',    2);

  SELECT id INTO v_card_interc     FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Intercession Team' LIMIT 1;
  SELECT id INTO v_card_prayer_min FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Prayer Ministry'   LIMIT 1;

  -- Kids Area cards
  INSERT INTO conference_board_cards (id, church_id, event_id, column_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_col_kids, 'Children''s Ministry', 'خدمة الأطفال', v_leader_id, 60, 'ready',    1),
    (gen_random_uuid(), v_church_id, v_event_id, v_col_kids, 'Nursery',              'الحضانة',      v_gl1_id,    15, 'planning', 2);

  SELECT id INTO v_card_children FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Children''s Ministry' LIMIT 1;
  SELECT id INTO v_card_nursery  FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Nursery'              LIMIT 1;

  -- Sports Zone cards
  INSERT INTO conference_board_cards (id, church_id, event_id, column_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_col_sports, 'Sports Ministry',  'خدمة الرياضة',     v_gl2_id,    50, 'in_progress',     1),
    (gen_random_uuid(), v_church_id, v_event_id, v_col_sports, 'Recreation Team',  'فريق الترفيه',      v_leader2_id, 20, 'leader_notified', 2);

  SELECT id INTO v_card_sports     FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Sports Ministry' LIMIT 1;
  SELECT id INTO v_card_recreation FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Recreation Team' LIMIT 1;

  -- Registration Hall cards
  INSERT INTO conference_board_cards (id, church_id, event_id, column_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_col_reg, 'Registration Team',    'فريق التسجيل',         v_admin_id,   120, 'ready',       1),
    (gen_random_uuid(), v_church_id, v_event_id, v_col_reg, 'Ushers & Greeters',    'المرحبون والمرشدون',   v_leader_id,  200, 'in_progress', 2);

  SELECT id INTO v_card_regteam FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Registration Team'  LIMIT 1;
  SELECT id INTO v_card_ushers  FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Ushers & Greeters' LIMIT 1;

  -- Media Center cards
  INSERT INTO conference_board_cards (id, church_id, event_id, column_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_col_media, 'Media & Tech Team', 'فريق الإعلام والتقنية', v_leader2_id, 25, 'ready',   1),
    (gen_random_uuid(), v_church_id, v_event_id, v_col_media, 'Social Media',      'وسائل التواصل الاجتماعي', v_gl1_id,  10, 'planning', 2);

  SELECT id INTO v_card_mediatech FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Media & Tech Team' LIMIT 1;
  SELECT id INTO v_card_social    FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Social Media'      LIMIT 1;

  -- Hospitality Zone cards
  INSERT INTO conference_board_cards (id, church_id, event_id, column_id, custom_name, custom_name_ar, assigned_leader_id, headcount_target, status, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_col_hosp, 'Hospitality Team',  'فريق الضيافة',   v_gl2_id,    80, 'in_progress', 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_col_hosp, 'Food & Catering',   'الطعام والتموين', v_leader_id, 40, 'ready',       2);

  SELECT id INTO v_card_hospteam FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Hospitality Team' LIMIT 1;
  SELECT id INTO v_card_catering FROM conference_board_cards WHERE event_id = v_event_id AND custom_name = 'Food & Catering'  LIMIT 1;

  RAISE NOTICE 'Created 15 board cards across 7 columns';

  -- ── 6. Conference Areas (3-level hierarchy) ─────────────

  -- ─ Level 1: Major zones ─────────────────────────────────
  INSERT INTO conference_areas (id, church_id, event_id, parent_area_id, name, name_ar, description, description_ar, location_hint, location_hint_ar, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, NULL, 'Main Building',    'المبنى الرئيسي',     'Indoor facilities including main hall and chapels', 'المرافق الداخلية بما فيها القاعة الرئيسية والكنائس', 'Enter through the main gate', 'الدخول من البوابة الرئيسية', 1),
    (gen_random_uuid(), v_church_id, v_event_id, NULL, 'Outdoor Campus',   'الحرم الخارجي',      'Sports fields and parking areas', 'ملاعب رياضية ومناطق انتظار', 'Follow the green signs', 'اتبع اللافتات الخضراء', 2),
    (gen_random_uuid(), v_church_id, v_event_id, NULL, 'Support Services', 'خدمات الدعم',        'Registration, hospitality, and volunteer coordination', 'التسجيل والضيافة وتنسيق المتطوعين', 'Near the south entrance', 'بجانب المدخل الجنوبي', 3);

  SELECT id INTO v_area_main_bld FROM conference_areas WHERE event_id = v_event_id AND name = 'Main Building'    LIMIT 1;
  SELECT id INTO v_area_outdoor  FROM conference_areas WHERE event_id = v_event_id AND name = 'Outdoor Campus'   LIMIT 1;
  SELECT id INTO v_area_support  FROM conference_areas WHERE event_id = v_event_id AND name = 'Support Services' LIMIT 1;

  -- ─ Level 2: Sub-areas of Main Building ─────────────────
  INSERT INTO conference_areas (id, church_id, event_id, parent_area_id, name, name_ar, description, description_ar, location_hint, location_hint_ar, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_main_bld, 'Main Hall',    'القاعة الرئيسية', 'Primary worship and teaching hall — 15,000 capacity', 'قاعة العبادة والتعليم الرئيسية — سعة ١٥,٠٠٠', 'Ground floor, central building', 'الطابق الأرضي، المبنى المركزي', 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_main_bld, 'Chapel East',  'الكنيسة الشرقية', 'Prayer and intercession chapel — 500 capacity', 'كنيسة الصلاة والشفاعة — سعة ٥٠٠', 'East wing, second floor', 'الجناح الشرقي، الطابق الثاني', 2),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_main_bld, 'Chapel West',  'الكنيسة الغربية', 'Children''s ministry area — 800 capacity', 'منطقة خدمة الأطفال — سعة ٨٠٠', 'West wing, ground floor', 'الجناح الغربي، الطابق الأرضي', 3);

  -- ─ Level 2: Sub-areas of Outdoor Campus ────────────────
  INSERT INTO conference_areas (id, church_id, event_id, parent_area_id, name, name_ar, description, description_ar, location_hint, location_hint_ar, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_outdoor, 'Sports Field',   'الملعب الرياضي', 'Multi-sport activity area for youth', 'منطقة أنشطة رياضية متعددة للشباب', 'Behind the main building, follow blue signs', 'خلف المبنى الرئيسي، اتبع الإشارات الزرقاء', 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_outdoor, 'Parking Zone A', 'موقف السيارات أ', 'Primary parking — 2,000 vehicles', 'موقف السيارات الرئيسي — ٢,٠٠٠ مركبة', 'North entrance, gate A', 'المدخل الشمالي، البوابة أ', 2),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_outdoor, 'Parking Zone B', 'موقف السيارات ب', 'Overflow parking — 1,500 vehicles', 'موقف السيارات الإضافي — ١,٥٠٠ مركبة', 'North entrance, gate B', 'المدخل الشمالي، البوابة ب', 3);

  -- ─ Level 2: Sub-areas of Support Services ──────────────
  INSERT INTO conference_areas (id, church_id, event_id, parent_area_id, name, name_ar, description, description_ar, location_hint, location_hint_ar, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_support, 'Registration',    'التسجيل',        'Check-in and information desks', 'طاولات تسجيل الحضور والمعلومات', 'South entrance, left side', 'المدخل الجنوبي، الجانب الأيسر', 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_support, 'Hospitality Hub', 'مركز الضيافة',   'Food distribution, volunteer care, and rest area', 'توزيع الطعام وخدمة المتطوعين ومنطقة الراحة', 'South entrance, right side', 'المدخل الجنوبي، الجانب الأيمن', 2);

  -- Re-select all L2 IDs
  SELECT id INTO v_area_main_hall  FROM conference_areas WHERE event_id = v_event_id AND name = 'Main Hall'      LIMIT 1;
  SELECT id INTO v_area_chapel_e   FROM conference_areas WHERE event_id = v_event_id AND name = 'Chapel East'    LIMIT 1;
  SELECT id INTO v_area_chapel_w   FROM conference_areas WHERE event_id = v_event_id AND name = 'Chapel West'    LIMIT 1;
  SELECT id INTO v_area_sports_fld FROM conference_areas WHERE event_id = v_event_id AND name = 'Sports Field'   LIMIT 1;
  SELECT id INTO v_area_parking_a  FROM conference_areas WHERE event_id = v_event_id AND name = 'Parking Zone A' LIMIT 1;
  SELECT id INTO v_area_parking_b  FROM conference_areas WHERE event_id = v_event_id AND name = 'Parking Zone B' LIMIT 1;
  SELECT id INTO v_area_reg_zone   FROM conference_areas WHERE event_id = v_event_id AND name = 'Registration'   LIMIT 1;
  SELECT id INTO v_area_hosp_hub   FROM conference_areas WHERE event_id = v_event_id AND name = 'Hospitality Hub' LIMIT 1;

  RAISE NOTICE 'Created 11 conference areas (3 L1, 8 L2)';

  -- ── 7. Conference Teams (L3 — one per sub-area) ─────────

  -- Main Hall teams
  INSERT INTO conference_teams (id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_main_hall, 'Ushers – Main Hall',    'المرشدون – القاعة الرئيسية',  'Guide attendees to seats and maintain order', 'توجيه الحضور إلى مقاعدهم والحفاظ على النظام', 'Main Hall entrance foyer', 'ردهة مدخل القاعة الرئيسية', 150, 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_main_hall, 'Sound Team – Main Hall','فريق الصوت – القاعة الرئيسية', 'Manage sound, lighting, and projection', 'إدارة الصوت والإضاءة والعرض', 'Stage left technical booth', 'الكابينة التقنية يسار المسرح', 20, 2);

  -- Chapel East teams
  INSERT INTO conference_teams (id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_chapel_e, 'Prayer Team East',  'فريق الصلاة الشرقي',  '24/7 intercession and prayer ministry during conference', 'خدمة شفاعة وصلاة متواصلة طوال المؤتمر', 'Chapel East altar', 'مذبح الكنيسة الشرقية', 40, 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_chapel_e, 'Kids Team East',    'فريق الأطفال الشرقي', 'Children programs and supervision for ages 4–12', 'برامج الأطفال والإشراف للأعمار ٤–١٢', 'East wing lobby', 'ردهة الجناح الشرقي', 30, 2);

  -- Sports Field teams
  INSERT INTO conference_teams (id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_sports_fld, 'Sports Volunteers', 'متطوعو الرياضة',     'Organize and supervise sports activities', 'تنظيم والإشراف على الأنشطة الرياضية', 'Sports field entrance', 'مدخل الملعب الرياضي', 50, 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_sports_fld, 'First Aid',         'الإسعافات الأولية',  'Emergency medical response team', 'فريق الاستجابة الطبية للطوارئ', 'Medical tent – Field center', 'الخيمة الطبية – وسط الملعب', 10, 2);

  -- Parking Zone A teams
  INSERT INTO conference_teams (id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_parking_a, 'Parking Team A', 'فريق المواقف أ', 'Direct vehicles and manage flow in Zone A', 'توجيه السيارات وإدارة الحركة في المنطقة أ', 'Zone A booth at gate', 'كشك المنطقة أ عند البوابة', 40, 1);

  -- Parking Zone B teams
  INSERT INTO conference_teams (id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_parking_b, 'Parking Team B', 'فريق المواقف ب', 'Direct vehicles and manage flow in Zone B', 'توجيه السيارات وإدارة الحركة في المنطقة ب', 'Zone B booth at gate', 'كشك المنطقة ب عند البوابة', 35, 1);

  -- Registration teams
  INSERT INTO conference_teams (id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_reg_zone, 'Check-In Team', 'فريق تسجيل الحضور', 'Process volunteer check-ins and badge printing', 'معالجة تسجيل حضور المتطوعين وطباعة الشارات', 'Registration desk row 1', 'صف طاولات التسجيل ١', 60, 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_reg_zone, 'Info Desk',     'طاولة المعلومات',   'Answer attendee questions and provide directions', 'الإجابة على استفسارات الحضور وتقديم الإرشادات', 'Info desk near south door', 'طاولة المعلومات قرب الباب الجنوبي', 20, 2);

  -- Hospitality Hub teams
  INSERT INTO conference_teams (id, church_id, event_id, area_id, name, name_ar, description, description_ar, muster_point, muster_point_ar, target_headcount, sort_order) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_area_hosp_hub, 'Food Distribution', 'توزيع الطعام',      'Distribute meals and snacks to volunteers and attendees', 'توزيع الوجبات والوجبات الخفيفة على المتطوعين والحضور', 'Food station – Hospitality Hub', 'محطة الطعام – مركز الضيافة', 50, 1),
    (gen_random_uuid(), v_church_id, v_event_id, v_area_hosp_hub, 'Volunteer Care',    'رعاية المتطوعين',   'Support volunteer wellbeing, prayer, and encouragement', 'دعم رفاهية المتطوعين والصلاة والتشجيع', 'Volunteer lounge – Hub east', 'صالة المتطوعين – شرق المركز', 20, 2);

  -- Resolve team IDs
  SELECT id INTO v_team_ushers_mh FROM conference_teams WHERE event_id = v_event_id AND name = 'Ushers – Main Hall'     LIMIT 1;
  SELECT id INTO v_team_sound_mh  FROM conference_teams WHERE event_id = v_event_id AND name = 'Sound Team – Main Hall' LIMIT 1;
  SELECT id INTO v_team_prayer_e  FROM conference_teams WHERE event_id = v_event_id AND name = 'Prayer Team East'       LIMIT 1;
  SELECT id INTO v_team_kids_e    FROM conference_teams WHERE event_id = v_event_id AND name = 'Kids Team East'         LIMIT 1;
  SELECT id INTO v_team_sports_v  FROM conference_teams WHERE event_id = v_event_id AND name = 'Sports Volunteers'      LIMIT 1;
  SELECT id INTO v_team_firstaid  FROM conference_teams WHERE event_id = v_event_id AND name = 'First Aid'              LIMIT 1;
  SELECT id INTO v_team_parking_a FROM conference_teams WHERE event_id = v_event_id AND name = 'Parking Team A'         LIMIT 1;
  SELECT id INTO v_team_parking_b FROM conference_teams WHERE event_id = v_event_id AND name = 'Parking Team B'         LIMIT 1;
  SELECT id INTO v_team_checkin   FROM conference_teams WHERE event_id = v_event_id AND name = 'Check-In Team'          LIMIT 1;
  SELECT id INTO v_team_infoDesk  FROM conference_teams WHERE event_id = v_event_id AND name = 'Info Desk'              LIMIT 1;
  SELECT id INTO v_team_food_dist FROM conference_teams WHERE event_id = v_event_id AND name = 'Food Distribution'      LIMIT 1;
  SELECT id INTO v_team_vol_care  FROM conference_teams WHERE event_id = v_event_id AND name = 'Volunteer Care'         LIMIT 1;

  RAISE NOTICE 'Created 12 conference teams';

  -- ── 8. Conference Team Members ───────────────────────────
  -- Assign real profiles across teams with realistic roles and shifts.
  -- Day 1 shift: 2026-04-10 06:00–14:00 Cairo time (+02)
  -- Day 2 shift: 2026-04-10 14:00–22:00 Cairo time (+02)

  -- v_admin_id → conference_director on Ushers – Main Hall (checked_in, simulating conference day)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, checked_in_at, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_ushers_mh, v_admin_id,
     'conference_director',
     '2026-04-10 06:00:00+02', '2026-04-10 14:00:00+02',
     'checked_in', '2026-04-10 05:45:00+02', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- v_leader_id → team_leader on Sound Team – Main Hall (checked_in)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, checked_in_at, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_sound_mh, v_leader_id,
     'team_leader',
     '2026-04-10 05:00:00+02', '2026-04-10 13:00:00+02',
     'checked_in', '2026-04-10 04:55:00+02', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- v_leader2_id → team_leader on Prayer Team East (not_arrived)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_prayer_e, v_leader2_id,
     'team_leader',
     '2026-04-10 06:00:00+02', '2026-04-10 18:00:00+02',
     'not_arrived', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- v_gl1_id → sub_leader on Kids Team East (checked_in)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, checked_in_at, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_kids_e, v_gl1_id,
     'sub_leader',
     '2026-04-10 07:30:00+02', '2026-04-10 15:30:00+02',
     'checked_in', '2026-04-10 07:25:00+02', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- v_gl2_id → sub_leader on Sports Volunteers (checked_in)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, checked_in_at, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_sports_v, v_gl2_id,
     'sub_leader',
     '2026-04-10 08:00:00+02', '2026-04-10 16:00:00+02',
     'checked_in', '2026-04-10 07:58:00+02', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- v_m1_id → volunteer on Check-In Team (not_arrived)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_checkin, v_m1_id,
     'volunteer',
     '2026-04-10 14:00:00+02', '2026-04-10 22:00:00+02',
     'not_arrived', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- v_m2_id → volunteer on Food Distribution (checked_in)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, checked_in_at, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_food_dist, v_m2_id,
     'volunteer',
     '2026-04-10 06:00:00+02', '2026-04-10 14:00:00+02',
     'checked_in', '2026-04-10 05:52:00+02', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- v_m3_id → volunteer on Parking Team A (no_show — edge case)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_parking_a, v_m3_id,
     'volunteer',
     '2026-04-10 05:30:00+02', '2026-04-10 13:30:00+02',
     'no_show', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- v_m4_id → volunteer on First Aid (no_show — second edge case)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_firstaid, v_m4_id,
     'volunteer',
     '2026-04-10 06:00:00+02', '2026-04-10 14:00:00+02',
     'no_show', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- v_m5_id → volunteer on Volunteer Care (checked_out — shows full cycle)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, checked_in_at, checked_out_at, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_vol_care, v_m5_id,
     'volunteer',
     '2026-04-10 06:00:00+02', '2026-04-10 14:00:00+02',
     'checked_out', '2026-04-10 06:02:00+02', '2026-04-10 14:10:00+02', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  -- Also place admin on the Info Desk as area_director (tests multi-team assignment)
  INSERT INTO conference_team_members
    (id, church_id, event_id, team_id, profile_id, role, shift_start, shift_end, checkin_status, checked_in_at, assigned_by)
  VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_infoDesk, v_leader_id,
     'area_director',
     '2026-04-10 07:00:00+02', '2026-04-10 19:00:00+02',
     'checked_in', '2026-04-10 06:58:00+02', v_admin_id)
  ON CONFLICT (team_id, profile_id) DO NOTHING;

  RAISE NOTICE 'Created 11 conference team member assignments';

  -- ── 9. Conference Tasks ──────────────────────────────────
  -- Mix: done, in_progress, open, blocked (×2), overdue, critical

  -- Task 1: DONE — pre-conference setup complete
  INSERT INTO conference_tasks (id, church_id, event_id, team_id, title, title_ar, description, description_ar, status, priority, assignee_id, due_at, completed_at, completed_by, created_by)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id, v_team_sound_mh,
    'Install PA system and test all microphones',
    'تركيب نظام الصوت واختبار جميع الميكروفونات',
    'Set up and test the full PA system in Main Hall including 32 microphones, DI boxes, and monitor mix.',
    'تركيب نظبام الصوت الكامل في القاعة الرئيسية بما في ذلك ٣٢ ميكروفون وصناديق DI وخلط المونيتور.',
    'done', 'critical',
    v_leader_id,
    '2026-04-09 18:00:00+02',
    '2026-04-09 17:30:00+02',
    v_leader_id,
    v_admin_id
  )
  RETURNING id INTO v_task1;

  -- Task 2: IN_PROGRESS — day-of task
  INSERT INTO conference_tasks (id, church_id, event_id, team_id, title, title_ar, description, description_ar, status, priority, assignee_id, due_at, created_by)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id, v_team_ushers_mh,
    'Brief all ushers on door assignments and emergency exits',
    'إحاطة جميع المرشدين بمهام الأبواب ومخارج الطوارئ',
    'Conduct 15-minute briefing at main entrance. Distribute post maps and radio units.',
    'إجراء إحاطة لمدة ١٥ دقيقة عند المدخل الرئيسي. توزيع خرائط المواقع وأجهزة الراديو.',
    'in_progress', 'high',
    v_admin_id,
    '2026-04-10 07:00:00+02',
    v_admin_id
  )
  RETURNING id INTO v_task2;

  -- Task 3: OPEN — upcoming task
  INSERT INTO conference_tasks (id, church_id, event_id, team_id, title, title_ar, description, description_ar, status, priority, assignee_id, due_at, created_by)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id, v_team_checkin,
    'Set up check-in kiosks and print badge rolls',
    'تجهيز أكشاك تسجيل الحضور وطباعة لفائف الشارات',
    'Deploy 8 check-in tablets, test QR scanner integration, load 1,000 pre-registered badge stickers.',
    'نشر ٨ أجهزة لوحية لتسجيل الحضور، اختبار تكامل ماسح QR، تحميل ١,٠٠٠ ملصق شارة مسجل مسبقاً.',
    'open', 'high',
    v_m1_id,
    '2026-04-10 06:30:00+02',
    v_admin_id
  )
  RETURNING id INTO v_task3;

  -- Task 4: DONE — overdue but eventually completed
  INSERT INTO conference_tasks (id, church_id, event_id, team_id, title, title_ar, description, description_ar, status, priority, assignee_id, due_at, completed_at, completed_by, created_by)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id, v_team_food_dist,
    'Confirm catering order: 3,000 volunteer meals',
    'تأكيد طلب التموين: ٣,٠٠٠ وجبة للمتطوعين',
    'Finalize menu, quantities, and delivery schedule with caterer. Confirm payment receipt.',
    'وضع اللمسات الأخيرة على القائمة والكميات وجدول التسليم مع المورد. تأكيد استلام الدفع.',
    'done', 'critical',
    v_m2_id,
    '2026-04-05 12:00:00+02',   -- was due April 5
    '2026-04-06 09:00:00+02',   -- completed April 6 (1 day overdue but done)
    v_m2_id,
    v_admin_id
  )
  RETURNING id INTO v_task4;

  -- Task 5: BLOCKED — alert feed item 1
  INSERT INTO conference_tasks (id, church_id, event_id, team_id, title, title_ar, description, description_ar, status, priority, assignee_id, due_at, created_by)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id, v_team_parking_a,
    'Install directional signage in Zone A — BLOCKED: permit pending',
    'تركيب لافتات الاتجاه في المنطقة أ — محجوب: انتظار التصريح',
    'Municipality permit for temporary signs has not been issued. Cannot proceed until permit arrives. Contact: Eng. Hani at municipality office.',
    'لم يُصدر تصريح البلدية للافتات المؤقتة بعد. لا يمكن المتابعة حتى وصول التصريح. تواصل: المهندس هاني في مكتب البلدية.',
    'blocked', 'critical',
    v_m3_id,
    '2026-04-08 17:00:00+02',   -- was overdue
    v_admin_id
  )
  RETURNING id INTO v_task_blocked1;

  -- Task 6: BLOCKED — alert feed item 2
  INSERT INTO conference_tasks (id, church_id, event_id, team_id, title, title_ar, description, description_ar, status, priority, assignee_id, due_at, created_by)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id, v_team_firstaid,
    'First Aid tent delivery — BLOCKED: supplier unresponsive',
    'توصيل خيمة الإسعافات الأولية — محجوب: المورد لا يرد',
    'The medical equipment supplier (MedCo Egypt) has not confirmed delivery of the first aid station tent and stretchers. Backup plan needed.',
    'مورد المعدات الطبية (ميدكو مصر) لم يؤكد توصيل خيمة محطة الإسعافات الأولية والنقالات. يحتاج خطة بديلة.',
    'blocked', 'high',
    v_m4_id,
    '2026-04-09 10:00:00+02',   -- overdue
    v_admin_id
  )
  RETURNING id INTO v_task_blocked2;

  -- Task 7: OPEN — low priority / non-critical
  INSERT INTO conference_tasks (id, church_id, event_id, area_id, title, title_ar, description, description_ar, status, priority, assignee_id, due_at, created_by)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id, v_area_main_bld,
    'Place welcome banners in Main Building lobby',
    'وضع لافتات الترحيب في ردهة المبنى الرئيسي',
    'Hang 4 vinyl welcome banners (2m × 1m) from lobby ceiling supports. Ladder and tools available in storage room B.',
    'تعليق ٤ لافتات ترحيب فينيل (٢م × ١م) من حوامل سقف الردهة. السلم والأدوات متاحة في غرفة التخزين ب.',
    'open', 'low',
    v_gl1_id,
    '2026-04-09 20:00:00+02',
    v_admin_id
  );

  RAISE NOTICE 'Created 7 conference tasks (done=2, in_progress=1, open=2, blocked=2)';

  -- ── 10. Conference Resources ─────────────────────────────

  -- Sound Team – Main Hall resources
  INSERT INTO conference_resources (id, church_id, event_id, team_id, name, name_ar, resource_type, quantity_needed, quantity_confirmed, status, estimated_cost, notes, notes_ar, requested_by) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_sound_mh,
     'Professional PA System (32-channel)', 'نظام PA احترافي (٣٢ قناة)',
     'equipment', 1, 1, 'delivered', 15000.00,
     'Rented from SoundPro Egypt. Delivered April 9.',
     'مستأجر من ساوند برو مصر. تم التسليم ٩ أبريل.',
     v_leader_id),
    (gen_random_uuid(), v_church_id, v_event_id, v_team_sound_mh,
     'Stage monitors (wedge, × 8)', 'شاشات مسرح (٨ وحدات)',
     'equipment', 8, 8, 'delivered', 2400.00,
     'Included in SoundPro rental package.',
     'مضمنة في حزمة الإيجار من ساوند برو.',
     v_leader_id),
    (gen_random_uuid(), v_church_id, v_event_id, v_team_sound_mh,
     'Wireless Handheld Microphones (× 12)', 'ميكروفونات لاسلكية يدوية (١٢ وحدة)',
     'equipment', 12, 10, 'confirmed',  3600.00,
     '2 units still pending shipment from supplier.',
     'وحدتان لا تزالان في انتظار الشحن من المورد.',
     v_leader_id);

  -- Ushers – Main Hall resources
  INSERT INTO conference_resources (id, church_id, event_id, team_id, name, name_ar, resource_type, quantity_needed, quantity_confirmed, status, estimated_cost, notes, notes_ar, requested_by) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_ushers_mh,
     'Volunteer vests (orange, × 150)', 'صدريات المتطوعين (برتقالي، ١٥٠)',
     'supply', 150, 150, 'delivered', 750.00,
     'Delivered to storage room A. Distribution before shift.',
     'تم التسليم إلى غرفة التخزين أ. التوزيع قبل الوردية.',
     v_admin_id),
    (gen_random_uuid(), v_church_id, v_event_id, v_team_ushers_mh,
     'Walkie-talkies (× 20)', 'أجهزة لاسلكية (٢٠)',
     'equipment', 20, 15, 'confirmed', 2000.00,
     '5 units still at rental shop. To be picked up April 9.',
     '٥ وحدات لا تزال في محل الإيجار. سيتم استلامها ٩ أبريل.',
     v_admin_id);

  -- Check-In Team resources
  INSERT INTO conference_resources (id, church_id, event_id, team_id, name, name_ar, resource_type, quantity_needed, quantity_confirmed, status, estimated_cost, notes, notes_ar, requested_by) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_checkin,
     'Check-in tablets with stands (× 8)', 'أجهزة لوحية للتسجيل مع حوامل (٨)',
     'equipment', 8, 8, 'delivered', 4800.00,
     'iPads with QR scanner app installed and tested.',
     'أجهزة iPad مع تطبيق ماسح QR مثبت ومختبر.',
     v_admin_id),
    (gen_random_uuid(), v_church_id, v_event_id, v_team_checkin,
     'Printed lanyards and badge holders (× 1500)', 'حمالات الشارات المطبوعة (١٥٠٠)',
     'supply', 1500, 1500, 'delivered', 300.00,
     NULL, NULL, v_admin_id);

  -- Food Distribution resources
  INSERT INTO conference_resources (id, church_id, event_id, team_id, name, name_ar, resource_type, quantity_needed, quantity_confirmed, status, estimated_cost, notes, notes_ar, requested_by) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_food_dist,
     'Boxed volunteer meals (× 3000)', 'وجبات المتطوعين (٣٠٠٠)',
     'food', 3000, 3000, 'confirmed', 18000.00,
     'CaterEgypt confirmed delivery. 1000 per day across 3 days.',
     'CaterEgypt أكدت التسليم. ١٠٠٠ يومياً على مدى ٣ أيام.',
     v_m2_id),
    (gen_random_uuid(), v_church_id, v_event_id, v_team_food_dist,
     'Water bottles (× 5000)', 'زجاجات مياه (٥٠٠٠)',
     'food', 5000, 5000, 'delivered', 1500.00,
     'Aqua Siwa donated 5,000 bottles. Stored in Hub room 2.',
     'أكوا سيوة تبرعت بـ ٥٠٠٠ زجاجة. مخزنة في غرفة المركز ٢.',
     v_m2_id);

  -- Parking teams resources
  INSERT INTO conference_resources (id, church_id, event_id, team_id, name, name_ar, resource_type, quantity_needed, quantity_confirmed, status, estimated_cost, notes, notes_ar, requested_by) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_parking_a,
     'Traffic cones (× 200)', 'مخروطات المرور (٢٠٠)',
     'equipment', 200, 200, 'delivered', 600.00,
     'Borrowed from municipality. Return after event.',
     'مستعارة من البلدية. إرجاعها بعد الحدث.',
     v_m3_id),
    (gen_random_uuid(), v_church_id, v_event_id, v_team_parking_a,
     'Shuttle bus service (× 4 buses)', 'خدمة الحافلات المكوكية (٤ حافلات)',
     'transport', 4, 2, 'confirmed', 8000.00,
     'GoMinibus confirmed 2 of 4 buses. Still negotiating 2 more.',
     'GoMinibus أكدت ٢ من ٤ حافلات. لا تزال المفاوضات جارية على ٢ أخريين.',
     v_m3_id);

  -- First Aid resource (needed status — the blocked scenario)
  INSERT INTO conference_resources (id, church_id, event_id, team_id, name, name_ar, resource_type, quantity_needed, quantity_confirmed, status, estimated_cost, notes, notes_ar, requested_by) VALUES
    (gen_random_uuid(), v_church_id, v_event_id, v_team_firstaid,
     'First aid station tent (× 1)', 'خيمة محطة الإسعافات الأولية (١)',
     'equipment', 1, NULL, 'needed', 2500.00,
     'Blocked: MedCo Egypt not responding. Consider backup supplier.',
     'محجوب: ميدكو مصر لا تستجيب. يُنصح بالتواصل مع مورد بديل.',
     v_m4_id),
    (gen_random_uuid(), v_church_id, v_event_id, v_team_firstaid,
     'First aid kits (× 20)', 'حقائب الإسعافات الأولية (٢٠)',
     'supply', 20, 20, 'delivered', 1000.00,
     'Donated by Ahl Misr NGO.',
     'تبرعت بها منظمة أهل مصر.',
     v_m4_id);

  RAISE NOTICE 'Created 15 conference resources across 6 teams';

  -- ── 11. Conference Broadcasts ────────────────────────────

  -- Broadcast 1: Urgent all-leaders broadcast
  INSERT INTO conference_broadcasts (id, church_id, event_id, team_id, area_id, sent_by, message, message_ar, is_urgent, created_at)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id,
    NULL, NULL,   -- all-event broadcast (no team/area scope)
    v_admin_id,
    'URGENT — All team leaders: mandatory briefing at 5:30 AM at the main entrance before gates open. Bring your team rosters.',
    'عاجل — جميع قادة الفرق: إحاطة إلزامية الساعة ٥:٣٠ صباحاً عند المدخل الرئيسي قبل فتح البوابات. أحضروا قوائم فرقكم.',
    true,
    '2026-04-09 20:00:00+02'
  )
  RETURNING id INTO v_bc_urgent;

  -- Broadcast 2: Team-scoped broadcast to Ushers team
  INSERT INTO conference_broadcasts (id, church_id, event_id, team_id, area_id, sent_by, message, message_ar, is_urgent, created_at)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id,
    v_team_ushers_mh, NULL,
    v_admin_id,
    'Ushers team: please pick up your orange vests and radios from storage room A (near south entrance). Distribution starts at 5:45 AM.',
    'فريق المرشدين: يرجى استلام الصدريات البرتقالية وأجهزة الراديو من غرفة التخزين أ (قرب المدخل الجنوبي). التوزيع يبدأ الساعة ٥:٤٥ صباحاً.',
    false,
    '2026-04-09 21:00:00+02'
  )
  RETURNING id INTO v_bc_team;

  -- Broadcast 3: Welcome all-event broadcast
  INSERT INTO conference_broadcasts (id, church_id, event_id, team_id, area_id, sent_by, message, message_ar, is_urgent, created_at)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id,
    NULL, NULL,
    v_admin_id,
    'Welcome to Grace Annual Conference 2026! Thank you for serving. Check the app for your team assignment, shift time, and muster point. God bless your service!',
    'مرحباً بكم في مؤتمر النعمة السنوي ٢٠٢٦! شكراً لخدمتكم. راجعوا التطبيق لمعرفة مهمتكم ووقت وردياتكم ونقطة التجمع. الرب يبارك خدمتكم!',
    false,
    '2026-04-10 05:00:00+02'
  )
  RETURNING id INTO v_bc_welcome;

  -- Broadcast 4: Area-scoped broadcast to Parking Zone A area
  INSERT INTO conference_broadcasts (id, church_id, event_id, team_id, area_id, sent_by, message, message_ar, is_urgent, created_at)
  VALUES (
    gen_random_uuid(), v_church_id, v_event_id,
    NULL, v_area_parking_a,
    v_admin_id,
    'Parking Zone A team: the municipality permit is still delayed. Hold your positions and await further instructions. Do NOT install signage yet.',
    'فريق موقف السيارات أ: تصريح البلدية لا يزال متأخراً. حافظوا على مواقعكم وانتظروا تعليمات إضافية. لا تركبوا اللافتات حتى الآن.',
    true,
    '2026-04-10 05:30:00+02'
  );

  RAISE NOTICE 'Created 4 conference broadcasts';

  -- ── 12. Broadcast Read Receipts ──────────────────────────
  -- Simulate that some members have read the urgent and welcome broadcasts

  -- v_admin_id read all broadcasts (they sent them — mark as read for UX)
  INSERT INTO conference_broadcast_reads (id, broadcast_id, profile_id, read_at) VALUES
    (gen_random_uuid(), v_bc_urgent,  v_admin_id,  '2026-04-09 20:01:00+02'),
    (gen_random_uuid(), v_bc_team,    v_admin_id,  '2026-04-09 21:01:00+02'),
    (gen_random_uuid(), v_bc_welcome, v_admin_id,  '2026-04-10 05:01:00+02')
  ON CONFLICT (broadcast_id, profile_id) DO NOTHING;

  -- v_leader_id read the urgent and welcome broadcasts
  INSERT INTO conference_broadcast_reads (id, broadcast_id, profile_id, read_at) VALUES
    (gen_random_uuid(), v_bc_urgent,  v_leader_id, '2026-04-09 20:15:00+02'),
    (gen_random_uuid(), v_bc_welcome, v_leader_id, '2026-04-10 05:08:00+02')
  ON CONFLICT (broadcast_id, profile_id) DO NOTHING;

  -- v_gl1_id read the welcome broadcast only
  INSERT INTO conference_broadcast_reads (id, broadcast_id, profile_id, read_at) VALUES
    (gen_random_uuid(), v_bc_welcome, v_gl1_id, '2026-04-10 05:22:00+02')
  ON CONFLICT (broadcast_id, profile_id) DO NOTHING;

  -- v_m2_id read the welcome broadcast
  INSERT INTO conference_broadcast_reads (id, broadcast_id, profile_id, read_at) VALUES
    (gen_random_uuid(), v_bc_welcome, v_m2_id, '2026-04-10 05:35:00+02')
  ON CONFLICT (broadcast_id, profile_id) DO NOTHING;

  RAISE NOTICE 'Created broadcast read receipts';

  -- ── 13. Summary ─────────────────────────────────────────
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Conference Mode seed complete for church: %', v_church_id;
  RAISE NOTICE '  Event:      Grace Annual Conference 2026 (%)', v_event_id;
  RAISE NOTICE '  Columns:    7 (board columns)';
  RAISE NOTICE '  Cards:      15 (board cards across all columns)';
  RAISE NOTICE '  Areas:      11 (3 L1 + 8 L2)';
  RAISE NOTICE '  Teams:      12 (L3 teams under L2 areas)';
  RAISE NOTICE '  Members:    % team assignments', (SELECT COUNT(*) FROM conference_team_members WHERE event_id = v_event_id);
  RAISE NOTICE '  Tasks:      7 (done=2, in_progress=1, open=2, blocked=2)';
  RAISE NOTICE '  Resources:  15 (equipment, supply, food, transport — all statuses)';
  RAISE NOTICE '  Broadcasts: 4 (urgent, team-scoped, area-scoped, all-event)';
  RAISE NOTICE '  Read rcpts: % receipt rows', (
    SELECT COUNT(*) FROM conference_broadcast_reads cbr
    JOIN conference_broadcasts cb ON cb.id = cbr.broadcast_id
    WHERE cb.event_id = v_event_id
  );
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Login: pastor@gracechurch.test (super_admin) to see all data';
  RAISE NOTICE 'Test URLs:';
  RAISE NOTICE '  /admin/events/[event_id]/conference           — Board view';
  RAISE NOTICE '  /admin/events/[event_id]/conference/areas     — Areas & teams';
  RAISE NOTICE '  /admin/events/[event_id]/conference/tasks     — Task list';
  RAISE NOTICE '  /admin/events/[event_id]/conference/resources — Resources';
  RAISE NOTICE '  /admin/events/[event_id]/conference/broadcasts — Broadcasts';
  RAISE NOTICE '  /admin/events/[event_id]/conference/checkin   — Check-in roster';

END $$;

NOTIFY pgrst, 'reload schema';
