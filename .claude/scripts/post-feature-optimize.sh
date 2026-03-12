#!/bin/bash
# post-feature-optimize.sh
# Triggered by Claude Code hook after every agent session.
# Detects what changed, then runs the optimization agent on those files.

set -e

# ── Config ────────────────────────────────────────────────────────────────────
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
AGENT_PROMPT="$REPO_ROOT/.claude/agents/optimize-after-feature.md"
LOG_FILE="$REPO_ROOT/.claude/logs/auto-optimize.log"
LOCK_FILE="$REPO_ROOT/.claude/logs/optimize.lock"

# ── Guard: only run if claude CLI available ───────────────────────────────────
if ! command -v claude &> /dev/null; then
  echo "[auto-optimize] claude CLI not found, skipping"
  exit 0
fi

# ── Guard: prevent concurrent runs ───────────────────────────────────────────
if [ -f "$LOCK_FILE" ]; then
  echo "[auto-optimize] already running (lock file exists), skipping"
  exit 0
fi
touch "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# ── Detect changed files ──────────────────────────────────────────────────────
# Only care about app code — not migrations, not translation files, not config
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null \
  | grep -E "\.(tsx|ts)$" \
  | grep -E "^(app|components|lib)/" \
  | grep -v "node_modules" \
  | grep -v "\.d\.ts$" \
  | head -30)  # cap at 30 files to keep agent focused

# Also check staged files
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null \
  | grep -E "\.(tsx|ts)$" \
  | grep -E "^(app|components|lib)/" \
  | grep -v "node_modules" \
  | head -30)

ALL_CHANGED=$(echo -e "$CHANGED_FILES\n$STAGED_FILES" | sort -u | grep -v "^$")

# ── Guard: skip if nothing relevant changed ───────────────────────────────────
if [ -z "$ALL_CHANGED" ]; then
  echo "[auto-optimize] No app code changed, skipping optimization pass"
  exit 0
fi

# ── Guard: skip if only CLAUDE.md or skills changed ──────────────────────────
ONLY_META=$(echo "$ALL_CHANGED" | grep -v "CLAUDE.md\|\.claude/" | wc -l | tr -d ' ')
if [ "$ONLY_META" -eq 0 ]; then
  echo "[auto-optimize] Only meta files changed, skipping"
  exit 0
fi

# ── Get git diff for context ──────────────────────────────────────────────────
GIT_DIFF=$(git diff HEAD -- $ALL_CHANGED 2>/dev/null | head -500)

# ── Build the prompt ──────────────────────────────────────────────────────────
mkdir -p "$REPO_ROOT/.claude/logs"

PROMPT=$(cat "$AGENT_PROMPT" \
  | sed "s|\$CHANGED_FILES|$ALL_CHANGED|g" \
  | sed "s|\$GIT_DIFF|$GIT_DIFF|g")

# ── Log the run ───────────────────────────────────────────────────────────────
echo "" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"
echo "Auto-optimize run: $(date)" >> "$LOG_FILE"
echo "Changed files:" >> "$LOG_FILE"
echo "$ALL_CHANGED" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

# ── Run the optimization agent ────────────────────────────────────────────────
echo "[auto-optimize] Running optimization agent on changed files..."
echo "[auto-optimize] Files: $ALL_CHANGED"

echo "$PROMPT" | claude --print >> "$LOG_FILE" 2>&1

echo "[auto-optimize] Done. Log: $LOG_FILE"
