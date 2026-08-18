import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { featuredThemeIds, themeOptions } from '@mobi/shared/configs'
import { describe, expect, it } from 'vitest'
import {
  buildMoreThemeSamples,
  excerptDefaultDraftForThemeSample,
  THEME_SAMPLE_MARKDOWN,
  themeSampleScopeId,
} from '@/utils/theme-sample'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`主题成稿小样`, () => {
  it(`小样摘自默认稿：有标题，没有占位图`, () => {
    const draft = readSource(`apps/web/src/assets/example/markdown.md`)
    const excerpt = excerptDefaultDraftForThemeSample(draft)

    expect(excerpt).toContain(`写完的稿，怎样变成能贴出去的样子`)
    expect(excerpt).toContain(`先看成稿，再动手改`)
    expect(excerpt).not.toContain(`logo.svg`)
    expect(excerpt).not.toContain(`图还没进素材库`)
    expect(THEME_SAMPLE_MARKDOWN).toBe(excerpt)
  })

  it(`更多里是 18 套，不是第一层那五套，也不加新主题`, () => {
    const groups = buildMoreThemeSamples()
    const ids = groups.flatMap(group => group.themes.map(theme => theme.id))

    expect(themeOptions).toHaveLength(23)
    expect(featuredThemeIds).toHaveLength(5)
    expect(ids).toHaveLength(18)
    expect(ids).not.toEqual(expect.arrayContaining([...featuredThemeIds]))
    expect(ids).toContain(`magazine`)
    expect(groups[0].themes[0].scopeId).toBe(themeSampleScopeId(groups[0].themes[0].id))
    expect(groups[0].themes[0].css).toContain(`#${groups[0].themes[0].scopeId}`)
    expect(groups[0].themes[0].html).toContain(`写完的稿`)
    expect(groups[0].themes[0].markup).toContain(`<style>`)
    expect(groups[0].themes[0].markup).toContain(groups[0].themes[0].html)
  })

  it(`更多面板用成稿小样，第一层仍是色块卡`, () => {
    const bar = readSource(`apps/web/src/components/editor/ThemeQuickBar.vue`)

    expect(bar).toContain(`buildMoreThemeSamples`)
    expect(bar).toContain(`theme-sample`)
    expect(bar).toContain(`item.markup`)
    expect(bar).toContain(`getThemeSwatch`)
    expect(bar).toContain(`专栏`)
    expect(themeOptions.map(option => option.value)).not.toContain(`brand-new-theme`)
  })
})
