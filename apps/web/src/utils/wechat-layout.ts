/**
 * 公众号多列布局的底层构件。
 *
 * 这一版的规则不是推测，是从秀米线上编辑器自己的代码里抄下来的：
 * `xiumi.us/studio/v5` 引用的 `edt.xiumius.cn/scripts/app/studio/entries/total/*.main.min.js`
 * 里有一个 `paperHtmlConverter`，那就是秀米「导出到公众号」用的转换器。
 * 详细出处和原始片段记在 `docs/wechat-layout-reference.md`。
 *
 * 从中抄来并在这里落地的规则：
 * - 秀米的标准容器就是 `display:inline-block; width:100%; max-width:100%; box-sizing:border-box`。
 * - 只要一个元素写了宽度，秀米就把同样的值再写一份 `max-width` 并且强制 `!important`
 *   （`if (style.width) style.setProperty("max-width", style.width, "important")`）。
 *   公众号会给正文元素塞 `max-width:100%`，不加 `!important` 的宽度会被压回去。
 * - 导出时秀米把 `overflow: x y` 双值简写拆成 `overflow-x` / `overflow-y` 两条长写法，
 *   说明公众号侧不能指望简写被正确解析。
 * - 从不使用 `<table>`：公众号编辑器不接受表格单元格里的图片，
 *   `<td><img></td>` 粘进去图片会被丢掉，整块排版随之塌掉。
 * - 相邻 inline-block 之间是零空白字符，列宽之和明显小于 100%，给行内空白留容错。
 */

export interface WeChatRowColumn {
  html: string
  /** 相对权重，行内按比例分配可用宽度 */
  weight?: number
  /** 附加在列容器上的声明，例如分隔线 */
  extraStyle?: string
}

export interface WeChatRowOptions {
  /** 列间距，百分比 */
  gap?: number
  /** 列内文字对齐 */
  align?: string
  /** 列顶部对齐方式 */
  valign?: string
}

/**
 * 行宽不占满，留出的余量吸收行内空白、边框和 box-sizing 被剥掉后的外扩。
 * 列越多，缝隙越多，余量按列数递增；秀米实测样本两列只占 86%，同样是这个思路。
 */
function rowSafety(columnCount: number) {
  return 2 + 1.5 * (columnCount - 1)
}

function formatPercent(value: number) {
  return `${Number(value.toFixed(4))}%`
}

/**
 * 抹掉标签之间的空白文本节点。
 *
 * inline-block 多列的经典陷阱：元素之间的换行和缩进会渲染成一个空格宽度，
 * 两个 50% 的列因此超过 100% 而换行掉下去，表现就是"排版塌了"。
 * 模板字符串生成的 HTML 天然带着大量缩进，进剪贴板前必须整体压掉。
 */
export function compactWeChatMarkup(markup: string) {
  return markup.replace(/>\s+</g, `><`).trim()
}

/**
 * 一行多列。
 *
 * 父级同时写 `display:flex` 和 `font-size:0`，子级同时写 `display:inline-block`
 * 和 `flex`：公众号留下 flex 时走弹性盒，剥掉 flex 时退回 inline-block 百分比宽，
 * 两条路都能排成一行。列宽加列间距之和恒定小于 100%。
 */
export function renderWeChatRow(columns: WeChatRowColumn[], options: WeChatRowOptions = {}) {
  const validColumns = columns.filter(column => column.html)
  if (!validColumns.length) {
    return ``
  }
  if (validColumns.length === 1) {
    return validColumns[0].html
  }

  const gap = options.gap ?? 2
  const align = options.align ?? `left`
  const valign = options.valign ?? `top`
  const totalGap = gap * (validColumns.length - 1)
  const available = Math.max(0, 100 - rowSafety(validColumns.length) - totalGap)
  const totalWeight = validColumns.reduce((sum, column) => sum + (column.weight ?? 1), 0) || 1

  const cells = validColumns.map((column, index) => {
    const width = formatPercent(available * ((column.weight ?? 1) / totalWeight))
    const style = [
      `display:inline-block;`,
      `vertical-align:${valign};`,
      `width:${width};`,
      // 秀米导出时对每个非 100% 的宽度都补一条 !important 的 max-width，
      // 否则公众号注入的 max-width:100% 会把百分比列宽压回去。
      `max-width:${width} !important;`,
      `flex:0 0 ${width};`,
      index ? `margin-left:${formatPercent(gap)};` : ``,
      `padding:0;`,
      `border:0;`,
      `background:transparent;`,
      `font-size:15px;`,
      `line-height:1.75;`,
      `text-align:${align};`,
      `box-sizing:border-box;`,
      column.extraStyle ?? ``,
    ].filter(Boolean).join(``)

    return `<section style="${style}">${column.html}</section>`
  }).join(``)

  // 行宽刻意不占满，居中让留白匀到两侧，而不是全堆在右边。
  // font-size:0 是为了让万一漏进来的空白字符宽度归零；这里不写 line-height:0，
  // 公众号官方规范把它列为错误用法，而它对横向空白宽度本来也没有作用。
  const rowStyle = [
    `display:flex;`,
    `flex-flow:row nowrap;`,
    `justify-content:center;`,
    `align-items:flex-start;`,
    `margin:0;`,
    `padding:0;`,
    `border:0;`,
    `background:transparent;`,
    `font-size:0;`,
    `letter-spacing:0;`,
    `word-spacing:0;`,
    `text-align:center;`,
    `box-sizing:border-box;`,
  ].join(``)

  return `<section style="${rowStyle}">${cells}</section>`
}

/** 秀米导出时给每个组件套的标准容器，见 paperHtmlConverter 里的样式常量 */
export const WECHAT_SECTION_RESET = `display:inline-block; width:100%; max-width:100%; vertical-align:top; box-sizing:border-box;`

export interface WeChatScrollerOptions {
  /** 视窗高度上限，px。内容比它矮时不裁剪也不出滚动条 */
  viewportHeight: number
  radius?: string
  /** 视窗下方的滑动提示 */
  hint?: string
  hintColor?: string
}

/**
 * 长图视窗：固定高度的视窗里上下滑动一幅长图。
 *
 * 结构照搬秀米的滑动容器（秀米自己的横滑组件是
 * `overflow-x:auto` 的外层 + `width:200%; max-width:200% !important` 的内轨），
 * 这里换成纵轴，并遵守秀米导出器的两条规则：overflow 只写长写法，
 * `overflow:hidden` 且后代有圆角时补一条 `transform:rotate(0deg)`
 * （秀米原文：`if ("hidden" === style.overflow && !style.transform) ... setProperty("transform","rotate(0deg)")`），
 * 这是 iOS 上圆角裁不住内容的老问题。
 *
 * `overflow:hidden` 和 `overflow-y:auto` 是刻意一起写的，形成一条降级阶梯：
 * 两条都活着就是可滚动视窗；只剩 `overflow:hidden` 就退化成裁剪，
 * 虽然看不全但不会压住后面的正文；两条都被剥掉再加上 `max-height` 也被剥掉，
 * 就退回整幅长图。三种结果都不会把后文盖住，唯一会盖住后文的组合是
 * 「overflow 全被剥掉但 max-height 留下」——真实文章 DOM 里 `overflow:hidden`
 * 是能穿过过滤的，所以这一格实测没有出现过。
 */
export function renderWeChatVerticalScroller(body: string, options: WeChatScrollerOptions) {
  if (!body) {
    return ``
  }

  const height = Math.round(options.viewportHeight)
  if (!(height > 0)) {
    return body
  }

  const radius = options.radius ?? `18px`
  const viewportStyle = [
    `overflow:hidden;`,
    `overflow-y:auto;`,
    `max-height:${height}px;`,
    radius === `0` ? `` : `border-radius:${radius};`,
    radius === `0` ? `` : `transform:rotate(0deg);`,
    `box-sizing:border-box;`,
  ].filter(Boolean).join(` `)

  const hint = options.hint
    ? `<p style="margin:8px 0 0; font-size:12px; line-height:1.6; color:${options.hintColor ?? `#9ca3af`}; text-align:center;">${options.hint}</p>`
    : ``

  return `
    <section style="${WECHAT_SECTION_RESET}">
      <section style="${viewportStyle}">
        <section style="${WECHAT_SECTION_RESET}">${body}</section>
      </section>
      ${hint}
    </section>
  `
}

/** 纵向堆叠，间距走 margin-top，避免相邻 margin 合并带来的意外 */
export function renderWeChatStack(blocks: string[], gap = 10) {
  const valid = blocks.filter(Boolean)
  if (!valid.length) {
    return ``
  }
  if (valid.length === 1) {
    return valid[0]
  }

  const body = valid.map((block, index) => (
    index === 0
      ? `<section style="margin:0; padding:0; border:0; background:transparent; box-sizing:border-box;">${block}</section>`
      : `<section style="margin:${gap}px 0 0; padding:0; border:0; background:transparent; box-sizing:border-box;">${block}</section>`
  )).join(``)

  return `<section style="margin:0; padding:0; border:0; background:transparent; box-sizing:border-box;">${body}</section>`
}
