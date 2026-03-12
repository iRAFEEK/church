-- ============================================================
-- Fix: add auth.identities for seed users
-- The 036 seed created auth.users but not auth.identities,
-- which Supabase GoTrue requires for email login.
-- ============================================================

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT
  u.id,
  u.id,
  u.id::text,
  'email',
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'provider', 'email'
  ),
  NOW(),
  u.created_at,
  NOW()
FROM auth.users u
WHERE u.email IN ('admin@gracecairo.org', 'admin@hopebeirut.org')
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );
