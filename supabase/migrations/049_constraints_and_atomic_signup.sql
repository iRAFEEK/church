-- ============================================================
-- Migration 049: Add missing unique constraints + atomic signup
-- Fixes: DB-3 (event_registrations), DB-1 (bible_bookmarks), DB-4 (serving signup)
-- ============================================================

-- ============================================================
-- 1. Unique constraint on event_registrations (event_id, profile_id)
--    Prevents duplicate registrations from concurrent requests or retry
-- ============================================================

-- First, clean up any existing duplicates (keep the earliest registration)
DELETE FROM event_registrations a
USING event_registrations b
WHERE a.id > b.id
  AND a.event_id = b.event_id
  AND a.profile_id = b.profile_id
  AND a.profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_registrations_unique
  ON event_registrations (event_id, profile_id)
  WHERE profile_id IS NOT NULL;
-- Partial index: allows multiple visitor registrations (profile_id IS NULL)
-- but prevents the same member from registering twice

-- ============================================================
-- 2. Unique constraint on bible_bookmarks
--    Prevents duplicate bookmarks for the same verse by the same user
-- ============================================================

-- Clean up any existing duplicates (keep the earliest bookmark)
DELETE FROM bible_bookmarks a
USING bible_bookmarks b
WHERE a.id > b.id
  AND a.profile_id = b.profile_id
  AND a.bible_id = b.bible_id
  AND a.book_id = b.book_id
  AND a.chapter_id = b.chapter_id
  AND COALESCE(a.verse_id, '') = COALESCE(b.verse_id, '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_bible_bookmarks_unique
  ON bible_bookmarks (profile_id, bible_id, book_id, chapter_id, COALESCE(verse_id, ''));

-- ============================================================
-- 3. Atomic serving slot signup function
--    Uses SELECT FOR UPDATE to prevent race conditions on capacity checks
-- ============================================================

CREATE OR REPLACE FUNCTION signup_for_serving_slot(
  p_slot_id UUID,
  p_profile_id UUID,
  p_church_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
  v_existing RECORD;
  v_count INTEGER;
  v_signup RECORD;
BEGIN
  -- Lock the slot row to prevent concurrent capacity checks
  SELECT id, max_volunteers, church_id
  INTO v_slot
  FROM serving_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF v_slot IS NULL THEN
    RETURN json_build_object('error', 'not_found', 'status', 404);
  END IF;

  IF v_slot.church_id != p_church_id THEN
    RETURN json_build_object('error', 'not_found', 'status', 404);
  END IF;

  -- Check if already signed up (non-cancelled)
  SELECT id, status
  INTO v_existing
  FROM serving_signups
  WHERE slot_id = p_slot_id
    AND profile_id = p_profile_id
    AND church_id = p_church_id;

  IF v_existing IS NOT NULL AND v_existing.status != 'cancelled' THEN
    RETURN json_build_object('error', 'already_signed_up', 'status', 409);
  END IF;

  -- Check capacity
  IF v_slot.max_volunteers IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_count
    FROM serving_signups
    WHERE slot_id = p_slot_id
      AND church_id = p_church_id
      AND status != 'cancelled';

    IF v_count >= v_slot.max_volunteers THEN
      RETURN json_build_object('error', 'slot_full', 'status', 409);
    END IF;
  END IF;

  -- If previously cancelled, re-activate
  IF v_existing IS NOT NULL AND v_existing.status = 'cancelled' THEN
    UPDATE serving_signups
    SET status = 'signed_up',
        signed_up_at = NOW(),
        cancelled_at = NULL,
        updated_at = NOW()
    WHERE id = v_existing.id
    RETURNING id, slot_id, profile_id, church_id, status, signed_up_at
    INTO v_signup;

    RETURN json_build_object('data', row_to_json(v_signup), 'status', 200);
  END IF;

  -- Insert new signup
  INSERT INTO serving_signups (slot_id, profile_id, church_id)
  VALUES (p_slot_id, p_profile_id, p_church_id)
  RETURNING id, slot_id, profile_id, church_id, status, signed_up_at
  INTO v_signup;

  RETURN json_build_object('data', row_to_json(v_signup), 'status', 201);
END;
$$;
