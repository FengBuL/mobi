# Markdown Editor Web

一个只保留网页编辑器能力的 Markdown 编辑器仓库，用于本地写作、预览和样式排版。

## 功能

- Markdown 编辑与实时预览
- 主题、字体、字号、标题样式配置
- 代码块、表格、脚注、Mermaid、KaTeX 等扩展渲染
- 本地文章管理与导入导出
- 固定启动地址：`http://localhost:5173/md/`

## 环境要求

- Node.js `>= 22.16.0`
- pnpm `>= 10`

## 本地启动

```bash
pnpm install
pnpm start
```

启动后打开：

```text
http://localhost:5173/md/
```

## 常用命令

```bash
pnpm start
pnpm type-check
pnpm --filter @md/web build
```

## 目录结构

```text
apps/web          Web 编辑器应用
packages/core     渲染与主题处理核心
packages/shared   共享配置、类型与工具
packages/config   TS 配置
patches           依赖补丁
```

## 说明

这个仓库已经移除了移动端壳、AI 模块、编辑器扩展壳、脚本工具链和无关文档，只保留运行网页编辑器所需的最小代码。
