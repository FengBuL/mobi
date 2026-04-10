# Markdown Editor Web v2.1.1

一个面向微信公众号写作的本地 Markdown 编辑器，保留网页编辑器主线能力，重点解决写作、预览、样式调整、图片排版和公众号复制发布。

## 访问地址

本地开发地址固定为：

```text
http://localhost:5173/md/
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

## 常用命令

```bash
pnpm start
pnpm proxy
pnpm type-check
pnpm --filter @md/web build
```

## 目录结构

```text
apps/web          网页编辑器
apps/mp-proxy     公众号图片代理
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
