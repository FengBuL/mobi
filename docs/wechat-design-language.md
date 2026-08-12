# 公众号排版设计语言库

这份文档是给**主题打磨**用的施工手册，不是设计感想。每一条手法都给了视觉描述、适用气质、
可直接粘进 `theme-css/*.css` 的代码片段、出处、以及微信兼容性结论。

配套文档：结构层的实证结果在 [`wechat-layout-reference.md`](./wechat-layout-reference.md)，
那份讲「微信保留什么」，这份讲「保留下来的东西能拼出什么好看的东西」。

---

## 0. 怎么读这份文档

### 0.1 可信度标注

每条手法都带一个标注，只有三种：

- **[真实 DOM]** —— 在真实已发布公众号文章的 `#js_content` 里直接看到过。
  这是最强的证据：说明它至少能在微信的渲染端存活。
- **[源码]** —— 从秀米 / 135 / 字间的产品代码或公开模板里读出来的，等价于该厂商的真实行为，
  但不代表它一定能穿过微信过滤。
- **[推测]** —— 有旁证或按已知规则推导出来的，**没有实际验证过**。

真实 DOM 的证据还带一个「覆盖度」，格式是 `N 篇 / 1681 篇`，指的是本轮语料里有多少篇文章用到。
覆盖度高 = 大量不同账号在生产环境里长期这么用 = 风险低。

### 0.2 三个来源实际取到了什么

| 来源 | 取证方式 | 成果 |
| --- | --- | --- |
| **A. 秀米** | 直接下载编辑器脚本，无需登录 | **1271 个组件模板**（本轮新发现两个模板包，见 0.3） |
| **B1. 135 编辑器** | 公开的 `/yangshi/{分类}.html` 样式中心页 | **256 套模板**，覆盖 17 个分类 |
| **B2. 字间** | GitHub 开源仓库 `src/lib/themes.js` | **26 套完整主题**（含配色、字号、间距全量 token） |
| **B3. 壹伴** | 从真实文章里反向提取 `class="mpa-template"` | 278 篇文章里 **179 个模板实例** |
| **B4. i 排版** | ✗ 官网是 Nuxt SPA，编辑器要登录 | **没拿到**，语料里只命中 4 篇 |
| **C. 真实文章** | `curl` 抓 `mp.weixin.qq.com/s/...` 解析 `#js_content` | **1681 篇**，其中 958 篇有完整可测量的排版数据 |

语料的来源渠道：用 GitHub 代码搜索在 markdown / json / txt 里捞 `mp.weixin.qq.com/s/` 链接，
得到 3798 个去重文章 ID，再逐个抓取。搜狗微信搜索有反爬，没用它。
**抓取成功率极高（HTTP 500/500），说明文章页本身不设防**，
掉的那部分是文章被删除或迁移。

语料的构成（按生成工具的指纹统计）：

| 指纹 | 篇数 | 占比 |
| --- | --- | --- |
| `data-tool="mdnice编辑器"` | 466 | 40% |
| `data-mpa-powered-by="yiban.io"`（壹伴） | 540 | 32% |
| `powered-by="xiumi.us"`（秀米） | 298 | 25% |
| `label="Powered by 135editor.com"` | 108 | 9% |
| `ipaiban.com`（i 排版） | 4 | 0.2% |

> ⚠️ **语料偏科，必须知道**：这批文章是从 GitHub 上捞的，**绝大多数是技术类公众号**。
> 语料里能识别出的非技术号只有零星几个（三联生活周刊 6 篇等）。
> 所以第 3 节的「排版节奏」数字代表的是**中文长图文的主流做法**，
> 不能当成「设计类精品号」的专属参数。用户点名的「一条」「日食记」这类号**没有抓到**，
> 原因见第 7 节。

### 0.3 秀米：本轮新挖到的两个模板包

上一轮只知道 `studio-main.js` 和 `studio-tpl.js`。这次从 `xiumi.us/studio/v5` 的
页面源码里发现还引用了两个**独立的组件模板包**，这才是组件库的真身：

```bash
curl -s 'https://xiumi.us/template/v5/paper/comp/ng-tpl.js?host=xiumi.us' -o paper-comp-tpl.js    # 1.0 MB
curl -s 'https://xiumi.us/template/v5/booklet/comp/ng-tpl.js?host=xiumi.us' -o booklet-comp-tpl.js # 25 KB
```

两个都是 Angular 的 `$templateCache.put(url, htmlString)` 集合，
可以直接造一个假的 `angular` 和 `window` 把它跑出来，拿到全部原始 HTML 模板。

分类分布（`paper-cp` 部分）：

| 目录 | 数量 | 内容 |
| --- | --- | --- |
| `header/` | 118 | **标题装饰**，本文第 1 节的主要来源 |
| `card/` | 112 | 卡片 / 边框容器 |
| `image/` | 53 | 图片框 |
| `layout/` | 35 | 多列、轮播、表格布局 |
| `middleware/` | 24 | **分割线 / 段间装饰** |
| `other/`、`form/`、`shape/`、`video/` | 46 | 杂项 |
| `2015-12-22` ~ `2019-8-8` 等日期目录 | ~880 | 按发版批次归档的历史组件 |

秀米模板的一个关键特征：**尺寸几乎全部用 `em`**，
`border: 0.1em solid`、`width: 3.2em`、`height: 2em` 这种写法遍地都是。
这跟我们「字号用 `calc(var(--md-font-size) * N)`」的约定是同一个思路——
装饰跟着字号缩放，换字号不塌。**这点值得整套抄过来。**

### 0.4 我们的写法约定（代码片段都遵守）

- 字号 `calc(var(--md-font-size) * N)`，不写死 px
- 主题色 `var(--md-primary-color)`，字体 `var(--md-font-family)`
- 主题内部变量定义在 `section, container { --theme-ink: #151515; ... }`
- 选择器不加 `#output` 前缀
- 不用 `position` / `display:grid` / `gap` / `aspect-ratio` / `margin-block`/`margin-inline` / `background-clip`
- 间距用 `margin-top` / `margin-bottom`

**关于 `color-mix()` 和 `var()` 能不能用**：能用。
`mergeCss` 里 juice 关掉了 `resolveCSSVariables`，但 `apps/web/src/utils/index.ts` 后面
有一步用预览区的 computed style 逐条回填真实值，所以进剪贴板时已经是具体颜色了。
现有主题大量使用 `color-mix()`，是安全的。**[源码]**

---

## 1. 标题装饰手法库

### 1.0 先看这张总表

| # | 手法 | 气质 | 兼容性 | 覆盖度证据 |
| --- | --- | --- | --- | --- |
| 1.1 | 眉标 / kicker | 杂志、编辑部 | ✅ 安全 | 现有主题已用 |
| 1.2 | 章节自动编号 | 方法论、教程 | ✅ 安全 | 真实文章有 counter 残留 |
| 1.3 | 序号徽章（圆/方） | 清单、步骤 | ✅ 安全 | 秀米 44×，135 72× |
| 1.4 | 上下装饰线 | 奢刊、宣言 | ✅ 安全 | 现有主题已用 |
| 1.5 | 两侧短横 | 古典、克制 | ✅ 安全 | 秀米 `006-text-bd` |
| 1.6 | 两侧三角 / 箭头 | 复古、力量 | ✅ 安全 | 秀米 39× `width:0` |
| 1.7 | 色块标题 | 强层级、技术 | ✅ 安全 | mdnice 真实文章 |
| 1.8 | 标签页签（圆角在上） | 档案、栏目 | ✅ 安全 | 有三AI 真实文章 |
| 1.9 | 荧光笔下衬 | 手账、轻松 | ✅ 安全（有兜底） | mdnice 真实文章 |
| 1.10 | 左竖线 / 引线 | 通用、最稳 | ✅ 安全 | 全网最常见 |
| 1.11 | 底部渐隐横杠 | 现代、科技 | ✅ 安全 | 135 大量使用 |
| 1.12 | 编号压字（巨型数字） | 索引、结构化 | ✅ 安全 | 现有 sequence 主题 |
| 1.13 | 双层错位描边 | 潮流、波普 | ✅ 安全 | 知道创宇 真实文章 |
| 1.14 | 标题嵌在分割线中间 | 章节切换 | ⚠️ 需负 margin | 京东零售技术 真实文章 |
| 1.15 | 文字投影 | 复古、软性 | ✅ 安全 | 星期五实验室 真实文章 |
| 1.16 | 描边字 | 波普、封面 | ⚠️ 中等 | 92 篇 / 1681 篇 |

---

### 1.1 眉标 / kicker（标题上方的小字标签）

**视觉**：标题正上方一行全大写、大字距、主题色的小字，像杂志栏目名。
**气质**：杂志、编辑部、专栏。是投入产出比最高的手法之一——一行 CSS 就把「普通标题」变成「有编排感的标题」。

**出处**：字间 `swiss-index` 主题用 `h1WrapOpen` 注入
`<span style="display:block;color:{primary};font-family:monospace;font-size:0.25em;font-weight:800;letter-spacing:0.1em;margin-bottom:1.4em;">SWISS INDEX / 01</span>`。
`night-film` 主题同样手法，内容是 `SCENE / 00:12:47:08`。**[源码]**

**关键差异**：字间必须**注入 HTML** 才能做眉标，因为它没有伪元素通道。
我们开了 `inlinePseudoElements: true`，**用纯 CSS `::before` 就能做到一样的产物**。这是我们的结构性优势。

**兼容性**：✅ 安全。产出就是一个带内联样式的 `<span style="display:block">`，
微信保留 `display`、`letter-spacing`、`text-transform`。

```css
h2 {
  margin-top: 2.8em;
  margin-bottom: 1.1em;
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.38);
  font-weight: 800;
  line-height: 1.35;
}

h2::before {
  content: "SECTION";
  display: block;
  margin-bottom: 0.7em;
  color: var(--md-primary-color);
  font-size: calc(var(--md-font-size) * 0.62);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}
```

> 注意 `::before` 上的 `font-size` 要用 `calc(var(--md-font-size) * N)` 而不是 `em`，
> 否则它会相对于 `h2` 的字号计算，换 h2 字号时眉标会跟着抖。

---

### 1.2 章节自动编号

**视觉**：h2 前面自动出现 `01`、`02`，作者不用手写序号。
**气质**：方法论、教程、结构化长文。

**兼容性**：✅ 安全。CSS 计数器在预览区就被算成了真实数字，
juice 把 `::before` 实体化成 `<span>` 时写进去的是**字面文本**，不是计数器。
真实文章里也见到过同样的产物：某技术号的 h2 里是
`<span style="counter-increment: counterh2 1; ...">1</span>` —— 数字 `1` 是**文本**，
`counter-increment` 只是没被清理掉的残留声明。**[真实 DOM]**（counter 相关 22 篇 / 1681 篇）

**三条硬约束**（来自已有取证，别踩）：

1. 一条 `content` 里只能有一个 `counter()`
2. `counter-increment` 必须和 `content` 写在**同一条规则**里
3. `decimal-leading-zero` 会被 juice 降级成普通数字，**不能用**

```css
section,
container {
  counter-reset: md-chapter;
}

h2::before {
  counter-increment: md-chapter;
  content: "0" counter(md-chapter);
  display: block;
  margin-bottom: 0.3em;
  color: var(--md-primary-color);
  font-size: calc(var(--md-font-size) * 0.78);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.12em;
}
```

> `content: "0" counter(...)` 是拿不到 `decimal-leading-zero` 之后的替代方案，
> **只在章节数 ≤ 9 时正确**，第 10 章会变成 `010`。
> 长文主题建议改成 `content: counter(md-chapter)` 配大字号，或者接受这个上限。

---

### 1.3 序号徽章（圆形 / 方形数字块）

**视觉**：标题左边一个实心圆或方块，里面是白色数字。
**气质**：清单、步骤、教程。

**出处**：秀米 `header/` 里 `border-radius: 100%` 出现 **44 次**，
典型如 `t-a-02-25.html` 的 `width:2.6em; height:2.6em; line-height:2.6em; text-align:center; border-radius:50%`。**[源码]**
135 的序号分类里是 `width:34px;height:34px;border-radius:100%;display:flex;justify-content:center;align-items:center`。**[源码]**
真实文章里也有 `float:left;width:40px;height:40px;text-align:center;color:#fff;background-color:#0d0c0c;font-size:24px;line-height:40px`。**[真实 DOM]**

**兼容性**：✅ 安全。我们不用 flex 居中（用 `line-height` 等于 `height` 的老办法，更稳）。

```css
section,
container {
  counter-reset: md-step;
}

h3 {
  margin-top: 2em;
  margin-bottom: 0.8em;
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.14);
  font-weight: 700;
  line-height: 1.5;
}

h3::before {
  counter-increment: md-step;
  content: counter(md-step);
  display: inline-block;
  width: 1.9em;
  height: 1.9em;
  margin-right: 0.6em;
  border-radius: 999px;
  background: var(--md-primary-color);
  color: #fff;
  font-size: calc(var(--md-font-size) * 0.82);
  font-weight: 800;
  line-height: 1.9em;
  text-align: center;
  vertical-align: 0.08em;
}
```

> 想要方块就把 `border-radius: 999px` 换成 `4px`；想要描边不填充就换成
> `background: transparent; color: var(--md-primary-color); border: 2px solid var(--md-primary-color);`
> —— 注意用了 `border` 之后要把 `line-height` 调成 `1.7em` 左右补偿边框占位。

---

### 1.4 上下装饰线（标题被两条横线夹住）

**视觉**：标题上下各一条细线，形成一个横向条带。
**气质**：奢刊、宣言、卷首语。

**出处**：我们的 `magazine.css` 已经在用（`border-top` + `border-bottom` + 左右留白 14%）。
秀米 `header/` 里 `border-top: 0.1em solid` / `border-bottom: 0.1em solid` 各 16 次。**[源码]**

**兼容性**：✅ 安全。`border` 是最保守的属性，1681 篇语料里无一例外保留。

```css
h2 {
  margin-top: 3em;
  margin-bottom: 1.3em;
  margin-left: 12%;
  margin-right: 12%;
  padding-top: 0.7em;
  padding-bottom: 0.7em;
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.3);
  font-weight: 500;
  line-height: 1.45;
  text-align: center;
  letter-spacing: 0.1em;
  border-top: 1px solid color-mix(in srgb, var(--md-primary-color) 45%, var(--theme-ink));
  border-bottom: 1px solid color-mix(in srgb, var(--md-primary-color) 45%, var(--theme-ink));
}
```

---

### 1.5 两侧短横（标题左右各一段小横线）

**视觉**：`—— 标题 ——`，横线跟文字同一行、垂直居中。
**气质**：古典、克制、目录页。

**出处**：秀米 `middleware/006-text-bd.html` 里是
`display:inline-block; vertical-align:middle; margin:6px 0; width:1.6em; height:0.4em`
（用有厚度的实心块，不是 border）。**[源码]**
我们的 `magazine.css` 用的是 `border-top` 版本。两种都行，实心块更有分量。

**兼容性**：✅ 安全。

```css
h3 {
  margin-top: 2.1em;
  margin-bottom: 0.9em;
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.14);
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.06em;
}

h3::before,
h3::after {
  content: "";
  display: inline-block;
  width: 1.8em;
  height: 1px;
  background: var(--theme-line);
  vertical-align: 0.3em;
}

h3::before {
  margin-right: 0.8em;
}

h3::after {
  margin-left: 0.8em;
}
```

> 秀米那种「有厚度的短块」把 `height: 1px; background: var(--theme-line)` 换成
> `height: 0.32em; background: var(--md-primary-color); vertical-align: 0.12em;` 即可，
> 观感会硬朗很多，适合体育 / 竞速类气质。

---

### 1.6 两侧三角 / 箭头（CSS 三角形）

**视觉**：标题左右各一个实心小三角，像播放键或书角。
**气质**：复古、力量、游戏、赛报。

**出处**：秀米 `header/` 里 `width: 0` 出现 **39 次**，
配 `border-bottom: 0.5em solid transparent !important` / `border-top: 0.5em solid transparent !important`。
典型如 `tb-200-007-07.html`：
`width:0; display:inline-block; border-left:0.6em solid; border-top:0.5em solid transparent !important; border-bottom:0.5em solid transparent !important`，
而且它把两个三角叠在一起、外侧那个 `opacity: 0.6`，做出渐远的层次。**[源码]**
135 的模板里也有 15/256 套用这个手法。**[源码]**
真实文章里同样出现（`transparent 边框` 60 篇 / 449 篇抽样）。**[真实 DOM]**

**兼容性**：✅ 安全。注意秀米在 transparent 那两条边上**统一加了 `!important`** ——
这是为了防止微信注入的样式把透明边覆盖掉，照抄。

```css
h2 {
  margin-top: 2.6em;
  margin-bottom: 1.1em;
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.3);
  font-weight: 800;
  text-align: center;
  letter-spacing: 0.04em;
}

h2::before,
h2::after {
  content: "";
  display: inline-block;
  width: 0;
  height: 0;
  vertical-align: 0.1em;
  border-top: 0.34em solid transparent !important;
  border-bottom: 0.34em solid transparent !important;
}

h2::before {
  margin-right: 0.6em;
  border-left: 0.42em solid var(--md-primary-color);
}

h2::after {
  margin-left: 0.6em;
  border-right: 0.42em solid var(--md-primary-color);
}
```

> 这里 `em` 是相对 h2 字号的，三角会跟着标题一起缩放，正是想要的效果。

---

### 1.7 色块标题（整条底色 + 反白字）

**视觉**：整行铺主题色，文字反白。
**气质**：技术、强层级、通知。

**出处**：真实文章里 mdnice 的产物：
`<h2><span style="padding: 3px 11px;text-align: center;display: block;background-color: rgb(231,100,43);color: white;border-radius: 1px;">3. 何为空间配置器</span></h2>`。**[真实 DOM]**
秀米 `t-a-01-01.html` 是同一思路的加投影版：
`display:inline-block; border-radius:0.5em; padding:0.3em 0.5em; color:white; box-shadow:#a5a5a5 0.2em 0.2em 0.1em`。**[源码]**

**兼容性**：✅ 安全。`background-color` + `color` + `border-radius` 全部在保留清单里。

```css
h2 {
  margin-top: 2.6em;
  margin-bottom: 1.1em;
  padding: 0.5em 0.9em;
  border-radius: 6px;
  background: var(--md-primary-color);
  color: #fff;
  font-size: calc(var(--md-font-size) * 1.24);
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: 0.02em;
}
```

> **不要给它加 `text-align: center`**，除非整套主题都是居中的。
> 语料里居中色块标题几乎都出现在通知类、活动类推文，用在长文里会显得廉价。

---

### 1.8 标签页签（只有上方两个圆角）

**视觉**：像文件夹的标签，色块上边圆角、下边直角，下方压着一条粗横线。
**气质**：档案、栏目、期刊。比 1.7 的整条色块更有设计感。

**出处**：真实文章（有三AI）里的秀米组件，完整结构是三段：
左三角 + 中间色块 + 右三角，外层 `margin-bottom: -0.9em` 把整组压到下面那条
`height:0.9em; border-top:3px solid #000; width:100%` 的横线上。**[真实 DOM]**
色块本体：`border-radius: 5px 5px 0px 0px; background-color: rgb(62,62,62); padding: 2px 5px; color: #fff; max-width: 90% !important`。

**兼容性**：✅ 安全，但**完整的三段式结构需要包装 HTML，纯 CSS 主题做不到**。
下面给的是单元素可实现的等价版本：色块作为 `::before` 的兄弟不可行，
所以改成「编号做页签 + h2 自己画底线」。

```css
h2 {
  margin-top: 2.8em;
  margin-bottom: 1.15em;
  padding-bottom: 0.5em;
  border-bottom: 3px solid var(--theme-ink);
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.26);
  font-weight: 800;
  line-height: 1.4;
}

h2::before {
  counter-increment: md-chapter;
  content: "PART " counter(md-chapter);
  display: inline-block;
  margin-right: 0.7em;
  padding: 0.16em 0.7em;
  border-radius: 7px 7px 0 0;
  background: var(--md-primary-color);
  color: #fff;
  font-size: calc(var(--md-font-size) * 0.7);
  font-weight: 800;
  letter-spacing: 0.1em;
  vertical-align: 0.14em;
}
```

（记得在 `section, container` 里 `counter-reset: md-chapter;`）

---

### 1.9 荧光笔下衬（文字下半截染色）

**视觉**：像用马克笔在字下面划了一道，只染下半部分。
**气质**：手账、轻松、教程重点。

**出处**：真实文章里 mdnice 的产物用的是**斜向**版本：
`background-image: linear-gradient(45deg, transparent 48%, rgb(37,132,181) 48%, rgb(37,132,181) 52%, transparent 52%)`。**[真实 DOM]**
`background-image` 在 1681 篇语料里覆盖 32%，`linear-gradient` 覆盖 14%。

**兼容性**：✅ 安全，而且**我们的复制链路自带兜底**：
`backfillClipboardGradientBackgrounds` 会在 `background-color` 为空时，
从渐变色标里挑一个对比度最高的补成纯色背景。**[源码]**
所以万一微信剥掉 `background-image`，效果会从「半高荧光笔」退化成「整块底色」，
不会变成看不见。这是可接受的降级。

```css
strong {
  padding: 0 0.1em;
  background-image: linear-gradient(
    180deg,
    transparent 62%,
    color-mix(in srgb, var(--md-primary-color) 28%, white) 62%
  );
  color: var(--theme-ink);
  font-weight: 700;
}
```

> 想要「整条平涂高亮」用 `mark`，想要「只有一道线」把 62% 改成 88%。
> 注意 `strong` 里不要再写 `background-color`，否则兜底逻辑不生效（它只在背景色为空时补）。

---

### 1.10 左竖线 / 引线

**视觉**：标题左侧一条竖杠。
**气质**：通用。**这是全网最常见、最不会出错的标题手法**。

**出处**：壹伴真实模板里 `h2 { border-left: 5px solid rgb(68,153,231); font-weight: bold; line-height: 32px; color: rgb(68,153,231); padding-right: 10px; padding-left: 10px; margin: 5px; }`。**[真实 DOM]**
字间的 base 主题、我们的 `default.css` / `ink.css` / `sequence.css` 都在用。

**兼容性**：✅ 最安全的一条。

```css
h2 {
  margin-top: 2.6em;
  margin-bottom: 1.05em;
  padding-left: 0.7em;
  border-left: 5px solid var(--md-primary-color);
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.28);
  font-weight: 700;
  line-height: 1.4;
}
```

> 这条太常见了，**单独用它就是「不够独特」的主因**。
> 要用的话至少改一个变量：竖线换成渐变（`border-image` 不稳，改用 1.11 的办法）、
> 换成双线（`border-left: 3px double`）、或者配合 1.1 的眉标一起上。

---

### 1.11 底部渐隐横杠

**视觉**：标题下面一条从主题色渐隐到透明的横杠。
**气质**：现代、科技、产品发布。

**出处**：135 的分割线分类里大量使用
`background: linear-gradient(to right,#d02d09 0%,#d02d09 50%,transparent ,#ffda69 90%,#ffda69 100%)`
配 `max-width:100% !important`。**[源码]**
真实文章里 `<hr>` 上的同类写法覆盖多个账号：
`background-image: linear-gradient(to right, rgba(93,186,133,0), rgb(...), rgba(93,186,133,0))`。**[真实 DOM]**
我们的 `default.css` / `ink.css` 的 `hr` 已经在用这个思路。

**兼容性**：✅ 安全。

```css
h2 {
  margin-top: 2.7em;
  margin-bottom: 1.1em;
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.3);
  font-weight: 800;
  line-height: 1.4;
}

h2::after {
  content: "";
  display: block;
  width: 3.2em;
  height: 4px;
  margin-top: 0.55em;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--md-primary-color), transparent);
}
```

---

### 1.12 编号压字（巨型数字）

**视觉**：标题上方或左侧一个非常大的数字，字重极高、字距收紧。
**气质**：索引、结构化、瑞士风。

**出处**：字间 `swiss-index` 的 `h2Index`：
`flex:0 0 auto; color:#050505; font-size:2.35em; font-weight:900; line-height:0.78; letter-spacing:-0.08em`。**[源码]**
我们的 `sequence.css` 已经是这个路子。

**兼容性**：✅ 安全（我们的版本不用 flex）。

```css
section,
container {
  counter-reset: md-sequence;
}

h2 {
  margin-top: 2.5em;
  margin-bottom: 1em;
  padding-top: 0.7em;
  border-top: 1px solid var(--theme-ink);
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.32);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

h2::before {
  counter-increment: md-sequence;
  content: counter(md-sequence);
  display: block;
  margin-bottom: 0.14em;
  color: var(--md-primary-color);
  font-size: calc(var(--md-font-size) * 2.05);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.06em;
}
```

> `line-height: 1` 是安全的，**`line-height: 0` 是官方规范 2.3 点名的错误用法**，别写。

---

### 1.13 双层错位描边

**视觉**：两层描边框错开几像素叠在一起，像印刷套色没对准。
**气质**：潮流、波普、复古印刷。

**出处**：真实文章（知道创宇404实验室）里的秀米组件：
外层 `background-image: linear-gradient(to left, rgb(253,213,231), rgb(194,226,249)); border: 1px solid rgb(62,62,62)`，
内层 `margin: -10px 0% 5px; transform: translate3d(-5px, 0px, 0px); background-color: #fff; padding: 5px; border: 1px solid rgb(62,62,62)`。**[真实 DOM]**
Hollis 的号里也有同款（`transform: translate3d(-3px,0,0)` + `margin-top:-3px`）。**[真实 DOM]**

**兼容性**：✅ `transform` 保留（1681 篇里 34% 用到）。
**纯 CSS 单元素版本用 `box-shadow` 模拟更简单**，效果几乎一样且更稳。

```css
h2 {
  margin-top: 2.8em;
  margin-bottom: 1.3em;
  padding: 0.55em 0.9em;
  border: 2px solid var(--theme-ink);
  background: #fff;
  box-shadow: 6px 6px 0 0 var(--md-primary-color);
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.24);
  font-weight: 800;
  line-height: 1.4;
}
```

> `box-shadow` 在 1681 篇语料里覆盖 38%，是被验证过的。
> 用 `0` 模糊半径的实心投影就是「错位描边」的观感，且不需要第二个元素。

---

### 1.14 标题嵌在分割线中间

**视觉**：一条横贯的虚线，中间开一个口，放一个胶囊形状的标题。
**气质**：章节切换、目录分隔。**这是本轮挖到的最漂亮的一个手法。**

**出处**：真实文章（京东零售技术）里的秀米组件，完整结构：**[真实 DOM]**

```html
<!-- 外层：撑出 1.8em 高度，上半留给线 -->
<section style="width:100%;height:1.8em;padding-top:0.9em;">
  <section style="padding-right:5px;padding-left:5px;">
    <section style="border-bottom:1px dashed rgb(160,160,160);width:100%;"></section>
    <section style="margin-top:-3px;">
      <section style="float:left;width:5px;height:5px;margin-left:-5px;border:1px solid rgb(160,160,160);border-radius:100%;"></section>
      <section style="float:right;width:5px;height:5px;margin-right:-5px;border:1px solid rgb(160,160,160);border-radius:100%;"></section>
      <section style="clear:both;"></section>
    </section>
  </section>
  <!-- 胶囊：负 margin 提上去压住线 -->
  <section style="border-radius:1em;display:inline-block;background-image:linear-gradient(to right,rgb(46,211,172) 0%,rgb(131,221,212) 100%);height:1.8em;line-height:1.8em;padding-left:12px;padding-right:12px;color:#fff;margin-top:-1em;">
    <p>产品原型概览</p>
  </section>
</section>
```

三个要点：虚线两端各一个 5px 空心圆做端点、`clear:both` 收 float、
**胶囊用 `margin-top: -1em` 负位移压到线上**——这就是 `position:absolute` 的替代品。

**兼容性**：✅ 安全。负 margin 叠压在 1681 篇语料里覆盖 10.2%，
在 135 的 256 套模板里覆盖 **64%**，是这个行业的标准做法。

**但这个手法进不了主题 CSS。** 它要求「横线」和「胶囊」是两个兄弟元素，
靠负 margin 把后者压到前者上。一个 `h2` 加两个伪元素排不出这个层叠关系
（`::before` / `::after` 都在 h2 的内容流里，没法跨到 h2 自己的边框上）。

**结论：把它留给图文组件通道**（`wechat-layout.ts` 那条线，那里能自由拼 DOM）。
主题 CSS 里的近似替代是「居中标题 + 上方虚线 + 下方渐隐横杠」：

```css
h2 {
  margin-top: 3em;
  margin-bottom: 1.3em;
  padding-top: 1.1em;
  border-top: 1px dashed var(--theme-line);
  color: var(--theme-ink);
  font-size: calc(var(--md-font-size) * 1.26);
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  letter-spacing: 0.08em;
}

h2::after {
  content: "";
  display: block;
  width: 2.4em;
  height: 3px;
  margin-top: 0.6em;
  margin-left: auto;
  margin-right: auto;
  border-radius: 999px;
  background: var(--md-primary-color);
}
```

---

### 1.15 文字投影

**视觉**：文字带一个浅色、偏移的柔影。
**气质**：复古、软性、儿童 / 生活方式。

**出处**：真实文章（星期五实验室）里的秀米组件：
`font-size:15px; color:rgb(71,193,168); text-shadow: rgba(177,221,248,0.65) 1px 3px; letter-spacing:3px`。**[真实 DOM]**
`text-shadow` 在 449 篇抽样里覆盖 7%。

**兼容性**：✅ 安全但覆盖度中等。用浅色、小偏移，别做发光。

```css
h1 {
  margin-top: 1.8em;
  margin-bottom: 1.2em;
  color: var(--md-primary-color);
  font-size: calc(var(--md-font-size) * 1.75);
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
  letter-spacing: 0.16em;
  text-shadow: 2px 3px 0 color-mix(in srgb, var(--md-primary-color) 18%, white);
}
```

---

### 1.16 描边字

**视觉**：空心字，只有轮廓。
**气质**：波普、封面、大标题。

**出处**：`text-stroke` 在 1681 篇语料里命中 **92 篇（5.5%）**。**[真实 DOM]**

**兼容性**：⚠️ 中等。需要 `-webkit-text-stroke`（带前缀），
而且必须配 `color: transparent`，一旦被剥就变成完全看不见的文字。
**建议只用在 h1，且给一个不透明的兜底色**：

```css
h1 {
  margin-top: 1.6em;
  margin-bottom: 1.1em;
  color: color-mix(in srgb, var(--md-primary-color) 22%, white);
  font-size: calc(var(--md-font-size) * 2.1);
  font-weight: 900;
  line-height: 1.15;
  text-align: center;
  letter-spacing: 0.04em;
  -webkit-text-stroke: 1px var(--md-primary-color);
}
```

> 用浅色填充而不是 `transparent`，被剥掉描边后仍然是「浅色大标题」，不会消失。

---

## 2. 引用块 / 列表 / 表格 / 分割线 / 强调

### 2.1 引用块

#### 2.1.1 左竖线（基准款）

**出处**：真实文章里最高频的引用样式，跨账号出现：
`border-top:none; border-right:none; border-bottom:none; font-size:0.9em; overflow:auto; border-left-color:rgba(0,0,0,0.4); background:rgba(0,0,0,0.05); color:rgb(106,115,125); padding:10px 10px 10px 20px; margin:20px 0`。**[真实 DOM]**（494 个引用块 / 115 种写法，这一族占比最高）

注意两个细节：**引用字号统一比正文小一档（`0.9em`）**，
以及 `overflow: auto` —— 防止长代码 / 长链接撑破。

```css
blockquote {
  margin-top: 1.5em;
  margin-bottom: 1.5em;
  padding: 0.75em 0.9em 0.75em 1.25em;
  border: 0;
  border-left: 4px solid var(--md-primary-color);
  border-radius: 0 8px 8px 0;
  overflow: auto;
  background: color-mix(in srgb, var(--md-primary-color) 6%, white);
  color: var(--theme-muted);
  font-size: calc(var(--md-font-size) * 0.94);
}

blockquote p {
  margin-top: 0;
  margin-bottom: 0.5em;
  color: var(--theme-muted);
}

blockquote p:last-child {
  margin-bottom: 0;
}
```

#### 2.1.2 大引号（开合引号夹住）

**出处**：135 的引用分类里是「左上开引号 + 右下闭引号 + 上下横线」，
引号用内联 SVG，横线是 `border-top: 3px solid #485385` 配 `flex`。**[源码]**
秀米 `002-round-text.html` 用 `border-top-color` / `border-bottom-color` 做同类装饰。**[源码]**

我们用伪元素放真实的引号字符，产物更干净：

```css
blockquote {
  margin-top: 1.8em;
  margin-bottom: 1.8em;
  padding-top: 0.6em;
  padding-bottom: 0.6em;
  border: 0;
  border-top: 2px solid var(--theme-ink);
  border-bottom: 2px solid var(--theme-ink);
  background: transparent;
  color: var(--theme-ink);
  text-align: center;
}

blockquote::before {
  content: "“";
  display: block;
  margin-bottom: -0.35em;
  color: var(--md-primary-color);
  font-size: calc(var(--md-font-size) * 2.6);
  font-weight: 700;
  line-height: 1;
}

blockquote p {
  margin-top: 0;
  margin-bottom: 0;
  font-size: calc(var(--md-font-size) * 1.02);
  line-height: 1.9;
}
```

> 引号直接写字面字符 `"“"`，别写 `"\201C"` —— 转义序列经过 juice 实体化后是否还原没验证过。

#### 2.1.3 无边框缩进（留白派）

**出处**：字间 `literary` 主题：`margin:1.8em 20px; padding:0; color:#8a7f6a; font-size:1.02em; letter-spacing:0.06em; line-height:2`，
完全不画线，只靠缩进和颜色区分。**[源码]** 我们的 `magazine.css` 也是这个思路。

```css
blockquote {
  margin-top: 1.9em;
  margin-bottom: 1.9em;
  margin-left: 1.6em;
  margin-right: 1.6em;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--theme-muted);
  font-size: calc(var(--md-font-size) * 1.02);
  letter-spacing: 0.06em;
}

blockquote p {
  line-height: 2.05;
}
```

---

### 2.2 列表

**实测基线**（1681 篇语料）：**[真实 DOM]**

| 声明 | 覆盖账号数 |
| --- | --- |
| `list-style-type: disc` | 27 个号 |
| `margin-top:8px; margin-bottom:8px; padding-left:25px` | 17 个号 |
| `list-style-type: decimal` | 9 个号 |
| `list-style-type: square` | 8 个号 |
| `list-style-type: circle` | 8 个号 |

结论：**`list-style-type` 是安全的，换 marker 形状是最低成本的差异化。**
`padding-left: 25px`（≈1.55em @16px）是事实标准。

```css
ul {
  margin-top: 0.9em;
  margin-bottom: 1.3em;
  padding-left: 1.5em;
  list-style-type: square;
}

ol {
  margin-top: 0.9em;
  margin-bottom: 1.3em;
  padding-left: 1.75em;
}

li {
  margin-top: 0.4em;
  margin-bottom: 0.4em;
  padding-left: 0.2em;
  color: var(--theme-muted);
  line-height: 1.8;
}

li::marker {
  color: var(--md-primary-color);
}
```

> ⚠️ **`li::marker` 需要验证。** juice 的 `inlinePseudoElements` 只处理 `::before` / `::after`，
> `::marker` 大概率**不会被内联**，也就是说复制到公众号后 marker 会退回默认颜色。**[推测]**
> 预览区里看得到、粘过去看不到，这种不一致最坑。
> 想稳妥地控制 marker 外观，改用下面这套（自绘 marker）：

```css
ul {
  margin-top: 0.9em;
  margin-bottom: 1.3em;
  padding-left: 0;
  list-style-type: none;
}

ul li {
  padding-left: 1.25em;
  text-indent: -1.25em;
}

ul li::before {
  content: "";
  display: inline-block;
  width: 0.4em;
  height: 0.4em;
  margin-right: 0.85em;
  border-radius: 999px;
  background: var(--md-primary-color);
  vertical-align: 0.18em;
  text-indent: 0;
}
```

> `text-indent` 负值 + `padding-left` 是让折行对齐到文字而不是 marker 的老办法，
> `text-indent` 在语料里覆盖 23%，安全。

---

### 2.3 表格

**基线**：真实文章里 `td` 带内联样式 7357 次、`th` 也常见，**`<table>` 本身是能用的**。
秀米从不用 `<table>`（它全部用 section 拼），但那是编辑器的选择，不是微信的限制。**[真实 DOM]**

**真正的坑是横向溢出**：手机屏宽有限，列多了会被截断。
字间的做法是给表格套一个 `tableWrap: overflow-x:auto`，表格本身 `min-width:520px`。**[源码]**
我们的主题 CSS 改不了 DOM 结构，所以只能在 `table` 上做文章：

```css
table {
  width: 100%;
  margin-top: 1.4em;
  margin-bottom: 1.4em;
  border-collapse: collapse;
  border-top: 2px solid var(--theme-ink);
  border-bottom: 1px solid var(--theme-ink);
  font-size: calc(var(--md-font-size) * 0.86);
  line-height: 1.5;
}

th {
  padding: 0.7em 0.6em;
  border: 0;
  border-bottom: 1px solid var(--theme-ink);
  background: transparent;
  color: var(--theme-ink);
  font-weight: 800;
  text-align: left;
  letter-spacing: 0.04em;
}

td {
  padding: 0.66em 0.6em;
  border: 0;
  border-bottom: 1px solid var(--theme-line);
  color: var(--theme-muted);
}
```

> **表格字号一定要压到 0.86 左右**，这是语料里的普遍做法（`font-size:0.9em` / `0.82em`）。
> 用正文字号做表格在手机上必溢出。

---

### 2.4 分割线

#### 2.4.1 发丝线（0.5px）—— 覆盖度最高的一种

**出处**：**7 个不同账号**用同一份写法，这是本轮语料里跨账号一致性最高的单条样式：**[真实 DOM]**

```
border-style: solid;
border-width: 1px 0 0;
border-color: rgba(0,0,0,0.1);
transform-origin: 0 0;
transform: scale(1, 0.5);
```

原理是画 1px 线再纵向压到一半，在 Retina 上得到真正的半像素发丝线。
这其实就是**微信编辑器自己插入 `<hr>` 时的默认样式**，所以它绝对安全。

```css
hr {
  height: 0;
  margin-top: 2.4em;
  margin-bottom: 2.4em;
  border-style: solid;
  border-width: 1px 0 0;
  border-color: color-mix(in srgb, var(--theme-ink) 12%, transparent);
  transform-origin: 0 0;
  transform: scale(1, 0.5);
}
```

> `height: 0` 在 `<hr>` 上是安全的（微信自己就这么写）。
> 官方规范 2.5 禁止的是**内容容器**用固定高度，不是 `<hr>`。

#### 2.4.2 渐隐横线

**出处**：多账号使用
`height:1px; border:none; background-image: linear-gradient(to right, rgba(93,186,133,0), rgb(93,186,133), rgba(93,186,133,0))`。**[真实 DOM]**
135 的分割线分类里也是同一手法。**[源码]** 我们的 `default.css` 已在用。

```css
hr {
  width: 100%;
  height: 1px;
  margin-top: 2.6em;
  margin-bottom: 2.6em;
  border: 0;
  background: linear-gradient(90deg, transparent, var(--md-primary-color), transparent);
}
```

#### 2.4.3 短居中线

**出处**：真实文章里
`margin: 36px auto; border: none; height: 2px; background: linear-gradient(to right, transparent, #d32f2f, transparent); max-width: 200px`。**[真实 DOM]**
注意它用 `max-width` 而不是 `width` —— 因为微信会注入 `max-width:100%`，
写 `max-width: 200px` 反而更不容易被覆盖。

```css
hr {
  width: 36%;
  height: 2px;
  margin-top: 2.8em;
  margin-bottom: 2.8em;
  margin-left: auto;
  margin-right: auto;
  border: 0;
  background: linear-gradient(90deg, transparent, var(--md-primary-color), transparent);
}
```

#### 2.4.4 符号分割线

**出处**：秀米 `middleware/` 里 `border-radius: 100%` 出现 7 次，
`t-b-53-01.html` 用三个递增尺寸的圆点（0.2em / 0.5em / 0.8em）做渐强节奏。**[源码]**

**⚠️ 重要限制**：已有取证结论是「`hr::before` 生成的 span 会落到 `<hr>` 外面，不可靠」。
所以**符号分割线不能挂在 `hr` 上**。要做只能挂在别的元素上，例如给 `h2::before` 用。

---

### 2.5 强调文字

**基线数据**（1681 篇语料）：**[真实 DOM]**

| 手法 | 覆盖 |
| --- | --- |
| `!important` | 99.9% |
| `white-space: nowrap` | 62% |
| `text-align: justify` | 33.5% |
| `letter-spacing` | 82%（449 篇抽样） |
| `text-decoration` 下划线 | 常见 |
| `text-underline-offset` | 2 篇 ⚠️ 极少 |

#### 2.5.1 主题色加粗（基准）

```css
strong {
  color: var(--md-primary-color);
  font-weight: 800;
}
```

#### 2.5.2 下划线加粗

**出处**：字间 `swiss-index`：
`font-weight:850; color:#050505; text-decoration:underline; text-decoration-color:{p}; text-decoration-thickness:2px; text-underline-offset:2px`。**[源码]**
我们的 `sequence.css` 已在用。

⚠️ `text-underline-offset` 在真实语料里只有 2 篇，**几乎没人用，不确定是否可靠**。**[推测]**
去掉它也不影响主体效果，只是下划线会贴得近一点。

```css
strong {
  color: var(--theme-ink);
  font-weight: 800;
  text-decoration: underline;
  text-decoration-color: var(--md-primary-color);
  text-decoration-thickness: 2px;
}
```

#### 2.5.3 标签块（`code` 用）

**出处**：真实文章里
`display:inline-block; background:rgb(239,112,96); color:#fff; padding:3px 10px 1px; border-top-right-radius:3px; border-top-left-radius:3px; margin-right:3px`
（只有上方两个圆角，做出「页签」感）。**[真实 DOM]**

```css
code {
  padding: 0.16em 0.45em;
  border-radius: 5px 5px 0 0;
  background: color-mix(in srgb, var(--md-primary-color) 12%, white);
  color: color-mix(in srgb, var(--md-primary-color) 75%, #101010);
  font-size: calc(var(--md-font-size) * 0.88);
}
```

#### 2.5.4 底部粗线（`mark`）

```css
mark {
  padding: 0 0.12em;
  background: transparent;
  box-shadow: inset 0 -0.42em 0 color-mix(in srgb, var(--md-primary-color) 24%, white);
  color: var(--theme-ink);
}
```

> `box-shadow: inset` 在语料里只命中 3 篇 **[真实 DOM]**，覆盖度低。
> 更稳的等价写法是 2.1.9 的 `linear-gradient` 荧光笔（覆盖 14%），优先用那个。

---

## 3. 排版节奏参考

**这一节比前面所有装饰都重要。** 数据来自 958 篇有完整可测量排版数据的真实公众号文章，
所有比值都换算成「相对正文字号的倍数」，可以直接映射到 `calc(var(--md-font-size) * N)`。

### 3.1 正文字号

| 字号 | 篇数 | 占比 |
| --- | --- | --- |
| **16px** | 728 | **76%** |
| 14px | 96 | 10% |
| 15px | 86 | 9% |
| 17px | 19 | 2% |
| 18px | 10 | 1% |

**结论：16px 是压倒性的事实标准。** 我们的默认 `--md-font-size` 应该锚定 16px。

### 3.2 标题字号倍率（相对正文）

| 层级 | 样本 | P25 | **P50** | P75 | P90 |
| --- | --- | --- | --- | --- | --- |
| h1 | 99 | 1.50 | **1.50** | 1.60 | 1.75 |
| h2 | 325 | 1.38 | **1.38** | 1.47 | 1.53 |
| h3 | 283 | 1.25 | **1.25** | 1.25 | 1.33 |
| h4 | 121 | 1.13 | **1.13** | 1.13 | 1.20 |

中位数序列是 **1.13 / 1.25 / 1.38 / 1.50**，等差 0.125，也就是 `9/8, 10/8, 11/8, 12/8`。
这是一个**非常克制的层级**——不是常见的 1.25 倍比例数列，而是线性递增。

> 🔴 **这是我们现有主题最大的问题。**
> `default.css` h1 = 1.82、`magazine.css` h1 = 1.92、`sequence.css` h1 = 1.96，
> **全部超过了真实语料的 P90（1.75）**。
> 在 375px 宽的手机上，1.9 倍的 h1（约 30px）会占掉大半行宽，
> 中文标题一长就折行，观感立刻变廉价。
>
> 建议区间：
> - **h1: 1.5 ~ 1.75**（想要冲击力的封面型主题可以到 1.9，但必须配 `letter-spacing` 收紧和短标题）
> - **h2: 1.3 ~ 1.45**
> - **h3: 1.1 ~ 1.25**
> - **h4: 1.0 ~ 1.15**

### 3.3 标题上下间距

换算成正文 em 之后，分布极度集中：

| 层级 | 项 | 样本 | P25 | **P50** | P75 |
| --- | --- | --- | --- | --- | --- |
| h1 | margin-top | 94 | 1.88 | **1.88** | 1.88 |
| h1 | margin-bottom | 95 | 0.94 | **0.94** | 0.94 |
| h2 | margin-top | 274 | 1.67 | **1.88** | 1.88 |
| h2 | margin-bottom | 262 | 0.94 | **0.94** | 0.94 |
| h3 | margin-top | 234 | 1.88 | **1.88** | 1.88 |
| h3 | margin-bottom | 245 | 0.94 | **0.94** | 0.94 |

### 3.4 「上间距 : 下间距」= 2 : 1

| 层级 | 样本 | P25 | **P50** | P75 |
| --- | --- | --- | --- | --- |
| h1 | 93 | 2.00 | **2.00** | 2.00 |
| h2 | 232 | 2.00 | **2.00** | 2.00 |
| h3 | 230 | 2.00 | **2.00** | 2.00 |

**上下间距严格 2:1，三个层级完全一致。**
这个数字这么干净是有原因的：`margin-top:30px; margin-bottom:15px`
是**微信自家编辑器给标题的默认值**，全行业都继承了它（30/16 = 1.875，15/16 = 0.9375）。

> 这条规律的意义：**标题应该「贴近它引导的内容，远离上文」**。
> 方向上我们是对的（现有主题的 h2 普遍在 2.4:1 左右），但**绝对值普遍偏大**：
> `default.css` h2 = 2.8em / 1.15em、`ink.css` h2 = 3em / 1.25em，
> 上间距是语料中位数（1.88em）的 1.5 倍以上。
>
> 注意这里的 em 基准不一样：主题 CSS 里 `margin` 的 `em` 是**相对标题自己的字号**，
> 而上表是**相对正文字号**。`default.css` h2 字号 1.3 倍、上间距 2.8em，
> 换算到正文就是 2.8 × 1.3 = **3.64em**，接近语料中位数的两倍。
> 留白多不等于好看 —— 标题被推得离上文太远，读者会失去「这是同一篇文章」的连续感。

### 3.5 正文行高

归一化成倍数后：

| P10 | P25 | **P50** | P75 | P90 |
| --- | --- | --- | --- | --- |
| 1.63 | 1.63 | **1.75** | 1.75 | 1.93 |

原始高频取值：`26px`(333)、`1.75em`(141)、`1.75`(74)、`30px`(62)、`2em`(43)、`1.8em`(22)、`1.6`(21)

**结论：1.75 是中位数，合理区间 1.6 ~ 1.95。**
`26px / 16px = 1.625` 是微信编辑器默认值，`1.75` 是 mdnice 系的默认值。

> 我们的 `ink.css` 正文行高 2.15、`magazine.css` 2.0 —— 都在 P90 之上。
> 留白型主题这么写没问题（那是刻意的气质），但**不该是所有主题的默认**。
> `sequence.css` 的 1.84 是个好数字。

### 3.6 正文字间距

归一化成 em：

| P25 | **P50** | P75 | P90 |
| --- | --- | --- | --- |
| 0.000 | **0.034** | 0.050 | 0.107 |

原始高频取值：`0px`(268)、`0.544px`(149)、`0.034em`(40)、`1px`(39)、`2px`(38)、`0.1em`(37)、`0.05em`(34)

`0.544px / 16px = 0.034em` —— **这是微信自己注入的默认字间距**，出现频率极高。

**结论：正文 `letter-spacing` 建议 0.02 ~ 0.05em。**
超过 0.1em 就属于「刻意的气质选择」（我们的 `ink.css` 用 0.05em 是合适的）。

### 3.7 标题行高

| 层级 | 高频取值 |
| --- | --- |
| h1 | 1.35、1.6、1.2 |
| h2 | 32px（≈1.45 @22px）、1.35、1.5em、1.75em |
| h3 | 1.35、1.4、1.5、1.43 |

**结论：标题行高集中在 1.2 ~ 1.5，中位数 1.35。**
正文 1.75、标题 1.35 —— 这个对比本身就是层级感的来源。

### 3.8 一句话总结的节奏配方

⚠️ **先搞清楚 em 的基准，这是最容易写错的地方。**
标题上的 `margin: 2.8em` 里的 `em` 是**相对标题自己的字号**，不是正文字号。
所以一个 1.38 倍字号的 h2 写 `margin-top: 1.9em`，实际是 `1.9 × 1.38 = 2.62` 倍正文字号，
比 3.3 节的目标值（1.88）多出 39%。

**最稳妥的写法是间距也用 `calc(var(--md-font-size) * N)`**，
这样代码里的数字就是「正文 em」，跟第 3 节的表能直接对上，改字号时也不会连锁走形：

```css
section,
container {
  --theme-ink: #1a1a1a;
  --theme-muted: #3f3f3f;
  --theme-line: #e3e3e3;
  color: var(--theme-muted);
  line-height: 1.75;
  letter-spacing: 0.03em;
}

h1 {
  margin-top: calc(var(--md-font-size) * 1.9);
  margin-bottom: calc(var(--md-font-size) * 0.95);
  font-size: calc(var(--md-font-size) * 1.6);
  line-height: 1.3;
}

h2 {
  margin-top: calc(var(--md-font-size) * 1.9);
  margin-bottom: calc(var(--md-font-size) * 0.95);
  font-size: calc(var(--md-font-size) * 1.38);
  line-height: 1.35;
}

h3 {
  margin-top: calc(var(--md-font-size) * 1.9);
  margin-bottom: calc(var(--md-font-size) * 0.95);
  font-size: calc(var(--md-font-size) * 1.25);
  line-height: 1.4;
}

h4 {
  margin-top: calc(var(--md-font-size) * 1.6);
  margin-bottom: calc(var(--md-font-size) * 0.8);
  font-size: calc(var(--md-font-size) * 1.13);
  line-height: 1.45;
}

p {
  margin-top: 0;
  margin-bottom: calc(var(--md-font-size) * 1.2);
}
```

如果坚持用 `em` 写间距（跟现有主题保持一致），需要先除以该级标题的字号倍率：

| 层级 | 字号倍率 | 目标（正文 em） | **应写的 em 值** |
| --- | --- | --- | --- |
| h1 | 1.60 | 1.88 / 0.94 | `margin-top: 1.18em; margin-bottom: 0.59em` |
| h2 | 1.38 | 1.88 / 0.94 | `margin-top: 1.36em; margin-bottom: 0.68em` |
| h3 | 1.25 | 1.88 / 0.94 | `margin-top: 1.50em; margin-bottom: 0.75em` |
| h4 | 1.13 | 1.60 / 0.80 | `margin-top: 1.42em; margin-bottom: 0.71em` |

> 🔴 **现有 36 套主题基本都踩了这个坑。**
> `default.css` h2 写的是 `margin: 2.8em 0 1.15em`，换算到正文是 **3.64em / 1.50em**；
> `ink.css` h2 写 `3em`（字号 1.24 倍）= **3.72em**。
> 都接近语料中位数的两倍。这就是「一眼看上去松散、不像成熟排版」的直接原因，
> **比任何装饰手法都更值得先修**。

把这段当**新主题的起手式**，先把节奏立住，再往上加第 1、2 节的装饰。
现在 36 套主题里「不够好看」的那部分，问题基本都在节奏而不在装饰。

---

## 4. 配色方案库

### 4.1 从真实语料里量出来的基线

**正文墨色**（Top，已剔除代码高亮色）：**[真实 DOM]**

`#000000`(28447) → `#1b1918`(21138) → `#4a4a4a`(18723) → `#333333`(13728) → `#3e3e3e`(9937) → `#3f3f3f`(6455) → `#595959`(5404) → `#888888`(4931)

**结论：正文别用纯黑。** 主流落在 `#333` ~ `#4a4a4a` 这一段，
标题用更深的 `#1b1918` ~ `#0a0a0a` 拉开层级。

**背景色**：**[真实 DOM]**

`#ffffff`(29322) → `#f8f8f8` → `#f3f1f1` → `#fff5e3` → `#f8f5ec` → `#f1efee` → `#f2f7fb` → `#fafafa` → `#eeedeb`

**结论：底色要么纯白，要么是明度 ≥ 95% 的极浅色偏。** 没有中间地带。

**每篇文章的主强调色**（多少篇以它为主色）：**[真实 DOM]**

| 色值 | 篇数 | 说明 |
| --- | --- | --- |
| `#1e6bb8` | 104 | mdnice 默认蓝 |
| `#0052ff` | 65 | 电光蓝 |
| `#d92142` | 49 | 正红 |
| `#ef7060` | 41 | mdnice 珊瑚橙 |
| `#47c1a8` | 26 | 秀米默认青绿 |
| `#35b378` / `#48b378` | 45 | 森绿 |
| `#576b95` | 18 | **微信官方链接蓝** |
| `#ff6827` / `#ff4c00` | 39 | 信号橙 |

> ⚠️ 语料是技术号为主，蓝色系被严重高估。`#c678dd` / `#98c379` / `#d19a66` / `#282c34`
> 这些高频色是 **One Dark 代码高亮主题**的颜色，不是排版配色，已从上表剔除。

### 4.2 成套配色（可直接写进主题）

以下 12 套，来源标在每套后面。格式统一为：主色 / 墨色 / 辅助色 / 边框色 / 背景色。

| # | 名称 | 气质 | 主色 | 墨色 | 辅助 | 边框 | 背景 | 出处 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 编辑黑白 | 编辑部、观点、方法论 | `#e00019` | `#050505` | `#666666` | `#d8d8d8` | `#ffffff` | 字间 `swiss-index` **[源码]** |
| 2 | 克莱因蓝 | 单色主义、艺术 | `#002FA7` | `#111111` | `#5a5a5a` | `#e0e0e0` | `#ffffff` | 字间 `klein` **[源码]** |
| 3 | 宣纸朱砂 | 东方古典、文化随笔 | `#c2352b` | `#3a3630` | `#8a7f6a` | `#e5ddcc` | `#f7f4ec` | 字间 `xuanzhi` **[源码]** |
| 4 | 午夜蓝金 | 商务周刊、评论 | `#1b2a4a` | `#111111` | `#8a7a58` | `#dcd7cc` | `#ffffff` | 字间 `midnight-gold` **[源码]** |
| 5 | 莫兰迪绿 | 灰调治愈、生活 | `#7d8c7a` | `#2f332e` | `#8d938a` | `#e2e5e0` | `#ffffff` | 字间 `morandi-green` **[源码]** |
| 6 | 夜航胶片 | 影像、纪实（深色底） | `#ff7a2d` | `#fff0d7` | `#9cb2cb` | `#415166` | `#07111f` | 字间 `night-film` **[源码]** |
| 7 | 珊瑚橙 | 技术、教程 | `#ef7060` | `#1b1918` | `#595959` | `#e8e8e8` | `#ffffff` | mdnice 真实文章 **[真实 DOM]** |
| 8 | 信号蓝 | 技术、产品 | `#1e6bb8` | `#000000` | `#4a4a4a` | `#e4e4e4` | `#ffffff` | mdnice 真实文章 **[真实 DOM]** |
| 9 | 秀米青 | 通用、清爽 | `#47c1a8` | `#3e3e3e` | `#6a6a6a` | `#d9d9d9` | `#ffffff` | 秀米默认色板 **[源码]** |
| 10 | 湖蓝浅底 | 政务、通知、活动 | `#3cb8c7` | `#0b4473` | `#188895` | `#c7e3ff` | `#e1f4ff` | 135 模板 **[源码]** |
| 11 | 秋绿姜黄 | 校园、开学季、清单 | `#5fa37e` | `#32433a` | `#fec55c` | `#e9e0cf` | `#faf3e8` | 135 模板 **[源码]** |
| 12 | 党政红金 | 时政、纪念 | `#d02d09` | `#2a2a2a` | `#ffda69` | `#e8d9c8` | `#ffffff` | 135 模板 **[源码]** |

秀米编辑器内置的取色板（可以当「主色候选池」）：**[源码]**

```
#f96e57  #ff8124  #ffca00  #8ec965  #47c1a8  #5f9cef  #a65bcb
#000000  #3e3e3e  #a0a0a0  #ffffff
```

135 模板里的高频色（出现次数）：**[源码]**

```
#ffffff(323) #333333(111) #5fa37e(43) #1a3782(42) #fec55c(40) #26c4ee(39)
#cecece(27) #f9d112(27) #ffdd56(27) #c7e3ff(24) #ffe760(24) #3ea4ff(24) #3bb7c7(22)
```

### 4.3 配色写进主题的模板

```css
section,
container {
  --theme-ink: #050505;      /* 标题 / 强调 */
  --theme-muted: #3f3f3f;    /* 正文 */
  --theme-second: #666666;   /* 图注 / 次要信息 */
  --theme-line: #d8d8d8;     /* 分割线 / 表格线 */
  --theme-surface: #f6f6f6;  /* 引用块 / 代码块底 */
  --theme-paper: #ffffff;    /* 页面底 */
  color: var(--theme-muted);
}
```

> 主色不要在这里定义，用 `var(--md-primary-color)` —— 那是用户可调的。
> 主题内部变量只放「跟主色无关的中性色」，这样用户换主色时整套依然成立。

---

## 5. 明确不能用的手法清单

| 手法 | 结论 | 原因 |
| --- | --- | --- |
| `position`（任何值） | 🚫 禁用 | **1681 篇真实文章里 0 处**。135 的 256 套模板里也只有 5 套（且是画廊 wrapper 泄漏）。全行业共识是微信剥掉它 **[真实 DOM]** |
| `line-height: 0` | 🚫 禁用 | 官方插件规范 2.3 点名，文字行会重叠 |
| 容器固定 px 宽度 | 🚫 禁用 | 官方规范 2.4，宽屏下破坏响应式 |
| 容器固定高度 | 🚫 禁用 | 官方规范 2.5，移动端内容不可见（`<hr>` 除外） |
| `text-align: start / end` | 🚫 禁用 | 官方规范 2.6，且是**结构校验接口唯一抓得到的错误** |
| `<pre>` 包正文 | 🚫 禁用 | 官方规范 2.8，移动端横向截断 |
| 相同标签嵌套 > 15 层 | 🚫 禁用 | 官方规范 3.1，结构会被自动删除 |
| `background-clip: text`（渐变文字） | 🚫 禁用 | 我们的复制链路会主动压成纯色（`flattenClipboardGradientText`），因为微信只留 `color:transparent` 会导致整行标题消失 **[源码]** |
| `decimal-leading-zero` | 🚫 禁用 | juice 会降级成普通数字，取证已确认 |
| `hr::before` / `hr::after` | 🚫 禁用 | 生成的 span 会落到 `<hr>` 外面，取证已确认 |
| `display: grid` | ⚠️ 避免 | 1681 篇里只有 12 篇（3%），且我们的约定禁止 |
| `gap` | ⚠️ 避免 | 1681 篇里只有 1 篇 |
| `aspect-ratio` | ⚠️ 避免 | 1681 篇里只有 1 篇 |
| `clip-path` | ⚠️ 避免 | 1681 篇里只有 1 篇。135 用它（8%）但全部带 `-webkit-` 前缀 |
| `filter` / `backdrop-filter` | ⚠️ 避免 | 1681 篇里只有 1 篇 |
| `writing-mode`（竖排） | ⚠️ 慎用 | 只有 1 篇。**能活但几乎没人用**，没有生产验证 |
| `li::marker` | ⚠️ 待验证 | juice 只内联 `::before`/`::after`，marker 样式大概率进不了剪贴板 **[推测]** |
| `::first-letter`（首字下沉） | ⚠️ 待验证 | 同上，juice 不处理这个伪元素 **[推测]**。真实文章里的「首字放大」全部是 `float:left` 的独立元素，不是 `::first-letter` |
| `text-underline-offset` | ⚠️ 慎用 | 1681 篇里只有 2 篇 |
| `box-shadow: inset` | ⚠️ 慎用 | 1681 篇里只有 3 篇。普通 `box-shadow` 是安全的（38%） |
| `border-image` | ⚠️ 慎用 | 1681 篇里只有 7 篇 |
| 固定 px 字号 | ⚠️ 避免 | 破坏我们的字号可调能力，用 `calc(var(--md-font-size) * N)` |
| `font-family` | ℹ️ 例外 | 官方规范第 4 条说别设，但**真实文章里 91% 都设了**。我们用 `var(--md-font-family)` 交给上层决定 **[真实 DOM]** |

### 5.1 一条容易忽略的：`max-width` 的正确写法

微信会给正文元素注入 `max-width: 100%`。所以：

- 需要 **等于** 100% 时：直接写 `max-width: 100%`，**不要**加 `!important`（秀米的判断逻辑就是这样）
- 需要 **超过** 100% 时：**必须**写 `max-width: N% !important`

135 的 256 套模板里 **63%** 都带 `max-width:100% !important`，
秀米的 `paperHtmlConverter` 会自动给任何非 100% 的 `max-width` 补 `!important`。**[源码]**
真实文章里 `!important` 的覆盖率是 **99.9%**，说明它完全能存活。**[真实 DOM]**

---

## 6. 来源与可信度汇总

| 章节 | 主要证据 | 可信度 |
| --- | --- | --- |
| 1.1 眉标 | 字间源码 + 我们已上线 | 高 |
| 1.2 章节编号 | 真实文章 counter 残留 + 已有取证 | 高 |
| 1.3 序号徽章 | 秀米 44× + 135 72× + 真实文章 | 高 |
| 1.4 上下线 | 秀米 32× + 已上线 | 高 |
| 1.5 两侧短横 | 秀米 `006-text-bd` + 已上线 | 高 |
| 1.6 CSS 三角 | 秀米 39× + 135 15/256 + 真实文章 13% | 高 |
| 1.7 色块标题 | mdnice 真实产物 | 高 |
| 1.8 标签页签 | 有三AI 真实文章 | 高（但完整版需要包装 HTML） |
| 1.9 荧光笔 | mdnice 真实产物 + 我们有兜底逻辑 | 高 |
| 1.10 左竖线 | 壹伴真实模板 + 全行业 | 高 |
| 1.11 渐隐横杠 | 135 大量 + 真实 `<hr>` | 高 |
| 1.12 巨型编号 | 字间源码 + 已上线 | 高 |
| 1.13 双层描边 | 知道创宇 / Hollis 真实文章 | 高 |
| 1.14 线中标题 | 京东零售技术 真实文章 | 高，但**主题 CSS 做不了** |
| 1.15 文字投影 | 星期五实验室 真实文章（7%） | 中 |
| 1.16 描边字 | 92 篇 / 1681 篇（5.5%） | 中 |
| 2.x 引用/列表/表格/分割线 | 真实文章跨账号统计 | 高 |
| 3. 排版节奏 | 958 篇实测 | 高（但样本偏技术号） |
| 4. 配色 | 字间 / 135 源码 + 真实文章色频 | 中高（技术号偏蓝） |
| 5. 禁用清单 | 官方规范 + 1681 篇统计 + 我们的源码 | 高 |

---

## 7. 抓不到 / 验证不了的部分

如实列出，不要在这些地方假设。

1. **i 排版的模板库没拿到。** 官网 `ipaiban.com` 是 Nuxt SPA，编辑器要登录，
   页面里没有任何模板 markup。语料 1681 篇里只命中 4 篇带 `ipaiban.com` 标记的文章，
   样本太小，不足以归纳手法。

2. **壹伴的模板库只拿到间接证据。** 壹伴是浏览器插件，模板在公众号后台里加载，
   官网只有营销页。绕过去的办法是从真实文章里提 `class="mpa-template"`，
   拿到 278 篇文章里的 179 个实例，分类是 `收藏`(89) / `title`(28) / `fav`(19) / `quote`(3) / `bottom_guide`(1) / `分隔`(1)。
   **这只是「被用过的模板」，不是完整模板库。**
   另外 `data-mpa-powered-by="yiban.io"` 这个标记**不是模板标记**，
   它是插件给经手内容打的戳，大量情况下包的其实是 mdnice 的产物 —— 别拿它当壹伴的设计。

3. **用户点名的「一条」「日食记」「新世相」这类精品号没有抓到。**
   语料是从 GitHub 代码搜索里捞链接得到的，天然偏技术。
   搜狗微信搜索有反爬（DuckDuckGo 返回 202、Bing 搜不到 `site:mp.weixin.qq.com` 结果），
   grep.app 返回 429。**要补这类样本，需要另找链接来源**——
   比较现实的路子是从这些号的官网 / 微博 / 小红书里找回链，或者人工提供几篇 URL。
   给出 URL 后，本轮的抓取和分析脚本可以直接复用。

4. **粘贴过滤没有验证。** 本轮所有「真实 DOM」证据证明的都是
   **微信渲染端支持**，不能证明**粘贴通道不剥**。已发布文章可能是通过接口同步进去的。
   这条限制上一轮就写在 `wechat-layout-reference.md` 里，本轮没有改变。
   要根治需要一个公众号后台账号。

5. **`li::marker` 和 `::first-letter` 能不能穿过 juice 没有实测。**
   按 `inlinePseudoElements` 只处理 `::before`/`::after` 推断是不行的，
   但**这是推断不是实测**。这两条影响到「列表 marker 变色」和「首字下沉」两个手法，
   建议下一轮用 `scripts/audit-theme-clipboard.mjs` 那条链路实际跑一遍。

6. **配色数据被代码高亮污染过。** 语料里技术文章带大量代码块，
   One Dark / Monokai 的配色（`#c678dd`、`#98c379`、`#282c34`、`#f92672` 等）
   会混进颜色统计。第 4.1 节的表已经人工剔除了明显的高亮色，
   但**低频段的颜色统计不可信**，只用了 Top 段。

7. **秀米日期目录（~880 个模板）没有逐个看。**
   本轮系统性分析的是 `header/`(118)、`card/`(112)、`middleware/`(24)、`layout/`(35) 这几个语义明确的目录。
   日期目录是历史发版批次，内容混杂，抽样看过但没有穷举。
   模板已全量落到 `/tmp/wxdl/tpls/`，需要时可以继续挖。
