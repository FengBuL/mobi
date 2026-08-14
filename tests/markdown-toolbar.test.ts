import { describe, expect, it } from 'vitest'
import { applyMarkdownCommand } from '@/utils/markdown-toolbar'

describe(`markdown 工具栏`, () => {
  it(`给选中文字添加加粗语法并保留内部选区`, () => {
    expect(applyMarkdownCommand(`这是重点内容`, { from: 2, to: 6 }, `bold`)).toEqual({
      from: 2,
      to: 6,
      insert: `**重点内容**`,
      selection: { anchor: 4, head: 8 },
    })
  })

  it(`没有选中文字时插入占位文字`, () => {
    expect(applyMarkdownCommand(`正文`, { from: 2, to: 2 }, `italic`)).toEqual({
      from: 2,
      to: 2,
      insert: `*斜体文字*`,
      selection: { anchor: 3, head: 7 },
    })
  })

  it(`标题和引用作用于完整行`, () => {
    const content = `第一行\n第二行\n第三行`

    expect(applyMarkdownCommand(content, { from: 4, to: 11 }, `heading-2`)).toMatchObject({
      from: 4,
      to: 11,
      insert: `## 第二行\n## 第三行`,
    })
    expect(applyMarkdownCommand(`一段文字`, { from: 2, to: 2 }, `quote`)).toMatchObject({
      from: 0,
      to: 4,
      insert: `> 一段文字`,
    })
  })

  it(`链接保留所选文字并选中待填写网址`, () => {
    expect(applyMarkdownCommand(`访问官网`, { from: 2, to: 4 }, `link`)).toEqual({
      from: 2,
      to: 4,
      insert: `[官网](https://)`,
      selection: { anchor: 7, head: 15 },
    })
  })
})
