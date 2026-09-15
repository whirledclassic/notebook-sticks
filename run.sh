#!/bin/sh
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 18 or newer from https://nodejs.org"
  exit 1
fi
if [ ! -d node_modules/ws ]; then
  echo "Installing the one dependency..."
  npm install
fi
export PORT="${PORT:-3000}"
export HOST="${HOST:-0.0.0.0}"
echo "Open http://localhost:$PORT"
exec node server.js
