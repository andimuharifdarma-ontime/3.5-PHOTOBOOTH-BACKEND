#!/usr/bin/env bash
# Pack macOS .app without relying on a broken default `node` in PATH.
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

for candidate in /opt/homebrew/opt/node@24/bin /usr/local/opt/node@24/bin; do
  if [ -x "$candidate/node" ] && "$candidate/node" -v >/dev/null 2>&1; then
    export PATH="$candidate:$PATH"
    break
  fi
done

if ! command -v node >/dev/null 2>&1 || ! node -v >/dev/null 2>&1; then
  echo "❌ Tidak ada Node.js yang bisa dijalankan."
  echo "   Install: brew install node@24"
  echo "   Lalu: export PATH=\"/opt/homebrew/opt/node@24/bin:\$PATH\""
  exit 1
fi

FAST=0
CLEAN=0
for arg in "$@"; do
  case "$arg" in
    --fast) FAST=1 ;;
    --clean) CLEAN=1 ;;
  esac
done

echo "▶ pack-dir using $(node -v) ($(command -v node))"
cd "$FRONTEND_ROOT"

STAGE_ARGS=()
if [ "$FAST" -eq 1 ]; then
  STAGE_ARGS+=(--fast)
fi
if [ "$CLEAN" -eq 1 ]; then
  STAGE_ARGS+=(--force-clean)
fi

node scripts/stage-pack.js "${STAGE_ARGS[@]}"

electron-builder --mac dir
