import { describe, expect, it } from 'vitest'
import {
  buildMediaLayoutMarkup,
  createDefaultMediaLayoutState,
  getMediaLayoutPresetSlotDefaults,
  mediaLayoutPresets,
  parseMediaLayoutBlocks,
} from '@/utils/image-layouts'

function stateWithImages(slotCount: number) {
  const form = createDefaultMediaLayoutState()
  form.images.forEach((slot, index) => {
    if (index < slotCount) {
      slot.url = `https://example.com/pic-${index + 1}.png`
      slot.alt = `示例图 ${index + 1}`
      slot.caption = `图注 ${index + 1}`
    }
  })
  return form
}

describe(`图文版式预设`, () => {
  it(`预设 id 全局唯一`, () => {
    const ids = mediaLayoutPresets.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it(`槽位数量在 1 到 4 之间，且默认值条数与之匹配`, () => {
    mediaLayoutPresets.forEach((preset) => {
      expect(preset.slotCount, preset.id).toBeGreaterThanOrEqual(1)
      expect(preset.slotCount, preset.id).toBeLessThanOrEqual(4)

      const defaults = getMediaLayoutPresetSlotDefaults(preset.id)
      expect(defaults.length, `${preset.id} 的槽位默认值`).toBeGreaterThanOrEqual(preset.slotCount)
    })
  })
})

describe(`build / parse 往返`, () => {
  it.each(mediaLayoutPresets)(`$id 能还原版式与图片`, (preset) => {
    const form = stateWithImages(preset.slotCount)
    const markup = buildMediaLayoutMarkup(preset, form)

    const blocks = parseMediaLayoutBlocks(markup)
    expect(blocks, preset.id).toHaveLength(1)

    const block = blocks[0]
    expect(block.presetId, preset.id).toBe(preset.id)
    for (let index = 0; index < preset.slotCount; index += 1) {
      expect(block.form.images[index].url, `${preset.id} 第 ${index + 1} 张`).toBe(form.images[index].url)
    }
  })

  it(`版块宽度会被带回来`, () => {
    const preset = mediaLayoutPresets.find(item => item.id === `hero-image`)!
    const form = stateWithImages(preset.slotCount)
    form.blockWidth = 76

    const block = parseMediaLayoutBlocks(buildMediaLayoutMarkup(preset, form))[0]
    expect(block.form.blockWidth).toBe(76)
  })

  it(`正文里多个图文模块能各自定位`, () => {
    const first = mediaLayoutPresets.find(item => item.id === `hero-image`)!
    const second = mediaLayoutPresets.find(item => item.id === `duo-framed-gallery`)!
    const markups = [
      buildMediaLayoutMarkup(first, stateWithImages(first.slotCount)),
      buildMediaLayoutMarkup(second, stateWithImages(second.slotCount)),
    ]
    const content = markups.join(`\n\n中间一段正文。\n\n`)

    const blocks = parseMediaLayoutBlocks(content)
    expect(blocks.map(item => item.presetId)).toEqual([first.id, second.id])
    blocks.forEach((block, index) => {
      expect(content.slice(block.from, block.to)).toBe(markups[index])
    })
  })
})

describe(`新增的边框版式`, () => {
  const framed = [
    `double-rule-single`,
    `passepartout-single`,
    `dashed-note-single`,
    `accent-band-single`,
    `duo-framed-gallery`,
    `triptych-framed-gallery`,
  ]

  it.each(framed)(`%s 已经登记为图片类别的版式`, (id) => {
    const preset = mediaLayoutPresets.find(item => item.id === id)
    expect(preset, id).toBeDefined()
    expect(preset!.category).toBe(`image`)
  })

  it(`产物里带上了边框或描边`, () => {
    framed.forEach((id) => {
      const preset = mediaLayoutPresets.find(item => item.id === id)!
      const markup = buildMediaLayoutMarkup(preset, stateWithImages(preset.slotCount))
      expect(/border(?:-top|-left)?:[^;]*(?:solid|dashed)/.test(markup), id).toBe(true)
    })
  })
})
