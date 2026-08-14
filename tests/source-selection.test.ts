import { describe, expect, it } from 'vitest'
import {
  resolveMarkdownSourceAtPosition,
  resolveMarkdownSourceRange,
} from '@/utils/blocks/source-selection'

const markdown = [
  `---`,
  `title: 定位测试`,
  `---`,
  ``,
  `## 重复标题`,
  ``,
  `> 第一行`,
  `> 第二行`,
  ``,
  `## 重复标题`,
  ``,
  `- 一级 A`,
  `  - 二级 B`,
  `- 一级 C`,
  ``,
  `---`,
  ``,
  `第一段正文，包含 **强调文字**。`,
  `这一行仍属于第一段。`,
  ``,
  `结尾`,
].join(`\n`)

function slice(kind: string, ordinal: number) {
  const range = resolveMarkdownSourceRange(markdown, kind, ordinal)
  return range ? markdown.slice(range.from, range.to).trimEnd() : null
}

describe(`markdown 源码定位`, () => {
  it(`同名标题按出现顺序区分`, () => {
    expect(slice(`heading-2`, 1)).toBe(`## 重复标题`)
    expect(slice(`heading-2`, 2)).toBe(`## 重复标题`)

    const first = resolveMarkdownSourceRange(markdown, `heading-2`, 1)!
    const second = resolveMarkdownSourceRange(markdown, `heading-2`, 2)!
    expect(second.from).toBeGreaterThan(first.from)
  })

  it(`引用块取到完整的多行`, () => {
    expect(slice(`quote`, 1)).toBe(`> 第一行\n> 第二行`)
  })

  it(`列表连同缩进的子项一起取到`, () => {
    expect(slice(`list-ul`, 1)).toBe(`- 一级 A\n  - 二级 B\n- 一级 C`)
  })

  it(`分隔线不会命中 front matter 的三横线`, () => {
    expect(slice(`divider`, 1)).toBe(`---`)
    const range = resolveMarkdownSourceRange(markdown, `divider`, 1)!
    expect(range.from).toBeGreaterThan(markdown.indexOf(`## 重复标题`))
  })

  it(`序号越界时返回 null，不会退而求其次`, () => {
    expect(resolveMarkdownSourceRange(markdown, `heading-2`, 99)).toBeNull()
    expect(resolveMarkdownSourceRange(markdown, `quote`, 2)).toBeNull()
  })

  it(`未知类型返回 null`, () => {
    expect(resolveMarkdownSourceRange(markdown, `heading-9`, 1)).toBeNull()
    expect(resolveMarkdownSourceRange(markdown, `unknown-kind`, 1)).toBeNull()
  })

  it(`普通段落也能按序号稳定定位`, () => {
    expect(slice(`paragraph`, 1)).toBe(`第一段正文，包含 **强调文字**。\n这一行仍属于第一段。`)
    expect(slice(`paragraph`, 2)).toBe(`结尾`)
  })

  it(`按编辑器光标位置返回对应段落及预览标记`, () => {
    const position = markdown.indexOf(`强调文字`)

    expect(resolveMarkdownSourceAtPosition(markdown, position)).toMatchObject({
      kind: `paragraph`,
      ordinal: 1,
      raw: `第一段正文，包含 **强调文字**。\n这一行仍属于第一段。`,
    })
  })
})
