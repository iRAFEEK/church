# P2-9: Outreach visits RLS too permissive

## Problem
Any authenticated church member can read all outreach visit notes via the `outreach_visits_select` RLS policy. Outreach visits contain sensitive pastoral content (visit notes, follow-up notes) that should only be visible to church leaders and the person who conducted the visit.

**Current policy (migration 025):**
```sql
CREATE POLICY "outreach_visits_select"
  ON outreach_visits FOR SELECT TO authenticated
  USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));
```
This allows ANY member in the church to SELECT all outreach visit records. The INSERT, UPDATE, and DELETE policies have the same permissive pattern.

## Fix
1. **DROP** all four existing overly permissive policies on `outreach_visits`
2. **CREATE** new SELECT policy restricted to:
   - `super_admin`, `ministry_leader`, `group_leader` roles (leaders)
   - OR the user who conducted the visit (`visited_by = auth.uid()`)
   - OR the person being visited (`profile_id = auth.uid()`)
3. **CREATE** new INSERT policy restricted to leaders only
4. **CREATE** new UPDATE policy restricted to leaders + the person who conducted the visit
5. **CREATE** new DELETE policy restricted to `super_admin` only

## Acceptance Criteria
- [x] Regular members cannot SELECT outreach visit records they did not conduct and are not the subject of
- [x] Leaders (super_admin, ministry_leader, group_leader) can SELECT all visits in their church
- [x] The person who conducted a visit (`visited_by`) can see their own visit records
- [x] The person being visited (`profile_id`) can see their own visit records
- [x] Only leaders can INSERT new outreach visits
- [x] Only leaders and the original visitor can UPDATE visit records
- [x] Only super_admin can DELETE visit records
- [x] Migration is idempotent (uses DROP POLICY IF EXISTS)
- [x] All policies enforce `church_id` scoping via `get_church_id()`

## Files Created/Modified
- **Created:** `supabase/migrations/045_outreach_visits_rls_fix.sql` -- new migration with tightened RLS policies
- **Created:** `docs/tickets/P2-9-TODO.md` -- this file
