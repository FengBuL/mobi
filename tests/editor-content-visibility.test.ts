import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import {
  embeddedContentVisibility,
  findEmbeddedContentRanges,
  stripEmbeddedContent,
} from '@/utils/editor-content-visibility'

describe(`编辑区嵌入内容隐藏`, () => {
  it(`隐藏组件源码和独立图片，只留下文章文字`, () => {
    const content = [
      `# 我的文章`,
      ``,
      `第一段正文。`,
      ``,
      `<section class="md-block md-block--card" data-block-category="card">`,
      `  <div><img src="https://example.com/card.png" alt="卡片图"><p>组件文案</p></div>`,
      `</section>`,
      ``,
      `![](https://example.com/article.png)`,
      ``,
      `第二段正文。`,
    ].join(`\n`)

    expect(stripEmbeddedContent(content)).toBe([
      `# 我的文章`,
      ``,
      `第一段正文。`,
      ``,
      `第二段正文。`,
    ].join(`\n`))
  })

  it(`隐藏图片排版组件的完整多行源码`, () => {
    const content = [
      `开头`,
      `<section class="md-media-block md-media-block--hero" data-layout-preset="hero-image">`,
      `  <figure><img src="https://example.com/hero.png" alt="头图"></figure>`,
      `</section>`,
      `结尾`,
    ].join(`\n`)

    expect(stripEmbeddedContent(content)).toBe(`开头\n结尾`)
  })

  it(`行内图片只隐藏图片语法并保留两侧文字`, () => {
    const content = `前文 ![说明](https://example.com/a.png "标题") 后文`

    expect(stripEmbeddedContent(content)).toBe(`前文  后文`)
  })

  it(`隐藏独立 HTML 图片并保留普通链接和 Markdown`, () => {
    const content = [
      `## 小节`,
      `<img src="https://example.com/raw.png" alt="原始图片">`,
      `[普通链接](https://example.com)`,
    ].join(`\n`)

    expect(stripEmbeddedContent(content)).toBe(`## 小节\n[普通链接](https://example.com)`)
  })

  it(`保留行内代码、代码围栏和转义后的图片示例`, () => {
    const content = [
      `行内示例：\`![说明](https://example.com/inline.png)\``,
      ``,
      `\`\`\`markdown`,
      `![说明](https://example.com/fenced.png)`,
      `<img src="https://example.com/fenced-html.png">`,
      `\`\`\``,
      ``,
      `转义示例：\\![说明](https://example.com/escaped.png)`,
    ].join(`\n`)

    expect(stripEmbeddedContent(content)).toBe(content)
  })

  it(`返回有序且互不重叠的隐藏区间`, () => {
    const content = [
      `<section class="md-block md-block--card" data-block-category="card">`,
      `<img src="https://example.com/nested.png">`,
      `</section>`,
      `![](https://example.com/standalone.png)`,
    ].join(`\n`)
    const ranges = findEmbeddedContentRanges(content)

    expect(ranges).toHaveLength(2)
    expect(ranges[0].from).toBe(0)
    expect(ranges[0].to).toBeLessThanOrEqual(ranges[1].from)
  })

  it(`编辑器装饰只改变显示，不改写底层文章`, () => {
    const content = `正文\n\n![](https://example.com/image.png)\n\n结尾`
    const state = EditorState.create({
      doc: content,
      extensions: [embeddedContentVisibility],
    })

    expect(state.doc.toString()).toBe(content)
    expect(state.field(embeddedContentVisibility).size).toBe(1)
  })

  it(`正文编辑器启用隐藏扩展并用可见内容统计`, () => {
    const editorSource = readFileSync(
      resolve(process.cwd(), `apps/web/src/views/CodemirrorEditor.vue`),
      `utf8`,
    )

    expect(editorSource).toContain(`embeddedContentVisibility,`)
    expect(editorSource).toContain(`stripEmbeddedContent(currentPost.value?.content ?? \`\`)`)
  })
})
