#!/bin/bash
# analytics-audit.sh — find uninstrumented CTAs and form submissions
# Usage: bash .claude/scripts/analytics-audit.sh [optional: directory]

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"
TARGET="${1:-app components}"

echo "═══════════════════════════════════════════════════"
echo "  Ekklesia Analytics Coverage Audit"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Find form submissions without analytics ───────────────────
echo "── Form submissions without analytics ──────────────"
for f in $(find $TARGET -name "*.tsx" | grep -v node_modules | sort); do
  has_submit=$(grep -cE "onSubmit|handleSubmit|formAction" "$f" 2>/dev/null)
  has_analytics=$(grep -cE "analytics\." "$f" 2>/dev/null)

  if [ "${has_submit:-0}" -gt 0 ] 2>/dev/null && [ "${has_analytics:-0}" -eq 0 ] 2>/dev/null; then
    echo "  ⚠️  $f"
    echo "     Has form submission but no analytics call"
    grep -nE "onSubmit|handleSubmit" "$f" | head -3 | sed 's/^/     /'
    echo ""
  fi
done

# ── Find primary buttons without analytics ────────────────────
echo "── Primary action buttons without analytics ─────────"
for f in $(find $TARGET -name "*.tsx" | grep -v node_modules | sort); do
  has_primary_click=$(grep -cE "onClick.*=.*\{|onClick=\{" "$f" 2>/dev/null)
  has_analytics=$(grep -cE "analytics\." "$f" 2>/dev/null)
  is_client=$(grep -cE "'use client'" "$f" 2>/dev/null)

  if [ "${has_primary_click:-0}" -gt 2 ] 2>/dev/null && [ "${has_analytics:-0}" -eq 0 ] 2>/dev/null && [ "${is_client:-0}" -gt 0 ] 2>/dev/null; then
    echo "  ⚠️  $f"
    echo "     Has $has_primary_click click handlers, 0 analytics calls"
    echo ""
  fi
done

# ── Check event catalog completeness ─────────────────────────
echo "── Event catalog modules ────────────────────────────"
grep -n "^  [a-z]*: {" lib/analytics/events.ts 2>/dev/null | sed 's/:/  /' | sed 's/{//'

echo ""
echo "── Events defined ───────────────────────────────────"
EVENT_COUNT=$(grep -c "posthog.capture" lib/analytics/events.ts 2>/dev/null)
echo "  ${EVENT_COUNT:-0} events in catalog"

# ── Check PostHog is initialized ─────────────────────────────
echo ""
echo "── PostHog initialization ───────────────────────────"
grep -rnE "PostHogProvider|initPostHog" app/layout.tsx 2>/dev/null \
  && echo "  ✅ PostHogProvider found in root layout" \
  || echo "  ❌ PostHogProvider NOT found in root layout"

# ── Check identify is called on login ─────────────────────────
echo ""
echo "── User identification ──────────────────────────────"
grep -rnE "analytics.identify|posthog.identify" \
  app/ components/ --include="*.tsx" 2>/dev/null | grep -v node_modules \
  && echo "  ✅ identify() found" \
  || echo "  ❌ identify() not found — users won't be tracked across sessions"

# ── Check for direct posthog.capture calls ────────────────────
echo ""
echo "── Direct posthog.capture calls (bypass catalog) ────"
DIRECT=$(grep -rnE "posthog\.capture|posthog.capture" \
  app/ components/ --include="*.tsx" --include="*.ts" 2>/dev/null \
  | grep -v node_modules \
  | grep -v "lib/analytics/" \
  | grep -v "components/shared/PostHogProvider" \
  | grep -v "//")

if [ -n "$DIRECT" ]; then
  echo "  ⚠️  Found direct capture calls outside catalog:"
  echo "$DIRECT" | sed 's/^/  /'
else
  echo "  ✅ All events go through the catalog"
fi

# ── Check for PII in events ───────────────────────────────────
echo ""
echo "── PII risk check ───────────────────────────────────"
PII=$(grep -rn "analytics\." app/ components/ --include="*.tsx" 2>/dev/null \
  | grep -v node_modules \
  | grep -iE "email|phone|first_name|last_name|address" \
  | grep -v "import" | grep -v "//")

if [ -n "$PII" ]; then
  echo "  ⚠️  Possible PII in analytics calls:"
  echo "$PII" | sed 's/^/  /'
else
  echo "  ✅ No obvious PII in analytics calls"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Audit complete"
echo "═══════════════════════════════════════════════════"
