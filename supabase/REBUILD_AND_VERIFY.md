# Production Database — Clean Rebuild & Verification

> The single most important launch gate. Pre-launch testing repeatedly proved the
> current database is **not** a clean application of the migrations (missing
> columns, duplicate foreign keys, unapplied migrations, a role-desync that
> locked out admins). Do **not** onboard a real church until production is rebuilt
> from a clean migration apply and passes `npm run verify:schema`.

---

## Why this is necessary (what we found)

- `funds.currency` / `budgets.currency` — columns the code requires that **no migration ever created**.
- **Duplicate foreign keys** on `donations/campaigns/pledges/transaction_line_items.fund_id` and `event_registrations.event_id` — broke PostgREST embeds (PGRST201 → 500s).
- Migrations **072/073 silently not applied** even though the tracker claimed otherwise.
- **Role desync**: every church/leader registered after migration 048 had `user_churches.role='member'` while `profiles.role` was elevated — the apiHandler trusts `user_churches.role`, so admins/leaders were locked out of everything.

The migration **tracker lies** — several migrations were marked applied but their tables/columns were absent. Trust the **schema**, verified by the script, not the tracker.

---

## Rebuild steps

> Do this on a **fresh** Supabase project (recommended) or a maintenance window.
> Back up any real data first.

1. **Link the CLI** to the prod project:
   ```bash
   supabase link --project-ref <PROD_REF>
   ```

2. **Apply all migrations cleanly, in order** (001 → 076):
   ```bash
   supabase db push --linked
   ```
   ⚠️ **Duplicate migration numbers** exist on disk — two `032_*` (`fix_songs_rls`, `push_tokens`) and two `033_*` (`seed_finance_test_data`, `songs_trigram_indexes`). They apply in filename order today; if `db push` complains about version collisions, renumber the duplicates first (e.g. `032b_…`, `033b_…`) so each version is unique. Verify the renamed files still capture both original statements.

3. **Skip the seed/test migrations on a real prod DB** (003, 033, 036, 037–042) — they create test churches/users. Apply only the schema migrations. (If `db push` runs them, delete the seeded test churches afterward.)

4. **Run the verification gate:**
   ```bash
   DATABASE_URL="<prod-pooler-url>" npm run verify:schema
   ```
   It must print `RESULT: N pass, 0 fail`. The checks:
   - RLS enabled on every public table
   - No duplicate foreign keys
   - Required columns present (`funds.currency`, `budgets.currency`, `songs.published_by_church_id`, `churches.visitor_form_config`)
   - Role-sync trigger present (076) + **0** role mismatches + every profile has a `user_churches` row
   - Songs UPDATE policy is church-scoped (073, the cross-church IDOR fix)

5. **Confirm the migrations that must be present** (these fix bugs found in testing):
   | Migration | Fixes |
   |---|---|
   | 073 | Songs cross-church write IDOR (RLS scope) |
   | 074 | `funds`/`budgets.currency`, song-publish column, 5 duplicate FKs |
   | 075 | Backfill stuck super-admin roles |
   | 076 | Role-sync trigger + full role backfill |

---

## Post-rebuild smoke test (do NOT skip)

A clean schema isn't enough — prove a brand-new church actually works end to end:

1. **Register a fresh church** through the real flow (`/welcome` → register, or `POST /api/churches/register`).
2. As that church's admin, confirm you can: create a group, ministry, event, announcement, serving area + slot, song, location + booking, log a visitor, submit a prayer, send a notification. (All should succeed — this is the exact gap that was broken before 075/076.)
3. **Register a leader** for that church and confirm the leader resolves as `group_leader` (not demoted to member).
4. Confirm **finance is blocked** (it's flagged off): `/api/finance/*` → 404, `/admin/finance` → redirects.
5. Delete the throwaway church when done.

(The repo's `scripts/` and the e2e harness pattern can automate this; at minimum do it once by hand against prod.)

---

## After go-live

- Re-run `npm run verify:schema` as a **post-deploy gate** whenever migrations change.
- Keep PITR/backups on and **test a restore** before the first real church.
