#!/bin/bash
# seed-feature.sh — run the feature seeding agent
# Usage:
#   bash .claude/scripts/seed-feature.sh
#     → auto-detects last feature from git, seeds it
#
#   bash .claude/scripts/seed-feature.sh "recurring donations feature"
#     → seeds a named feature
#
#   bash .claude/scripts/seed-feature.sh "recurring donations" app/api/finance/donations/
#     → seeds named feature, scoped to specific directory

set -e

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
AGENT_PROMPT="$REPO_ROOT/.claude/agents/seed-feature.md"
LOG_FILE="$REPO_ROOT/.claude/logs/seed-feature.log"

# ── Check claude CLI ──────────────────────────────────────────
if ! command -v claude &> /dev/null; then
  echo "Error: claude CLI not found. Install Claude Code first."
  exit 1
fi

# ── Check agent prompt exists ─────────────────────────────────
if [ ! -f "$AGENT_PROMPT" ]; then
  echo "Error: Agent prompt not found at $AGENT_PROMPT"
  exit 1
fi

# ── Get feature description ───────────────────────────────────
if [ -n "$1" ]; then
  FEATURE_DESCRIPTION="$1"
else
  # Auto-detect from last commit or git status
  LAST_COMMIT=$(git log --oneline -1 2>/dev/null || echo "recent changes")
  CHANGED_SUMMARY=$(git diff --name-only HEAD 2>/dev/null \
    | grep -E "\.(tsx|ts)$" \
    | grep -E "^(app|components|lib)/" \
    | head -10 | tr '\n' ', ')
  FEATURE_DESCRIPTION="$LAST_COMMIT — changed files: $CHANGED_SUMMARY"
fi

# ── Get changed files ─────────────────────────────────────────
if [ -n "$2" ]; then
  # Specific directory provided
  if [ -d "$2" ]; then
    CHANGED_FILES=$(find "$2" -name "*.tsx" -o -name "*.ts" | grep -v node_modules | sort | head -30)
  else
    CHANGED_FILES="$2"
  fi
else
  # Auto-detect from git
  CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null \
    | grep -E "\.(tsx|ts|sql)$" \
    | grep -E "^(app|components|lib|supabase)/" \
    | grep -v node_modules \
    | head -30)

  # If no uncommitted changes, use last commit
  if [ -z "$CHANGED_FILES" ]; then
    CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null \
      | grep -E "\.(tsx|ts|sql)$" \
      | head -30)
  fi
fi

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected. Pass a directory or feature name."
  echo "Usage: bash .claude/scripts/seed-feature.sh [feature-name] [directory]"
  exit 0
fi

echo "[seed-agent] Feature: $FEATURE_DESCRIPTION"
echo "[seed-agent] Files:"
echo "$CHANGED_FILES" | sed 's/^/  /'
echo ""

# ── Build prompt ──────────────────────────────────────────────
PROMPT=$(cat "$AGENT_PROMPT")
PROMPT="${PROMPT//\$FEATURE_DESCRIPTION/$FEATURE_DESCRIPTION}"
PROMPT="${PROMPT//\$CHANGED_FILES/$CHANGED_FILES}"

# ── Log ───────────────────────────────────────────────────────
mkdir -p "$REPO_ROOT/.claude/logs"
{
  echo ""
  echo "==========================================="
  echo "Seed run: $(date)"
  echo "Feature: $FEATURE_DESCRIPTION"
  echo "Files: $CHANGED_FILES"
} >> "$LOG_FILE"

# ── Run ───────────────────────────────────────────────────────
echo "$PROMPT" | claude
