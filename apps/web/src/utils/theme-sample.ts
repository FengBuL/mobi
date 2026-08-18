import type { ThemeName } from '@mobi/shared/configs'
import { initRenderer, renderMarkdown, wrapCSSWithScope } from '@mobi/core'
import {
  baseCSSContent,
  featuredThemeIds,
  getThemeDefaultPrimaryColor,
  skeletonCSSContent,
  themeCategoryOptions,
  themeMap,
} from '@mobi/shared/configs'
import DEFAULT_CONTENT from '@/assets/example/markdown.md?raw'
import { applyWechatPreviewTextureDowngradeToHtml } from '@/utils/wechat-preview'

const featuredIdSet = new Set<ThemeName>(featuredThemeIds)

export function excerptDefaultDraftForThemeSample(source: string) {
  return source
    .split(/\n{2,}/u)
    .map(block => block.trim())
    .filter(block =>
      Boolean(block)
      && !/!\[[^\]]*\]\(/u.test(block)
      && !block.startsWith(`## 图还没进素材库`),
    )
    .slice(0, 4)
    .join(`\n\n`)
}

export const THEME_SAMPLE_MARKDOWN = excerptDefaultDraftForThemeSample(DEFAULT_CONTENT)

let sampleHtml = ``

export function getThemeSampleHtml() {
  if (!sampleHtml) {
    const renderer = initRenderer({})
    const rendered = renderMarkdown(THEME_SAMPLE_MARKDOWN, renderer).html
    sampleHtml = typeof document === `undefined`
      ? rendered
      : applyWechatPreviewTextureDowngradeToHtml(rendered)
  }
  return sampleHtml
}

export function themeSampleScopeId(name: ThemeName) {
  return `theme-sample-${name}`
}

export function buildThemeSampleCss(name: ThemeName) {
  const scope = `#${themeSampleScopeId(name)}`
  const themeCSS = themeMap[name] || themeMap.default
  const rewritten = [baseCSSContent, skeletonCSSContent, themeCSS]
    .join(`\n\n`)
    .replace(/#output/g, scope)

  return [
    `${scope} {`,
    `  --md-primary-color: ${getThemeDefaultPrimaryColor(name)};`,
    `  --md-font-family: inherit;`,
    `  --md-font-size: 14px;`,
    `}`,
    `${scope} .theme-sample__page {`,
    `  min-height: 100%;`,
    `  padding: 16px 18px 24px;`,
    `  box-sizing: border-box;`,
    `  background: var(--theme-paper, #fff);`,
    `  color: var(--theme-body, #333);`,
    `}`,
    wrapCSSWithScope(rewritten, scope),
  ].join(`\n`)
}

export function buildMoreThemeSamples(hiddenThemes: readonly string[] = []) {
  const html = getThemeSampleHtml()
  const hidden = new Set(hiddenThemes)

  return themeCategoryOptions
    .map(category => ({
      category: category.category,
      themes: category.themes
        .filter(option => !featuredIdSet.has(option.value) && !hidden.has(option.value))
        .map((option) => {
          const css = buildThemeSampleCss(option.value)
          return {
            id: option.value,
            label: option.label,
            scopeId: themeSampleScopeId(option.value),
            html,
            css,
            markup: `<style>${css}</style><section class="theme-sample__page">${html}</section>`,
          }
        }),
    }))
    .filter(category => category.themes.length > 0)
}
