#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

osascript <<EOF
tell application "Terminal"
  activate
  do script "cd " & quoted form of "$REPO_ROOT" & " && bun run mobile-jobs"
end tell
EOF
