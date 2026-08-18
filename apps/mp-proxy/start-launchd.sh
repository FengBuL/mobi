#!/bin/zsh
set -euo pipefail

# 由 install-launchd.sh 复制到 ~/Library/Application Support/mobi/mp-proxy 下运行。
# 这里不写死任何用户目录：launchd 会带上 HOME，手动执行时也能从当前环境拿到。
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-8788}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173}"

APP_DIR="${MP_PROXY_DIR:-$HOME/Library/Application Support/mobi/mp-proxy}"

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "找不到 node，请确认它在 PATH 里（或用 MP_PROXY_NODE 指定）" >&2
  exit 1
fi
NODE_BIN="${MP_PROXY_NODE:-$NODE_BIN}"

cd "$APP_DIR"
exec "$NODE_BIN" "$APP_DIR/server.mjs"
