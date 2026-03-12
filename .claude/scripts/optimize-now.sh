#!/bin/bash
# optimize-now.sh — manually trigger the optimization agent
# Usage: bash .claude/scripts/optimize-now.sh [optional: specific files]
#   bash .claude/scripts/optimize-now.sh                    # optimize all uncommitted changes
#   bash .claude/scripts/optimize-now.sh app/api/finance/   # optimize specific directory

set -e

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
AGENT_PROMPT="$REPO_ROOT/.claude/agents/optimize-after-feature.md"

if [ -n "$1" ]; then
  # Specific files/directory provided
  if [ -d "$1" ]; then
    CHANGED_FILES=$(find "$1" -name "*.tsx" -o -name "*.ts" | grep -v node_modules | sort | head -30)
  else
    CHANGED_FILES="$1"
  fi
else
  # All uncommitted changes
  CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null \
    | grep -E "\.(tsx|ts)$" \
    | grep -E "^(app|components|lib)/" \
    | head -30)
fi

if [ -z "$CHANGED_FILES" ]; then
  echo "No files to optimize. Pass a directory or make some changes."
  exit 0
fi

echo "Optimizing: $CHANGED_FILES"

GIT_DIFF=$(git diff HEAD -- $CHANGED_FILES 2>/dev/null | head -500)

PROMPT=$(cat "$AGENT_PROMPT" \
  | sed "s|\$CHANGED_FILES|$CHANGED_FILES|g" \
  | sed "s|\$GIT_DIFF|$GIT_DIFF|g")

echo "$PROMPT" | claude
