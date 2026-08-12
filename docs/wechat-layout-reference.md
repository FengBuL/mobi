# 公众号排版结构参考（秀米实证）

这份文档记的是**实证结果**，不是设计方案。每一条都标了出处和取证方式，
后面再改图文排版模块时先看这里，不要重新猜。

三类结论分开标注：

- **[源码]** —— 从秀米线上编辑器自己的 JS 里读出来的，等价于秀米的真实行为。
- **[实测]** —— 在浏览器里真实渲染测出来的。
- **[未验证]** —— 有旁证但没有在真实公众号后台里跑过。

---

## 0. 取证方法

### 0.1 秀米编辑器源码（本文档的主要来源）

秀米的编辑器是公开可下载的，不需要登录：

```bash
curl -s https://xiumi.us/studio/v5 -o studio.html
# 从中取出脚本地址，当前为：
curl -s https://edt.xiumius.cn/scripts/app/studio/entries/total/67bb60.main.min.js -o studio-main.js   # 约 9.5 MB
curl -s https://edt.xiumius.cn/views/app/studio/ca463b.ng-tpl.min.js -o studio-tpl.js                  # 约 1.1 MB
```

`studio-main.js` 里有两个关键模块：

| 模块 | 作用 |
| --- | --- |
| `slide: function (t) {...}` | 生成滑动容器，内含完整的 HTML 模板字符串 |
| `define("depot/services/paperHtmlConverter", ...)` | **秀米「导出到公众号」用的转换器**，所有兼容性 workaround 都在这里 |

文件名带 hash，会随秀米发版变化；用 `rg -oF 'powered-by' studio-main.js` 之类的关键字定位即可。

### 0.2 已发布文章的 DOM

`mp.weixin.qq.com/s/...` 的正文就是微信过滤后的 HTML，`curl` 下来解析 `#js_content`
就能看到微信实际保留了什么。这是第三轮用的方法，仍然有效。
局限：已发布文章可能是通过**接口同步**进去的，不一定经过粘贴过滤，
所以它只能证明「渲染端支持」，不能证明「粘贴能过」。

### 0.3 公众号官方结构校验接口

`POST https://mp.weixin.qq.com/article-bin/verify_article_structure`，body `{"content": "<html>"}`。
**实测这个接口很弱**，只抓得到官方规范里点名的少数几条。实测样本：

| 送检结构 | 结果 |
| --- | --- |
| 秀米滑动容器原样 | `isValid=true` |
| `overflow-y:auto` + `max-height` | `isValid=true` |
| `line-height:0` | `isValid=true`（规范里明确说这是错的，接口却放行） |
| `width:900px` 固定宽度 | `isValid=true`（同上） |
| `text-align:start` | `isValid=false` ✅ 唯一抓到的 |

**结论：这个接口通过不等于粘贴正常，不能作为验收依据。**

---

## 1. 横向滑动到底怎么实现 —— 秀米的确切结构

**[源码]** `studio-main.js` 的 `slide` 函数，原始模板字符串（未改动，仅换行便于阅读）：

```html
<section style="display: inline-block; width: 100%;vertical-align: top;overflow-x: auto;box-sizing: border-box;" powered-by="xiumi.us">
  <section style="display: flex; width: 200%; max-width: 200% !important; box-sizing: border-box;">
    <section class="sliding-content" style="position: static;vertical-align: middle;width: 50%;box-sizing: border-box;transform: scale(1);" powered-by="xiumi.us"></section>
    <section style="display: inline-block;position: static;vertical-align: top;width: 50%;box-sizing: border-box;pointer-events: none;" powered-by="xiumi.us"><br></section>
  </section>
</section>
```

模板插入后，同一个函数还会用 JS 补三条样式：

```js
r.css("scroll-snap-type", "x mandatory")            // 外层滚动容器
r.children().children().css("scroll-snap-align", "center")  // 两个 50% 列
r.find(".sliding-content:first").css("pointer-events", "painted")
// 方向为 right 时额外：r.css("direction", "rtl")
```

### 要点

1. **横滑就是 `overflow-x: auto`，没有 SVG。** 之前「微信不支持 overflow 滚动容器」的判断是错的。
2. **`max-width: 200% !important` 是这套结构的命门。** 公众号会给正文元素注入 `max-width:100%`，
   内轨不写 `!important` 会被压回 100%，也就没有可滚动的余量了，看上去就是「滑动没生效」。
3. 宽度是 `外层 100% / 内轨 200% / 每列 50%`，即每列正好等于一屏。
4. 第二列是**空白占位列**（`<br>` + `pointer-events:none`），秀米这个组件本质是
   「滑一屏触发动画」，不是通用的 N 图轮播。要做 N 张图的横滑，
   按同样的比例推广即可：内轨 `N×100%`，每列 `(100/N)%`。
5. `position: static` 是秀米编辑器自身的残留（编辑态用了 `position:relative`，
   导出时统一写回 `static`）。**公众号侧没有这个需要，我们不写**，
   写了反而会让我们自己的检测器误报。

### 竖向滑动（长图视窗）

**[源码]** 秀米没有独立的竖滑 CSS 组件；`slide` 只做横轴。
**[未验证]** 135 编辑器的滑动布局有「竖向」选项，且其文档说竖向支持单板块、可自定义显示高度
（正是「长图视窗」的形态），但 135 把滑动放在 **SVG** 分类下。

**[未验证，重要]** 135 编辑器和壹伴的官方教程都明确写着：
用了滑动布局的文章**必须走「保存同步」推送到素材库，直接复制粘贴会失效**。
两家独立厂商口径一致。这条如果成立，意味着**任何滑动组件都不可能靠剪贴板传进公众号**，
包括秀米的。我们没有公众号后台账号，无法直接验证粘贴过滤的行为，这一条保持「未验证」。

---

## 2. 秀米导出到公众号的规则（paperHtmlConverter）

以下全部 **[源码]**，出自 `define("depot/services/paperHtmlConverter", ...)`。

### 2.1 任何非 100% 的 max-width 一律强制 !important

```js
if (null != (i = e.style) && (n = i.maxWidth) && "100%" !== n && n.indexOf("important") < 0)
  return i.setProperty("max-width", n, "important")
```

写了宽度的元素还会被再补一份同值的 max-width：

```js
if (a.width) a.setProperty("max-width", a.width, "important")
```

> 已落地：`wechat-layout.ts` 的 `renderWeChatRow` 现在给每列写
> `max-width:<width> !important`。`max-width:100%` 按秀米的判断**不加** `!important`。

### 2.2 overflow 简写要拆成长写法

```js
Mt = function (t) {
  for (var e, n, r = /overflow\s*:\s*(\w+)\s+(\w+)\s*;/gim; null !== (e = r.exec(t));) {
    n = "overflow-x: " + e[1] + "; overflow-y: " + e[2] + ";"
    t = t.replace(e[0], n)
  }
  return t
}
```

秀米导出时把 `overflow: x y` 双值简写展开成两条长写法，说明公众号侧不能指望简写被正确解析。

### 2.3 overflow:hidden + 圆角要补 transform

```js
if ("hidden" === a.overflow && !a.transform)
  for (...) if ($(n).css("border-radius")) { a.setProperty("transform", "rotate(0deg)"); break }
```

iOS 上 `overflow:hidden` 裁不住圆角内容的老问题，秀米用 `transform:rotate(0deg)` 强制生成层来解决。

### 2.4 秀米的标准容器样式

```js
var p = { display: "inline-block", width: "100%", "box-sizing": "border-box", position: "static", "max-width": "100%" }
var a = { position: "static", "box-sizing": "border-box", width: "100%", height: "auto" }
```

> 已落地：`wechat-layout.ts` 导出的 `WECHAT_SECTION_RESET`（去掉了 `position:static`，理由见 1.5）。

### 2.5 其他 workaround

```js
kt = function (t) {
  return (t = t.replace(/opacity\s*:\s*0\.9[98]\d*\s*;/gim, "isolation: isolate;"))
    .replace(/border-radius\s*:\s*[01]px\s*;/gim, "")
}
```

`opacity: 0.98/0.99` 换成 `isolation: isolate`（避开公众号对近似透明元素的处理），
`border-radius: 0px/1px` 直接删掉。

### 2.6 导出时保留的属性白名单

```js
p = function (t) {
  return "placeholder" !== t && ("copyright" === t || "powered-by" === t || "provider-by" === t
    || t.startsWith("tn-") || t.startsWith("ng-") || t.startsWith("data-")
    || t.startsWith("ui-on-") || "stop-propagation" === t || "contenteditable" === t)
}
f = { img: ["data-ratio", "data-s", "data-w", "data-type", "_width", "crossorigin"], ... }
```

`img` 上保留 `data-ratio` / `data-w` / `data-type` —— 和我们现在写的一致。

---

## 3. 公众号官方规范里点名的错误用法

来源：<https://developers.weixin.qq.com/doc/subscription/guide/product/plugin_spec.html>

| 条目 | 错误用法 | 后果 |
| --- | --- | --- |
| 2.3 | `line-height: 0` | 文字行重叠 |
| 2.4 | 容器固定 px 宽度 | 破坏响应式，宽屏留白左对齐 |
| 2.5 | 容器固定高度（示例是 `height: 0`） | 移动端内容完全不可见 |
| 2.6 | `text-align: start / end` | iOS 18+ 与其他端表现不一致 |
| 2.7 | SVG `animate` 的 `begin` 只写 `touchstart` | PC 端触发不了，要写 `begin="touchstart; click"` |
| 2.8 | `<pre>` 包正文 | 移动端横向截断 |
| 3.1 | 相同标签嵌套超过 15 层 | 结构会被编辑器自动删除 |
| 4 | 设置 `font-family` | iOS 17+ 字号字距不一致 |

**规范里从头到尾没有提 `overflow`**，既没有禁止也没有背书。
另外规范 2.7 专门规范 SVG 动画的写法，说明 **SVG 动画在公众号文章里是被官方认可的一等公民**。
规范 2.1 的示例 DOM 里出现了 `style="width: 676.996px !important; ... height: auto !important;"`，
可见 **`!important` 在公众号文章里是能存活的**。

---

## 4. 限高滚动视窗的降级实测

**[实测]** 375px 宽画布，750×3000 的长图，视窗 420px，逐个剥属性后量「图片有没有盖住后面的正文」：

| 结构 | 原样 | 剥掉 overflow-y | 剥掉全部 overflow | 全剥（含 max-height） |
| --- | --- | --- | --- | --- |
| `overflow-y:auto; max-height` | 可滚动 | **盖住后文 1080px** | **盖住后文 1080px** | 整幅长图，正常 |
| `overflow:hidden; overflow-y:auto; max-height` | 可滚动 | 裁剪，不盖后文 | **盖住后文** | 整幅长图，正常 |
| 秀米横滑（`overflow-x`） | 可横滑 | 不盖后文，仅右溢 | 不盖后文，仅右溢 | 不盖后文 |
| 整幅长图 | 正常 | 正常 | 正常 | 正常 |

### 两条结论

1. **横轴降级安全，纵轴降级危险。** 横向溢出不影响纵向文档流，
   公众号正文容器还会把溢出部分裁掉；纵向限高一旦失去 overflow，
   长图会直接画到后面的正文上。秀米把 CSS 滑动做成横向的，大概率就是这个原因。
2. **同时写 `overflow:hidden` 和 `overflow-y:auto` 能造出一条降级阶梯**，
   把「盖住后文」这个最坏结果限制在「overflow 简写和长写法一起被剥掉」这一格。
   而第三轮已经从真实文章 DOM 里确认 `overflow:hidden` 能穿过过滤，
   所以这一格在现有证据下不成立。

> 已落地：`wechat-layout.ts` 的 `renderWeChatVerticalScroller`，
> 以及 `verify-wechat-layout.mjs` 里新增的 `nooverflow` 场景和 `coverAfter` 判据。

---

## 5. 我们的产物与秀米的对照

| 秀米做法 | 我们的落点 | 状态 |
| --- | --- | --- |
| 多列 = 父 flex + 子 inline-block 百分比 | `renderWeChatRow` | 已对齐 |
| 非 100% 的 max-width 加 `!important` | `renderWeChatRow` | 本轮补上 |
| overflow 只写长写法 | `renderWeChatVerticalScroller` | 本轮补上 |
| `overflow:hidden` + 圆角补 `transform:rotate(0deg)` | `renderWeChatVerticalScroller` | 本轮补上 |
| 标准容器 `display:inline-block; width:100%; max-width:100%; box-sizing:border-box` | `WECHAT_SECTION_RESET` | 本轮补上 |
| 相邻 inline-block 之间零空白 | `compactWeChatMarkup` | 已对齐 |
| 从不用 `<table>` | 全部产物 | 已对齐 |
| `position: static` | 不写 | 刻意不抄，见 1.5 |
| 滑动组件走接口同步而非粘贴 | 我们只有粘贴通道 | **未解决，见 1 节末** |

---

## 5.5 大样本复核：1681 篇真实文章的属性存活率

第四轮补的。用 GitHub 代码搜索在 markdown / json / txt 里捞 `mp.weixin.qq.com/s/` 链接，
去重得到 3798 个文章 ID，抓下来 1681 篇有完整 `#js_content` 的文章。
**HTTP 成功率 500/500，文章页本身不设防**，掉的是已删除文章。
脚本和语料在 `/tmp/wxdl/`（`crawl-articles.mjs` / `mine-articles.mjs` / `targeted.mjs`）。

这批数据把之前「保留 / 剥离」的清单从个案升级成了统计。
下表的百分比 = 有多少篇文章的正文里出现过该手法（449 篇抽样的标注为 †，其余为全量 1681 篇）：

| 属性 / 手法 | 覆盖率 | 结论 |
| --- | --- | --- |
| `position` | **0 篇** | 🚫 确认被剥。之前的判断成立，且样本扩大到 1681 篇仍是 0 |
| `!important` | 99.9% | ✅ 完全存活 |
| `em` 单位尺寸 | 94% † | ✅ |
| `font-family` | 91% † | ✅ 存活（尽管官方规范第 4 条建议别设） |
| `letter-spacing` | 82% † | ✅ |
| 百分比 `width` | 71% † | ✅ |
| `border-radius` | 68% † | ✅ |
| `display: inline-block` | 67% † | ✅ |
| `white-space: nowrap` | 62% | ✅ |
| `overflow` | 62% † | ✅ **再次确认 overflow 能活** |
| `box-sizing` | 61% † | ✅ |
| `display: flex` | 49% † | ✅ |
| `vertical-align` | 44% † | ✅ |
| **`box-shadow`** | 38% † | ✅ **新增，之前清单里没有** |
| **`text-align: justify`** | 33.5% | ✅ **新增** |
| `transform` | 34% † | ✅ |
| `background-image` | 32% † | ✅ |
| `list-style-type` | 29% † | ✅ |
| **`text-indent`** | 23% † | ✅ **新增** |
| **`outline`** | 22% † | ✅ **新增** |
| **`background-clip`** | 20% † | ⚠️ 能活，但我们主动禁用（见下） |
| `float` | 17% † | ✅ |
| `linear-gradient` | 14% † | ✅ |
| transparent 边框（CSS 三角） | 13% † | ✅ |
| **em 负 margin 叠压** | 10.2% | ✅ **这是 `position:absolute` 的行业替代品** |
| `text-transform` | 9% † | ✅ |
| **`text-shadow`** | 7% † | ✅ **新增** |
| **`-webkit-text-stroke`** | 5.5% | ✅ **新增，覆盖度偏低** |
| `width:0` 三角形 | 6% † | ✅ |
| `counter-reset` / `counter-increment` | 22 篇 | ✅ 存活（且数字已被实体化成文本） |
| `display: grid` | 3% † | ⚠️ 能活但极少 |
| `max-width: N% !important` | 2% † | ✅ |
| `box-shadow: inset` | 3 篇 | ⚠️ 极少 |
| `border-image` | 7 篇 | ⚠️ 极少 |
| `writing-mode` / `aspect-ratio` / `gap` / `clip-path` / `filter` | 各 1 篇 | ⚠️ 几乎无人使用 |

### 两条值得单独记住的

1. **负 margin 叠压是全行业绕开 `position` 的标准手法。**
   在 135 编辑器的 256 套公开模板里覆盖率高达 **64%**。
   典型用法：把一个 `inline-block` 用 `margin-top: -1em` 提上去压住上面那条线。
2. **`background-clip: text` 虽然微信留着（20%），但我们主动禁用。**
   原因在我们这边：`apps/web/src/utils/index.ts` 的 `flattenClipboardGradientText`
   会在复制前把渐变文字压成纯色，因为一旦微信只留下 `color: transparent`，整行标题就消失了。

### 生成工具的市场分布（按指纹统计）

| 指纹 | 篇数 | 占比 |
| --- | --- | --- |
| `data-tool="mdnice编辑器"` | 466 | 40% |
| `data-mpa-powered-by="yiban.io"`（壹伴插件） | 540 | 32% |
| `powered-by="xiumi.us"` | 298 | 25% |
| `label="Powered by 135editor.com"` | 108 | 9% |
| `class="mpa-template"`（壹伴模板） | 278 | 17% |
| `ipaiban.com` | 4 | 0.2% |

⚠️ 语料是从 GitHub 捞的链接，**绝大多数是技术类公众号**，不能代表设计 / 生活方式类账号。

## 5.6 秀米还有两个模板包（第四轮新发现）

之前只知道 `studio-main.js` 和 `studio-tpl.js`。`xiumi.us/studio/v5` 的页面里还引用了：

```bash
curl -s 'https://xiumi.us/template/v5/paper/comp/ng-tpl.js?host=xiumi.us' -o paper-comp-tpl.js    # 1.0 MB
curl -s 'https://xiumi.us/template/v5/booklet/comp/ng-tpl.js?host=xiumi.us' -o booklet-comp-tpl.js # 25 KB
```

**这两个才是组件模板库的真身**，共 1271 个 `$templateCache.put(url, htmlString)` 条目。
造一个假的 `angular` 和 `window` 跑一遍就能全量导出（`/tmp/wxdl/extract.mjs`）。

分类：`header/` 118、`card/` 112、`image/` 53、`layout/` 35、`middleware/` 24、
`other/` 39、其余约 880 个散在日期命名的发版批次目录里。

设计手法的分析结果在 [`wechat-design-language.md`](./wechat-design-language.md)，
这里只记结构事实：**秀米模板的尺寸几乎全用 `em`**
（`border: 0.1em solid`、`width: 3.2em`、`height: 2em`），装饰跟着字号缩放。

## 5.7 135 编辑器的模板库是公开的（第四轮新发现）

不需要登录，两个入口：

```bash
# 单个素材（含完整 markup）
curl -s 'https://www.135editor.com/editor_styles/86486.html'
# 分类列表，每页约 16 套
curl -s 'https://www.135editor.com/yangshi/biaoti.html'      # 标题
curl -s 'https://www.135editor.com/yangshi/fengexian.html'   # 分割线
curl -s 'https://www.135editor.com/yangshi/yinyong.html'     # 引用
curl -s 'https://www.135editor.com/yangshi/xuhao.html'       # 序号
# 其余分类：disebiaoti / zhengwen / xiantiao / sekuai / juzhong / guanzhu / erweima / wenyi / shangwu / jianyue / shishang / zuhe / jihexingzhuang
```

模板 markup 在 `<div id="template-{id}" data-name="...">` 里。
本轮抓了 256 套（`/tmp/wxdl/b/scrape135.mjs`）。注意外层那个 div 自带
`style="position: relative"` —— **那是 135 画廊页自己的样式，不是模板的一部分**，
统计时要剥掉，否则会误判成「135 用 position」（剥掉后 256 套里只有 5 套有 position）。

`/editor_styles/search.json` 这个接口要登录，返回空数组。

## 6. 还没有验证的事

1. **公众号粘贴过滤到底剥不剥 `overflow`。** 需要一个公众号后台账号，
   把产物粘进编辑器再读回 DOM 才能确定。目前的证据只到「已发布文章里 `overflow:hidden` 存在」。
2. **滑动组件能否靠粘贴传递。** 135 和壹伴都说不能、必须用同步接口。
   如果这条成立，长图视窗在纯剪贴板链路里就是做不到的，
   要做只能补一条「同步到公众号草稿箱」的接口通道（仓库里已经有
   `mpFileUpload` 走 `api.weixin.qq.com`，具备扩展成 `draft/add` 的基础）。
3. 秀米各类**静态图文组件**（四宫格、卡片、图文混排）的确切 DOM。
   ~~源码里没有现成模板字符串~~ —— **第四轮已解决**，见 5.6：
   `paper-comp-tpl.js` 里有 1271 个现成模板字符串，包含 `card/` 112 个、`image/` 53 个、`layout/` 35 个。
4. **`li::marker` 和 `::first-letter` 能不能穿过 juice。**（第四轮新增）
   juice 的 `inlinePseudoElements` 只处理 `::before` / `::after`，
   按此推断这两个伪元素的样式**不会进剪贴板**，会造成「预览里有、粘过去没有」的不一致。
   这是**推断不是实测**，影响到「列表 marker 变色」和「首字下沉」两个手法。
   现有多套主题（`default.css`、`ink.css`、`magazine.css`、`sequence.css`）都写了 `li::marker`，
   建议用 `scripts/audit-theme-clipboard.mjs` 那条链路实跑一遍确认。
5. **本轮所有「真实 DOM」证据仍然只能证明渲染端支持，证明不了粘贴通道不剥。**
   已发布文章可能是通过接口同步进去的。这条限制从第三轮到现在没有变化。
