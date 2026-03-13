-- P1-10: handle_new_user() assigns wrong church
-- Remove the fallback to oldest church. Require church_id in user metadata.
-- Also insert into user_churches for multi-church consistency.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_church_id UUID;
BEGIN
  v_church_id := (NEW.raw_user_meta_data->>'church_id')::UUID;

  -- Require church_id in metadata — never silently assign to wrong church
  IF v_church_id IS NULL THEN
    RAISE WARNING '[handle_new_user] No church_id in metadata for user %, skipping profile creation', NEW.id;
    RETURN NEW;
  END IF;

  -- Create profile with the specified church
  INSERT INTO public.profiles (id, church_id, email, onboarding_completed)
  VALUES (NEW.id, v_church_id, NEW.email, false)
  ON CONFLICT (id) DO NOTHING;

  -- Also create user_churches entry for multi-church consistency
  INSERT INTO public.user_churches (user_id, church_id, role)
  VALUES (NEW.id, v_church_id, 'member')
  ON CONFLICT (user_id, church_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
