# MP Proxy

用于本地 Markdown 编辑器的微信公众号代理服务。

## 启动

```bash
pnpm --filter @mobi/mp-proxy start
```

默认监听：

```text
http://127.0.0.1:8788
```

局域网访问时，手机应使用你电脑的局域网 IP，例如：

```text
http://192.168.101.148:8788
```

## 环境变量

```bash
HOST=0.0.0.0
PORT=8788
ALLOWED_ORIGINS=*
MAX_BODY_SIZE_MB=32
```

默认允许所有来源，保证本机和局域网先能跑起来。公网部署时，建议手动改成：

```text
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://192.168.101.148:5173
```

## 编辑器里怎么填

- 代理域名：`http://127.0.0.1:8788`
- appID：你的公众号 AppID
- appsecret：你的公众号 AppSecret

如果你是手机通过局域网访问编辑器，把 `ALLOWED_ORIGINS` 里补上你的局域网地址，例如：

```text
http://192.168.101.148:5173
```

## 开机自启（macOS）

```bash
zsh apps/mp-proxy/install-launchd.sh
```

脚本会按**当前用户**生成 LaunchAgent，仓库里不保留任何人的家目录路径。它做三件事：

1. 把 `server.mjs` 和 `start-launchd.sh` 复制到 `~/Library/Application Support/mobi/mp-proxy`
2. 在 `~/Library/LaunchAgents/com.md-editor.mp-proxy.plist` 生成配置
3. 立即加载，之后每次登录自动启动

想换端口或收紧来源，安装时带上环境变量：

```bash
PORT=9000 ALLOWED_ORIGINS=http://localhost:5173 zsh apps/mp-proxy/install-launchd.sh
```

日志在 `/tmp/md-mp-proxy.out.log` 和 `/tmp/md-mp-proxy.err.log`。

卸载：

```bash
launchctl bootout gui/$UID/com.md-editor.mp-proxy
rm ~/Library/LaunchAgents/com.md-editor.mp-proxy.plist
```
