import { initRenderer, renderMarkdown } from '@mobi/core'
import { describe, expect, it } from 'vitest'
import { resolveMarkdownSourceRange } from '@/utils/blocks/source-selection'

function render(markdown: string) {
  const renderer = initRenderer()
  renderer.reset({})
  return renderMarkdown(markdown, renderer).html
}

describe(`预览源码标记`, () => {
  it(`为顶层普通段落写入稳定的来源序号`, () => {
    const html = render(`第一段。\n\n第二段。`)

    expect(html).toContain(`data-src-kind="paragraph" data-src-ordinal="1"`)
    expect(html).toContain(`data-src-kind="paragraph" data-src-ordinal="2"`)
  })

  it(`引用内部段落不会占用正文段落序号`, () => {
    const html = render(`> 引用段落\n\n正文段落`)

    expect(html.match(/data-src-kind="paragraph"/g)).toHaveLength(1)
    expect(html).toContain(`data-src-kind="paragraph" data-src-ordinal="1"`)
  })

  it(`为独立 Markdown 图片标记可删除的源码范围`, () => {
    const markdown = `前文\n\n![封面](https://example.com/cover.png)\n\n后文`
    const html = render(markdown)

    expect(html).toContain(`<figure data-src-kind="image" data-src-ordinal="1">`)
    expect(resolveMarkdownSourceRange(markdown, `image`, 1)).toMatchObject({
      raw: `![封面](https://example.com/cover.png)`,
    })
  })
})
