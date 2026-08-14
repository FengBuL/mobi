# 墨笔数据观测台使用与排障 SOP（小白版）

> 适用对象：第一次接触终端、Cloudflare Worker 和数据库的维护者。
>
> 最后核对日期：2026-08-14。

## 1. 先记住这两个入口

### 日常查看数据

[打开墨笔数据观测台](https://mobi-telemetry.shovy-mobi.workers.dev/dashboard)

这是日常使用的入口。以后无需保存带 `?key=...` 的旧 `/stats` 链接。

### 检查服务是否存活

[打开健康检查](https://mobi-telemetry.shovy-mobi.workers.dev/health)

正常时会显示：

```json
{
  "ok": true
}
```

## 2. 这套系统由什么组成

先不用记技术细节，只需要知道每部分的职责：

| 名称 | 通俗解释 | 平时是否需要操作 |
| --- | --- | --- |
| 墨笔客户端 | 收集匿名功能使用次数 | 使用墨笔时自动完成 |
| 数据观测台 | 把数据转换成图表 | 日常主要使用这里 |
| Cloudflare Worker | 接收数据、查询数据、提供看板页面 | 出问题或更新代码时检查 |
| Cloudflare D1 | 保存统计事件的数据库 | 排查数据缺失时检查 |
| `ADMIN_KEY_SECRET` | 进入观测台的管理密钥 | 登录看板时使用 |
| macOS 钥匙串 | 在你的 Mac 上安全保存管理密钥 | 通过终端复制密钥 |
| Wrangler | 在终端中管理 Cloudflare 的工具 | 部署、看日志、查数据库时使用 |

当前 Worker 名称：`mobi-telemetry`。

当前 D1 数据库名称：`mobi-telemetry`。

项目目录：

```text
/Users/shovy/Documents/gongzhonghao/md-editor-web-private/infra/telemetry-worker
```

## 3. 每天查看数据：1 分钟流程

### 第 1 步：打开终端

1. 按下 `Command + 空格`。
2. 输入「终端」或 `Terminal`。
3. 按回车打开。

文档里的命令每次复制一个代码块，然后在终端按回车。不要复制命令前面的解释文字。

### 第 2 步：把管理密钥复制到剪贴板

在终端运行：

```bash
security find-generic-password -a "$USER" -s "mobi-telemetry-admin-key" -w | pbcopy
```

命令没有显示内容属于正常现象。密钥已经进入剪贴板。

### 第 3 步：打开观测台

打开：

<https://mobi-telemetry.shovy-mobi.workers.dev/dashboard>

在「管理密钥」输入框中按 `Command + V`，然后点击「验证并进入」。

### 第 4 步：选择统计周期

- `7 天`：查看最近一周的短期变化。
- `30 天`：日常推荐，数据量和趋势比较均衡。
- `90 天`：查看长期累计情况。

### 第 5 步：需要时点击「刷新」

客户端最多会暂存约 15 秒再上报。刚完成一次操作时，建议等待 20 秒，然后点击「刷新」。

### 第 6 步：在公用电脑上点击「退出」

管理密钥只保存在当前浏览器会话中。个人电脑可以保持页面打开，公用电脑使用后必须点击「退出」。

## 4. 观测台每个区域怎么看

### 4.1 顶部数字卡片

| 指标 | 含义 | 容易误解的地方 |
| --- | --- | --- |
| 活跃设备 | 按匿名设备 ID 去重后的数量 | 不能直接当作真实人数 |
| 功能操作 | 7 类功能事件的总触发次数 | 同一设备可触发很多次 |
| 桌面端占比 | 桌面版操作量占总操作量的比例 | 按操作次数计算 |
| 高频功能 | 当前周期内使用次数最多的功能 | 数字是触发次数 |

「活跃设备」只是统计口径：

- 同一个人在 2 台电脑上使用，可能算 2 台设备。
- 多个人共用 1 台电脑，可能只算 1 台设备。
- 清理浏览器本地数据后，设备 ID 可能重新生成。

### 4.2 每日操作趋势

折线越高，代表当天记录的操作越多。

目前每天按 UTC 划分，北京时间上午 08:00 左右会进入新的统计日期。这会让凌晨发生的操作落到前一个 UTC 日期中，属于当前统计口径。

### 4.3 平台构成

- 「桌面端」代表安装版墨笔。
- 「网页版」代表浏览器中打开的墨笔。

### 4.4 版本分布

这里可以看到 `2.1.6`、`2.1.7` 等客户端版本。

发布新版后，先看新版是否开始产生数据。如果新版长期为 0，需要检查用户有没有安装新版、统计开关有没有开启、客户端能否联网。

### 4.5 七类功能事件

观测台固定展示全部 7 项。计数为 `0` 表示所选周期内没有收到这类事件。

| 观测台名称 | 内部事件名 | 什么操作会增加计数 |
| --- | --- | --- |
| 复制内容 | `copy` | 成功执行复制到公众号、Markdown 或其他复制方式 |
| 切换主题 | `theme_change` | 选择并切换到另一套主题 |
| 应用整套搭配 | `style_preset_apply` | 应用一套完整的样式搭配预设 |
| 应用板块 | `block_apply` | 把标题、引用、卡片等板块写入正文 |
| 应用图文排版 | `image_layout_apply` | 选择图文模板并写入正文 |
| 导出文件 | `export` | 导出 HTML、纯 HTML、PNG、PDF 或 Markdown |
| 保存公众号配置 | `mp_config_saved` | 保存公众号图床配置 |

主题热度和板块预设热度属于更细的分类，用于判断具体主题或预设的使用情况。

## 5. 终端分别用来做什么

### 5.1 日常：复制管理密钥

```bash
security find-generic-password -a "$USER" -s "mobi-telemetry-admin-key" -w | pbcopy
```

### 5.2 日常：检查 Worker 是否正常

```bash
curl --silent --show-error --fail \
  "https://mobi-telemetry.shovy-mobi.workers.dev/health"
```

正常结果：

```json
{
  "ok": true
}
```

### 5.3 可选：在终端读取原始统计 JSON

普通查看推荐使用观测台。需要检查原始接口时运行：

```bash
mobi_admin_key=$(security find-generic-password -a "$USER" -s "mobi-telemetry-admin-key" -w)
curl --silent --show-error --fail \
  -H "Authorization: Bearer $mobi_admin_key" \
  "https://mobi-telemetry.shovy-mobi.workers.dev/stats?days=30"
unset mobi_admin_key
```

不要把密钥放进 URL，也不要把包含密钥的完整命令发到群聊、工单或截图里。

### 5.4 维护前：进入 Worker 目录

```bash
cd /Users/shovy/Documents/gongzhonghao/md-editor-web-private/infra/telemetry-worker
```

后面的 Wrangler 命令建议都在这个目录中执行。

### 5.5 检查 Cloudflare 登录状态

```bash
npx wrangler whoami
```

正常时会显示 Cloudflare 账号和权限。

如果提示未登录：

```bash
npx wrangler login
```

浏览器会打开 Cloudflare 授权页面，登录后确认授权。

### 5.6 查看当前线上部署

```bash
npx wrangler deployments status
```

重点看：

- 是否能正常返回信息。
- `Version(s)` 是否有版本 ID。
- 创建时间是否符合最近一次部署时间。

### 5.7 查看管理密钥是否存在

```bash
npx wrangler secret list
```

正常时应该看到：

```text
ADMIN_KEY_SECRET
```

Cloudflare 只会显示 Secret 的名称，不会显示密钥内容。这是正常的安全设计。

### 5.8 查看实时请求日志

```bash
npx wrangler tail mobi-telemetry --format pretty
```

运行后终端会持续等待请求。此时：

1. 打开观测台或在墨笔中触发一次事件。
2. 回到终端查看是否出现 `/dashboard`、`/stats` 或 `/ingest` 请求。
3. 检查状态是成功还是错误。
4. 排查结束后按 `Control + C` 停止。

只看错误可以运行：

```bash
npx wrangler tail mobi-telemetry --status error --format pretty
```

### 5.9 只读检查 D1 数据库

下面命令只做查询，不会修改数据：

```bash
npx wrangler d1 execute mobi-telemetry --remote \
  --command "SELECT COUNT(*) AS total_events, COUNT(DISTINCT anon_id) AS devices FROM events;"
```

查看每类事件的总数：

```bash
npx wrangler d1 execute mobi-telemetry --remote \
  --command "SELECT event, COUNT(*) AS count FROM events GROUP BY event ORDER BY count DESC;"
```

查看最后一条事件的时间：

```bash
npx wrangler d1 execute mobi-telemetry --remote \
  --command "SELECT datetime(MAX(ts) / 1000, 'unixepoch') AS latest_event_utc FROM events;"
```

命令中的 `--remote` 很重要，代表查询线上数据库。

## 6. Cloudflare 网站上分别做什么

Cloudflare 控制台地址：<https://dash.cloudflare.com/>

界面名称可能随 Cloudflare 更新略有变化。找不到入口时，优先使用页面顶部搜索。

### 6.1 查看 Worker

1. 登录 Cloudflare。
2. 进入「Workers & Pages」。
3. 选择 `mobi-telemetry`。

在这里可以检查：

- Worker 是否存在。
- 最近部署时间和版本。
- `workers.dev` 访问地址。
- 请求量、错误和日志。

### 6.2 查看管理密钥绑定

1. 打开 `mobi-telemetry`。
2. 进入「Settings」。
3. 找到「Variables and Secrets」。
4. 确认存在 `ADMIN_KEY_SECRET`。
5. 类型应该是 Secret。

Secret 的值不会再次显示。忘记密钥时需要轮换，无法从 Cloudflare 读取旧值。

不要创建明文 `ADMIN_KEY` 变量，也不要把密钥写进 `wrangler.toml`。

### 6.3 查看 D1 数据库

1. 在 Cloudflare 控制台中找到「D1」或「Storage & Databases」。
2. 打开数据库 `mobi-telemetry`。
3. 进入数据浏览或 Console 页面。
4. 查看 `events` 表。

电脑小白建议只运行 `SELECT` 查询。以下 SQL 会修改或删除数据，未经备份和确认不要执行：

```sql
DELETE
DROP TABLE
UPDATE
INSERT
ALTER TABLE
```

### 6.4 查看 Cloudflare 日志

1. 打开 Worker `mobi-telemetry`。
2. 找到「Logs」「Observability」或「Real-time logs」。
3. 重新打开观测台或触发一次墨笔操作。
4. 查看是否有状态码 `401`、`404`、`500` 或异常信息。

## 7. 修改代码后怎么部署

日常查看数据不需要部署。只有修改 Worker 或观测台代码后才执行本节。

先判断修改属于哪一类：

- 修改 `worker.js`、`dashboard.js` 或统计查询：只需部署 Worker，无需重发墨笔安装包。
- 修改客户端埋点、统计开关或 `telemetry.ts`：需要重新构建并发布墨笔客户端，单独部署 Worker 无法让旧客户端获得新逻辑。

### 第 1 步：进入项目根目录

```bash
cd /Users/shovy/Documents/gongzhonghao/md-editor-web-private
```

### 第 2 步：运行测试

```bash
pnpm exec vitest run tests/telemetry-worker.test.ts
```

正常时应看到所有测试通过，失败时先停止部署并排查。

### 第 3 步：运行代码规范检查

```bash
pnpm exec eslint \
  infra/telemetry-worker/worker.js \
  infra/telemetry-worker/dashboard.js \
  tests/telemetry-worker.test.ts
```

没有错误输出并返回终端提示符，代表检查通过。

### 第 4 步：进入 Worker 目录并部署

```bash
cd /Users/shovy/Documents/gongzhonghao/md-editor-web-private/infra/telemetry-worker
npx wrangler deploy
```

正常时会显示：

- `Uploaded mobi-telemetry`
- `Deployed mobi-telemetry triggers`
- Worker 地址
- 新的 `Version ID`

### 第 5 步：部署后验收

```bash
curl --silent --show-error --fail \
  "https://mobi-telemetry.shovy-mobi.workers.dev/health"
```

然后重新打开观测台，确认能登录、能加载 7 项事件、能切换 7/30/90 天。

## 8. 管理密钥怎么轮换

仅在以下情况执行：

- 密钥出现在网址、截图、公开文档或聊天记录中。
- 怀疑别人拿到了密钥。
- 钥匙串中的密钥丢失，Cloudflare 中只剩无法查看的 Secret。

轮换会让旧密钥立即失效。已经打开的观测台需要退出并输入新密钥。

### 第 1 步：进入 Worker 目录

```bash
cd /Users/shovy/Documents/gongzhonghao/md-editor-web-private/infra/telemetry-worker
```

### 第 2 步：生成新密钥并保存到 macOS 钥匙串

```bash
mobi_new_admin_key=$(openssl rand -hex 32)
security add-generic-password -U \
  -a "$USER" \
  -s "mobi-telemetry-admin-key" \
  -w "$mobi_new_admin_key"
```

### 第 3 步：把同一个密钥写入 Cloudflare Secret

```bash
printf '%s' "$mobi_new_admin_key" | npx wrangler secret put ADMIN_KEY_SECRET
unset mobi_new_admin_key
```

`wrangler secret put` 会创建并立即部署一个新 Worker 版本。

### 第 4 步：确认新密钥可用

```bash
security find-generic-password -a "$USER" -s "mobi-telemetry-admin-key" -w | pbcopy
```

打开观测台，点击「退出」，粘贴新密钥重新登录。

## 9. 常见问题与排查顺序

建议从最简单的步骤开始。每完成一步就重新测试，恢复后无需继续往下查。

### 问题 1：观测台提示「密钥无效」或「未验证」

可能原因：

- 使用了已经轮换的旧密钥。
- 浏览器会话里还保存着旧密钥。
- 复制密钥时多了空格或换行。
- Cloudflare 的 `ADMIN_KEY_SECRET` 被删除或换成了别的值。

排查步骤：

1. 在观测台点击「退出」。
2. 重新运行复制命令：

   ```bash
   security find-generic-password -a "$USER" -s "mobi-telemetry-admin-key" -w | pbcopy
   ```

3. 重新粘贴登录。
4. 运行 `npx wrangler secret list`，确认存在 `ADMIN_KEY_SECRET`。
5. 钥匙串找不到密钥时，按照「管理密钥怎么轮换」生成新密钥。

HTTP `401` 就是鉴权失败，通常与密钥有关。

### 问题 2：观测台打不开或显示 404

先确认地址完整：

```text
https://mobi-telemetry.shovy-mobi.workers.dev/dashboard
```

然后检查健康接口：

```bash
curl --silent --show-error \
  "https://mobi-telemetry.shovy-mobi.workers.dev/health"
```

- 健康接口正常、观测台 404：可能部署了旧版 Worker。
- 健康接口也打不开：可能是网络、Cloudflare 服务或 Worker 部署问题。

继续运行：

```bash
cd /Users/shovy/Documents/gongzhonghao/md-editor-web-private/infra/telemetry-worker
npx wrangler deployments status
```

### 问题 3：页面能打开，但一直没有数据

按以下顺序检查：

1. 确认选择了 `30 天` 或 `90 天`。
2. 在墨笔「关于墨笔」中确认匿名使用统计已开启。
3. 主动触发一次主题切换或复制。
4. 等待 20 秒。
5. 点击观测台「刷新」。
6. 打开健康接口确认 Worker 在线。
7. 使用 D1 只读命令查看总事件数有没有增加。

客户端的正常上报机制：

- 最多等待约 15 秒发送一次。
- 队列达到 20 条时会提前发送。
- 页面关闭时会尝试补发。

### 问题 4：只有部分事件有数据，其他事件为 0

这通常代表对应功能还没有在所选周期内成功触发。

逐项测试：

1. 成功复制一次内容。
2. 切换一次主题。
3. 应用一次整套搭配预设。
4. 应用一次板块。
5. 应用一次图文排版。
6. 导出一次文件。
7. 保存一次公众号图床配置。
8. 等待 20 秒后刷新观测台。

如果某一项仍为 0：

1. 运行实时日志：

   ```bash
   cd /Users/shovy/Documents/gongzhonghao/md-editor-web-private/infra/telemetry-worker
   npx wrangler tail mobi-telemetry --format pretty
   ```

2. 再触发该功能。
3. 检查是否出现 `POST /ingest`。
4. 没有 `/ingest` 时重点检查客户端版本、统计开关和网络。

### 问题 5：网页版有数据，桌面端没有数据

可能原因：

- 桌面端安装的是旧安装包。
- 桌面端的匿名统计开关被关闭。
- 桌面端无法访问 Worker 地址。
- 事件还在 15 秒暂存时间内。

排查步骤：

1. 在「关于墨笔」查看版本和统计开关。
2. 确认已经安装当前发布版本。
3. 在桌面端触发主题切换和复制。
4. 等待 20 秒。
5. 查看观测台的版本分布和平台构成。

### 问题 6：终端提示 `command not found`

如果提示 `npx: command not found`：

```bash
node --version
npm --version
```

两条命令也找不到时，说明 Node.js 没有安装或终端环境异常。

如果提示 `pnpm: command not found`，可以先检查：

```bash
corepack enable
pnpm --version
```

仍无法解决时，先停止部署，避免临时安装错误版本破坏项目环境。

### 问题 7：Wrangler 提示未登录或没有权限

```bash
npx wrangler whoami
```

未登录时运行：

```bash
npx wrangler login
```

如果已经登录但没有权限，确认登录的是维护 `mobi-telemetry` 的 Cloudflare 账号。

### 问题 8：出现 HTTP 500

HTTP `500` 代表 Worker 内部执行失败，常见原因是 D1 绑定缺失、数据库表缺失或代码异常。

先看错误日志：

```bash
npx wrangler tail mobi-telemetry --status error --format pretty
```

再检查 D1 是否有 `events` 表：

```bash
npx wrangler d1 execute mobi-telemetry --remote \
  --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
```

如果列表里没有 `events`，先停止操作并确认数据库绑定。初始化表会改变线上数据库，建议在确认目标数据库后再执行：

```bash
npx wrangler d1 execute mobi-telemetry --remote --file schema.sql
```

`schema.sql` 使用 `CREATE TABLE IF NOT EXISTS`，用于创建缺失的表和索引。

### 问题 9：数据突然减少或活跃设备数不符合预期

先检查统计周期是否从 `90 天` 切到了 `7 天`。

另外注意：

- 活跃设备按匿名 ID 计算。
- 用户清理本地存储后可能获得新的匿名 ID。
- 同一设备上的多人可能只计为一个设备。
- 当前系统没有自动删除历史数据的定时任务。

如果 D1 总数据还在，通常属于筛选周期或统计口径变化。

### 问题 10：Cloudflare 网站上的按钮名称和文档不一致

Cloudflare 会更新控制台界面。可以在控制台顶部搜索以下关键词：

- `mobi-telemetry`
- `Workers & Pages`
- `D1`
- `Variables and Secrets`
- `Logs`
- `Deployments`

找不到时优先使用本 SOP 中的 Wrangler 命令完成只读检查。

## 10. HTTP 状态码速查

| 状态码 | 含义 | 优先检查 |
| --- | --- | --- |
| `200` | 请求成功 | 无需处理 |
| `204` | 数据上报成功，没有返回正文 | `/ingest` 正常情况 |
| `302` | 自动跳转 | 根地址跳转到 `/dashboard` 属于正常情况 |
| `400` | 上报内容格式有问题 | 客户端请求内容、Worker 日志 |
| `401` | 管理密钥验证失败 | 钥匙串、Secret、浏览器旧会话 |
| `404` | 路径不存在或部署版本太旧 | URL、部署版本 |
| `500` | Worker 或数据库执行异常 | 错误日志、D1 绑定、数据表 |

## 11. 哪些操作平时不要做

以下操作可能导致数据丢失、看板无法登录或服务中断：

- 不要删除 D1 数据库。
- 不要在 D1 中运行 `DELETE` 或 `DROP TABLE`。
- 不要运行 `wrangler secret delete ADMIN_KEY_SECRET`。
- 不要把真实密钥写进 `wrangler.toml`、Git、文档或网址。
- 不要在测试失败时部署。
- 不要把旧版安装包重新上传成新版。
- 不要随意修改 Worker 的 D1 绑定名称 `DB`。

拿不准时先截图错误信息。截图前确认画面里没有管理密钥。

## 12. 建议维护节奏

### 每周一次

- 打开 30 天观测台。
- 检查 7 类事件是否都显示。
- 查看桌面端和网页版是否持续有数据。

### 每次发布墨笔新版后

- 查看版本分布是否出现新版本。
- 在新版本中触发主题、复制和板块操作。
- 等待 20 秒后刷新观测台。

### 每月一次

- 运行 `npx wrangler deployments status`。
- 运行 `npx wrangler secret list`。
- 使用 D1 只读命令检查总事件数和最后事件时间。
- 检查 Cloudflare 是否出现错误或额度提醒。

## 13. 隐私与数据边界

当前系统记录：

- 匿名设备 ID。
- 临时会话 ID。
- 平台和客户端版本。
- 7 类功能事件。
- 主题、预设、导出格式等有限功能参数。

当前系统不记录：

- 文章正文。
- 文章标题。
- 微信公众号内容。
- 姓名、手机号或邮箱。
- 公众号密钥和图床密钥。

## 14. 官方参考资料

- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Workers 实时日志](https://developers.cloudflare.com/workers/observability/logs/real-time-logs/)
- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Cloudflare D1 Wrangler 命令](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare D1 入门与远程查询](https://developers.cloudflare.com/d1/get-started/)

---

## 最短故障处理路线

只记住下面 6 步也可以：

1. 打开 `/health`，确认返回 `{ "ok": true }`。
2. 在观测台退出，重新从钥匙串复制密钥登录。
3. 选择 `30 天`，触发一次功能后等待 20 秒并刷新。
4. 运行 `npx wrangler deployments status`。
5. 运行 `npx wrangler tail mobi-telemetry --status error --format pretty`。
6. 仍无法解决时保留终端错误和 Cloudflare 日志截图，交给开发人员排查。
