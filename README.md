# 墨笔

写完就能贴进公众号的 Markdown 排版编辑器。

本项目以 [GNU AGPL-3.0-or-later](./LICENSE) 开源。源码、Issue 和桌面安装包都在 [FengBuL/mobi](https://github.com/FengBuL/mobi)。参与开发见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

开发者第一次接手项目时，请先阅读：

- [开发环境与交接](./DEVELOPMENT.md)
- [当前项目状态](./PROJECT_STATUS.md)
- [第三方来源与许可证](./THIRD_PARTY_NOTICES.md)
- [安全说明](./SECURITY.md)

左边写 Markdown，右边按贴进公众号之后的结果预览。微信保不住的构图（长图会变成公众号长图、固定裁剪会按原图比例铺满、压在图上的角标会落到图下）当场打标；主题 SVG / 纸纹预览里不画。不要按「贴进去 100% 一样」来理解。依据见 [docs/wechat-paste-regression](./docs/wechat-paste-regression/README.md) 与 TASK-06 记录表。

## 开始用

两种用法，功能是同一套，区别只在装不装。

### 下载桌面版

到 <https://app.mobieditor.cn> 下载对应系统的安装包，或看 [GitHub Releases](https://github.com/FengBuL/mobi/releases/latest)：

| 系统 | 文件 |
| --- | --- |
| macOS（Apple 芯片） | `mobi-*-arm64.dmg` |
| macOS（Intel） | `mobi-*-x64.dmg` |
| Windows | `mobi-*-x64.exe` |

桌面安装包只出 macOS 和 Windows。Linux 请用网页版。

安装包没有花钱买证书做公证，所以第一次打开系统会拦一下，之后就不再提示：

- **macOS 15 及以上**：双击提示「无法验证开发者」之后，打开「系统设置 → 隐私与安全性」，
  往下翻会看到刚才被拦下的墨笔，点「仍要打开」。macOS 15 取消了以前右键「打开」那个入口
- **macOS 14 及以下**：右键点图标选「打开」，在弹窗里再点一次「打开」
- **Windows**：SmartScreen 提示里点「更多信息 → 仍要运行」

### 或者直接用网页版

<https://mobieditor.cn/>

打开就能写，不用装东西。

- **Chrome / Edge**：授权一个本地文件夹后，稿子落成磁盘上的 Markdown 文件，一稿一文件。网页版每次打开要重新授权。
- **Safari / Firefox**：没有文件夹写权限，稿子存在浏览器里。清缓存会丢，建议定期导出。

### 两者的区别

| | 桌面版 | 网页版 |
| --- | --- | --- |
| 公众号素材库 | 填 AppID / AppSecret；还要把本机公网 IP 加进公众号 API 白名单 | 同上，另外必须自填代理。官方代理尚未就绪 |
| 存稿 | 授权目录后，一稿一个 `.md` 文件；重启可恢复 | Chrome / Edge 同样落盘，但每次要重新授权。Safari / Firefox 只在浏览器里 |
| 窗口 | 记住尺寸和位置 | 跟着浏览器 |

素材库那一条是主要差别。浏览器不能跨域访问 `api.weixin.qq.com`，网页版只能绕代理；
桌面版的主进程本身就是 Node，没这层限制，所以不需要代理。填完密钥不等于能转存：接口还要求认证主体和 IP 白名单。

## 能做什么

- Markdown 编辑与实时预览。预览按贴完的结果画，保不住的构图当场打标
- 23 套主题，主题色、字体、字号都能单独调。第一层五套，其余进「更多」
- 板块库：140 个预设。先点预览里的标题、引用或列表，再换这一块的样子
- 图片排版工作台，单图、双图、三图、长图视窗等模板
- 代码块、表格、脚注、Mermaid。公式在帮助里的语法课，不占第一篇
- 存稿是本地 Markdown 文件（桌面版、Chrome / Edge）。Safari / Firefox 存在浏览器里

## 公众号图床

要把图稳定变成公众号自己的地址，走的是素材库接口，不是「填完就能用」。需要同时有 AppID / AppSecret，并把这台电脑当前的公网 IP 加进公众号「API IP 白名单」。没加或宽带换了 IP，接口会报 40164。个人主体通常无法做企业微信认证。

不配图床也可以直接复制。微信不会可靠地把外链转成 `mmbiz`：能热链的外链和本机图，后台有时还在；防盗链或插入失败的会丢（TASK-06：Wikimedia 失败，Unsplash / picsum / httpbin / 本机夹具还在）。

桌面版：打开「设置 → 图床配置 → 公众号图床」，按上面门槛填写。配不了就不要填：直接复制，或在公众号后台手工传图再把 mmbiz 地址贴回来。

网页版：还要先在本机跑代理。官方域名 `api.mobieditor.cn` 尚未 `/health` 成功，不能当成开箱能用。

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

开发环境默认使用 `http://127.0.0.1:8788`。生产构建**不会**把 `https://api.mobieditor.cn` 写成运行时默认——该域名尚未 `/health` 成功。网页版转存必须用户自填代理，或通过 `VITE_MP_PROXY_ORIGIN` 覆盖。

`api.mobieditor.cn` 上线前必须完成 HTTPS、固定出口 IP、公众号 IP 白名单、来源限制、限流和日志脱敏。健康检查返回 `{ "ok": true, "service": "mp-proxy" }` 后，才能发布使用该默认值的 Web 版本。

v2.2.0 开始使用公开仓库 `FengBuL/mobi` 的 GitHub Release 执行应用内更新。发现新版时由用户选择下载、稍后提醒或忽略该版本；下载完成后可以立即重启安装，也可以退出应用时安装。

### 发布

源码和桌面 Release 都在本仓库 [`FengBuL/mobi`](https://github.com/FengBuL/mobi)。

网页版：`pnpm deploy:web`。官方入口是 Cloudflare Pages 的 <https://mobieditor.cn/>；桌面下载页是 <https://app.mobieditor.cn/>；旧地址 <https://fengbul.github.io/mobi/> 仍会同步一份 `/mobi/` 产物。

桌面版：打 `v*` 开头的 tag，CI 在 macOS、Windows 各构建一次，把安装包挂到本仓库的草稿 Release。核对后把草稿改成正式发布即可。
打包只能在目标系统上做，本机 `pnpm package:desktop` 只出当前系统的包。桌面安装包不出 Linux，Linux 请用网页版。

应用内更新还要求 Release 包含 `latest*.yml`、macOS ZIP 和对应的 blockmap。macOS 正式启用自动安装前需要 Developer ID 签名与公证，Windows 建议配置代码签名。
