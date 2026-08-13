import { describe, expect, it } from 'vitest'
import {
  blockCategories,
  convertBlocksForWeChat,
  getBlockPreset,
  parseBlockEntries,
  parseBlockMarkup,
} from '@/utils/blocks/registry'

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
})
