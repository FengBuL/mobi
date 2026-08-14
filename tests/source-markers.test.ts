import { initRenderer, renderMarkdown } from '@mobi/core'
import { describe, expect, it } from 'vitest'

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
})
