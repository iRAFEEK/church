---
name: ekklesia-context-update
description: How and when to update CLAUDE.md after completing any task in the Ekklesia project. This skill MUST be triggered at the end of every agent session, after completing any code change, feature, fix, optimization, or migration. If you just finished building, fixing, or changing anything in this codebase — read and follow this skill before closing.
---

# Context Update Protocol

## When to Use This Skill

After EVERY completed task. Before ending your session. No exceptions.

`CLAUDE.md` is the memory of this project. If you change something and don't update `CLAUDE.md`, the next agent starts blind. Be the agent you'd want to inherit from.

---

## What to Update

### Always update — Section 10 (Work Status)

Move completed items from "In Progress" or "Pending" to "Completed".
Add new pending items you discovered during your work.

```markdown
### Completed
- [x] [Short description of what you did] — [DATE]
```

### Always update — Section 15 (Change Log)

Add a row for your task:

```markdown
| [DATE] | [Task description] | [Key changes in one line] | [Comma-separated file list] |
```

Keep file list short — list directories for large changes, specific files for small ones.

### Update if changed — Section 9 (Performance Baseline)

If you ran Lighthouse or measured bundle sizes, update the tables with new numbers.

### Update if changed — Section 5 (Database Schema)

If you added or modified tables or migrations, update the schema table and the migrations list.

### Update if changed — Section 6 (Architecture Patterns)

If you added a new pattern that other agents should follow, document it here.

### Update if changed — Section 3 (User Roles)

If you added or changed role-based access, update the roles table.

### Update if changed — Section 11

If new environment variables were added.

---

## How to Update

1. Read the current `CLAUDE.md`:
```bash
cat CLAUDE.md
```

2. Make surgical edits — update only the sections that changed. Do not rewrite unrelated sections.

3. Update the header line:
```markdown
> Last updated: [TODAY'S DATE] | Updated by: [YOUR TASK IN 5 WORDS]
```

4. Verify the file is valid:
```bash
# Check CLAUDE.md is not empty or corrupted
wc -l CLAUDE.md
head -5 CLAUDE.md
```

---

## Completeness Check

Before ending your session, run:

```bash
echo "=== TypeScript ==="
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Target: 0

echo ""
echo "=== RTL violations ==="
grep -rn "\bml-[0-9]\|\bmr-[0-9]\|\btext-right\b\|\btext-left\b" \
  app/ components/ --include="*.tsx" | grep -v "//" | wc -l
# Target: 0

echo ""
echo "=== loading.tsx coverage (pages missing skeleton) ==="
for dir in $(find app -type d | grep -v node_modules | grep -v ".next" | sort); do
  if [ -f "$dir/page.tsx" ] && [ ! -f "$dir/loading.tsx" ]; then
    echo "MISSING: $dir"
  fi
done
# Target: 0 missing (or document known exceptions)

echo ""
echo "=== Unbounded list queries ==="
for f in $(find app -name "page.tsx" | grep -v node_modules | sort); do
  has_list=$(grep -c "\.from(" "$f" 2>/dev/null || echo 0)
  has_range=$(grep -c "\.range(\|limit(\|PAGE_SIZE" "$f" 2>/dev/null || echo 0)
  if [ "$has_list" -gt 0 ] && [ "$has_range" -eq 0 ]; then
    echo "NO PAGINATION: $f"
  fi
done
# Target: 0 (or document known exceptions like single-record detail pages)

echo ""
echo "=== select('*') violations ==="
grep -rn "\.select('\*')\|\.select(\"*\")" app/ lib/ 2>/dev/null \
  | grep -v node_modules | grep -v ".next" | wc -l
# Target: 0

echo ""
echo "=== Build ==="
npm run build 2>&1 | tail -3

echo ""
echo "=== CLAUDE.md last updated ==="
head -3 CLAUDE.md
```

All checks must pass. If any fail, fix them before updating `CLAUDE.md`.

### Known exceptions to document

Some pages legitimately don't need `loading.tsx` (e.g., pages that are purely static or redirect immediately). Some queries legitimately don't paginate (e.g., fetching a single record by ID with `.single()`). If your task leaves any of these checks non-zero for a legitimate reason, document the exception in `CLAUDE.md` Section 13 with a comment.

---

## Do Not

- Do not rewrite sections you didn't touch
- Do not remove historical entries from the change log
- Do not update performance baselines with estimated numbers — only measured values
- Do not leave `CLAUDE.md` with `[DATE]` or `[FILL]` placeholders — fill them with real values
