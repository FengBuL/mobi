#!/bin/zsh
set -euo pipefail

export HOME="${HOME:-/Users/liujunming}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HOST="0.0.0.0"
export PORT="8788"
export ALLOWED_ORIGINS="*"

APP_DIR="$HOME/Library/Application Support/md-editor-web-private/mp-proxy"
NODE_BIN="/opt/homebrew/bin/node"

if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="/usr/local/bin/node"
fi

cd "$APP_DIR"
exec "$NODE_BIN" "$APP_DIR/server.mjs"
