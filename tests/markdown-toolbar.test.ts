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

  it.each([
    [`bold`, `**重点**`],
    [`italic`, `*重点*`],
    [`strike`, `~~重点~~`],
    [`code`, `\`重点\``],
  ] as const)(`再次点击 %s 会取消已有的行内格式`, (command, formatted) => {
    const first = applyMarkdownCommand(`重点`, { from: 0, to: 2 }, command)
    expect(first.insert).toBe(formatted)

    const second = applyMarkdownCommand(first.insert, {
      from: Math.min(first.selection.anchor, first.selection.head),
      to: Math.max(first.selection.anchor, first.selection.head),
    }, command)
    expect(second).toEqual({
      from: 0,
      to: formatted.length,
      insert: `重点`,
      selection: { anchor: 0, head: 2 },
    })
  })

  it.each([
    [`heading-2`, `## 标题`],
    [`quote`, `> 标题`],
    [`unordered-list`, `- 标题`],
    [`ordered-list`, `1. 标题`],
  ] as const)(`再次点击 %s 会取消已有的整行格式`, (command, formatted) => {
    const first = applyMarkdownCommand(`标题`, { from: 0, to: 2 }, command)
    expect(first.insert).toBe(formatted)

    const second = applyMarkdownCommand(first.insert, {
      from: Math.min(first.selection.anchor, first.selection.head),
      to: Math.max(first.selection.anchor, first.selection.head),
    }, command)
    expect(second).toMatchObject({
      from: 0,
      to: formatted.length,
      insert: `标题`,
    })
  })

  it(`再次点击链接会保留文字并移除链接语法`, () => {
    const first = applyMarkdownCommand(`官网`, { from: 0, to: 2 }, `link`)
    const second = applyMarkdownCommand(first.insert, {
      from: Math.min(first.selection.anchor, first.selection.head),
      to: Math.max(first.selection.anchor, first.selection.head),
    }, `link`)

    expect(second).toEqual({
      from: 0,
      to: `[官网](https://)`.length,
      insert: `官网`,
      selection: { anchor: 0, head: 2 },
    })
  })
})
