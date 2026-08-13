# 墨笔匿名使用统计（Cloudflare Worker + D1）

收集端只记「功能被用了多少次」：复制、换主题、插板块、图文排版、导出、配图床。
没有文章内容，没有个人信息，anonId 是客户端随机生成的 UUID。
Cloudflare 免费额度（每天 10 万次请求、5GB D1）对这个量级绰绰有余。

## 部署（一次性，约 10 分钟）

```bash
cd infra/telemetry-worker

# 1. 登录（首次会打开浏览器授权）
npx wrangler login

# 2. 建数据库，把输出的 database_id 填进 wrangler.toml
npx wrangler d1 create mobi-telemetry

# 3. 建表
npx wrangler d1 execute mobi-telemetry --remote --file=schema.sql

# 4. 改 wrangler.toml 里的 ADMIN_KEY（换成长随机串），然后部署
npx wrangler deploy
```

部署完会得到一个地址，形如 `https://mobi-telemetry.<子域>.workers.dev`。

## 接到编辑器上

把地址填进 `apps/web/src/config/telemetry.ts`：

```ts
export const TELEMETRY_ENDPOINT = `https://mobi-telemetry.<子域>.workers.dev`
```

重新构建发版后生效。没填之前，客户端一个字节都不会发。
用户随时可以在「关于墨笔」里关掉统计。

## 看数据

```bash
curl "https://mobi-telemetry.<子域>.workers.dev/stats?key=<ADMIN_KEY>&days=30"
```

返回：

- `activeUsers`：活跃设备数（按 anonId 去重）
- `byPlatform`：桌面版 / 网页版分布
- `byEvent`：各事件总次数（copy / theme_change / block_apply / image_layout_apply / export / style_preset_apply / mp_config_saved）
- `topDetails`：细分明细，例如哪个板块预设、哪套主题用得最多

## 客户端埋点一览

| 事件 | 触发点 | 维度 |
| --- | --- | --- |
| `copy` | 复制到公众号 / 其他格式 | mode |
| `theme_change` | 切换主题 | theme |
| `style_preset_apply` | 应用整套搭配预设 | preset |
| `block_apply` | 板块库写入正文 | category, preset |
| `image_layout_apply` | 图文排版写入正文 | preset |
| `export` | 导出文件 | format |
| `mp_config_saved` | 保存公众号图床配置 | - |
