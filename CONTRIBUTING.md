# 参与墨笔

源码、Issue 和桌面安装包都在 [FengBuL/mobi](https://github.com/FengBuL/mobi)。向本仓库提交的代码默认按 [GNU AGPL-3.0-or-later](./LICENSE) 授权。

## 环境

需要 Node.js 22.16.0 或更高的 22 版本，以及 pnpm 10（仓库已通过 Corepack 固定）。细节见 [DEVELOPMENT.md](./DEVELOPMENT.md)。

```bash
pnpm install --frozen-lockfile
pnpm start
```

浏览器打开 <http://localhost:5173/mobi/>。

## 提交前

```bash
pnpm test
pnpm type-check
pnpm lint
```

当前 lint 基线允许既有 warning，新增代码不得增加 error。

## 开 Issue

请用仓库里的模板，并带上主题名、预览截图、编辑器截图、是否配置了公众号图床。不要在 Issue 里贴 AppSecret、图床密钥或 Cloudflare 管理密钥。

## 开 Pull Request

1. 从默认分支拉出功能分支。
2. 只改和这件事有关的文件。
3. 在 PR 里写清改了什么、怎么验证。
4. 粘贴与图床相关的句子不要写成「贴进去 100% 一样」；微信保不住的构图以 [docs/wechat-paste-regression](./docs/wechat-paste-regression/README.md) 为准。

安全漏洞请走 [SECURITY.md](./SECURITY.md)，不要公开开 Issue。
