-- ============================================================
-- EKKLESIA — Church Needs Test Data Seed
-- Run AFTER 035_church_needs.sql
-- Creates 2 additional churches with admin users + cross-church needs
-- ⚠️ Only run in development — do NOT run in production
-- ============================================================

DO $$
DECLARE
  v_church1_id    UUID;  -- existing church
  v_church2_id    UUID;  -- new: Grace Church Cairo
  v_church3_id    UUID;  -- new: Hope Church Beirut
  v_admin1_id     UUID;  -- existing super_admin
  v_admin2_id     UUID;  -- new admin for church 2
  v_admin3_id     UUID;  -- new admin for church 3
  v_need1_id      UUID;
  v_need2_id      UUID;
  v_need3_id      UUID;
  v_need4_id      UUID;
  v_need5_id      UUID;
  v_need6_id      UUID;
  v_need7_id      UUID;
  v_need8_id      UUID;
BEGIN
  -- ─── Get existing church & admin ───────────────────────────
  SELECT id INTO v_church1_id FROM churches ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_admin1_id FROM profiles
    WHERE church_id = v_church1_id AND role = 'super_admin'
    ORDER BY created_at ASC LIMIT 1;

  IF v_church1_id IS NULL THEN
    RAISE NOTICE 'No church found — skipping church needs seed data';
    RETURN;
  END IF;

  -- ─── Create 2 additional churches ─────────────────────────
  INSERT INTO churches (id, name, name_ar, country, timezone, primary_language, denomination, welcome_message, welcome_message_ar)
  VALUES (
    gen_random_uuid(),
    'Grace Church Cairo',
    'كنيسة النعمة بالقاهرة',
    'Egypt',
    'Africa/Cairo',
    'ar',
    'Evangelical',
    'Welcome to Grace Church!',
    'مرحباً بكم في كنيسة النعمة!'
  )
  RETURNING id INTO v_church2_id;

  INSERT INTO churches (id, name, name_ar, country, timezone, primary_language, denomination, welcome_message, welcome_message_ar)
  VALUES (
    gen_random_uuid(),
    'Hope Church Beirut',
    'كنيسة الرجاء بيروت',
    'Lebanon',
    'Asia/Beirut',
    'ar',
    'Baptist',
    'Welcome to Hope Church!',
    'أهلاً وسهلاً في كنيسة الرجاء!'
  )
  RETURNING id INTO v_church3_id;

  -- ─── Create auth users for new churches ────────────────────
  -- Using pre-computed bcrypt hash for 'password123' (same as seed_data.sql)
  -- Admin for Grace Church Cairo
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'admin@gracecairo.org',
    '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
    NOW(), 'authenticated', 'authenticated',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"email_verified":true}',
    '', '', '', '', '', '', '', ''
  )
  RETURNING id INTO v_admin2_id;

  -- Admin for Hope Church Beirut
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'admin@hopebeirut.org',
    '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
    NOW(), 'authenticated', 'authenticated',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"email_verified":true}',
    '', '', '', '', '', '', '', ''
  )
  RETURNING id INTO v_admin3_id;

  -- ─── Create auth identities (required for email login) ──────────
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_admin2_id, v_admin2_id::text, 'email',
     jsonb_build_object('sub', v_admin2_id::text, 'email', 'admin@gracecairo.org', 'email_verified', false, 'phone_verified', false),
     NOW(), NOW(), NOW()),
    (gen_random_uuid(), v_admin3_id, v_admin3_id::text, 'email',
     jsonb_build_object('sub', v_admin3_id::text, 'email', 'admin@hopebeirut.org', 'email_verified', false, 'phone_verified', false),
     NOW(), NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- ─── Update profiles for new admins (trigger auto-created them) ──
  UPDATE profiles SET
    church_id = v_church2_id, first_name = 'Mina', last_name = 'Gerges',
    first_name_ar = 'مينا', last_name_ar = 'جرجس', email = 'admin@gracecairo.org',
    role = 'super_admin', status = 'active', onboarding_completed = true, preferred_language = 'ar'
  WHERE id = v_admin2_id;

  UPDATE profiles SET
    church_id = v_church3_id, first_name = 'Georges', last_name = 'Haddad',
    first_name_ar = 'جورج', last_name_ar = 'حداد', email = 'admin@hopebeirut.org',
    role = 'super_admin', status = 'active', onboarding_completed = true, preferred_language = 'ar'
  WHERE id = v_admin3_id;

  -- ─── Add to user_churches junction table ───────────────────
  INSERT INTO user_churches (user_id, church_id, role) VALUES
    (v_admin2_id, v_church2_id, 'super_admin'),
    (v_admin3_id, v_church3_id, 'super_admin');

  -- ─── Church Needs: from existing church (Church 1) ─────────
  INSERT INTO church_needs (id, church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, contact_email, created_at)
  VALUES
    -- Need 1: Projector (high urgency)
    (gen_random_uuid(), v_church1_id, v_admin1_id,
     'Projector for Main Hall', 'بروجكتور للقاعة الرئيسية',
     'We need a high-quality projector (4000+ lumens) for worship service slides and video presentations. Our current one is broken beyond repair.',
     'نحتاج بروجكتور عالي الجودة (٤٠٠٠+ لومن) لعرض الترانيم والفيديو في الخدمة. الحالي تعطل نهائياً.',
     'electronics', 1, 'high', 'open',
     'Pastor Samuel', '+20-100-555-0001', 'samuel@church.org',
     NOW() - INTERVAL '2 days')
  RETURNING id INTO v_need1_id;

  INSERT INTO church_needs (id, church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, created_at)
  VALUES
    -- Need 2: Chairs (medium urgency)
    (gen_random_uuid(), v_church1_id, v_admin1_id,
     'Folding Chairs for Youth Hall', 'كراسي قابلة للطي لقاعة الشباب',
     'We are expanding our youth ministry and need additional seating. Folding chairs preferred for flexible setup.',
     'نوسع خدمة الشباب ونحتاج كراسي إضافية. يُفضل كراسي قابلة للطي لسهولة الترتيب.',
     'furniture', 50, 'medium', 'open',
     'Youth Leader Mark', '+20-100-555-0002',
     NOW() - INTERVAL '5 days')
  RETURNING id INTO v_need2_id;

  -- ─── Church Needs: from Grace Church Cairo (Church 2) ──────
  INSERT INTO church_needs (id, church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, contact_email, created_at)
  VALUES
    -- Need 3: Sound system (critical)
    (gen_random_uuid(), v_church2_id, v_admin2_id,
     'Complete Sound System', 'نظام صوت كامل',
     'Our sound system was damaged in flooding. We urgently need a mixer, 2 speakers, 4 microphones, and cabling. Any components would help.',
     'تضرر نظام الصوت من الفيضان. نحتاج بشكل عاجل مكسر صوت و٢ سماعة و٤ ميكروفون وكابلات. أي مكون سيساعد.',
     'electronics', 1, 'critical', 'open',
     'Mina Gerges', '+20-100-555-0010', 'admin@gracecairo.org',
     NOW() - INTERVAL '1 day')
  RETURNING id INTO v_need3_id;

  INSERT INTO church_needs (id, church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, created_at)
  VALUES
    -- Need 4: Sunday school supplies
    (gen_random_uuid(), v_church2_id, v_admin2_id,
     'Sunday School Teaching Materials', 'مواد تعليم مدارس الأحد',
     'Coloring books, crayons, craft paper, scissors, glue sticks, and Bible story flashcards for children aged 4-10.',
     'كتب تلوين وألوان شمع وورق حرف ومقصات وأعواد لصق وبطاقات قصص الكتاب المقدس للأطفال من ٤ إلى ١٠ سنوات.',
     'educational', 30, 'medium', 'open',
     'Sister Sarah', '+20-100-555-0011',
     NOW() - INTERVAL '7 days')
  RETURNING id INTO v_need4_id;

  INSERT INTO church_needs (id, church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, created_at)
  VALUES
    -- Need 5: Food packages
    (gen_random_uuid(), v_church2_id, v_admin2_id,
     'Food Packages for Needy Families', 'طرود غذائية للعائلات المحتاجة',
     'We distribute food packages monthly to 20 families in our neighborhood. Rice, oil, sugar, pasta, canned goods appreciated.',
     'نوزع طرود غذائية شهرياً على ٢٠ عائلة في منطقتنا. نقدر الأرز والزيت والسكر والمكرونة والمعلبات.',
     'food', 20, 'high', 'open',
     'Deacon Fady', '+20-100-555-0012',
     NOW() - INTERVAL '3 days')
  RETURNING id INTO v_need5_id;

  -- ─── Church Needs: from Hope Church Beirut (Church 3) ──────
  INSERT INTO church_needs (id, church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, contact_email, created_at)
  VALUES
    -- Need 6: Building repairs
    (gen_random_uuid(), v_church3_id, v_admin3_id,
     'Roof Waterproofing Materials', 'مواد عزل السقف',
     'Our church building has several roof leaks that are getting worse with winter rains. We need waterproofing membrane, sealant, and labor help.',
     'مبنى كنيستنا فيه عدة تسريبات في السقف تزداد مع أمطار الشتاء. نحتاج عوازل ومانع تسرب ومساعدة في العمل.',
     'building', 1, 'high', 'open',
     'Georges Haddad', '+961-71-555-001', 'admin@hopebeirut.org',
     NOW() - INTERVAL '4 days')
  RETURNING id INTO v_need6_id;

  INSERT INTO church_needs (id, church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, created_at)
  VALUES
    -- Need 7: Winter clothing
    (gen_random_uuid(), v_church3_id, v_admin3_id,
     'Winter Clothing for Refugees', 'ملابس شتوية للاجئين',
     'We serve 15 refugee families. Coats, sweaters, boots, and blankets for adults and children needed before the cold season.',
     'نخدم ١٥ عائلة لاجئة. نحتاج معاطف وسترات وأحذية شتوية وبطانيات للكبار والصغار قبل موسم البرد.',
     'clothing', 60, 'critical', 'open',
     'Sister Nadia', '+961-71-555-002',
     NOW() - INTERVAL '1 day')
  RETURNING id INTO v_need7_id;

  INSERT INTO church_needs (id, church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, created_at)
  VALUES
    -- Need 8: Volunteers for medical day
    (gen_random_uuid(), v_church3_id, v_admin3_id,
     'Volunteer Doctors for Free Medical Day', 'أطباء متطوعون ليوم طبي مجاني',
     'We are organizing a free medical day for the community on April 5th. We need volunteer doctors, nurses, and pharmacists for the day.',
     'ننظم يوم طبي مجاني للمجتمع في ٥ أبريل. نحتاج أطباء وممرضين وصيادلة متطوعين لهذا اليوم.',
     'volunteer', 10, 'medium', 'open',
     'Dr. Antoine', '+961-71-555-003',
     NOW() - INTERVAL '6 days')
  RETURNING id INTO v_need8_id;

  -- ─── Responses: cross-church communication ─────────────────

  -- Church 2 (Grace Cairo) responds to Church 1's projector need
  INSERT INTO church_need_responses (need_id, responder_church_id, responder_user_id, message, message_ar, status)
  VALUES (
    v_need1_id, v_church2_id, v_admin2_id,
    'We have a spare Epson projector (3800 lumens) that we replaced recently. It works perfectly. We can ship it to you.',
    'عندنا بروجكتور إبسون احتياطي (٣٨٠٠ لومن) غيرناه مؤخراً. يعمل بشكل ممتاز. نقدر نرسله لكم.',
    'pending'
  );

  -- Church 3 (Hope Beirut) responds to Church 1's projector need too
  INSERT INTO church_need_responses (need_id, responder_church_id, responder_user_id, message, message_ar, status)
  VALUES (
    v_need1_id, v_church3_id, v_admin3_id,
    'We have an extra BenQ projector. It is 4200 lumens. Let us know if you still need it.',
    'عندنا بروجكتور بينكيو إضافي. ٤٢٠٠ لومن. خبرونا إذا بعدكم بحاجة.',
    'pending'
  );

  -- Church 1 responds to Church 2's sound system need
  INSERT INTO church_need_responses (need_id, responder_church_id, responder_user_id, message, message_ar, status)
  VALUES (
    v_need3_id, v_church1_id, v_admin1_id,
    'We recently upgraded our sound system and have 2 Yamaha speakers and a Behringer mixer available. Contact us to arrange pickup.',
    'حدّثنا نظام الصوت مؤخراً وعندنا ٢ سماعة ياماها ومكسر بيرنجر متاحين. تواصلوا معنا لترتيب الاستلام.',
    'accepted'
  );

  -- Church 3 responds to Church 2's food packages need
  INSERT INTO church_need_responses (need_id, responder_church_id, responder_user_id, message, message_ar, status)
  VALUES (
    v_need5_id, v_church3_id, v_admin3_id,
    'Our church received a large donation of rice and cooking oil. We can provide 10 packages. God bless your ministry.',
    'كنيستنا استلمت تبرع كبير من الأرز وزيت الطبخ. نقدر نوفر ١٠ طرود. الرب يبارك خدمتكم.',
    'pending'
  );

  -- Church 1 responds to Church 3's winter clothing need
  INSERT INTO church_need_responses (need_id, responder_church_id, responder_user_id, message, message_ar, status)
  VALUES (
    v_need7_id, v_church1_id, v_admin1_id,
    'We just finished a clothing drive and have boxes of winter coats and blankets. We can ship to Lebanon if you cover shipping costs.',
    'خلصنا حملة جمع ملابس ومعنا صناديق معاطف شتوية وبطانيات. نقدر نشحنهم لبنان لو غطيتوا تكاليف الشحن.',
    'accepted'
  );

  -- Church 2 responds to Church 3's medical day volunteer need
  INSERT INTO church_need_responses (need_id, responder_church_id, responder_user_id, message, message_ar, status)
  VALUES (
    v_need8_id, v_church2_id, v_admin2_id,
    'We have 2 doctors and 1 nurse in our congregation who are willing to travel. Can you help with accommodation?',
    'عندنا ٢ دكتور وممرضة في كنيستنا مستعدين يسافروا. تقدروا تساعدوا في السكن؟',
    'pending'
  );

  -- ─── Update need statuses based on responses ──────────────
  -- Need 3 (sound system) → in_progress because a response was accepted
  UPDATE church_needs SET status = 'in_progress' WHERE id = v_need3_id;
  -- Need 7 (winter clothing) → in_progress because a response was accepted
  UPDATE church_needs SET status = 'in_progress' WHERE id = v_need7_id;

  RAISE NOTICE 'Church Needs test data seeded successfully';
  RAISE NOTICE 'Church 1 (existing): %', v_church1_id;
  RAISE NOTICE 'Church 2 (Grace Cairo): % — login: admin@gracecairo.org / password123', v_church2_id;
  RAISE NOTICE 'Church 3 (Hope Beirut): % — login: admin@hopebeirut.org / password123', v_church3_id;
END $$;
