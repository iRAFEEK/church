-- ============================================================
-- Create 2 new test churches with admin accounts and church needs
-- for testing cross-church communication and notifications
-- ============================================================

DO $$
DECLARE
  v_church4_id UUID := gen_random_uuid();
  v_church5_id UUID := gen_random_uuid();
  v_admin4_id  UUID := 'c0000000-0000-0000-0000-000000000004';
  v_admin5_id  UUID := 'c0000000-0000-0000-0000-000000000005';
  v_church1_id UUID;
  v_church2_id UUID;
  v_church3_id UUID;
  v_admin1_id  UUID;
  v_admin2_id  UUID := 'c0000000-0000-0000-0000-000000000002';
  v_admin3_id  UUID := 'c0000000-0000-0000-0000-000000000003';
BEGIN
  -- Look up existing churches
  SELECT id INTO v_church1_id FROM churches ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_admin1_id FROM auth.users WHERE email = 'pastor@gracechurch.test' LIMIT 1;

  -- ========== Create 2 new churches ==========
  INSERT INTO churches (id, name, name_ar, country, timezone, primary_language, denomination, welcome_message, welcome_message_ar)
  VALUES
    (v_church4_id, 'Resurrection Church Amman', 'كنيسة القيامة عمّان', 'Jordan', 'Asia/Amman', 'ar', 'Evangelical', 'Welcome to Resurrection Church', 'أهلاً بك في كنيسة القيامة'),
    (v_church5_id, 'St. Mark Church Baghdad', 'كنيسة مار مرقس بغداد', 'Iraq', 'Asia/Baghdad', 'ar', 'Orthodox', 'Welcome to St. Mark Church', 'أهلاً بك في كنيسة مار مرقس');

  -- ========== Create auth.users (all 20 columns) ==========
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    role, aud, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current,
    email_change, phone_change, phone_change_token, reauthentication_token
  ) VALUES
    (v_admin4_id, '00000000-0000-0000-0000-000000000000',
     'admin@resurrectionamman.org',
     '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
     now(), 'authenticated', 'authenticated',
     now() - interval '1 year', now(),
     '{"provider":"email","providers":["email"]}',
     '{"email_verified":true}',
     '', '', '', '', '', '', '', ''),
    (v_admin5_id, '00000000-0000-0000-0000-000000000000',
     'admin@stmarkbaghdad.org',
     '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
     now(), 'authenticated', 'authenticated',
     now() - interval '1 year', now(),
     '{"provider":"email","providers":["email"]}',
     '{"email_verified":true}',
     '', '', '', '', '', '', '', '');

  -- ========== Create auth.identities ==========
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  SELECT gen_random_uuid(), id, id::text, 'email',
    jsonb_build_object('sub', id::text, 'email', email, 'email_verified', false, 'phone_verified', false),
    now(), now(), now()
  FROM auth.users
  WHERE email IN ('admin@resurrectionamman.org', 'admin@stmarkbaghdad.org');

  -- ========== Update auto-created profiles (handle_new_user trigger) ==========
  UPDATE profiles SET
    church_id = v_church4_id, first_name = 'Rami', last_name = 'Khoury',
    first_name_ar = 'رامي', last_name_ar = 'خوري',
    role = 'super_admin', status = 'active', onboarding_completed = true, preferred_language = 'ar'
  WHERE id = v_admin4_id;

  UPDATE profiles SET
    church_id = v_church5_id, first_name = 'Youssef', last_name = 'Hanna',
    first_name_ar = 'يوسف', last_name_ar = 'حنّا',
    role = 'super_admin', status = 'active', onboarding_completed = true, preferred_language = 'ar'
  WHERE id = v_admin5_id;

  -- ========== Create user_churches entries ==========
  INSERT INTO user_churches (user_id, church_id, role) VALUES
    (v_admin4_id, v_church4_id, 'super_admin'),
    (v_admin5_id, v_church5_id, 'super_admin')
  ON CONFLICT DO NOTHING;

  -- ========== Create church needs for the new churches ==========

  -- Resurrection Church Amman needs
  INSERT INTO church_needs (church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, contact_email)
  VALUES
    (v_church4_id, v_admin4_id,
     'Sound System Equipment', 'معدات نظام صوت',
     'We need a complete sound system for our new worship hall including speakers, mixer, and microphones.',
     'نحتاج نظام صوت كامل لقاعة العبادة الجديدة يشمل سماعات وميكسر ومايكروفونات.',
     'electronics', 1, 'high', 'open',
     'Rami Khoury', '+962791234567', 'admin@resurrectionamman.org'),
    (v_church4_id, v_admin4_id,
     'Children Sunday School Supplies', 'مستلزمات مدرسة الأحد للأطفال',
     'Art supplies, coloring books, educational materials for 50 children.',
     'مستلزمات فنية وكتب تلوين ومواد تعليمية لـ 50 طفلاً.',
     'educational', 50, 'medium', 'open',
     'Rami Khoury', '+962791234567', 'admin@resurrectionamman.org'),
    (v_church4_id, v_admin4_id,
     'Winter Clothing Distribution', 'توزيع ملابس شتوية',
     'Collecting winter jackets and blankets for families in need in our community.',
     'جمع جاكيتات وبطانيات شتوية للعائلات المحتاجة في مجتمعنا.',
     'clothing', 200, 'critical', 'open',
     'Rami Khoury', '+962791234567', 'admin@resurrectionamman.org');

  -- St. Mark Church Baghdad needs
  INSERT INTO church_needs (church_id, created_by, title, title_ar, description, description_ar, category, quantity, urgency, status, contact_name, contact_phone, contact_email)
  VALUES
    (v_church5_id, v_admin5_id,
     'Church Building Repair Materials', 'مواد ترميم مبنى الكنيسة',
     'Cement, paint, and roofing materials needed for urgent building repairs after storm damage.',
     'نحتاج إسمنت ودهان ومواد سقف لإصلاحات عاجلة بعد أضرار العاصفة.',
     'building', 1, 'critical', 'open',
     'Youssef Hanna', '+9647701234567', 'admin@stmarkbaghdad.org'),
    (v_church5_id, v_admin5_id,
     'Medical Supplies for Church Clinic', 'مستلزمات طبية لعيادة الكنيسة',
     'Basic medications, first aid kits, and blood pressure monitors for our free community clinic.',
     'أدوية أساسية وحقائب إسعافات أولية وأجهزة قياس ضغط الدم لعيادتنا المجانية.',
     'medical', 10, 'high', 'open',
     'Youssef Hanna', '+9647701234567', 'admin@stmarkbaghdad.org'),
    (v_church5_id, v_admin5_id,
     'Food Packages for Displaced Families', 'طرود غذائية للعائلات النازحة',
     'Monthly food packages for 30 displaced families attending our church.',
     'طرود غذائية شهرية لـ 30 عائلة نازحة تحضر كنيستنا.',
     'food', 30, 'critical', 'open',
     'Youssef Hanna', '+9647701234567', 'admin@stmarkbaghdad.org'),
    (v_church5_id, v_admin5_id,
     'Volunteer Teachers for Arabic Literacy', 'معلمون متطوعون لمحو الأمية',
     'Looking for 5 volunteer teachers to help with our Arabic literacy program for adults.',
     'نبحث عن 5 معلمين متطوعين للمساعدة في برنامج محو الأمية للكبار.',
     'volunteer', 5, 'medium', 'open',
     'Youssef Hanna', '+9647701234567', 'admin@stmarkbaghdad.org');

  -- ========== Create some cross-church responses to test notifications ==========

  -- Grace Church Cairo responds to Amman's sound system need
  INSERT INTO church_need_responses (need_id, responder_church_id, responder_user_id, message, message_ar, status)
  SELECT cn.id, (SELECT id FROM churches WHERE name = 'Grace Church Cairo' LIMIT 1), v_admin2_id,
    'We have a spare sound system from our old hall. Happy to ship it to you!',
    'لدينا نظام صوت إضافي من قاعتنا القديمة. يسعدنا إرساله إليكم!',
    'pending'
  FROM church_needs cn WHERE cn.title = 'Sound System Equipment' AND cn.church_id = v_church4_id;

  -- Hope Church Beirut responds to Baghdad's building repair need
  INSERT INTO church_need_responses (need_id, responder_church_id, responder_user_id, message, message_ar, status)
  SELECT cn.id, (SELECT id FROM churches WHERE name = 'Hope Church Beirut' LIMIT 1), v_admin3_id,
    'We can send building materials and a team of volunteers to help with repairs.',
    'يمكننا إرسال مواد بناء وفريق متطوعين للمساعدة في الإصلاحات.',
    'pending'
  FROM church_needs cn WHERE cn.title = 'Church Building Repair Materials' AND cn.church_id = v_church5_id;

  -- Grace Church (original) responds to Baghdad's food packages need
  INSERT INTO church_need_responses (need_id, responder_church_id, responder_user_id, message, message_ar, status)
  SELECT cn.id, v_church1_id, v_admin1_id,
    'Our church can sponsor 10 food packages per month. Let us coordinate delivery.',
    'كنيستنا يمكنها رعاية 10 طرود غذائية شهرياً. دعنا ننسّق التوصيل.',
    'pending'
  FROM church_needs cn WHERE cn.title = 'Food Packages for Displaced Families' AND cn.church_id = v_church5_id;

  RAISE NOTICE 'Created test churches and accounts:';
  RAISE NOTICE '  Resurrection Church Amman (%) → admin@resurrectionamman.org (%)', v_church4_id, v_admin4_id;
  RAISE NOTICE '  St. Mark Church Baghdad (%) → admin@stmarkbaghdad.org (%)', v_church5_id, v_admin5_id;
  RAISE NOTICE '  Created 7 new church needs and 3 cross-church responses';
END $$;

NOTIFY pgrst, 'reload schema';
