# 真机粘贴回归包（TASK-06）

本目录只放**可复现的最小稿**和本机图夹具。人怎么操作、怎么填表、真机结论，写在 Obsidian：

`notes/墨笔-更新版/TASK-06-真机粘贴回归矩阵.md`

本包证明不了微信真实行为，只保证每一格都能原样重跑。真机结论以任务卡记录表为准，不要只看本 README。

## 目录

| 路径 | 用途 |
| --- | --- |
| `manuscripts/01-common-blocks.md` | 常用块：标题 / 段落 / 引用 / 列表 / 代码 / 表格 / 分隔线 / 外链 |
| `manuscripts/02-heading-quote-blocks.md` | 标题板块 + 引用板块 |
| `manuscripts/03-single-external.md` | 单张未转存外链图 |
| `manuscripts/04-single-local.md` | 单张本机图（data URI，也可改插夹具） |
| `manuscripts/05-single-mmbiz.md` | 已转存 mmbiz 图（需你自己填地址） |
| `manuscripts/06-side-by-side.md` | 并排双图 |
| `manuscripts/07-long-scroll.md` | 长图视窗（事实 B） |
| `manuscripts/08-crop-aspect.md` | 固定裁剪比例（事实 B） |
| `manuscripts/09-badge.md` | 压图角标（事实 B） |
| `manuscripts/10-fact-a-domains.md` | 四个域名，专测微信是否自动转存（事实 A） |
| `fixtures/local-photo.png` | 本机图夹具（红黄蓝 + 中心黑块） |
| `fixtures/portrait-stripes.png` | 竖图夹具，给裁剪格对照用 |

## 怎么导入

1. 本地 `pnpm start`，打开 <http://localhost:5173/mobi/>
2. 文件 → 导入 Markdown → 选上表对应稿
3. 预览上方点主题：专栏 / 科技 / 教程 / 克制 / 中式
4. 点「复制到公众号」，贴进公众号后台，手机预览

格号、对照点和截图命名见任务卡。

## 发版前必跑（六格）

以后每次发版由人跑这一子集。不要用「贴进去 100% 一样」当通过标准：预览按贴完的结果画，保不住的构图当场打标即算对齐。完整 16 格和事实定性仍以 Obsidian `TASK-06-真机粘贴回归矩阵.md` 为准。

预计合计 **35～45 分钟**（含导入、复制、后台粘贴、手机扫码）。每格都走任务卡「每一格都这样走」，截三机位。

| 格 | 主题 | 稿件 | 对照点 | 预计 |
| --- | --- | --- | --- | --- |
| A1 | 专栏 `default` | `01-common-blocks.md` | H1/H2/H3、段落、引用、列表、代码底色、表格线、分隔线还在；先开「微信外链转底部引用」，文末出现引用。TASK-06：通过。v2.3.0 发版前六格 2026-08-18 再跑：通过 | 6 分钟 |
| B1 | 专栏 `default` | `02-heading-quote-blocks.md` | 左侧蓝条标题板块、侧栏引用还在，不要塌成普通标题/引用；夹中普通段落仍在。TASK-06：通过 | 5 分钟 |
| B2 | 中式 `ink` | 同上 | 换主题后这两块仍是自己的蓝，不要当成失败；普通段落都在。TASK-06：通过 | 5 分钟 |
| C5 | 专栏 `default` | `07-long-scroll.md` | 预览有「贴完会变成公众号长图」；后台/手机是微信自己的长图，不是 240px 框。一致则「构图变化但已打标」。TASK-06 事实 B | 7 分钟 |
| C6 | 专栏 `default` | `08-crop-aspect.md` | 预览有「不会按比例裁，会按图片自身比例铺满」；后台/手机应更「高」。一致则「构图变化但已打标」。TASK-06 事实 B | 6 分钟 |
| C7 | 专栏 `default` | `09-badge.md` | 预览「前/后」压在图上并有「角标会落到图下」；后台/手机角标在图下。右图 Wikimedia 丢失是事实 A，不是本格失败。TASK-06 事实 B | 7 分钟 |

没配公众号图床做。C7 右图 Wikimedia 预览就裂、后台插入失败，与 C1 / D1 同源，不要当成新回归。`scroll-window` 粘贴安全脚本标红是已验证的可接受行为。
