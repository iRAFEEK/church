-- ============================================================
-- COMPREHENSIVE SEED DATA FOR EKKLESIA
-- Church: كنيسة النعمة (Grace Church)
-- ~300 members, full data across all tables
-- ============================================================

BEGIN;

-- ============================================================
-- 0. Disable auto-profile trigger & Clean existing data
-- ============================================================
ALTER TABLE profiles DISABLE TRIGGER update_profiles_updated_at;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DELETE FROM event_service_assignments;
DELETE FROM event_service_needs;
DELETE FROM event_segments;
DELETE FROM event_template_segments;
DELETE FROM event_template_needs;
DELETE FROM event_templates;
DELETE FROM event_registrations;
DELETE FROM events;
DELETE FROM serving_signups;
DELETE FROM serving_slots;
DELETE FROM serving_areas;
DELETE FROM announcements;
DELETE FROM attendance;
DELETE FROM gatherings;
DELETE FROM prayer_requests;
DELETE FROM group_members;
DELETE FROM ministry_members;
DELETE FROM groups;
DELETE FROM ministries;
DELETE FROM visitors;
DELETE FROM notifications_log;
DELETE FROM church_leaders;
DELETE FROM profile_milestones;
DELETE FROM profiles;
DELETE FROM churches;
-- Clean auth identities and users we created
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@gracechurch.test');
DELETE FROM auth.users WHERE email LIKE '%@gracechurch.test';

-- ============================================================
-- 1. CHURCH
-- ============================================================
INSERT INTO churches (id, name, name_ar, country, timezone, primary_language, welcome_message, welcome_message_ar, denomination, visitor_sla_hours)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Grace Church',
  'كنيسة النعمة',
  'Lebanon',
  'Asia/Beirut',
  'ar',
  'Welcome to Grace Church! We are glad you are here.',
  'أهلاً بكم في كنيسة النعمة! يسعدنا وجودكم معنا.',
  'Evangelical',
  48
);

-- ============================================================
-- 2. AUTH USERS + PROFILES
-- We create users in auth.users, then matching profiles.
-- Password for ALL test users: "password123"
-- The bcrypt hash below corresponds to "password123"
-- ============================================================

-- Helper: insert into auth.users
-- We'll create 310 users (300 members + 10 key staff/leaders)
-- Key accounts with memorable emails:

-- PASTOR (super_admin)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'pastor@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '2 years', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Samuel', 'Haddad', 'صموئيل', 'حداد',
  'pastor@gracechurch.test', '+961 71 000 001', 'male',
  'super_admin', 'active', true, '2010-01-15', '1975-03-20', 'Senior Pastor', 'القس الأقدم'
);

-- ASSOCIATE PASTOR (super_admin)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'admin@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '1 year', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Nadia', 'Khoury', 'نادية', 'خوري',
  'admin@gracechurch.test', '+961 71 000 002', 'female',
  'super_admin', 'active', true, '2012-06-01', '1980-11-08', 'Associate Pastor', 'القسيسة المساعدة'
);

-- WORSHIP MINISTRY LEADER
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'worship@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '1 year', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
VALUES (
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Elias', 'Mansour', 'الياس', 'منصور',
  'worship@gracechurch.test', '+961 71 000 003', 'male',
  'ministry_leader', 'active', true, '2014-09-10', '1988-07-15', 'Worship Leader', 'قائد التسبيح'
);

-- YOUTH MINISTRY LEADER
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'youth@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '1 year', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
VALUES (
  'b0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Maya', 'Sarkis', 'مايا', 'سركيس',
  'youth@gracechurch.test', '+961 71 000 004', 'female',
  'ministry_leader', 'active', true, '2016-03-20', '1992-01-25', 'Youth Pastor', 'راعية الشباب'
);

-- CHILDREN MINISTRY LEADER
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'children@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '1 year', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
VALUES (
  'b0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Rita', 'Fares', 'ريتا', 'فارس',
  'children@gracechurch.test', '+961 71 000 005', 'female',
  'ministry_leader', 'active', true, '2015-08-12', '1985-04-30', 'Teacher', 'معلّمة'
);

-- MEDIA MINISTRY LEADER
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'media@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '6 months', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
VALUES (
  'b0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'Tony', 'Azar', 'طوني', 'عازار',
  'media@gracechurch.test', '+961 71 000 006', 'male',
  'ministry_leader', 'active', true, '2018-02-01', '1990-09-12', 'Graphic Designer', 'مصمم جرافيك'
);

-- GROUP LEADER 1
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  'leader1@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '1 year', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
VALUES (
  'b0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'George', 'Nasr', 'جورج', 'نصر',
  'leader1@gracechurch.test', '+961 71 000 007', 'male',
  'group_leader', 'active', true, '2017-01-10', '1986-12-05', 'Engineer', 'مهندس'
);

-- GROUP LEADER 2
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000000',
  'leader2@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '1 year', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
VALUES (
  'b0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000001',
  'Layla', 'Kassab', 'ليلى', 'قصاب',
  'leader2@gracechurch.test', '+961 71 000 008', 'female',
  'group_leader', 'active', true, '2018-05-15', '1991-06-20', 'Pharmacist', 'صيدلانية'
);

-- REGULAR MEMBER
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000000',
  'member@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '6 months', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
VALUES (
  'b0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000001',
  'Karim', 'Boutros', 'كريم', 'بطرس',
  'member@gracechurch.test', '+961 71 000 009', 'male',
  'member', 'active', true, '2020-03-01', '1995-08-10', 'Accountant', 'محاسب'
);

-- NEW MEMBER (just joined, onboarding not completed)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
VALUES (
  'b0000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000000',
  'newmember@gracechurch.test',
  '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  now(), now(), 'authenticated', 'authenticated', now() - interval '1 week', now(),
  '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
  '', '', '', '', '', '', '', ''
);
INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at)
VALUES (
  'b0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000001',
  'Sara', 'Karam', 'سارة', 'كرم',
  'newmember@gracechurch.test', '+961 71 000 010', 'female',
  'member', 'active', false, '2026-02-28'
);

-- ============================================================
-- 2b. BULK MEMBERS (290 more members to reach ~300)
-- ============================================================

-- Arabic first names pool
-- Male: ميشال، بيار، أنطوان، يوسف، مارون، شربل، إيلي، جاد، ربيع، فادي، وليد، عماد، خالد، باسم، طارق، حسن، عمر، رامي، سمير، كميل
-- Female: ماري، تريز، كلود، لينا، رنا، كارلا، جيسيكا، نتالي، غادة، هدى، سلوى، نور، دانا، ميرنا، ريما، سوزان، لمى، جنان، روز، ميراي

DO $$
DECLARE
  male_first TEXT[] := ARRAY['Michel','Pierre','Antoine','Youssef','Maroun','Charbel','Elie','Jad','Rabie','Fadi','Walid','Imad','Khaled','Bassem','Tarek','Hassan','Omar','Rami','Samir','Camille','Paul','Joseph','Daniel','Patrick','Marc','Philippe','Sami','Roy','Ralph','Kevin'];
  male_first_ar TEXT[] := ARRAY['ميشال','بيار','أنطوان','يوسف','مارون','شربل','إيلي','جاد','ربيع','فادي','وليد','عماد','خالد','باسم','طارق','حسن','عمر','رامي','سمير','كميل','بولس','جوزيف','دانيال','باتريك','مارك','فيليب','سامي','روي','رالف','كيفن'];
  female_first TEXT[] := ARRAY['Marie','Therese','Claude','Lina','Rana','Carla','Jessica','Natalie','Ghada','Huda','Salwa','Nour','Dana','Mirna','Rima','Suzanne','Lama','Jinan','Rose','Mireille','Sarah','Grace','Joy','Christina','Joelle','Sandra','Pamela','Tatiana','Diana','Cynthia'];
  female_first_ar TEXT[] := ARRAY['ماري','تريز','كلود','لينا','رنا','كارلا','جيسيكا','نتالي','غادة','هدى','سلوى','نور','دانا','ميرنا','ريما','سوزان','لمى','جنان','روز','ميراي','سارة','غريس','جوي','كريستينا','جويل','ساندرا','باميلا','تاتيانا','ديانا','سينتيا'];
  last_names TEXT[] := ARRAY['Haddad','Khoury','Mansour','Sarkis','Fares','Azar','Nasr','Kassab','Boutros','Karam','Saad','Khalil','Moussa','Ibrahim','Gerges','Sabbagh','Rizk','Tanios','Bou Nassif','Aoun','Saliba','Youssef','Bassil','Eid','Assaf','Daher','Jabbour','Makhoul','Frem','Helou'];
  last_names_ar TEXT[] := ARRAY['حداد','خوري','منصور','سركيس','فارس','عازار','نصر','قصاب','بطرس','كرم','سعد','خليل','موسى','إبراهيم','جرجس','صباغ','رزق','طانيوس','بو نصيف','عون','صليبا','يوسف','باسيل','عيد','عساف','ضاهر','جبور','مخّول','فرام','حلو'];
  occupations TEXT[] := ARRAY['Engineer','Teacher','Doctor','Nurse','Accountant','Lawyer','Designer','Developer','Manager','Student','Retired','Entrepreneur','Chef','Architect','Pharmacist'];
  occupations_ar TEXT[] := ARRAY['مهندس','معلّم','طبيب','ممرض','محاسب','محامي','مصمم','مبرمج','مدير','طالب','متقاعد','رائد أعمال','شيف','مهندس معماري','صيدلاني'];

  i INTEGER;
  uid UUID;
  fname TEXT;
  fname_ar TEXT;
  lname TEXT;
  lname_ar TEXT;
  gen gender_type;
  occ TEXT;
  occ_ar TEXT;
  role_val user_role;
  dob DATE;
  joined DATE;
  idx INTEGER;
BEGIN
  FOR i IN 1..290 LOOP
    uid := gen_random_uuid();

    -- Alternate male/female
    IF i % 2 = 0 THEN
      idx := (i % 30) + 1;
      fname := male_first[idx];
      fname_ar := male_first_ar[idx];
      gen := 'male';
    ELSE
      idx := (i % 30) + 1;
      fname := female_first[idx];
      fname_ar := female_first_ar[idx];
      gen := 'female';
    END IF;

    idx := ((i * 7) % 30) + 1;
    lname := last_names[idx];
    lname_ar := last_names_ar[idx];

    idx := (i % 15) + 1;
    occ := occupations[idx];
    occ_ar := occupations_ar[idx];

    -- Most are members, a few group leaders
    IF i <= 8 THEN
      role_val := 'group_leader';
    ELSE
      role_val := 'member';
    END IF;

    dob := '1970-01-01'::date + (floor(random() * 18000))::integer;
    joined := '2015-01-01'::date + (floor(random() * 3800))::integer;

    -- Create auth user
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token)
    VALUES (
      uid, '00000000-0000-0000-0000-000000000000',
      'member' || (i + 10)::text || '@gracechurch.test',
      '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
      now(), now(), 'authenticated', 'authenticated', now() - interval '1 year', now(),
      '{"provider":"email","providers":["email"]}', '{"email_verified":true}',
      '', '', '', '', '', '', '', ''
    );

    -- Create profile
    INSERT INTO profiles (id, church_id, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, role, status, onboarding_completed, joined_church_at, date_of_birth, occupation, occupation_ar)
    VALUES (
      uid,
      'a0000000-0000-0000-0000-000000000001',
      fname, lname, fname_ar, lname_ar,
      'member' || (i + 10)::text || '@gracechurch.test',
      '+961 71 ' || lpad((100 + i)::text, 3, '0') || ' ' || lpad((i * 13 % 1000)::text, 3, '0'),
      gen, role_val, 'active', true, joined, dob, occ, occ_ar
    );
  END LOOP;
END $$;

-- ============================================================
-- 2c. AUTH IDENTITIES (required by Supabase GoTrue)
-- ============================================================
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', false, 'phone_verified', false),
  now(), now(), now()
FROM auth.users
WHERE email LIKE '%@gracechurch.test';

-- ============================================================
-- 3. MINISTRIES (8 ministries)
-- ============================================================
INSERT INTO ministries (id, church_id, name, name_ar, leader_id, description, description_ar) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Worship', 'التسبيح', 'b0000000-0000-0000-0000-000000000003', 'Leading worship through music and song', 'قيادة التسبيح من خلال الموسيقى والترنيم'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Youth Ministry', 'خدمة الشباب', 'b0000000-0000-0000-0000-000000000004', 'Discipleship and fellowship for ages 15-25', 'تلمذة وشركة للأعمار ١٥-٢٥'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Children Ministry', 'خدمة الأطفال', 'b0000000-0000-0000-0000-000000000005', 'Teaching and nurturing children ages 3-12', 'تعليم ورعاية الأطفال من ٣ إلى ١٢ سنة'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Media & Tech', 'الإعلام والتقنية', 'b0000000-0000-0000-0000-000000000006', 'Sound, projection, live streaming, and social media', 'الصوت، العرض، البث المباشر، ووسائل التواصل'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Ushers & Welcome', 'الاستقبال', 'b0000000-0000-0000-0000-000000000001', 'Greeting guests and managing seating', 'استقبال الضيوف وتنظيم الجلوس'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Prayer Ministry', 'خدمة الصلاة', 'b0000000-0000-0000-0000-000000000002', 'Intercessory prayer and prayer room coordination', 'الصلاة الشفاعية وتنسيق غرفة الصلاة'),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Outreach', 'الكرازة', 'b0000000-0000-0000-0000-000000000001', 'Evangelism, community service, and missions', 'الكرازة وخدمة المجتمع والإرساليات'),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Hospitality', 'الضيافة', 'b0000000-0000-0000-0000-000000000002', 'Coffee, snacks, and fellowship meals', 'القهوة والوجبات الخفيفة ووجبات الشركة');

-- ============================================================
-- 4. MINISTRY MEMBERS (populate each ministry with members)
-- ============================================================

-- Worship: 20 members
INSERT INTO ministry_members (ministry_id, church_id, profile_id)
SELECT 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id != 'b0000000-0000-0000-0000-000000000003'
ORDER BY random() LIMIT 20;

-- Youth: 25 members
INSERT INTO ministry_members (ministry_id, church_id, profile_id)
SELECT 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id != 'b0000000-0000-0000-0000-000000000004'
AND id NOT IN (SELECT profile_id FROM ministry_members WHERE ministry_id = 'c0000000-0000-0000-0000-000000000002')
ORDER BY random() LIMIT 25;

-- Children: 15 members
INSERT INTO ministry_members (ministry_id, church_id, profile_id)
SELECT 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id != 'b0000000-0000-0000-0000-000000000005'
ORDER BY random() LIMIT 15;

-- Media: 10 members
INSERT INTO ministry_members (ministry_id, church_id, profile_id)
SELECT 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id != 'b0000000-0000-0000-0000-000000000006'
ORDER BY random() LIMIT 10;

-- Ushers: 18 members
INSERT INTO ministry_members (ministry_id, church_id, profile_id)
SELECT 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY random() LIMIT 18;

-- Prayer: 12 members
INSERT INTO ministry_members (ministry_id, church_id, profile_id)
SELECT 'c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY random() LIMIT 12;

-- Outreach: 15 members
INSERT INTO ministry_members (ministry_id, church_id, profile_id)
SELECT 'c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY random() LIMIT 15;

-- Hospitality: 12 members
INSERT INTO ministry_members (ministry_id, church_id, profile_id)
SELECT 'c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY random() LIMIT 12;

-- ============================================================
-- 5. GROUPS (12 groups)
-- ============================================================
INSERT INTO groups (id, church_id, ministry_id, name, name_ar, type, leader_id, co_leader_id, meeting_day, meeting_time, meeting_location, meeting_location_ar, meeting_frequency, max_members) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NULL, 'Beirut Young Adults', 'شباب بيروت', 'small_group', 'b0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000008', 'Friday', '19:00', 'Church Hall Room A', 'قاعة الكنيسة - غرفة أ', 'weekly', 20),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', NULL, 'Married Couples', 'الأزواج', 'family', NULL, NULL, 'Saturday', '18:00', 'Church Hall Room B', 'قاعة الكنيسة - غرفة ب', 'biweekly', 16),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Teen Bible Study', 'دراسة الكتاب للمراهقين', 'youth', 'b0000000-0000-0000-0000-000000000004', NULL, 'Wednesday', '17:00', 'Youth Room', 'غرفة الشباب', 'weekly', 25),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', NULL, 'Men of Faith', 'رجال الإيمان', 'men', NULL, NULL, 'Tuesday', '06:30', 'Church Lounge', 'صالون الكنيسة', 'weekly', 15),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', NULL, 'Women of Grace', 'نساء النعمة', 'women', 'b0000000-0000-0000-0000-000000000008', NULL, 'Thursday', '10:00', 'Church Hall Room A', 'قاعة الكنيسة - غرفة أ', 'weekly', 20),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', NULL, 'Intercessory Prayer', 'صلاة شفاعية', 'prayer', NULL, NULL, 'Monday', '20:00', 'Prayer Room', 'غرفة الصلاة', 'weekly', 30),
  ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', NULL, 'New Believers', 'المؤمنون الجدد', 'small_group', 'b0000000-0000-0000-0000-000000000007', NULL, 'Sunday', '17:00', 'Church Office', 'مكتب الكنيسة', 'weekly', 12),
  ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', NULL, 'Seniors Fellowship', 'شركة كبار السن', 'other', NULL, NULL, 'Wednesday', '11:00', 'Church Hall Room B', 'قاعة الكنيسة - غرفة ب', 'weekly', 20),
  ('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'College & Career', 'الجامعيون والمهنيون', 'youth', NULL, NULL, 'Friday', '20:00', 'Youth Room', 'غرفة الشباب', 'weekly', 20),
  ('d0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', NULL, 'Jbeil Home Group', 'مجموعة جبيل البيتية', 'small_group', NULL, NULL, 'Thursday', '19:30', 'Home — Jbeil', 'منزل — جبيل', 'weekly', 15),
  ('d0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', NULL, 'Jounieh Home Group', 'مجموعة جونية البيتية', 'small_group', NULL, NULL, 'Wednesday', '19:30', 'Home — Jounieh', 'منزل — جونية', 'weekly', 15),
  ('d0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Kids Sunday School', 'مدرسة الأحد للأطفال', 'other', 'b0000000-0000-0000-0000-000000000005', NULL, 'Sunday', '10:00', 'Children Hall', 'قاعة الأطفال', 'weekly', 40);

-- Assign leaders to groups that don't have them (pick random group_leaders)
UPDATE groups SET leader_id = (SELECT id FROM profiles WHERE role = 'group_leader' ORDER BY random() LIMIT 1) WHERE leader_id IS NULL;

-- ============================================================
-- 6. GROUP MEMBERS
-- ============================================================
DO $$
DECLARE
  grp RECORD;
  member_ids UUID[];
  m UUID;
BEGIN
  FOR grp IN SELECT id, max_members FROM groups WHERE church_id = 'a0000000-0000-0000-0000-000000000001' LOOP
    SELECT array_agg(id) INTO member_ids
    FROM (
      SELECT id FROM profiles
      WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
        AND id NOT IN (SELECT profile_id FROM group_members WHERE group_id = grp.id)
        AND id != (SELECT COALESCE(leader_id, gen_random_uuid()) FROM groups WHERE id = grp.id)
      ORDER BY random()
      LIMIT LEAST(grp.max_members - 2, 8 + floor(random() * 10)::integer)
    ) sub;

    IF member_ids IS NOT NULL THEN
      FOREACH m IN ARRAY member_ids LOOP
        INSERT INTO group_members (group_id, church_id, profile_id, role_in_group)
        VALUES (grp.id, 'a0000000-0000-0000-0000-000000000001', m, 'member')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 7. EVENTS (past + upcoming)
-- ============================================================

-- Past Sunday services (last 8 weeks)
INSERT INTO events (id, church_id, created_by, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, registration_required, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', now() - interval '56 days' + time '10:00', now() - interval '56 days' + time '12:00', 'Main Sanctuary', 300, true, false, 'completed'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', now() - interval '49 days' + time '10:00', now() - interval '49 days' + time '12:00', 'Main Sanctuary', 300, true, false, 'completed'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', now() - interval '42 days' + time '10:00', now() - interval '42 days' + time '12:00', 'Main Sanctuary', 300, true, false, 'completed'),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', now() - interval '35 days' + time '10:00', now() - interval '35 days' + time '12:00', 'Main Sanctuary', 300, true, false, 'completed'),
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', now() - interval '28 days' + time '10:00', now() - interval '28 days' + time '12:00', 'Main Sanctuary', 300, true, false, 'completed'),
  ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', now() - interval '21 days' + time '10:00', now() - interval '21 days' + time '12:00', 'Main Sanctuary', 300, true, false, 'completed'),
  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', now() - interval '14 days' + time '10:00', now() - interval '14 days' + time '12:00', 'Main Sanctuary', 300, true, false, 'completed'),
  ('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', now() - interval '7 days' + time '10:00', now() - interval '7 days' + time '12:00', 'Main Sanctuary', 300, true, false, 'completed');

-- Upcoming Sunday services (next 4 weeks)
INSERT INTO events (id, church_id, created_by, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, registration_required, status) VALUES
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', (date_trunc('week', now()) + interval '6 days' + time '10:00')::timestamptz, (date_trunc('week', now()) + interval '6 days' + time '12:00')::timestamptz, 'Main Sanctuary', 300, true, false, 'published'),
  ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', (date_trunc('week', now()) + interval '13 days' + time '10:00')::timestamptz, (date_trunc('week', now()) + interval '13 days' + time '12:00')::timestamptz, 'Main Sanctuary', 300, true, false, 'published'),
  ('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', (date_trunc('week', now()) + interval '20 days' + time '10:00')::timestamptz, (date_trunc('week', now()) + interval '20 days' + time '12:00')::timestamptz, 'Main Sanctuary', 300, true, false, 'draft'),
  ('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'service', (date_trunc('week', now()) + interval '27 days' + time '10:00')::timestamptz, (date_trunc('week', now()) + interval '27 days' + time '12:00')::timestamptz, 'Main Sanctuary', 300, true, false, 'draft');

-- Special events
INSERT INTO events (id, church_id, created_by, title, title_ar, description, description_ar, event_type, starts_at, ends_at, location, capacity, is_public, registration_required, status) VALUES
  ('e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'Youth Night', 'سهرة الشباب', 'Monthly youth gathering with worship, games, and a message', 'لقاء شبابي شهري مع تسبيح وألعاب وكلمة', 'youth', (date_trunc('week', now()) + interval '5 days' + time '19:00')::timestamptz, (date_trunc('week', now()) + interval '5 days' + time '21:30')::timestamptz, 'Youth Room', 60, true, true, 'published'),
  ('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Easter Service', 'خدمة عيد الفصح', 'Special Easter celebration service', 'خدمة احتفال عيد الفصح المميزة', 'service', '2026-04-05 10:00:00+03', '2026-04-05 13:00:00+03', 'Main Sanctuary', 400, true, true, 'published'),
  ('e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Women''s Conference', 'مؤتمر النساء', 'Annual women''s conference: "Rooted in Grace"', 'مؤتمر النساء السنوي: "متجذرات في النعمة"', 'conference', '2026-03-28 09:00:00+03', '2026-03-28 17:00:00+03', 'Church Hall', 120, true, true, 'published'),
  ('e0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Prayer & Worship Night', 'سهرة صلاة وتسبيح', 'A night of prayer and worship', 'سهرة صلاة وتسبيح', 'prayer', (date_trunc('week', now()) + interval '3 days' + time '19:30')::timestamptz, (date_trunc('week', now()) + interval '3 days' + time '21:30')::timestamptz, 'Main Sanctuary', 200, true, false, 'published'),
  ('e0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'Church Picnic', 'نزهة الكنيسة', 'Annual spring picnic for all families', 'النزهة السنوية الربيعية لجميع العائلات', 'social', '2026-04-18 10:00:00+03', '2026-04-18 16:00:00+03', 'Faraya Park', 200, true, true, 'published'),
  ('e0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'Youth Retreat', 'خلوة الشباب', '3-day youth retreat in the mountains', 'خلوة شبابية لمدة ٣ أيام في الجبل', 'retreat', '2026-05-01 08:00:00+03', '2026-05-03 14:00:00+03', 'Camp Ehden', 50, false, true, 'draft'),
  -- Past special events
  ('e0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Christmas Service', 'خدمة عيد الميلاد', 'Christmas Eve celebration', 'احتفال ليلة عيد الميلاد', 'service', '2025-12-24 18:00:00+03', '2025-12-24 20:30:00+03', 'Main Sanctuary', 400, true, false, 'completed'),
  ('e0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'Youth Worship Night', 'سهرة تسبيح شبابية', 'Youth-led worship night', 'سهرة تسبيح يقودها الشباب', 'youth', now() - interval '10 days' + time '19:00', now() - interval '10 days' + time '21:00', 'Youth Room', 60, true, false, 'completed');

-- ============================================================
-- 8. EVENT SERVICE NEEDS (for upcoming Sunday + special events)
-- ============================================================
INSERT INTO event_service_needs (id, event_id, church_id, ministry_id, volunteers_needed, notes, notes_ar) VALUES
  -- This Sunday
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 5, 'Full worship team needed', 'فريق تسبيح كامل مطلوب'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 3, 'Sound, projection, camera', 'صوت، عرض، كاميرا'),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 4, 'Door greeters and ushers', 'استقبال وتنظيم'),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 6, 'Sunday school teachers', 'معلّمو مدرسة الأحد'),
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 3, 'Coffee and snacks', 'قهوة ووجبات خفيفة'),
  -- Next Sunday
  ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 5, NULL, NULL),
  ('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 3, NULL, NULL),
  ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 4, NULL, NULL),
  -- Easter
  ('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 8, 'Extended worship + choir', 'تسبيح مطوّل + جوقة'),
  ('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 5, 'Extra cameras for livestream', 'كاميرات إضافية للبث المباشر'),
  ('f0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 8, 'Extra ushers for overflow seating', 'مرشدون إضافيون للمقاعد الإضافية'),
  ('f0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 6, 'Easter brunch after service', 'غداء الفصح بعد الخدمة'),
  -- Youth Night
  ('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 4, 'Youth worship band', 'فرقة تسبيح الشباب'),
  ('f0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 2, 'Sound and lights', 'صوت وإنارة');

-- ============================================================
-- 9. EVENT SERVICE ASSIGNMENTS (for this Sunday)
-- ============================================================
INSERT INTO event_service_assignments (service_need_id, church_id, profile_id, assigned_by, status, role, role_ar) VALUES
  -- Worship team
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'confirmed', 'Worship Leader', 'قائد التسبيح'),
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN ('b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000006') ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000003', 'confirmed', 'Vocalist', 'مرنّم'),
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000003', 'assigned', 'Guitarist', 'عازف جيتار'),
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000003', 'confirmed', 'Pianist', 'عازف بيانو'),
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000003', 'declined', 'Drummer', 'عازف درمز'),
  -- Media team
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'confirmed', 'Sound Engineer', 'مهندس صوت'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000006', 'confirmed', 'Projectionist', 'عارض'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000006', 'assigned', 'Camera Operator', 'مشغّل كاميرا'),
  -- Ushers
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000001', 'confirmed', 'Head Usher', 'رئيس المرشدين'),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000001', 'confirmed', 'Usher', 'مرشد'),
  -- Children
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'confirmed', 'Lead Teacher', 'المعلّمة الرئيسية'),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000005', 'confirmed', 'Assistant', 'مساعد'),
  -- Hospitality
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000002', 'confirmed', 'Barista', 'باريستا'),
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', (SELECT id FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND id NOT IN (SELECT profile_id FROM event_service_assignments) ORDER BY random() LIMIT 1), 'b0000000-0000-0000-0000-000000000002', 'assigned', 'Setup', 'تجهيز');

-- ============================================================
-- 10. EVENT REGISTRATIONS (for events requiring registration)
-- ============================================================
-- Youth Night registrations
INSERT INTO event_registrations (event_id, church_id, profile_id, name, email, phone, status)
SELECT 'e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', id,
       first_name || ' ' || last_name, email, phone, 'registered'
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY random() LIMIT 35;

-- Easter registrations
INSERT INTO event_registrations (event_id, church_id, profile_id, name, email, phone, status)
SELECT 'e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', id,
       first_name || ' ' || last_name, email, phone, 'registered'
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY random() LIMIT 180;

-- Women's Conference registrations (women only)
INSERT INTO event_registrations (event_id, church_id, profile_id, name, email, phone, status)
SELECT 'e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', id,
       first_name || ' ' || last_name, email, phone, 'registered'
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND gender = 'female'
ORDER BY random() LIMIT 75;

-- Church Picnic registrations
INSERT INTO event_registrations (event_id, church_id, profile_id, name, email, phone, status)
SELECT 'e0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001', id,
       first_name || ' ' || last_name, email, phone, 'registered'
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY random() LIMIT 90;

-- Some visitor registrations for Easter (non-members)
INSERT INTO event_registrations (event_id, church_id, name, phone, email, status) VALUES
  ('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Ahmad Saleh', '+961 76 111 999', 'ahmad.s@gmail.com', 'registered'),
  ('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Mona Fakhoury', '+961 76 222 888', NULL, 'registered'),
  ('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Rania Wehbe', '+961 76 333 777', 'rania.w@outlook.com', 'registered'),
  ('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Fadi Tannous', '+961 76 444 666', NULL, 'registered'),
  ('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Hala Bashir', '+961 76 555 555', 'hala.b@gmail.com', 'registered');

-- ============================================================
-- 11. EVENT SEGMENTS (Run of Show for this Sunday)
-- ============================================================
INSERT INTO event_segments (event_id, church_id, title, title_ar, duration_minutes, ministry_id, assigned_to, notes, notes_ar, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Welcome & Announcements', 'ترحيب وإعلانات', 5, NULL, 'b0000000-0000-0000-0000-000000000001', 'Pastor Samuel opens', 'القس صموئيل يفتتح', 0),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Worship Set 1', 'تسبيح - المجموعة الأولى', 20, 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '3 songs: praise, praise, slower', '٣ ترانيم: تسبيح، تسبيح، أبطأ', 1),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Prayer', 'صلاة', 5, 'c0000000-0000-0000-0000-000000000006', NULL, 'Congregational prayer', 'صلاة جماعية', 2),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Offering', 'تقدمة', 5, 'c0000000-0000-0000-0000-000000000005', NULL, 'Ushers collect offering', 'المرشدون يجمعون التقدمة', 3),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Scripture Reading', 'قراءة الكتاب المقدس', 5, NULL, NULL, NULL, NULL, 4),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Sermon', 'العظة', 35, NULL, 'b0000000-0000-0000-0000-000000000001', 'Series: "Walking in the Light" - Part 4', 'سلسلة: "المشي في النور" - الجزء ٤', 5),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Worship Set 2', 'تسبيح - المجموعة الثانية', 15, 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '2 response songs', '٢ ترنيمة استجابة', 6),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Communion', 'العشاء الرباني', 10, NULL, 'b0000000-0000-0000-0000-000000000001', 'First Sunday of month', 'الأحد الأول من الشهر', 7),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Closing & Benediction', 'الختام والبركة', 5, NULL, 'b0000000-0000-0000-0000-000000000001', NULL, NULL, 8),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Fellowship & Coffee', 'شركة وقهوة', 30, 'c0000000-0000-0000-0000-000000000008', NULL, NULL, NULL, 9);

-- ============================================================
-- 12. EVENT TEMPLATES
-- ============================================================
INSERT INTO event_templates (id, church_id, name, name_ar, event_type, title, title_ar, description, description_ar, location, capacity, is_public, registration_required, notes, notes_ar, created_by) VALUES
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sunday Morning Service', 'خدمة صباح الأحد', 'service', 'Sunday Service', 'خدمة الأحد', 'Weekly Sunday morning worship service', 'خدمة عبادة صباح الأحد الأسبوعية', 'Main Sanctuary', 300, true, false, 'Check with pastor about communion (1st Sunday of month). Remind media team about livestream.', 'تحقق مع القس عن العشاء الرباني (أحد أول من الشهر). ذكّر فريق الإعلام بالبث المباشر.', 'b0000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Youth Night', 'سهرة الشباب', 'youth', 'Youth Night', 'سهرة الشباب', 'Monthly youth gathering with worship, games, and a message', 'لقاء شبابي شهري مع تسبيح وألعاب وكلمة', 'Youth Room', 60, true, true, 'Check snack budget with admin. Need 2 leaders for games.', 'تحقق من ميزانية الوجبات الخفيفة مع الإدارة. حاجة لـ٢ قادة للألعاب.', 'b0000000-0000-0000-0000-000000000004'),
  ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Prayer & Worship Night', 'سهرة صلاة وتسبيح', 'prayer', 'Prayer & Worship Night', 'سهرة صلاة وتسبيح', 'A night devoted to prayer and worship', 'سهرة مكرّسة للصلاة والتسبيح', 'Main Sanctuary', 200, true, false, NULL, NULL, 'b0000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Kids Sunday School', 'مدرسة الأحد للأطفال', 'service', 'Kids Sunday School', 'مدرسة الأحد للأطفال', 'Sunday school program for children ages 3-12', 'برنامج مدرسة الأحد للأطفال من ٣ إلى ١٢ سنة', 'Children Hall', 40, false, false, 'Curriculum: Bible Adventures Q2. Snacks needed.', 'المنهاج: مغامرات الكتاب المقدس الفصل ٢. حاجة لوجبات خفيفة.', 'b0000000-0000-0000-0000-000000000005');

-- ============================================================
-- 13. EVENT TEMPLATE NEEDS
-- ============================================================
INSERT INTO event_template_needs (template_id, church_id, ministry_id, volunteers_needed, notes, notes_ar) VALUES
  -- Sunday Service template
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 5, 'Full band: leader, 2 vocalists, keys, guitar', 'فرقة كاملة: قائد، ٢ مرنّم، كيبورد، جيتار'),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 3, 'Sound, projection, camera', 'صوت، عرض، كاميرا'),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 4, 'Greeters at doors', 'مستقبلون عند الأبواب'),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 6, 'Sunday school classes', 'صفوف مدرسة الأحد'),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 3, 'Coffee and setup', 'قهوة وتجهيز'),
  -- Youth Night template
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 4, 'Youth worship band', 'فرقة تسبيح الشباب'),
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 2, 'Sound and lights', 'صوت وإنارة'),
  -- Prayer Night template
  ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 3, 'Acoustic worship set', 'فريق تسبيح أكوستيك'),
  ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 1, 'Sound only', 'صوت فقط'),
  -- Kids Sunday School
  ('70000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 6, 'Teachers and helpers', 'معلّمون ومساعدون');

-- ============================================================
-- 14. EVENT TEMPLATE SEGMENTS
-- ============================================================
INSERT INTO event_template_segments (template_id, church_id, title, title_ar, duration_minutes, ministry_id, notes, notes_ar, sort_order) VALUES
  -- Sunday Service template
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Welcome & Announcements', 'ترحيب وإعلانات', 5, NULL, NULL, NULL, 0),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Worship Set 1', 'تسبيح - المجموعة الأولى', 20, 'c0000000-0000-0000-0000-000000000001', '3 songs: upbeat → medium → slower', '٣ ترانيم: حماسية → متوسطة → أبطأ', 1),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Prayer', 'صلاة', 5, 'c0000000-0000-0000-0000-000000000006', NULL, NULL, 2),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Offering', 'تقدمة', 5, 'c0000000-0000-0000-0000-000000000005', NULL, NULL, 3),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Scripture Reading', 'قراءة الكتاب المقدس', 5, NULL, NULL, NULL, 4),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sermon', 'العظة', 35, NULL, NULL, NULL, 5),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Worship Set 2', 'تسبيح - المجموعة الثانية', 15, 'c0000000-0000-0000-0000-000000000001', 'Response songs', 'ترانيم استجابة', 6),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Closing & Benediction', 'الختام والبركة', 5, NULL, NULL, NULL, 7),
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Fellowship & Coffee', 'شركة وقهوة', 30, 'c0000000-0000-0000-0000-000000000008', NULL, NULL, 8),
  -- Youth Night template
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Doors Open & Hangout', 'فتح الأبواب وتجمع', 15, NULL, 'Background music, snacks available', 'موسيقى خلفية، وجبات خفيفة متوفرة', 0),
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Ice Breaker Game', 'لعبة كسر الجليد', 15, NULL, NULL, NULL, 1),
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Worship', 'تسبيح', 20, 'c0000000-0000-0000-0000-000000000002', NULL, NULL, 2),
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Message', 'كلمة', 25, NULL, NULL, NULL, 3),
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Small Group Discussion', 'نقاش مجموعات صغيرة', 20, NULL, 'Break into groups of 5-6', 'تقسيم إلى مجموعات من ٥-٦', 4),
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Closing Prayer & Hangout', 'صلاة ختامية وتجمع', 15, NULL, NULL, NULL, 5),
  -- Prayer Night template
  ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Worship', 'تسبيح', 20, 'c0000000-0000-0000-0000-000000000001', 'Slow, contemplative songs', 'ترانيم بطيئة وتأملية', 0),
  ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Scripture & Devotional', 'كلمة وتأمل', 15, NULL, NULL, NULL, 1),
  ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Prayer Stations', 'محطات الصلاة', 30, 'c0000000-0000-0000-0000-000000000006', '4 stations around the room', '٤ محطات حول القاعة', 2),
  ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Corporate Prayer', 'صلاة جماعية', 20, NULL, NULL, NULL, 3),
  ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Closing Worship', 'تسبيح ختامي', 15, 'c0000000-0000-0000-0000-000000000001', NULL, NULL, 4);

-- ============================================================
-- 15. VISITORS (15 recent visitors)
-- ============================================================
INSERT INTO visitors (church_id, first_name, last_name, first_name_ar, last_name_ar, phone, email, age_range, occupation, how_heard, visited_at, status, assigned_to, contacted_at, contact_notes) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Adam', 'Obeid', 'آدم', 'عبيد', '+961 76 111 111', 'adam.obeid@gmail.com', '18_25', 'Student', 'friend', now() - interval '2 days', 'new', NULL, NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'Lara', 'Hanna', 'لارا', 'حنا', '+961 76 222 222', 'lara.hanna@gmail.com', '26_35', 'Nurse', 'social_media', now() - interval '3 days', 'assigned', 'b0000000-0000-0000-0000-000000000007', NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'Joseph', 'Bitar', 'جوزيف', 'بيطار', '+961 76 333 333', NULL, '36_45', 'Businessman', 'walk_in', now() - interval '5 days', 'contacted', 'b0000000-0000-0000-0000-000000000008', now() - interval '3 days', 'Very interested in joining a group'),
  ('a0000000-0000-0000-0000-000000000001', 'Nathalie', 'Younes', 'ناتالي', 'يونس', '+961 76 444 444', 'nathalie.y@gmail.com', '26_35', 'Teacher', 'friend', now() - interval '7 days', 'contacted', 'b0000000-0000-0000-0000-000000000007', now() - interval '5 days', 'Invited to women''s group'),
  ('a0000000-0000-0000-0000-000000000001', 'Mark', 'Abboud', 'مارك', 'عبود', '+961 76 555 555', NULL, '18_25', 'Student', 'event', now() - interval '10 days', 'converted', 'b0000000-0000-0000-0000-000000000004', now() - interval '8 days', 'Joined youth group!'),
  ('a0000000-0000-0000-0000-000000000001', 'Tina', 'Gemayel', 'تينا', 'الجميّل', '+961 76 666 666', 'tina.g@hotmail.com', '46_55', NULL, 'website', now() - interval '14 days', 'contacted', 'b0000000-0000-0000-0000-000000000008', now() - interval '12 days', 'Interested in prayer ministry'),
  ('a0000000-0000-0000-0000-000000000001', 'Elio', 'Najm', 'إيليو', 'نجم', '+961 76 777 777', NULL, '18_25', 'Barista', 'friend', now() - interval '1 day', 'new', NULL, NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'Raya', 'Salameh', 'رايا', 'سلامة', '+961 76 888 888', 'raya.s@outlook.com', '26_35', 'Designer', 'social_media', now() - interval '1 day', 'new', NULL, NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'Simon', 'Harb', 'سيمون', 'حرب', '+961 76 999 999', NULL, '56_plus', 'Retired', 'walk_in', now() - interval '21 days', 'lost', 'b0000000-0000-0000-0000-000000000007', now() - interval '18 days', 'Called twice, no answer'),
  ('a0000000-0000-0000-0000-000000000001', 'Lea', 'Rached', 'ليا', 'راشد', '+961 70 111 222', 'lea.rached@gmail.com', '18_25', 'Student', 'friend', now() - interval '4 days', 'assigned', 'b0000000-0000-0000-0000-000000000008', NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'Georges', 'Khoury', 'جورج', 'خوري', '+961 70 333 444', NULL, '36_45', 'Engineer', 'friend', now() - interval '6 days', 'new', NULL, NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'Farah', 'Daou', 'فرح', 'ضو', '+961 70 555 666', 'farah.daou@yahoo.com', '26_35', 'Architect', 'event', now() - interval '8 days', 'assigned', 'b0000000-0000-0000-0000-000000000007', NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'Wael', 'Makdisi', 'وائل', 'مقدسي', '+961 70 777 888', NULL, '46_55', 'Doctor', 'website', now() - interval '12 days', 'contacted', 'b0000000-0000-0000-0000-000000000008', now() - interval '10 days', 'Will come again next Sunday'),
  ('a0000000-0000-0000-0000-000000000001', 'Christelle', 'Abi Nader', 'كريستيل', 'أبي نادر', '+961 70 999 000', 'christelle.an@gmail.com', '18_25', NULL, 'social_media', now() - interval '2 days', 'new', NULL, NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'Roy', 'Hajj', 'روي', 'حج', '+961 71 222 333', NULL, '26_35', 'Developer', 'friend', now() - interval '3 days', 'new', NULL, NULL, NULL);

-- ============================================================
-- 16. SERVING AREAS & SLOTS
-- ============================================================
INSERT INTO serving_areas (id, church_id, name, name_ar, description, description_ar, ministry_id) VALUES
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sunday Coffee Bar', 'بار القهوة الأحد', 'Serve coffee and snacks after service', 'تقديم القهوة والوجبات الخفيفة بعد الخدمة', 'c0000000-0000-0000-0000-000000000008'),
  ('80000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Parking Team', 'فريق المواقف', 'Direct traffic and greet in parking lot', 'توجيه السيارات والترحيب في المواقف', 'c0000000-0000-0000-0000-000000000005'),
  ('80000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Kids Check-in', 'تسجيل الأطفال', 'Check in children for Sunday school', 'تسجيل الأطفال لمدرسة الأحد', 'c0000000-0000-0000-0000-000000000003'),
  ('80000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Greeter Team', 'فريق الاستقبال', 'Welcome people at the doors', 'الترحيب بالناس عند الأبواب', 'c0000000-0000-0000-0000-000000000005');

INSERT INTO serving_slots (id, church_id, serving_area_id, title, title_ar, date, start_time, end_time, max_volunteers, created_by) VALUES
  -- This Sunday slots
  ('81000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Sunday Coffee Service', 'خدمة القهوة الأحد', (date_trunc('week', now()) + interval '6 days')::date, '09:30', '13:00', 3, 'b0000000-0000-0000-0000-000000000002'),
  ('81000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'Parking Duty', 'مناوبة المواقف', (date_trunc('week', now()) + interval '6 days')::date, '09:00', '11:00', 2, 'b0000000-0000-0000-0000-000000000002'),
  ('81000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000003', 'Kids Check-in Desk', 'مكتب تسجيل الأطفال', (date_trunc('week', now()) + interval '6 days')::date, '09:45', '12:15', 2, 'b0000000-0000-0000-0000-000000000005'),
  ('81000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000004', 'Door Greeters', 'مستقبلون عند الأبواب', (date_trunc('week', now()) + interval '6 days')::date, '09:30', '10:30', 4, 'b0000000-0000-0000-0000-000000000002'),
  -- Next Sunday slots
  ('81000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Sunday Coffee Service', 'خدمة القهوة الأحد', (date_trunc('week', now()) + interval '13 days')::date, '09:30', '13:00', 3, 'b0000000-0000-0000-0000-000000000002'),
  ('81000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'Parking Duty', 'مناوبة المواقف', (date_trunc('week', now()) + interval '13 days')::date, '09:00', '11:00', 2, 'b0000000-0000-0000-0000-000000000002');

-- Signups for this Sunday
INSERT INTO serving_signups (church_id, slot_id, profile_id)
SELECT 'a0000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001' ORDER BY random() LIMIT 2;

INSERT INTO serving_signups (church_id, slot_id, profile_id)
SELECT 'a0000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000002', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
AND id NOT IN (SELECT profile_id FROM serving_signups)
ORDER BY random() LIMIT 2;

INSERT INTO serving_signups (church_id, slot_id, profile_id)
SELECT 'a0000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000004', id
FROM profiles WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
AND id NOT IN (SELECT profile_id FROM serving_signups)
ORDER BY random() LIMIT 3;

-- ============================================================
-- 17. ANNOUNCEMENTS
-- ============================================================
INSERT INTO announcements (church_id, title, title_ar, body, body_ar, status, is_pinned, published_at, expires_at, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Easter Service — April 5', 'خدمة عيد الفصح — ٥ نيسان', 'Join us for a special Easter celebration! Invite your friends and family. Service starts at 10 AM followed by Easter brunch.', 'انضموا إلينا لاحتفال عيد الفصح المميز! ادعوا أصدقاءكم وعائلاتكم. الخدمة تبدأ الساعة ١٠ صباحاً يليها غداء الفصح.', 'published', true, now() - interval '3 days', '2026-04-06', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'Women''s Conference Registration Open', 'التسجيل مفتوح لمؤتمر النساء', 'Register now for our annual women''s conference "Rooted in Grace" on March 28. Limited spots available!', 'سجّلي الآن لمؤتمر النساء السنوي "متجذرات في النعمة" في ٢٨ آذار. المقاعد محدودة!', 'published', false, now() - interval '7 days', '2026-03-29', 'b0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', 'New Small Group Starting', 'مجموعة صغيرة جديدة تبدأ', 'A new small group is starting in Jounieh on Wednesdays at 7:30 PM. Contact George Nasr if interested.', 'مجموعة صغيرة جديدة تبدأ في جونية يوم الأربعاء الساعة ٧:٣٠ مساءً. تواصلوا مع جورج نصر إن كنتم مهتمين.', 'published', false, now() - interval '5 days', now() + interval '30 days', 'b0000000-0000-0000-0000-000000000007'),
  ('a0000000-0000-0000-0000-000000000001', 'Church Picnic — April 18', 'نزهة الكنيسة — ١٨ نيسان', 'Save the date! Annual spring picnic at Faraya Park. Food, games, and fellowship for the whole family. Registration required.', 'احجزوا الموعد! النزهة السنوية الربيعية في فاريا بارك. طعام، ألعاب، وشركة لكل العائلة. التسجيل مطلوب.', 'published', false, now() - interval '2 days', '2026-04-19', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'Volunteers Needed for Easter', 'متطوعون مطلوبون لعيد الفصح', 'We need extra volunteers for Easter Sunday: ushers, hospitality, kids ministry, and parking. Sign up through the app!', 'نحتاج متطوعين إضافيين لأحد الفصح: مرشدون، ضيافة، خدمة أطفال، ومواقف. سجّلوا من خلال التطبيق!', 'published', true, now() - interval '1 day', '2026-04-06', 'b0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', 'Midweek Prayer Meeting', 'اجتماع الصلاة النصف أسبوعي', 'Join us every Wednesday at 7 PM for our midweek prayer meeting in the sanctuary.', 'انضموا إلينا كل أربعاء الساعة ٧ مساءً لاجتماع الصلاة في القاعة الرئيسية.', 'published', false, now() - interval '14 days', now() + interval '60 days', 'b0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', 'Youth Retreat Registration', 'تسجيل خلوة الشباب', 'Youth retreat May 1-3 at Camp Ehden. Register by April 15!', 'خلوة الشباب ١-٣ أيار في مخيم إهدن. سجّلوا قبل ١٥ نيسان!', 'draft', false, NULL, '2026-04-15', 'b0000000-0000-0000-0000-000000000004');

-- ============================================================
-- 18. SONGS
-- ============================================================
INSERT INTO songs (church_id, title, title_ar, artist, artist_ar, lyrics, lyrics_ar, tags, is_active, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'How Great Is Our God', 'ما أعظم إلهنا', 'Chris Tomlin', 'كريس توملين', 'The splendor of the King, clothed in majesty...', 'بهاء الملك، متّشح بالجلال...', ARRAY['worship','praise'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Goodness of God', 'صلاح الله', 'Bethel Music', 'بيثل ميوزك', 'I love You, Lord, for Your mercy never fails me...', 'أحبك يا رب، لأن رحمتك لا تخذلني...', ARRAY['worship','slow'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Build My Life', 'ابنِ حياتي', 'Housefires', 'هاوسفايرز', 'Worthy of every song we could ever sing...', 'مستحق كل ترنيمة يمكننا ترنيمها...', ARRAY['worship','building'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Great Are You Lord', 'عظيم أنت يا رب', 'All Sons & Daughters', 'كل الأبناء والبنات', 'You give life, You are love, You bring light to the darkness...', 'تعطي حياة، أنت محبة، تجلب نوراً للظلمة...', ARRAY['worship','slow','response'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Blessed Be Your Name', 'مبارك اسمك', 'Matt Redman', 'مات ريدمان', 'Blessed be Your name, in the land that is plentiful...', 'مبارك اسمك، في أرض الوفرة...', ARRAY['praise','upbeat'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Way Maker', 'صانع الطريق', 'Sinach', 'سيناتش', 'You are here, moving in our midst...', 'أنت هنا، تتحرك في وسطنا...', ARRAY['worship','slow','powerful'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', '10,000 Reasons', '١٠,٠٠٠ سبب', 'Matt Redman', 'مات ريدمان', 'Bless the Lord, O my soul, O my soul...', 'باركي الرب يا نفسي، يا نفسي...', ARRAY['worship','classic'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Reckless Love', 'حب مُسرف', 'Cory Asbury', 'كوري آسبري', 'Before I spoke a word, You were singing over me...', 'قبل أن أنطق كلمة، كنت ترنّم فوقي...', ARRAY['worship','slow','response'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'King of Kings', 'ملك الملوك', 'Hillsong Worship', 'هيلسونغ ورشيب', 'In the darkness we were waiting, without hope without light...', 'في الظلام كنا ننتظر، بلا رجاء بلا نور...', ARRAY['worship','easter','powerful'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Living Hope', 'رجاء حي', 'Phil Wickham', 'فيل ويكهام', 'How great the chasm that lay between us...', 'كم عظيمة الهوّة التي كانت بيننا...', ARRAY['worship','easter','building'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Oceans', 'محيطات', 'Hillsong United', 'هيلسونغ يونايتد', 'You call me out upon the waters, the great unknown where feet may fail...', 'تدعوني إلى المياه، المجهول العظيم حيث قد تزل القدم...', ARRAY['worship','slow','faith'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'What A Beautiful Name', 'ما أجمل الاسم', 'Hillsong Worship', 'هيلسونغ ورشيب', 'You were the Word at the beginning, one with God the Lord Most High...', 'كنت الكلمة في البدء، واحد مع الله العلي...', ARRAY['worship','praise','building'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Holy Spirit', 'الروح القدس', 'Francesca Battistelli', 'فرانشيسكا باتيستيلي', 'Holy Spirit, You are welcome here, come flood this place and fill the atmosphere...', 'أيها الروح القدس، مرحباً بك هنا، تعال واملأ هذا المكان...', ARRAY['worship','slow','prayer'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'Cornerstone', 'حجر الزاوية', 'Hillsong Worship', 'هيلسونغ ورشيب', 'My hope is built on nothing less, than Jesus'' blood and righteousness...', 'رجائي مبني على لا شيء أقل من دم يسوع وبره...', ARRAY['worship','hymn','classic'], true, 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', 'No Longer Slaves', 'لم نعد عبيداً', 'Bethel Music', 'بيثل ميوزك', 'You unravel me with a melody, You surround me with a song...', 'تحلّني بلحن، تحيطني بترنيمة...', ARRAY['worship','powerful','freedom'], true, 'b0000000-0000-0000-0000-000000000003');

-- ============================================================
-- 19. GATHERINGS (small group meetings — past 4 weeks)
-- ============================================================
DO $$
DECLARE
  grp RECORD;
  g_id UUID;
  week_offset INTEGER;
BEGIN
  FOR grp IN SELECT id, leader_id, meeting_day FROM groups WHERE church_id = 'a0000000-0000-0000-0000-000000000001' AND is_active = true LIMIT 6 LOOP
    FOR week_offset IN 1..4 LOOP
      g_id := gen_random_uuid();
      INSERT INTO gatherings (id, group_id, church_id, scheduled_at, topic, topic_ar, status, created_by)
      VALUES (
        g_id, grp.id, 'a0000000-0000-0000-0000-000000000001',
        now() - (week_offset * interval '7 days'),
        'Week ' || (5 - week_offset) || ' Study',
        'دراسة الأسبوع ' || (5 - week_offset),
        'completed',
        grp.leader_id
      );

      -- Add attendance for each gathering
      INSERT INTO attendance (gathering_id, group_id, church_id, profile_id, status, marked_by)
      SELECT g_id, grp.id, 'a0000000-0000-0000-0000-000000000001', gm.profile_id,
             CASE WHEN random() > 0.2 THEN 'present'::attendance_status ELSE 'absent'::attendance_status END,
             grp.leader_id
      FROM group_members gm
      WHERE gm.group_id = grp.id
      LIMIT 15;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 20. CHURCH LEADERS
-- ============================================================
INSERT INTO church_leaders (church_id, name, name_ar, title, title_ar, bio, bio_ar, display_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Samuel Haddad', 'صموئيل حداد', 'Senior Pastor', 'القس الأقدم', 'Pastor Samuel founded Grace Church in 2010 and has been faithfully leading the congregation for over 15 years.', 'القس صموئيل أسس كنيسة النعمة عام ٢٠١٠ ويقود الجماعة بأمانة لأكثر من ١٥ سنة.', 1),
  ('a0000000-0000-0000-0000-000000000001', 'Nadia Khoury', 'نادية خوري', 'Associate Pastor', 'القسيسة المساعدة', 'Pastor Nadia oversees pastoral care, counseling, and women''s ministry.', 'القسيسة نادية تشرف على الرعاية الراعوية والإرشاد وخدمة النساء.', 2),
  ('a0000000-0000-0000-0000-000000000001', 'Elias Mansour', 'الياس منصور', 'Worship Director', 'مدير التسبيح', 'Elias leads the worship ministry with a heart for authentic praise.', 'الياس يقود خدمة التسبيح بقلب مكرّس للتسبيح الحقيقي.', 3),
  ('a0000000-0000-0000-0000-000000000001', 'Maya Sarkis', 'مايا سركيس', 'Youth Director', 'مديرة الشباب', 'Maya is passionate about discipling the next generation.', 'مايا شغوفة بتلمذة الجيل القادم.', 4),
  ('a0000000-0000-0000-0000-000000000001', 'Rita Fares', 'ريتا فارس', 'Children Director', 'مديرة الأطفال', 'Rita leads the children''s ministry with creativity and love.', 'ريتا تقود خدمة الأطفال بإبداع ومحبة.', 5);

-- ============================================================
-- 21. NOTIFICATIONS (sample)
-- ============================================================
INSERT INTO notifications_log (church_id, profile_id, type, channel, title, body, status, sent_at, read_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'assignment', 'in_app', 'You''ve been assigned to serve', 'You are assigned as Worship Leader for this Sunday''s service.', 'sent', now() - interval '2 days', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000009', 'announcement', 'in_app', 'Easter Service — April 5', 'Join us for a special Easter celebration!', 'read', now() - interval '3 days', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 'visitor', 'in_app', 'New visitor assigned to you', 'Lara Hanna has been assigned to you for follow-up.', 'sent', now() - interval '3 days', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'general', 'in_app', 'Weekly summary', '8 new visitors this week. 3 pending follow-ups.', 'read', now() - interval '7 days', now() - interval '6 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'assignment', 'in_app', 'Sound team this Sunday', 'You are assigned as Sound Engineer for this Sunday.', 'sent', now() - interval '2 days', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'assignment', 'in_app', 'Sunday School this week', 'You are assigned as Lead Teacher for children''s ministry this Sunday.', 'read', now() - interval '2 days', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'general', 'in_app', 'Youth Night reminder', 'Youth Night is this Friday at 7 PM. Don''t forget to prepare the games!', 'sent', now() - interval '1 day', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008', 'visitor', 'in_app', 'New visitor follow-up', 'Joseph Bitar visited last week and is interested in joining a group.', 'read', now() - interval '5 days', now() - interval '4 days'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'general', 'whatsapp', 'Women''s Conference update', '75 women have registered for the conference so far.', 'delivered', now() - interval '1 day', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'general', 'email', 'Monthly giving report', 'The monthly giving report is ready for review.', 'delivered', now() - interval '3 days', NULL);

-- ============================================================
-- 22. PROFILE MILESTONES (for key members)
-- ============================================================
INSERT INTO profile_milestones (church_id, profile_id, type, title, title_ar, date, notes) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'baptism', 'Baptism', 'المعمودية', '2008-06-15', 'Baptized at Grace Church'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'other', 'Founding Member', 'عضو مؤسس', '2010-01-15', 'Founding member of Grace Church'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'leadership_training', 'Seminary Graduation', 'تخرّج من الإكليريكية', '2009-06-01', 'Completed seminary training'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'marriage', 'Marriage', 'الزواج', '2003-09-20', 'Married at Grace Church'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'baptism', 'Baptism', 'المعمودية', '2005-04-10', 'Baptized at previous church'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'leadership_training', 'Leadership Training', 'تدريب القيادة', '2013-03-15', 'Completed pastoral care training'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'salvation', 'Salvation', 'الخلاص', '2006-12-25', 'Accepted Christ during Christmas service'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'baptism', 'Baptism', 'المعمودية', '2007-03-18', 'Baptized at Grace Church'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000009', 'salvation', 'Salvation', 'الخلاص', '2020-01-12', 'Accepted Christ during Sunday service'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000009', 'baptism', 'Baptism', 'المعمودية', '2020-09-20', 'Baptized during Sunday service'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'baptism', 'Baptism', 'المعمودية', '2010-08-22', 'Baptized at summer camp'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'leadership_training', 'Youth Ministry Certification', 'شهادة خدمة الشباب', '2016-01-10', 'Completed youth ministry training'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 'baptism', 'Baptism', 'المعمودية', '2012-06-10', 'Baptized at Grace Church'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 'leadership_training', 'Small Group Leader Training', 'تدريب قائد مجموعة صغيرة', '2017-02-20', 'Completed small group leader certification'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008', 'baptism', 'Baptism', 'المعمودية', '2015-04-05', 'Baptized during Easter service'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008', 'marriage', 'Marriage', 'الزواج', '2019-07-14', 'Married at Grace Church');

-- Add some milestones for random bulk members
INSERT INTO profile_milestones (church_id, profile_id, type, title, title_ar, date, notes)
SELECT 'a0000000-0000-0000-0000-000000000001', id, 'baptism', 'Baptism', 'المعمودية',
       (joined_church_at + (floor(random() * 365))::integer)::date,
       'Baptized at Grace Church'
FROM profiles
WHERE church_id = 'a0000000-0000-0000-0000-000000000001'
  AND id NOT IN ('b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000009')
ORDER BY random() LIMIT 80;

-- ============================================================
-- 23. PRAYER REQUESTS
-- ============================================================
DO $$
DECLARE
  grp RECORD;
  g RECORD;
  member_id UUID;
BEGIN
  FOR grp IN SELECT id FROM groups WHERE church_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 6 LOOP
    FOR g IN SELECT id FROM gatherings WHERE group_id = grp.id LIMIT 2 LOOP
      -- Pick a random member from the group for each prayer request
      SELECT gm.profile_id INTO member_id
      FROM group_members gm WHERE gm.group_id = grp.id
      ORDER BY random() LIMIT 1;

      IF member_id IS NOT NULL THEN
        INSERT INTO prayer_requests (gathering_id, group_id, church_id, submitted_by, content, is_private, status)
        VALUES (g.id, grp.id, 'a0000000-0000-0000-0000-000000000001', member_id,
                'Please pray for my family during this difficult season.', false, 'active');
      END IF;

      SELECT gm.profile_id INTO member_id
      FROM group_members gm WHERE gm.group_id = grp.id
      ORDER BY random() LIMIT 1;

      IF member_id IS NOT NULL THEN
        INSERT INTO prayer_requests (gathering_id, group_id, church_id, submitted_by, content, is_private, status)
        VALUES (g.id, grp.id, 'a0000000-0000-0000-0000-000000000001', member_id,
                'Pray for healing and strength.', true, 'active');
      END IF;
    END LOOP;

    -- Some standalone prayer requests (not tied to a gathering)
    SELECT gm.profile_id INTO member_id
    FROM group_members gm WHERE gm.group_id = grp.id
    ORDER BY random() LIMIT 1;

    IF member_id IS NOT NULL THEN
      INSERT INTO prayer_requests (group_id, church_id, submitted_by, content, is_private, status)
      VALUES (grp.id, 'a0000000-0000-0000-0000-000000000001', member_id,
              'Please pray for my upcoming exams and studies.', false, 'active');
    END IF;
  END LOOP;

  -- Some answered prayers
  FOR grp IN SELECT id FROM groups WHERE church_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 3 LOOP
    SELECT gm.profile_id INTO member_id
    FROM group_members gm WHERE gm.group_id = grp.id
    ORDER BY random() LIMIT 1;

    IF member_id IS NOT NULL THEN
      INSERT INTO prayer_requests (group_id, church_id, submitted_by, content, is_private, status, resolved_at, resolved_notes)
      VALUES (grp.id, 'a0000000-0000-0000-0000-000000000001', member_id,
              'Praying for a job opportunity.', false, 'answered',
              now() - interval '5 days', 'Got the job! Thank God!');
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 24. Re-enable the trigger
-- ============================================================
ALTER TABLE profiles ENABLE TRIGGER update_profiles_updated_at;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
