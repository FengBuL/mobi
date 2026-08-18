import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { markdownNeedsMathJax } from '@mobi/core'
import { describe, expect, it } from 'vitest'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`首屏按需加载`, () => {
  it(`首页不再同步拉 MathJax`, () => {
    const html = readSource(`apps/web/index.html`)
    expect(html).not.toContain(`MathJax-script`)
    expect(html).not.toContain(`static/mathjax/tex-svg.js`)
  })

  it(`默认稿不触发公式引擎，成对美元和括号公式会触发`, () => {
    const draft = readSource(`apps/web/src/assets/example/markdown.md`)
    expect(markdownNeedsMathJax(draft)).toBe(false)
    expect(markdownNeedsMathJax(`普通段落，没有公式`)).toBe(false)
    expect(markdownNeedsMathJax(`价格 $100`)).toBe(false)
    expect(markdownNeedsMathJax(`行内 $E=mc^2$`)).toBe(true)
    expect(markdownNeedsMathJax(`$$\nE=mc^2\n$$`)).toBe(true)
    expect(markdownNeedsMathJax(`\\(a+b\\)`)).toBe(true)
    expect(markdownNeedsMathJax(`\\[a+b\\]`)).toBe(true)
  })

  it(`渲染链路在需要时才加载 MathJax，图表仍是动态 import`, () => {
    const render = readSource(`apps/web/src/stores/render.ts`)
    const mathjax = readSource(`apps/web/src/utils/mathjax.ts`)
    const infographic = readSource(`packages/core/src/extensions/infographic.ts`)
    const mermaid = readSource(`packages/core/src/extensions/mermaid.ts`)

    expect(mathjax).toContain(`static/mathjax/tex-svg.js`)
    expect(render).toContain(`ensureMathJax`)
    expect(render).toContain(`markdownNeedsMathJax`)
    expect(infographic).toMatch(/import\(\s*`@antv\/infographic`\s*\)/)
    expect(mermaid).toMatch(/import\(\s*`mermaid`\s*\)/)
  })
})
