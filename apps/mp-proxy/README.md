# MP Proxy

用于本地 Markdown 编辑器的微信公众号代理服务。

## 启动

```bash
pnpm --filter @md/mp-proxy start
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

## 开机自启

仓库内已提供模板：

- 启动脚本：`apps/mp-proxy/start-launchd.sh`
- LaunchAgent 模板：`apps/mp-proxy/com.liujunming.md-mp-proxy.plist`

安装时会把运行文件复制到：

```text
~/Library/Application Support/md-editor-web-private/mp-proxy
```

然后由 macOS 在登录时自动启动代理。
