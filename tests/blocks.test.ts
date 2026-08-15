import { describe, expect, it } from 'vitest'
import {
  blockCategories,
  buildBlockMarkup,
  convertBlocksForWeChat,
  getBlockPreset,
  parseBlockEntries,
  parseBlockMarkup,
} from '@/utils/blocks/registry'
import { materializeWeChatDecorations } from '@/utils/wechat-compat'

const allPresets = blockCategories.flatMap(category => (
  category.presets.map(preset => ({ category, preset }))
))

function buildExport(presetId: string) {
  const preset = getBlockPreset(presetId)!
  const category = blockCategories.find(item => item.id === preset.category)!
  const state = category.createDefaultState(preset)
  const holder = document.createElement(`div`)
  holder.innerHTML = category.build(preset, state)
  convertBlocksForWeChat(holder)
  return holder.innerHTML
}

/**
 * 本地保守清洗夹具：模拟公众号粘贴时会丢弃的空元素和不稳定布局属性。
 * 它不声称完整复刻微信，只编码用户截图和项目参考文档已能验证的失效边界。
 */
function sanitizeLikeWeChat(html: string) {
  const holder = document.createElement(`div`)
  holder.innerHTML = html

  holder.querySelectorAll<HTMLElement>(`[style]`).forEach((element) => {
    element.style.removeProperty(`position`)
    element.style.removeProperty(`top`)
    element.style.removeProperty(`right`)
    element.style.removeProperty(`bottom`)
    element.style.removeProperty(`left`)
    element.style.removeProperty(`transform`)
    element.style.removeProperty(`gap`)
    if (element.style.display === `flex` || element.style.display === `grid`) {
      element.style.removeProperty(`display`)
    }
    element.style.removeProperty(`flex`)
  })

  Array.from(holder.querySelectorAll<HTMLElement>(`span, section`)).reverse().forEach((element) => {
    if (!element.childNodes.length && element.textContent === ``) {
      element.remove()
    }
  })

  return holder
}

describe(`板块预设`, () => {
  it(`预设 id 全局唯一`, () => {
    const ids = allPresets.map(item => item.preset.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it(`每个类别都声明了预设`, () => {
    blockCategories.forEach((category) => {
      expect(category.presets.length, category.id).toBeGreaterThan(0)
    })
  })
})

describe(`build / parse 往返`, () => {
  it(`可选字段节点被删除后解析为空值`, () => {
    const preset = getBlockPreset(`heading-geometry-dots`)!
    const category = blockCategories.find(item => item.id === `heading`)!
    const state = category.createDefaultState(preset)
    state.subtitle = ``

    const parsed = category.parse(category.build(preset, state))

    expect(parsed?.state.subtitle).toBe(``)
  })

  it(`统一字号比例会写入板块并能够回填`, () => {
    const preset = getBlockPreset(`heading-signal-banner`)!
    const state = { ...blockCategories.find(item => item.id === `heading`)!.createDefaultState(preset), fontScale: 1.2 }
    const markup = buildBlockMarkup(preset, state)
    const parsed = parseBlockMarkup(markup)

    expect(markup).toContain(`data-block-font-scale="1.2"`)
    expect(markup).toContain(`font-size:26.4px`)
    expect(parsed?.state.fontScale).toBe(1.2)
  })

  it.each(allPresets)(`$preset.id 能还原全部字段`, ({ category, preset }) => {
    const state = category.createDefaultState(preset)
    const parsed = category.parse(category.build(preset, state))

    expect(parsed).not.toBeNull()
    expect(parsed!.presetId).toBe(preset.id)
    expect(parsed!.category).toBe(category.id)
    preset.fields.forEach((field) => {
      expect(String(parsed!.state[field.key] ?? ``), field.key).toBe(String(state[field.key] ?? ``))
    })
  })

  it(`字段留空时往返仍然成立`, () => {
    allPresets.forEach(({ category, preset }) => {
      const state = category.createDefaultState(preset)
      preset.fields.forEach((field) => {
        if (typeof state[field.key] === `string`) {
          state[field.key] = ``
        }
      })
      const parsed = category.parse(category.build(preset, state))
      expect(parsed, preset.id).not.toBeNull()
    })
  })

  it(`带引号和尖括号的用户文本会被转义且能还原`, () => {
    const preset = getBlockPreset(`heading-signal-banner`)!
    const category = blockCategories.find(item => item.id === `heading`)!
    const state = category.createDefaultState(preset)
    state.title = `<script>"危险" & 'text'`

    const markup = category.build(preset, state)
    expect(markup).not.toContain(`<script>`)

    const parsed = category.parse(markup)
    expect(parsed!.state.title).toBe(state.title)
  })

  it(`只解析本类别的根节点，类别不匹配返回 null`, () => {
    const heading = getBlockPreset(`heading-signal-banner`)!
    const headingCategory = blockCategories.find(item => item.id === `heading`)!
    const markup = headingCategory.build(heading, headingCategory.createDefaultState(heading))

    const quoteCategory = blockCategories.find(item => item.id === `quote`)!
    expect(quoteCategory.parse(markup)).toBeNull()
  })
})

describe(`正文扫描`, () => {
  it(`根节点 class 前存在字号元数据时仍能定位板块`, () => {
    const preset = getBlockPreset(`quote-editorial-rail`)!
    const category = blockCategories.find(item => item.id === `quote`)!
    const markup = buildBlockMarkup(preset, {
      ...category.createDefaultState(preset),
      fontScale: 1.2,
    })

    const entries = parseBlockEntries(`开头\n\n${markup}\n\n结尾`)

    expect(entries).toHaveLength(1)
    expect(entries[0].presetId).toBe(preset.id)
    expect(entries[0].state.fontScale).toBe(1.2)
  })

  it(`能在混排正文里定位板块的起止位置`, () => {
    const preset = getBlockPreset(`heading-editorial-rail`)!
    const category = blockCategories.find(item => item.id === `heading`)!
    const markup = category.build(preset, category.createDefaultState(preset))
    const content = [`# 标题`, ``, markup, ``, `结尾正文。`].join(`\n`)

    const entries = parseBlockEntries(content)
    expect(entries).toHaveLength(1)
    expect(content.slice(entries[0].from, entries[0].to)).toBe(markup)
    expect(entries[0].presetId).toBe(preset.id)
  })

  it(`同一篇里的多个板块互不干扰`, () => {
    const category = blockCategories.find(item => item.id === `heading`)!
    const markups = [`heading-signal-banner`, `heading-number-seal`, `heading-pure-type`].map((id) => {
      const preset = getBlockPreset(id)!
      return category.build(preset, category.createDefaultState(preset))
    })
    const content = markups.join(`\n\n段落\n\n`)

    const entries = parseBlockEntries(content)
    expect(entries.map(item => item.presetId)).toEqual([
      `heading-signal-banner`,
      `heading-number-seal`,
      `heading-pure-type`,
    ])
  })

  it(`结构损坏时不会猜成别的预设`, () => {
    expect(parseBlockMarkup(`<section class="md-block" data-block-category="heading">缺少 preset</section>`)).toBeNull()
  })
})

describe(`公众号导出产物`, () => {
  it(`组件字号比例会进入公众号导出产物`, () => {
    const preset = getBlockPreset(`heading-signal-banner`)!
    const category = blockCategories.find(item => item.id === `heading`)!
    const holder = document.createElement(`div`)
    holder.innerHTML = buildBlockMarkup(preset, { ...category.createDefaultState(preset), fontScale: 0.9 })

    convertBlocksForWeChat(holder)

    expect(holder.innerHTML).toContain(`font-size:19.8px`)
    expect(holder.innerHTML).not.toContain(`data-block-font-scale`)
  })

  const forbidden: Array<[string, RegExp]> = [
    [`position`, /position\s*:/i],
    [`display:grid`, /display\s*:\s*grid/i],
    [`gap`, /(?:^|[;"])\s*gap\s*:/i],
    [`aspect-ratio`, /aspect-ratio\s*:/i],
    [`逻辑属性`, /(?:margin|padding|inset)-(?:block|inline)/i],
    [`table`, /<table/i],
    [`预览用 class`, /md-block/],
    [`回填元数据`, /data-block-(?:field|value|preset|category)/],
  ]

  it.each(allPresets)(`$preset.id 不含公众号会剥掉的写法`, ({ preset }) => {
    const html = buildExport(preset.id)
    forbidden.forEach(([name, pattern]) => {
      expect(pattern.test(html), `${preset.id} 出现 ${name}`).toBe(false)
    })
  })

  it(`div 全部改写成 section`, () => {
    allPresets.forEach(({ preset }) => {
      expect(buildExport(preset.id), preset.id).not.toContain(`<div`)
    })
  })

  it(`flex:1 的列都补上了百分比宽度兜底`, () => {
    allPresets.forEach(({ preset }) => {
      const html = buildExport(preset.id)
      expect(/flex\s*:\s*1\b/.test(html), `${preset.id} 仍有裸 flex:1`).toBe(false)
    })
  })

  it(`兜底列同时写了 width、max-width !important 和 flex 基准`, () => {
    // 序章印记是「固定宽标记 + 弹性文字列」的典型
    const html = buildExport(`heading-number-seal`)
    expect(html).toMatch(/width:[\d.]+%/)
    expect(html).toMatch(/max-width:[\d.]+% !important/)
    expect(html).toMatch(/flex:0 0 [\d.]+%/)
  })

  it(`固定宽的标记不会被改成百分比（圆点不能被拉成椭圆）`, () => {
    const html = buildExport(`list-orbit-number`)
    expect(html).toContain(`width:32px`)
    expect(html).toContain(`border-radius:999px`)
  })

  it(`用户文本在导出产物里依然是转义的`, () => {
    const preset = getBlockPreset(`heading-signal-banner`)!
    const category = blockCategories.find(item => item.id === `heading`)!
    const state = category.createDefaultState(preset)
    state.title = `<img onerror=alert(1)>`

    const holder = document.createElement(`div`)
    holder.innerHTML = category.build(preset, state)
    convertBlocksForWeChat(holder)

    expect(holder.querySelector(`img`)).toBeNull()
    expect(holder.textContent).toContain(`<img onerror=alert(1)>`)
  })

  it(`几何坐标的菱形与圆点经过保守清洗仍由真实节点承载`, () => {
    const sanitized = sanitizeLikeWeChat(buildExport(`heading-geometry-dots`))
    const decorations = Array.from(sanitized.querySelectorAll<HTMLElement>(`[data-mobi-clipboard-decoration]`))

    expect(sanitized.textContent).toContain(`这里是章节标题`)
    expect(decorations).toHaveLength(2)
    expect(decorations.map(element => element.textContent)).toEqual([`◆`, `●`])
    expect(decorations.map(element => element.style.color)).toEqual([`rgb(30, 107, 184)`, `rgb(220, 236, 255)`])
    decorations.forEach((element) => {
      expect(element.style.transform).toBe(``)
      expect(element.style.backgroundImage).toBe(``)
    })
  })

  it(`几何坐标的菱形与圆点跟随预设主题色`, () => {
    const preset = getBlockPreset(`heading-geometry-dots`)!
    const category = blockCategories.find(item => item.id === `heading`)!
    const customPreset = {
      ...preset,
      palette: { ...preset.palette, primary: `#7346c8`, secondary: `#e2d8fa` },
    }
    const holder = document.createElement(`div`)
    holder.innerHTML = category.toWeChat(customPreset, category.createDefaultState(customPreset))
    materializeWeChatDecorations(holder)
    const sanitized = sanitizeLikeWeChat(holder.innerHTML)
    const decorations = Array.from(sanitized.querySelectorAll<HTMLElement>(`[data-mobi-clipboard-decoration]`))

    expect(decorations.map(element => element.style.color)).toEqual([`rgb(115, 70, 200)`, `rgb(226, 216, 250)`])
  })

  it(`空装饰节点经过保守清洗仍保留尺寸、颜色和顺序`, () => {
    const sanitized = sanitizeLikeWeChat(buildExport(`divider-three-breaths`))
    const decorations = Array.from(sanitized.querySelectorAll<HTMLElement>(`span`))

    expect(decorations).toHaveLength(3)
    expect(decorations.map(element => element.style.width)).toEqual([`5px`, `8px`, `5px`])
    expect(decorations.every(element => Boolean(element.style.backgroundColor))).toBe(true)
    expect(decorations.every(element => element.textContent !== ``)).toBe(true)
  })

  it(`依赖 flex 的标题行在布局属性被清洗后仍保持装饰、文字和先后顺序`, () => {
    const sanitized = sanitizeLikeWeChat(buildExport(`heading-number-seal`))
    const text = sanitized.textContent || ``
    const badge = Array.from(sanitized.querySelectorAll<HTMLElement>(`span`)).find(element => element.style.width === `42px`)
    const title = Array.from(sanitized.querySelectorAll<HTMLElement>(`p`)).find(element => element.textContent === `这里是章节标题`)

    expect(badge).toBeTruthy()
    expect(title).toBeTruthy()
    expect(text.indexOf(`01`)).toBeLessThan(text.indexOf(`这里是章节标题`))
    expect(title?.parentElement?.style.width).toMatch(/%$/)
  })

  it(`所有板块类别的可见空装饰都已物化`, () => {
    allPresets.forEach(({ preset }) => {
      const holder = document.createElement(`div`)
      holder.innerHTML = buildExport(preset.id)
      const unsafe = Array.from(holder.querySelectorAll<HTMLElement>(`span, section`)).filter((element) => {
        if (element.childNodes.length || element.textContent !== `` || element.style.display === `none`) {
          return false
        }
        const style = element.getAttribute(`style`) || ``
        return /(?:background|border|box-shadow)\s*:/i.test(style)
      })
      expect(unsafe, preset.id).toHaveLength(0)
    })
  }, 15000)

  it(`内联 SVG 分隔件被剔除时仍有真实边框降级`, () => {
    const sanitized = sanitizeLikeWeChat(buildExport(`divider-tidal-wave`))
    sanitized.querySelectorAll(`svg`).forEach(svg => svg.remove())
    const fallback = Array.from(sanitized.querySelectorAll<HTMLElement>(`section`)).find(element => element.style.borderBottomWidth)

    expect(fallback?.style.borderBottomStyle).toBe(`solid`)
    expect(fallback?.style.borderBottomColor).toBeTruthy()
  })

  it(`data-URI 环形进度在背景图被清洗后仍有内联边框轮廓`, () => {
    const sanitized = sanitizeLikeWeChat(buildExport(`data-orbit-progress`))
    const ring = Array.from(sanitized.querySelectorAll<HTMLElement>(`span`)).find(element => element.style.width === `112px`)
    ring?.style.removeProperty(`background-image`)

    expect(ring?.textContent).toContain(`68%`)
    expect(ring?.style.borderWidth).toBeTruthy()
    expect(ring?.style.borderStyle).toBe(`solid`)
    expect(ring?.style.borderColor).toBeTruthy()
  })
})
