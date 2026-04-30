#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: bun run terminal <script-name>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_NAME="$1"
COMMAND_TEXT="cd '$REPO_ROOT' && bun run '$SCRIPT_NAME'"

osascript >/dev/null <<EOF
set commandText to "$COMMAND_TEXT"

tell application "Terminal"
  set terminalWasRunning to running
  if not terminalWasRunning then
    do script commandText
    activate
  else
    activate
    do script ""
    delay 0.2
    do script commandText in selected tab of front window
  end if
end tell
EOF
