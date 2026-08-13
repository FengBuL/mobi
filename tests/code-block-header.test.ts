import { initRenderer, renderMarkdown } from '@mobi/core'
import { describe, expect, it } from 'vitest'

/**
 * 代码块顶部原来放的是三个 macOS 窗口圆点（一段写死的 SVG），继承自上游。
 * 现在换成语言名。这里把结果钉住：圆点不能回来，语言名要认得出，
 * 没标语言的代码块不该凭空多一行。
 */
function render(markdown: string) {
  const renderer = initRenderer({ isShowCodeLanguage: true })
  return renderMarkdown(markdown, renderer).html
}

function labelsIn(html: string) {
  return [...html.matchAll(/<span class="mac-sign"[^>]*>([^<]*)<\/span>/g)].map(m => m[1])
}

describe(`代码块顶部标注`, () => {
  it(`按 highlight.js 的正式名称标出语言`, () => {
    expect(labelsIn(render('```ts\nconst a = 1\n```'))).toEqual([`TypeScript`])
    expect(labelsIn(render('```python\nprint(1)\n```'))).toEqual([`Python`])
    expect(labelsIn(render('```bash\nls\n```'))).toEqual([`Bash`])
  })

  it(`没写语言的代码块不加标注`, () => {
    expect(labelsIn(render('```\nplain\n```'))).toEqual([])
    expect(labelsIn(render('```plaintext\nplain\n```'))).toEqual([])
  })

  it(`不再输出 macOS 三色圆点`, () => {
    const html = render('```ts\nconst a = 1\n```')
    expect(html).not.toContain(`<ellipse`)
    expect(html).not.toContain(`rgb(237,108,96)`)
    expect(html).not.toMatch(/viewBox="0 0 450 130"/)
  })

  it(`标注颜色继承代码块自身前景色，这样 25 套主题都不会读不清`, () => {
    expect(render('```ts\nconst a = 1\n```')).toMatch(
      /<span class="mac-sign" style="[^"]*color: inherit/,
    )
  })

  it(`沿用 mac-sign 类名：复制链路按这个选择器补内联样式，公众号才认`, () => {
    expect(render('```ts\nconst a = 1\n```')).toContain(`class="mac-sign"`)
  })
})
