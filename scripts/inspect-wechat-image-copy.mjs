/**
 * 复现「复制到公众号」链路中普通 Markdown 图片的内联结果。
 * 用于验证 juice 内联后 <figure>/<img> 上残留了哪些微信不支持的声明。
 *
 * 运行：node scripts/inspect-wechat-image-copy.mjs [主题名，默认 default]
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(resolve(process.cwd(), `apps/web/package.json`))
const juice = require(`juice`)

const root = resolve(dirname(fileURLToPath(import.meta.url)), `..`)
const themeName = process.argv[2] || `default`

const baseCss = readFileSync(resolve(root, `packages/shared/src/configs/theme-css/base.css`), `utf8`)
const themeCss = readFileSync(resolve(root, `packages/shared/src/configs/theme-css/${themeName}.css`), `utf8`)

// 与 packages/core/src/theme/cssScopeWrapper.ts 保持一致的简化实现
function wrapCSSWithScope(css, scope = `#output`) {
  return css.replace(/([^{}]+)\{([^}]*)\}/g, (match, selectors, properties) => {
    const trimmedSelectors = selectors.trim()
    if (trimmedSelectors.startsWith(`@`) || trimmedSelectors.startsWith(`:root`)) {
      return match
    }
    const wrapped = selectors
      .split(`,`)
      .map((selector) => {
        const trimmed = selector.trim()
        if (!trimmed || trimmed.startsWith(scope)) {
          return trimmed
        }
        if (/^h[1-6](\s|$|::|[:[])/.test(trimmed)) {
          return `${scope} section ${trimmed}`
        }
        return `${scope} ${trimmed}`
      })
      .filter(Boolean)
      .join(`,\n`)
    return `${wrapped} {${properties}}`
  })
}

const variablesCss = `:root {
  --md-primary-color: #16a34a;
  --md-font-family: Optima-Regular, sans-serif;
  --md-font-size: 16px;
}`

const injectedCss = [variablesCss, baseCss, wrapCSSWithScope(themeCss)].join(`\n\n`)

// 与 apps/web/src/utils/index.ts getThemeStyles() 保持一致
function stripOutputScope(css) {
  return css
    .replace(/#output\s*\{/g, `body {`)
    .replace(/#output\s+/g, ``)
    .replace(/^#output\s*/gm, ``)
}

const html = `<section class="container">
  <p class="paragraph">前面的一段正文。</p>
  <figure><img src="https://example.com/a.png" alt="示意图"/><figcaption class="figcaption">示意图</figcaption></figure>
  <p class="paragraph">后面的一段正文。</p>
</section>`

const merged = juice(`<style>${stripOutputScope(injectedCss)}</style>${html}`, {
  inlinePseudoElements: true,
  preserveImportant: true,
  resolveCSSVariables: false,
})

const figureMatch = merged.match(/<figure[\s\S]*?<\/figure>/)
console.log(`主题：${themeName}`)
console.log(`\n=== 内联后的 figure ===`)
console.log(figureMatch ? figureMatch[0] : `（未匹配到 figure）`)

const styleAttrs = [...merged.matchAll(/style="([^"]*)"/g)].map(item => item[1])
const leftoverVars = styleAttrs.flatMap(value => [...value.matchAll(/var\(--[a-z0-9-]+/gi)].map(m => m[0]))
const counted = leftoverVars.reduce((acc, name) => {
  acc[name] = (acc[name] || 0) + 1
  return acc
}, {})

console.log(`\n=== style 属性里残留的 var() 引用 ===`)
console.log(Object.keys(counted).length ? counted : `（无）`)

const risky = [`margin-block`, `margin-inline`, `padding-block`, `aspect-ratio`, `display: flex`, `display: grid`, `display:flex`, `display:grid`, `gap:`, `inset:`, `object-fit`, `color-mix`]
console.log(`\n=== style 属性里残留的微信不支持属性 ===`)
risky.forEach((token) => {
  const hits = styleAttrs.filter(value => value.includes(token)).length
  if (hits) {
    console.log(`${token}: ${hits} 处`)
  }
})
