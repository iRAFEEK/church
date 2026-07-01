-- 085_update_policies_with_check.sql
-- Audit fix: three UPDATE RLS policies had a USING clause but no WITH CHECK.
--
-- Without WITH CHECK, an UPDATE only gates which rows a caller may target — it
-- does NOT constrain what those rows may become. A leader could therefore
-- UPDATE a row and rewrite its church_id (or otherwise move it out of their
-- tenant / assign it across churches). Add a WITH CHECK that mirrors each
-- policy's existing USING clause so the post-update row must still satisfy the
-- same church-scoped, role-based condition.
--
-- Policies fixed:
--   * ministry_action_items "Leaders can update action items"   (migration 059)
--   * locations            "Admins can update locations"        (migration 064)
--   * location_bookings    "Booker or admin can update bookings"(migration 064)
--
-- Recreated (DROP + CREATE) to attach WITH CHECK while preserving the original
-- USING expression verbatim. Idempotent via DROP POLICY IF EXISTS.

-- 1) ministry_action_items (059)
DROP POLICY IF EXISTS "Leaders can update action items" ON ministry_action_items;
CREATE POLICY "Leaders can update action items"
  ON ministry_action_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = ministry_action_items.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.church_id = ministry_action_items.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
    )
  );

-- 2) locations (064)
DROP POLICY IF EXISTS "Admins can update locations" ON locations;
CREATE POLICY "Admins can update locations"
  ON locations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = locations.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = locations.church_id
      AND p.role IN ('ministry_leader', 'super_admin')
  ));

-- 3) location_bookings (064)
DROP POLICY IF EXISTS "Booker or admin can update bookings" ON location_bookings;
CREATE POLICY "Booker or admin can update bookings"
  ON location_bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = location_bookings.church_id
      AND (location_bookings.booked_by = p.id OR p.role IN ('ministry_leader', 'super_admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.church_id = location_bookings.church_id
      AND (location_bookings.booked_by = p.id OR p.role IN ('ministry_leader', 'super_admin'))
  ));
