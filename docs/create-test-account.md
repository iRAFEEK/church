# Creating Supabase Test Accounts

The exact SQL pattern that works for creating loginable test accounts in local Supabase.

## Prerequisites

- Pre-computed bcrypt hash of `password123`:
  ```
  $2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6
  ```
- A deterministic UUID for the new user (e.g. `c0000000-0000-0000-0000-000000000004`)
- The target `church_id` (query from `churches` table)

## SQL (run via `supabase db push` as a migration)

```sql
DO $$
DECLARE
  v_user_id  UUID := 'c0000000-0000-0000-0000-000000000004'; -- pick a unique UUID
  v_church_id UUID;
BEGIN
  -- 1. Look up the target church
  SELECT id INTO v_church_id FROM churches WHERE name = 'Your Church Name' LIMIT 1;

  -- 2. Create auth.users (ALL 20 columns required)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    role, aud, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current,
    email_change, phone_change, phone_change_token, reauthentication_token
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'newuser@example.org',
    '$2a$06$qUbixs5VU2j1gLF3xT.ywO3sAWwyy3amqo8kGcXJ16UNPqrnqTuS6',
    now(),
    'authenticated', 'authenticated',
    now() - interval '1 year', now(),
    '{"provider":"email","providers":["email"]}',
    '{"email_verified":true}',
    '', '', '', '', '', '', '', ''
  );

  -- 3. Create auth.identities (required for GoTrue login)
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_user_id, v_user_id::text, 'email',
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', 'newuser@example.org',
      'email_verified', false,
      'phone_verified', false
    ),
    now(), now(), now();

  -- 4. Update auto-created profile (handle_new_user trigger fires on step 2)
  UPDATE profiles SET
    church_id = v_church_id,
    first_name = 'First',
    last_name = 'Last',
    first_name_ar = 'الاسم',
    last_name_ar = 'العائلة',
    role = 'super_admin',        -- or member, ministry_leader, etc.
    status = 'active',
    onboarding_completed = true,
    preferred_language = 'ar'
  WHERE id = v_user_id;

  -- 5. Create user_churches entry
  INSERT INTO user_churches (user_id, church_id, role)
  VALUES (v_user_id, v_church_id, 'super_admin')
  ON CONFLICT DO NOTHING;
END $$;

NOTIFY pgrst, 'reload schema';
```

## Key gotchas

1. **All 20 columns on `auth.users`** — GoTrue rejects login if columns are missing or NULL where it expects empty strings.
2. **Use the pre-computed bcrypt hash** — `crypt()`/`gen_salt()` require pgcrypto which may not be available. The hash above is bcrypt of "password123".
3. **Don't INSERT into `profiles`** — the `handle_new_user` trigger auto-creates a profile row when you insert into `auth.users`. Just UPDATE it.
4. **`auth.identities` is mandatory** — without it, GoTrue returns 500 on `/auth/v1/token`.
5. **`NOTIFY pgrst, 'reload schema'`** — run this after any schema changes so PostgREST picks them up.

## To add the account to the login page

Edit `app/(auth)/login/page.tsx` and add to the appropriate accounts array:

```tsx
{ email: 'newuser@example.org', password: 'password123', label: 'Description', role: 'super_admin' },
```

## Deleting a test account (if you need to recreate)

Delete in this order to avoid FK violations:

```sql
-- Reassign any FK references first
UPDATE church_needs SET created_by = '<fallback_admin_id>' WHERE created_by = '<user_id>';
UPDATE church_need_responses SET responder_user_id = '<fallback_admin_id>' WHERE responder_user_id = '<user_id>';

-- Then delete
DELETE FROM user_churches WHERE user_id = '<user_id>';
DELETE FROM profiles WHERE id = '<user_id>';
DELETE FROM auth.identities WHERE user_id = '<user_id>';
DELETE FROM auth.users WHERE id = '<user_id>';
```
