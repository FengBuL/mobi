# 墨笔开发交接

本文面向第一次拿到项目源码的开发者。基础开发不需要生产环境密钥。

## 1. 环境

- macOS、Windows 或 Linux；
- Git；
- Node.js 22.16.0 或更高的 Node.js 22 版本；
- pnpm 10（仓库已通过 Corepack 固定版本）。

项目提供 `.nvmrc`：

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@10 --activate
```

如果系统没有 Corepack，可以单独安装 pnpm：

```bash
npm install --global pnpm@10
```

## 2. 首次启动

在项目根目录运行：

```bash
pnpm install --frozen-lockfile
pnpm start
```

浏览器打开：

<http://localhost:5173/mobi/>

`pnpm start` 会同时启动网页开发服务器和 `mp-proxy`。只调试页面且不使用公众号图床时，可以运行 `pnpm start:web`。

开发环境的公众号代理默认为 `http://127.0.0.1:8788`。验证其他部署时可以覆盖：

```bash
VITE_MP_PROXY_ORIGIN=https://api.example.com pnpm start:web
```

桌面端开发使用两个终端：

```bash
# 终端 1
pnpm start

# 终端 2
pnpm desktop
```

## 3. 提交前验证

```bash
pnpm test
pnpm type-check
pnpm lint
pnpm build:web
pnpm build:desktop
```

当前 lint 基线允许既有 warning，新增代码不得增加 error。

桌面发布还要确认 `apps/desktop/release` 包含对应平台的 `latest*.yml`、macOS ZIP 和 blockmap；只有安装包无法支持应用内更新。

## 4. 常用任务

| 任务 | 命令 |
| --- | --- |
| 网页开发（含公众号代理） | `pnpm start` |
| 仅网页开发服务器 | `pnpm start:web` |
| 桌面开发 | `pnpm desktop` |
| 网页构建 | `pnpm build:web` |
| 桌面构建 | `pnpm build:desktop` |
| 当前系统安装包 | `pnpm package:desktop` |
| 公众号图片代理 | `pnpm proxy` |
| 单元测试 | `pnpm test` |
| 测试监听 | `pnpm test:watch` |
| 类型检查 | `pnpm type-check` |
| 代码检查 | `pnpm lint` |

## 5. 可选服务与凭据

### 公众号图片代理

网页版使用公众号图床时运行：

```bash
pnpm proxy
```

可选环境变量：

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | 监听地址 |
| `PORT` | `8788` | 监听端口 |
| `MAX_BODY_SIZE_MB` | `32` | 最大请求体 |
| `ALLOWED_ORIGINS` | `*` | 允许来源，逗号分隔 |

微信公众号 AppID、AppSecret 和图床凭据由开发者在界面中填写，只保存在本机数据中，禁止提交到 Git。

### 数据观测台

基础编辑器开发不需要 Cloudflare 权限。只有部署或维护 `infra/telemetry-worker` 时才需要：

- Cloudflare 账号权限；
- D1 数据库绑定；
- Cloudflare Secret `ADMIN_KEY_SECRET`。

管理密钥禁止写入仓库、URL、截图或聊天记录。

当前客户端配置了生产 telemetry endpoint。匿名统计默认关闭；只有在「设置」里打开后才会上报。

## 6. Git 与双仓库边界

| 远端 | 仓库 | 用途 |
| --- | --- | --- |
| `origin` | `FengBuL/mobi-src` | 私有完整源码 |
| `dist` | `FengBuL/mobi` | 公开 README、网页产物和安装包 |

禁止向 `dist` 推送源码分支。日常开发从 `main` 建立功能分支，提交到 `origin`，通过 Pull Request 合并。

建议流程：

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/short-description

# 开发并完成验证
git add <明确文件>
git commit -m "feat: concise description"
git push -u origin feature/short-description
```

## 7. 交接时需要保留

- 全部 Git 受控文件；
- `.git`，如果接收者需要完整历史和直接提交；
- `pnpm-lock.yaml`；
- `patches/`；
- `.nvmrc`、`.npmrc`；
- `DEVELOPMENT.md`、`PROJECT_STATUS.md`、`THIRD_PARTY_NOTICES.md`。

交接时无需携带：

- `node_modules/`；
- `apps/web/dist/`；
- `apps/desktop/release/`；
- coverage、测试报告和日志；
- `.env*`、账号凭据、Cloudflare Secret；
- macOS `.DS_Store`。
