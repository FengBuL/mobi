# Markdown Editor Web v2.1.1

一个面向微信公众号写作的 Markdown 编辑器，既可以本地运行，也可以通过 GitHub Pages 在线打开，重点解决写作、预览、样式调整、图片排版和公众号复制发布。

## 访问地址

本地开发地址固定为：

```text
http://localhost:5173/md/
```

在线地址部署到 GitHub Pages 后，默认访问：

```text
https://fengbul.github.io/md-editor-web-private/
```

## 主要能力

- Markdown 编辑与实时文章预览
- 主题、主题色、字体、字号、标题样式组合调整
- 代码块、表格、脚注、Mermaid、KaTeX 等扩展渲染
- 图片排版工作台，支持单图、双图、三图、长图视窗等模板
- 公众号复制链路，支持图片转公众号安全地址后再复制
- 本地文章管理、导入导出

## 环境要求

- Node.js `>= 22.16.0`
- pnpm `>= 10`

## 快速开始

安装依赖：

```bash
pnpm install
```

启动编辑器：

```bash
pnpm start
```

浏览器打开：

```text
http://localhost:5173/md/
```

## 在线部署

仓库已经内置 GitHub Pages 工作流：

- 推送到 `main` 后会自动构建并发布 `apps/web/dist`
- GitHub Pages 项目地址默认是 `https://<owner>.github.io/<repository>/`
- 当前仓库对应地址是 `https://fengbul.github.io/md-editor-web-private/`

如果 GitHub 还没有启用 Pages，需要做一次仓库设置：

1. 打开仓库 `Settings`
2. 进入 `Pages`
3. 把发布来源切到 `GitHub Actions`

如果你的账号计划不支持“私有仓库 GitHub Pages”，这个仓库需要改成公开仓库，或者使用支持私有仓库 Pages 的 GitHub 方案。

## 在线版限制

GitHub Pages 只能部署静态前端，因此：

- 在线版可以正常进行 Markdown 编辑、预览、主题样式调整和本地浏览器存储
- 依赖服务端的公众号图片安全转存、代理上传等能力，仍然需要单独部署 `apps/mp-proxy`
- 如果你希望在线版也支持公众号安全图片复制，需要再提供一个可公网访问的代理服务地址

## 微信公众号图片安全复制

如果要把带图片的内容稳定复制到公众号，建议同时启动本地代理：

```bash
pnpm proxy
```

默认代理地址：

```text
http://127.0.0.1:8788
```

在编辑器里配置：

- 代理域名：`http://127.0.0.1:8788`
- AppID：你的公众号 AppID
- AppSecret：你的公众号 AppSecret

代理说明见 [apps/mp-proxy/README.md](./apps/mp-proxy/README.md)。

## 桌面版

桌面版是同一套前端套了个 Electron 壳，页面代码和网页版完全共用。

```bash
pnpm desktop        # 开发模式，会复用已经起着的 dev server
pnpm build:desktop  # 出产物到 apps/desktop/dist
```

它和网页版的区别只有一处：调微信接口这件事交给主进程做了。浏览器不能跨域访问
`api.weixin.qq.com`，所以网页版必须绕 `mp-proxy`；主进程本身就是 Node，没有这层限制。
所以**桌面版不需要开代理**，图床配置里也不会再让你填代理域名，AppID 和 AppSecret 填上就能用。

这个差异收在 `apps/web/src/services/wechat/` 后面，上层代码不区分自己跑在哪儿。

## 常用命令

```bash
pnpm start
pnpm build:web
pnpm desktop
pnpm build:desktop
pnpm proxy
pnpm type-check
```

## 目录结构

```text
apps/web          网页编辑器
apps/desktop      桌面版 Electron 外壳
apps/mp-proxy     公众号图片代理（网页版用，桌面版不需要）
packages/core     Markdown 渲染与主题注入核心
packages/shared   共享配置、样式与工具
packages/config   TS 配置
patches           依赖补丁
```

## 发布说明

当前发布版本：`v2.1.1`

这一版重点包含：

- 编辑器工作台与预览体验重构
- 图片排版模块与长图视窗能力
- 公众号图片复制链路增强
- 本地代理与局域网使用支持
