import { describe, expect, it } from 'vitest'
import { formatDoc, maskHtmlSections } from '../packages/shared/src/utils/fileHelpers'

describe(`自动排版保护 HTML 板块`, () => {
  it(`同名 section 嵌套时整块提出去，不让 prettier 提前合上`, () => {
    const inner = `<section class="inner"><p>内</p></section>`
    const html = `<section class="md-block"><div>${inner}</div></section>`
    const doc = `# 标题\n\n${html}\n\n正文`
    const { masked, blocks } = maskHtmlSections(doc)

    expect(blocks).toEqual([html])
    expect(masked).toContain(`<!-- mobi-html-block:0 -->`)
    expect(masked).not.toContain(`class="md-block"`)
  })

  it(`formatDoc 之后 HTML 板块原文还在`, async () => {
    const html = `<section class="md-block"><div><section class="inner"><p>内</p></section></div></section>`
    const next = await formatDoc(`# 标题\n\n${html}\n`)
    expect(next).toContain(html)
  })
})
