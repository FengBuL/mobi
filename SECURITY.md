# 安全说明

不要在公开 Issue、Pull Request 或讨论区里发送密钥、Cookie、管理后台截图。

## 本机凭据

微信公众号 AppID / AppSecret、各类图床密钥只存在使用者本机。它们不属于仓库，也不应出现在提交、日志或示例配置里。

观测台管理密钥是 Cloudflare Secret，只放在部署环境里。不要写进 `wrangler.toml`、URL 或文档正文。

## 报告漏洞

请使用 GitHub Private Vulnerability Advisory：

<https://github.com/FengBuL/mobi/security/advisories/new>

说明影响范围、复现条件和你认为的修复方向即可。我们会在确认后公开修复，并在需要时致谢。

以下情况请直接开 Issue，不必走私密渠道：

- 未签名安装包被系统拦截（已知限制）
- 公众号 API 返回 40164（IP 未进白名单）
- 外链图片贴进公众号后丢失（微信不会可靠转存外链）
