# 墨笔匿名使用统计 + 应用内反馈（Cloudflare Worker + D1）

收集端记两类东西：

- 匿名使用统计：打开、复制、换主题、点选、插板块、调全局样式、开面板、出错。没有文章内容，没有个人信息，anonId 是客户端随机生成的 UUID。
- 应用内反馈：用户在编辑器顶栏「反馈」里勾的「哪里不对」标签（可多选）和选填的一段话。不收联系方式；环境信息（版本 / 平台 / 主题 / 屏宽 / 模式 / 浏览器 / 系统 / 图床类型 / 入口）一律附带，不含稿子正文。落 D1，再按配置转发到 GitHub Issue 和飞书群。

Cloudflare 免费额度（每天 10 万次请求、5GB D1）对这个量级绰绰有余。

## 部署（一次性，约 10 分钟）

```bash
cd infra/telemetry-worker

# 1. 登录（首次会打开浏览器授权）
npx wrangler login

# 2. 建数据库，把输出的 database_id 填进 wrangler.toml
npx wrangler d1 create mobi-telemetry

# 3. 建表（已部署过的库再跑一次也安全，只会补 feedback 表和新索引）
npx wrangler d1 execute mobi-telemetry --remote --file=schema.sql

# 4. 把管理密钥保存为 Cloudflare Secret，避免写进仓库
npx wrangler secret put ADMIN_KEY_SECRET

# 5. 部署
npx wrangler deploy
```

部署完会得到一个地址，形如 `https://mobi-telemetry.<子域>.workers.dev`。

## 升级已有部署（2.3.3 → 本版）

```bash
cd infra/telemetry-worker
npx wrangler d1 execute mobi-telemetry --remote --file=schema.sql   # 补 feedback 表
npx wrangler deploy
```

旧客户端继续往 `/ingest` 报，不受影响。新增看板区块要等新版客户端发出去才有数据。

## 反馈转发（可选，填哪个走哪个）

```bash
# GitHub：建一个 fine-grained token，只给 FengBuL/mobi 的 Issues: Read and write
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put GITHUB_REPO        # 填 FengBuL/mobi

# 飞书：群设置 → 群机器人 → 自定义机器人，复制 webhook 地址
npx wrangler secret put FEISHU_WEBHOOK
```

- 两个都不填：反馈只存 D1，看板「用户反馈」里能看到。
- 只填 GitHub：每条反馈开一个 Issue，标签 `feedback` + 用户勾的每个标签（贴进去不一样 / 图丢了 / 复制失败 / 主题不对 / 板块不对 / 样式面板难用 / 想要新功能 / 其他）。只勾标签没写字的，标题写「（只勾了标签）」。用户提交后能看到 Issue 链接。
- 只填飞书：每条反馈推一条文本消息到群。
- 都填：先建 Issue，再把 Issue 链接一起推飞书。

限流：同一 IP 一小时最多 5 条。正文 10–4000 字。带蜜罐字段，机器人填了直接 403。

## 接到编辑器上

客户端从构建环境变量 `VITE_TELEMETRY_ENDPOINT` 读取 Worker 地址，统计和反馈共用这一个地址。
网页发布前设置 `MOBI_TELEMETRY_ENDPOINT`，桌面发布由 GitHub Actions 仓库变量注入。

没填地址时：统计一个字节都不发；反馈弹窗仍能打开，「提交」会把内容带到 GitHub 新建 Issue 页。

## 看数据

浏览器打开可视化看板：

```text
https://mobi-telemetry.<子域>.workers.dev/dashboard
```

看板会提示输入管理密钥，并通过 `Authorization` 请求头读取数据。密钥仅保存在当前浏览器会话中。

看板区块：

- 顶部四格：活跃设备（含新增 / 回访）、复制次数、打开 → 复制转化、桌面端占比
- 主路径漏斗：打开 → 换主题 → 点选 → 复制，按设备数
- 屏幕宽度：打开时的窗口宽度分桶
- 全局样式 · 控件使用：每个控件被多少台设备动过。长期 0 或只有 1 台设备用过的，就是可以收掉的候选
- 全局样式 · 页签与精细调节：四个页签各被翻开多少次；「精细调节」各分组被改过多少次
- 复制时的稿子：带板块、带图、有图没转存、已配图床的占比
- 面板打开、错误、功能排行、版本、主题、板块预设
- 用户反馈：周期内最近 200 条，含标签（`type` 列存逗号串）、正文、环境、Issue 链接、处理状态；可按标签 / 状态过滤，可标「已处理 / 不处理」

命令行：

```bash
curl -H "Authorization: Bearer <ADMIN_KEY>" \
  "https://mobi-telemetry.<子域>.workers.dev/stats?days=30"
```

旧的 `?key=` 查询参数暂时保留兼容。

`/stats` 返回字段：`activeUsers`、`newUsers`、`returningUsers`、`byPlatform`、`byEvent`、`topDetails`、`byDay`、`byVersion`、`funnel`、`byViewport`、`byTheme`、`byBlock`、`byStyleControl`、`byStyleTab`、`byTokenGroup`、`byPanel`、`byError`、`copyContext`、`feedback`。

## 客户端埋点一览

| 事件 | 触发点 | 维度 |
| --- | --- | --- |
| `app_open` | 每次打开 | first（是否新设备）, viewport（宽度桶）, width, height, dpr, mode, dark |
| `copy` | 复制到公众号 / 其他格式 | mode, theme, blocks, images, unsafeImages, chars（字数桶）, mpConfigured |
| `theme_change` | 切换主题 | theme |
| `block_select` | 预览里点中一块 | category, styled |
| `block_apply` | 板块库写入正文 | category, preset |
| `image_layout_apply` | 图文排版写入正文 | preset |
| `style_preset_apply` | 应用整套搭配预设 | preset |
| `style_adjust` | 全局样式里动了一个控件 | control, surface（panel / compact）, value（只记枚举值） |
| `style_token_adjust` | 「精细调节」改了一个字段 | action（set / reset / reset_group / reset_all / palette）, group, key |
| `style_tab_open` | 翻开样式面板页签 | tab（template / text / block / detail / component） |
| `panel_open` | 打开样式 / 板块库 / 文章列表 / 文件夹 / 插图 / 图文排版 | panel, mode |
| `workspace_mode` | 简洁 ↔ 专业 | mode |
| `export` | 导出文件 | format |
| `mp_config_saved` | 保存公众号图床配置 | - |
| `feedback_submit` | 反馈提交成功 | types（逗号串）, hasMessage, source, forwarded |
| `error` | 复制失败、存稿写入失败、存稿快满、图床上传失败 | kind, message（≤80 字） |

`style_adjust` 的 `control` 取值：`font_family`、`font_size`、`primary_color`、`primary_color_follow_theme`、`primary_color_save`、`indent`、`justify`、`code_block_theme`、`code_language`、`line_number`、`cite_links`、`word_count`、`reset_text_group`、`reset_detail_group`、`preset_save`、`preset_cancel`、`layout_restore`、`custom_layout_apply`、`custom_layout_save`。
