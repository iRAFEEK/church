#!/bin/bash
# ux-review.sh — run the UX designer agent
# Usage:
#   bash .claude/scripts/ux-review.sh
#     → reviews last changed files (Mode A)
#
#   bash .claude/scripts/ux-review.sh "build a recurring donations feature"
#     → design spec for new feature (Mode B)
#
#   bash .claude/scripts/ux-review.sh "" app/(app)/admin/finance/
#     → reviews specific directory (Mode A)

set -e

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
AGENT_PROMPT="$REPO_ROOT/.claude/agents/ux-designer.md"
LOG_FILE="$REPO_ROOT/.claude/logs/ux-review.log"

if ! command -v claude &> /dev/null; then
  echo "Error: claude CLI not found."
  exit 1
fi

FEATURE_INPUT="${1:-}"
TARGET="${2:-}"

# ── Detect changed files ──────────────────────────────────────
if [ -n "$TARGET" ]; then
  if [ -d "$TARGET" ]; then
    CHANGED_FILES=$(find "$TARGET" -name "*.tsx" -o -name "*.ts" | grep -v node_modules | sort | head -30)
  else
    CHANGED_FILES="$TARGET"
  fi
else
  CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null \
    | grep -E "\.(tsx|ts)$" \
    | grep -E "^(app|components)/" \
    | grep -v node_modules | head -20)

  if [ -z "$CHANGED_FILES" ]; then
    CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null \
      | grep -E "\.(tsx|ts)$" | head -20)
  fi
fi

# ── Detect mode ───────────────────────────────────────────────
if [ -n "$FEATURE_INPUT" ] && [ -z "$TARGET" ]; then
  MODE="Design Spec (Mode B)"
else
  MODE="UX Review (Mode A)"
fi

echo "[ux-agent] Mode: $MODE"
echo "[ux-agent] Input: ${FEATURE_INPUT:-[auto-detected from git]}"
echo "[ux-agent] Files: $CHANGED_FILES"

# ── Build prompt ──────────────────────────────────────────────
PROMPT=$(cat "$AGENT_PROMPT" \
  | sed "s|\$FEATURE_INPUT|${FEATURE_INPUT:-[Review changed files for UX issues]}|g" \
  | sed "s|\$CHANGED_FILES|$CHANGED_FILES|g")

# ── Log ───────────────────────────────────────────────────────
mkdir -p "$REPO_ROOT/.claude/logs"
echo "" >> "$LOG_FILE"
echo "═══════════════════════════════════════" >> "$LOG_FILE"
echo "UX run: $(date)" >> "$LOG_FILE"
echo "Mode: $MODE" >> "$LOG_FILE"
echo "Files: $CHANGED_FILES" >> "$LOG_FILE"

# ── Run ───────────────────────────────────────────────────────
echo "$PROMPT" | claude
