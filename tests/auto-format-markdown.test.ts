import { history, redo, undo } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { initRenderer, renderMarkdown } from '@mobi/core'
import { describe, expect, it } from 'vitest'
import {
  autoFormatMarkdown,
  createAutoFormatTransaction,
  mapAutoFormatOffset,
} from '@/utils/auto-format-markdown'

describe(`自动排版`, () => {
  it(`只有普通文本行时仍会整理为独立段落并保留长中文与 URL`, () => {
    const longChinese = `这是一段没有 Markdown 标记的长中文内容，用来验证自动排版确实会产生可观察的段落结构。`
    const longUrl = `https://example.com/a-very-long-path/that-must-remain-intact?source=mobi&mode=wrap`
    const result = autoFormatMarkdown(`# 已有标题\n${longChinese}\n${longUrl}`)

    expect(result.changed).toBe(true)
    expect(result.content).toBe(`# 已有标题\n\n${longChinese}\n\n${longUrl}`)
    expect(result.stats.paragraphs).toBe(2)

    const renderer = initRenderer()
    renderer.reset({})
    const preview = renderMarkdown(result.content, renderer).html
    expect(preview.match(/<p\b/gu)).toHaveLength(2)
    expect(preview).toContain(longChinese)
    expect(preview).toContain(longUrl.replace(/&/gu, `&amp;`))
  })

  it(`整理中文普通文章的标题、段落和列表`, () => {
    const input = `写给刚开始独立工作的你

很多人刚开始独立工作时，会把忙碌误认为成长。
真正重要的是建立可以持续的节奏。

一、先建立自己的节奏
每天只确定三件最重要的事。

• 记录当天重点
  ● 写下仍未解决的问题
• 每周回顾一次

二、让工具服务目标
工具应该减少重复劳动。`

    const result = autoFormatMarkdown(input)

    expect(result.content).toBe(`# 写给刚开始独立工作的你

很多人刚开始独立工作时，会把忙碌误认为成长。

真正重要的是建立可以持续的节奏。

## 一、先建立自己的节奏

每天只确定三件最重要的事。

- 记录当天重点
  - 写下仍未解决的问题
- 每周回顾一次

## 二、让工具服务目标

工具应该减少重复劳动。`)
    expect(result.stats).toEqual({ headings: 3, listItems: 3, paragraphs: 4 })
    expect(result.changed).toBe(true)
  })

  it(`连续纯文本编号转换为列表，独立编号转换为分节标题`, () => {
    expect(autoFormatMarkdown(`本周计划

1、完成初稿
2、邀请评审`).content).toBe(`# 本周计划

1. 完成初稿
2. 邀请评审`)

    expect(autoFormatMarkdown(`项目复盘指南

1、先确认目标

这里说明目标范围。

1.1 数据来源

这里说明数据口径。`).content).toBe(`# 项目复盘指南

## 1、先确认目标

这里说明目标范围。

### 1.1 数据来源

这里说明数据口径。`)
  })

  it(`保护已有 Markdown、frontmatter、表格、代码围栏和 HTML`, () => {
    const input = `---
title: 原样保留
---

# 已有标题

访问 [墨笔](https://example.com/path?q=1)，查看 \`一、行内代码\`。

![说明](https://example.com/image.png)

| 项目 | 状态 |
| --- | --- |
| 文档 | 完成 |

\`\`\`text
一、代码里的标题
• 代码里的项目
\`\`\`

<section>
一、HTML 里的文字
</section>`

    expect(autoFormatMarkdown(input)).toMatchObject({
      content: input,
      changed: false,
      stats: { headings: 0, listItems: 0 },
    })
  })

  it(`混合内容只转换明确的普通文本片段`, () => {
    const input = `# 已有标题

开场段落。

第二部分 交付阶段

这里有 \`一、行内代码\` 和 [链接](https://example.com)。

＞ 保持克制地引用原话。`

    expect(autoFormatMarkdown(input).content).toBe(`# 已有标题

开场段落。

## 第二部分 交付阶段

这里有 \`一、行内代码\` 和 [链接](https://example.com)。

> 保持克制地引用原话。`)
  })

  it(`不把普通顿号短语误判为分节标题`, () => {
    const input = `# 已有标题

另外、这只是普通正文。`

    expect(autoFormatMarkdown(input)).toMatchObject({ content: input, changed: false })
  })

  it(`连续执行保持幂等`, () => {
    const first = autoFormatMarkdown(`文章标题

第一部分 开始

• 第一项
• 第二项`)
    const second = autoFormatMarkdown(first.content)

    expect(second.content).toBe(first.content)
    expect(second.changed).toBe(false)
  })

  it(`空文档和无需整理的文档保持不变`, () => {
    expect(autoFormatMarkdown(`  \n\n`)).toMatchObject({ content: `  \n\n`, changed: false })
    expect(autoFormatMarkdown(`# 标题\n\n正文。`)).toMatchObject({
      content: `# 标题\n\n正文。`,
      changed: false,
    })
  })

  it(`映射光标到同一语义文本`, () => {
    const input = `文章标题\n\n正文内容。`
    const result = autoFormatMarkdown(input)
    const originalOffset = input.indexOf(`内容`) + 1
    const mapped = mapAutoFormatOffset(result, originalOffset)

    expect(result.content.slice(mapped - 1, mapped + 1)).toBe(`内容`)
  })

  it(`重复段落中的光标保持在原出现序号`, () => {
    const input = `文章标题

重复内容。
重复内容。`
    const result = autoFormatMarkdown(input)
    const originalOffset = input.lastIndexOf(`内容`) + 1
    const mapped = mapAutoFormatOffset(result, originalOffset)

    expect(mapped).toBe(result.content.lastIndexOf(`内容`) + 1)
    expect(result.content.slice(mapped - 1, mapped + 1)).toBe(`内容`)
  })

  it(`整篇转换形成单个可撤销和重做事务`, () => {
    const input = `文章标题\n\n• 第一项\n• 第二项`
    const result = autoFormatMarkdown(input)
    const view = new EditorView({
      state: EditorState.create({ doc: input, extensions: [history()] }),
      parent: document.body,
    })

    view.dispatch(createAutoFormatTransaction(input, result, { anchor: input.length, head: input.length }))
    expect(view.state.doc.toString()).toBe(result.content)
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe(input)
    expect(redo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe(result.content)
    view.destroy()
  })
})
