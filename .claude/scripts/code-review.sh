#!/bin/bash
# code-review.sh — run the code reviewer agent on changed files
#
# Usage:
#   bash .claude/scripts/code-review.sh
#     -> reviews all uncommitted changes (staged + unstaged)
#
#   bash .claude/scripts/code-review.sh app/api/finance/
#     -> reviews all .ts/.tsx files in the specified directory
#
#   bash .claude/scripts/code-review.sh --last-commit
#     -> reviews files changed in the last commit
#
#   bash .claude/scripts/code-review.sh --diff-main
#     -> reviews all files changed since diverging from main

set -e

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
AGENT_PROMPT="$REPO_ROOT/.claude/agents/code-reviewer.md"
LOG_DIR="$REPO_ROOT/.claude/logs"
OUTPUT_DIR="$REPO_ROOT/.claude/output"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/code-review.log"

# ── Guard: claude CLI must exist ─────────────────────────────────────────────
if ! command -v claude &> /dev/null; then
  echo "[code-review] Error: claude CLI not found."
  exit 1
fi

# ── Guard: agent prompt must exist ───────────────────────────────────────────
if [ ! -f "$AGENT_PROMPT" ]; then
  echo "[code-review] Error: Agent prompt not found at $AGENT_PROMPT"
  exit 1
fi

# ── Detect changed files based on input mode ────────────────────────────────
MODE="uncommitted changes"

if [ "$1" = "--last-commit" ]; then
  MODE="last commit"
  CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null \
    | grep -E "\.(tsx|ts)$" \
    | grep -E "^(app|components|lib)/" \
    | grep -v "node_modules\|\.d\.ts$\|__tests__" \
    | head -40)

elif [ "$1" = "--diff-main" ]; then
  MODE="diff against main"
  MERGE_BASE=$(git merge-base main HEAD 2>/dev/null || echo "HEAD~10")
  CHANGED_FILES=$(git diff --name-only "$MERGE_BASE" HEAD 2>/dev/null \
    | grep -E "\.(tsx|ts)$" \
    | grep -E "^(app|components|lib)/" \
    | grep -v "node_modules\|\.d\.ts$\|__tests__" \
    | head -40)

elif [ -n "$1" ]; then
  # Specific directory or file
  MODE="directory: $1"
  if [ -d "$1" ]; then
    CHANGED_FILES=$(find "$1" \( -name "*.tsx" -o -name "*.ts" \) \
      | grep -v "node_modules\|\.d\.ts$\|__tests__\|\.next" \
      | sort \
      | head -40)
  elif [ -f "$1" ]; then
    CHANGED_FILES="$1"
  else
    echo "[code-review] Error: $1 is not a file or directory."
    exit 1
  fi

else
  # Default: all uncommitted changes (staged + unstaged)
  UNSTAGED=$(git diff --name-only 2>/dev/null \
    | grep -E "\.(tsx|ts)$" \
    | grep -E "^(app|components|lib)/" \
    | grep -v "node_modules\|\.d\.ts$\|__tests__")

  STAGED=$(git diff --cached --name-only 2>/dev/null \
    | grep -E "\.(tsx|ts)$" \
    | grep -E "^(app|components|lib)/" \
    | grep -v "node_modules\|\.d\.ts$\|__tests__")

  CHANGED_FILES=$(echo -e "${UNSTAGED}\n${STAGED}" | sort -u | grep -v "^$" | head -40)

  # Fallback: if no uncommitted changes, review last commit
  if [ -z "$CHANGED_FILES" ]; then
    MODE="last commit (fallback — no uncommitted changes)"
    CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null \
      | grep -E "\.(tsx|ts)$" \
      | grep -E "^(app|components|lib)/" \
      | grep -v "node_modules\|\.d\.ts$\|__tests__" \
      | head -40)
  fi
fi

# ── Guard: nothing to review ────────────────────────────────────────────────
if [ -z "$CHANGED_FILES" ]; then
  echo "[code-review] No files to review. Pass a directory, use --last-commit, or make some changes."
  exit 0
fi

FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')

echo "[code-review] Mode: $MODE"
echo "[code-review] Files to review: $FILE_COUNT"
echo "$CHANGED_FILES" | while read -r f; do echo "  - $f"; done

# ── Get git diff for context ────────────────────────────────────────────────
GIT_DIFF=$(git diff HEAD -- $CHANGED_FILES 2>/dev/null | head -1000)
if [ -z "$GIT_DIFF" ]; then
  GIT_DIFF=$(git diff HEAD~1 HEAD -- $CHANGED_FILES 2>/dev/null | head -1000)
fi

# ── Build prompt ─────────────────────────────────────────────────────────────
PROMPT=$(cat "$AGENT_PROMPT" \
  | sed "s|\\\$CHANGED_FILES|$CHANGED_FILES|g" \
  | sed "s|\\\$GIT_DIFF|$GIT_DIFF|g")

# ── Log ──────────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR" "$OUTPUT_DIR"

echo "" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"
echo "Code review run: $(date)" >> "$LOG_FILE"
echo "Mode: $MODE" >> "$LOG_FILE"
echo "Files ($FILE_COUNT):" >> "$LOG_FILE"
echo "$CHANGED_FILES" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

# ── Run ──────────────────────────────────────────────────────────────────────
echo "[code-review] Starting review..."
echo "$PROMPT" | claude

echo ""
echo "[code-review] Review complete."
echo "[code-review] Check .claude/output/ for the review report."
echo "[code-review] Log: $LOG_FILE"
