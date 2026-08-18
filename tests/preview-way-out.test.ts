import { describe, expect, it } from 'vitest'
import { blockStateToPlainMarkdown } from '@/utils/blocks/plain-markdown'
import {
  buildMediaLayoutMarkup,
  createMediaLayoutStateFromImages,
  expandScrollWindowToFullImage,
  mediaLayoutPresets,
  replaceScrollWindowWithSlicedImages,
} from '@/utils/image-layouts'

describe(`板块还原为普通文本`, () => {
  it(`标题、引用、列表、分隔线退回 Markdown`, () => {
    expect(blockStateToPlainMarkdown(`heading`, {
      title: `回归矩阵`,
      subtitle: `验证还原`,
      number: `01`,
    })).toBe(`## 01 回归矩阵\n\n验证还原`)

    expect(blockStateToPlainMarkdown(`quote`, {
      quote: `贴进去和看见的一样`,
      author: `墨笔`,
      source: `TASK-09`,
    })).toBe(`> 贴进去和看见的一样\n>\n> — 墨笔，TASK-09`)

    expect(blockStateToPlainMarkdown(`list`, {
      item1: `先看成稿`,
      item1Desc: ``,
      item2: `再复制`,
      item2Desc: ``,
    })).toBe(`1. 先看成稿\n2. 再复制`)

    expect(blockStateToPlainMarkdown(`divider`, {})).toBe(`---`)
  })
})

describe(`长图视窗改成整幅长图`, () => {
  it(`把 scroll-window 换成 hero-image 原图比例`, () => {
    const scroll = mediaLayoutPresets.find(item => item.id === `scroll-window`)!
    const html = buildMediaLayoutMarkup(scroll, createMediaLayoutStateFromImages(scroll, [
      { url: `https://example.com/long.png`, alt: `长图` },
    ]))
    const content = `前文\n${html}\n后文`
    const next = expandScrollWindowToFullImage(content, 0)

    expect(next).toBeTruthy()
    expect(next).toContain(`data-layout-preset="hero-image"`)
    expect(next).toContain(`md-media-figure--auto`)
    expect(next).toContain(`https://example.com/long.png`)
    expect(next).not.toContain(`md-media-scroll-window`)
  })

  it(`把 scroll-window 换成若干张普通 Markdown 图`, () => {
    const scroll = mediaLayoutPresets.find(item => item.id === `scroll-window`)!
    const html = buildMediaLayoutMarkup(scroll, createMediaLayoutStateFromImages(scroll, [
      { url: `https://example.com/long.png`, alt: `长图` },
    ]))
    const content = `前文\n${html}\n后文`
    const next = replaceScrollWindowWithSlicedImages(content, 0, [
      `https://example.com/long-1.png`,
      `https://example.com/long-2.png`,
    ])

    expect(next).toBeTruthy()
    expect(next).toContain(`![长图 1](https://example.com/long-1.png)`)
    expect(next).toContain(`![长图 2](https://example.com/long-2.png)`)
    expect(next).not.toContain(`md-media-scroll-window`)
    expect(next).toContain(`前文`)
    expect(next).toContain(`后文`)
  })
})
