-- ============================================================
-- Fix: Patch existing seed users to use the correct password hash
-- and ensure auth.identities exist (matching seed_data.sql pattern).
-- ============================================================

-- Step 1: Fix password hash and metadata on existing auth.users
-- Use the same pre-computed bcrypt hash as working test accounts
UPDATE auth.users SET
  encrypted_password = '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  raw_user_meta_data = '{"email_verified":true}',
  updated_at = now()
WHERE email IN ('admin@gracecairo.org', 'admin@hopebeirut.org');

-- Step 2: Delete any malformed identities and recreate properly
DELETE FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('admin@gracecairo.org', 'admin@hopebeirut.org'));

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  u.id::text,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', false, 'phone_verified', false),
  now(), now(), now()
FROM auth.users u
WHERE u.email IN ('admin@gracecairo.org', 'admin@hopebeirut.org');
