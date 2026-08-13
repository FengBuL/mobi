import { describe, expect, it } from 'vitest'
import { resolveMarkdownSourceRange } from '@/utils/blocks/source-selection'

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
    expect(range.from).toBeGreaterThan(markdown.indexOf(`结尾`) - 20)
  })

  it(`序号越界时返回 null，不会退而求其次`, () => {
    expect(resolveMarkdownSourceRange(markdown, `heading-2`, 99)).toBeNull()
    expect(resolveMarkdownSourceRange(markdown, `quote`, 2)).toBeNull()
  })

  it(`未知类型返回 null`, () => {
    expect(resolveMarkdownSourceRange(markdown, `heading-9`, 1)).toBeNull()
    expect(resolveMarkdownSourceRange(markdown, `unknown-kind`, 1)).toBeNull()
  })
})
