#!/usr/bin/env bash
# Validate runtime config files in config/
# Checks: file existence, line syntax (key=value), and required keys.

set -euo pipefail

PASS=0
FAIL=0

pass() { echo "  [OK]  $*"; ((PASS++)) || true; }
fail() { echo "  [FAIL] $*" >&2; ((FAIL++)) || true; }

# ---------------------------------------------------------------------------
# 1. Required files must exist
# ---------------------------------------------------------------------------
REQUIRED_FILES=(
  config/ui.cfg
  config/shadow.cfg
  config/win-fx.cfg
  config/leaderboard.cfg
)

echo "=== Checking file existence ==="
for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    pass "$f exists"
  else
    fail "$f is missing"
  fi
done

# ---------------------------------------------------------------------------
# 2. Syntax: every non-blank, non-comment line must be key=value
# ---------------------------------------------------------------------------
echo ""
echo "=== Checking line syntax ==="
for f in "${REQUIRED_FILES[@]}"; do
  [[ -f "$f" ]] || continue
  lineno=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    ((lineno++)) || true
    # Strip Windows CRLF carriage return
    line="${line%$'\r'}"
    # Skip blank lines and comment lines
    [[ -z "${line// /}" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    # Must match: key=<anything> (key may contain letters, digits, ., -)
    if [[ "$line" =~ ^[A-Za-z][A-Za-z0-9._-]*= ]]; then
      : # valid
    else
      fail "$f:$lineno — invalid syntax: $line"
    fi
  done < "$f"
  pass "$f syntax OK"
done

# ---------------------------------------------------------------------------
# 3. Required keys per file
# ---------------------------------------------------------------------------
echo ""
echo "=== Checking required keys ==="

check_key() {
  local file="$1" key="$2"
  if grep -qE "^${key}=" "$file" 2>/dev/null; then
    pass "$file: $key"
  else
    fail "$file: missing required key '$key'"
  fi
}

# ui.cfg
check_key config/ui.cfg ui.fixedWindowAspectRatio
check_key config/ui.cfg ui.emojiPackParityMode
check_key config/ui.cfg ui.tileGlobalOpacity
check_key config/ui.cfg board.minTileSizePx
check_key config/ui.cfg board.targetTileSizePx
check_key config/ui.cfg window.defaultScale
check_key config/ui.cfg animation.defaultSpeed
check_key config/ui.cfg gameplay.mismatchDelayMs

# shadow.cfg
check_key config/shadow.cfg activePreset
check_key config/shadow.cfg preset.crisp.leftOffsetPx
check_key config/shadow.cfg preset.balanced.leftOffsetPx
check_key config/shadow.cfg preset.soft.leftOffsetPx

# win-fx.cfg
check_key config/win-fx.cfg winFx.durationMs
check_key config/win-fx.cfg winFx.maxTilePieces
check_key config/win-fx.cfg winFx.colors
check_key config/win-fx.cfg winFx.textOptions

# leaderboard.cfg
check_key config/leaderboard.cfg leaderboard.enabled
check_key config/leaderboard.cfg leaderboard.maxEntries

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
