# 墨笔

写完就能贴进公众号的 Markdown 排版编辑器。

开发者第一次接手项目时，请先阅读：

- [开发环境与交接](./DEVELOPMENT.md)
- [当前项目状态](./PROJECT_STATUS.md)
- [第三方来源与许可证](./THIRD_PARTY_NOTICES.md)

左边写 Markdown，右边就是公众号里的样子，排好版一键复制，粘到公众号后台不走样。

## 开始用

两种用法，功能是同一套，区别只在装不装。

### 下载桌面版

到 [Releases](https://github.com/FengBuL/mobi/releases/latest) 下载对应系统的安装包：

| 系统 | 文件 |
| --- | --- |
| macOS（Apple 芯片） | `mobi-*-arm64.dmg` |
| macOS（Intel） | `mobi-*-x64.dmg` |
| Windows | `mobi-*-x64.exe` |
| Linux | `mobi-*-x64.AppImage` |

安装包没有花钱买证书做公证，所以第一次打开系统会拦一下，之后就不再提示：

- **macOS 15 及以上**：双击提示「无法验证开发者」之后，打开「系统设置 → 隐私与安全性」，
  往下翻会看到刚才被拦下的墨笔，点「仍要打开」。macOS 15 取消了以前右键「打开」那个入口
- **macOS 14 及以下**：右键点图标选「打开」，在弹窗里再点一次「打开」
- **Windows**：SmartScreen 提示里点「更多信息 → 仍要运行」

### 或者直接用网页版

<https://fengbul.github.io/mobi/>

打开就能写，不用装东西。建议用 Chrome 或 Edge——本地文件夹功能只有 Chromium 系浏览器支持。

### 两者的区别

| | 桌面版 | 网页版 |
| --- | --- | --- |
| 公众号图床 | 填好 AppID 和 AppSecret 就能用 | 还要自己跑一个 `mp-proxy` 代理 |
| 本地文件夹 | 重启后自动恢复上次打开的 | 每次打开都要重新授权一次 |
| 窗口 | 记住尺寸和位置 | 跟着浏览器 |
| 浏览器要求 | 没有 | Chromium 系 |

图床那一条是主要差别。浏览器不能跨域访问 `api.weixin.qq.com`，网页版只能绕代理；
桌面版的主进程本身就是 Node，没这层限制，所以不需要代理。

## 能做什么

- Markdown 编辑与实时预览，预览就是公众号里的最终效果
- 23 套主题，主题色、字体、字号、标题样式都能单独调
- 板块库：140 个预设，点预览里的元素就能原地换样式
- 图片排版工作台，单图、双图、三图、长图视窗等模板
- 代码块、表格、脚注、Mermaid、KaTeX
- 本地文章管理、授权文件夹读写、导入导出

## 公众号图床

要把带图片的内容稳定复制进公众号，需要配一下图床，让图片先转成公众号自己的地址。

桌面版：打开「插入 → 插入图片 → 公众号图床」，填 AppID 和 AppSecret，保存。

网页版：还要先在本机跑代理

```bash
pnpm proxy   # 默认监听 http://127.0.0.1:8788
```

然后在同一个配置面板里多填一项「代理域名」`http://127.0.0.1:8788`。
代理说明见 [apps/mp-proxy/README.md](./apps/mp-proxy/README.md)。

---

## 开发

Node.js `>= 22.16.0`，pnpm `10`（仓库已通过 Corepack 固定版本）。

```bash
pnpm install
pnpm start      # 同时启动网页版和公众号代理，http://localhost:5173/mobi/
pnpm desktop    # 桌面版开发模式，会复用已经起着的 dev server
```

### 常用命令

```bash
pnpm start            # 网页版 dev server + 公众号图片代理
pnpm start:web        # 只启动网页版 dev server
pnpm desktop          # 桌面版 dev
pnpm build:web        # 构建网页版
pnpm build:desktop    # 构建桌面版产物
pnpm package:desktop  # 打当前系统的安装包到 apps/desktop/release
pnpm proxy            # 单独启动公众号图片代理
pnpm type-check
pnpm lint
pnpm test
```

### 目录结构

```text
apps/web          编辑器本体，网页版和桌面版共用这一套前端
apps/desktop      桌面版 Electron 外壳（主进程、preload、打包配置）
apps/mp-proxy     公众号图片代理，只有网页版需要
packages/core     Markdown 渲染与主题注入核心
packages/shared   共享配置、样式与工具
packages/config   TS 配置
docs              板块系统、主题、公众号排版的设计与验收文档
```

桌面版和网页版跑的是同一份前端代码，没有第二套实现。两边调微信接口的方式不同，
差异收在 `apps/web/src/services/wechat/` 后面：网页走 `mp-proxy`，桌面走 IPC 交给主进程。
上层代码不需要知道自己跑在哪儿。

生产构建默认使用 `https://api.mobieditor.cn` 作为公众号代理，普通用户无需填写代理地址。开发环境默认使用 `http://127.0.0.1:8788`；私有部署可以通过 `VITE_MP_PROXY_ORIGIN` 覆盖，或在公众号图床的高级设置中填写自定义代理。

`api.mobieditor.cn` 上线前必须完成 HTTPS、固定出口 IP、公众号 IP 白名单、来源限制、限流和日志脱敏。健康检查返回 `{ "ok": true, "service": "mp-proxy" }` 后，才能发布使用该默认值的 Web 版本。

v2.2.0 开始使用公开仓库 `FengBuL/mobi` 的 GitHub Release 执行应用内更新。发现新版时由用户选择下载、稍后提醒或忽略该版本；下载完成后可以立即重启安装，也可以退出应用时安装。

### 发布

代码在私有仓库 `mobi-src`，对外分发走公开仓库 [`mobi`](https://github.com/FengBuL/mobi)——
那边只有下载说明、Release 安装包和网页版构建产物，没有源码。

网页版：`pnpm deploy:web`，本地构建后把纯产物推到公开仓库的 `gh-pages` 分支。

桌面版：打 `v*` 开头的 tag，本仓库的 CI 在三个平台各构建一次，汇总成一个草稿 Release；
下载这些安装包后在公开仓库发正式 Release（`gh release create vX.Y.Z --repo FengBuL/mobi 安装包...`）。
打包只能在目标系统上做，本机 `pnpm package:desktop` 只出当前系统的包。

应用内更新还要求公开 Release 包含 `latest*.yml`、macOS ZIP 和对应的 blockmap。macOS 正式启用自动安装前需要 Developer ID 签名与公证，Windows 建议配置代码签名。
