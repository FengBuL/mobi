#!/bin/zsh
set -euo pipefail

# 把代理装成登录时自启的 LaunchAgent。
# plist 在这里按当前用户生成，仓库里不保留任何人的家目录路径。

LABEL="com.md-editor.mp-proxy"
SOURCE_DIR="${0:A:h}"
APP_DIR="$HOME/Library/Application Support/mobi/mp-proxy"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

PORT="${PORT:-8788}"
HOST="${HOST:-0.0.0.0}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-*}"

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "找不到 node，请先安装或把它加入 PATH" >&2
  exit 1
fi

mkdir -p "$APP_DIR" "$HOME/Library/LaunchAgents"
cp "$SOURCE_DIR/server.mjs" "$SOURCE_DIR/start-launchd.sh" "$APP_DIR/"
chmod +x "$APP_DIR/start-launchd.sh"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>$APP_DIR/start-launchd.sh</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$APP_DIR</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>$HOME</string>
    <key>PATH</key>
    <string>$(dirname "$NODE_BIN"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOST</key>
    <string>$HOST</string>
    <key>PORT</key>
    <string>$PORT</string>
    <key>ALLOWED_ORIGINS</key>
    <string>$ALLOWED_ORIGINS</string>
  </dict>

  <key>StandardOutPath</key>
  <string>/tmp/md-mp-proxy.out.log</string>

  <key>StandardErrorPath</key>
  <string>/tmp/md-mp-proxy.err.log</string>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
PLIST_EOF

launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$UID" "$PLIST"

echo "已安装并启动：$LABEL"
echo "  监听      http://127.0.0.1:$PORT"
echo "  运行目录  $APP_DIR"
echo "  日志      /tmp/md-mp-proxy.out.log  /tmp/md-mp-proxy.err.log"
echo
echo "卸载：launchctl bootout gui/\$UID/$LABEL && rm '$PLIST'"
