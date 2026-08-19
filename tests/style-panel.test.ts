import type { IStylePreset } from '@mobi/shared/configs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildThemeSelectOptions,
  clearStylePresetSession,
  createLatestAsyncScheduler,
  createLatestTaskScheduler,
  createStylePresetSession,
  loadStylePresets,
  loadStylePresetSession,
  persistStylePresets,
  persistStylePresetSession,
  removeSavedItem,
  restoreSavedItem,
  shouldClearStylePreset,
  shouldIgnorePresetSelectValue,
  shouldRefreshAfterStyleApply,
  stepSelectValue,
  toPlainSnapshot,
  validateStylePresetName,
} from '../apps/web/src/utils/style-panel'

describe(`全局样式面板交互`, () => {
  const categories = [
    {
      category: `编辑`,
      themes: [{ label: `编辑黑白`, value: `default`, desc: ``, defaultPrimaryColor: `#000` }],
    },
    {
      category: `专业`,
      themes: [{ label: `行业洞察`, value: `insight`, desc: ``, defaultPrimaryColor: `#123` }],
    },
  ] as const

  it(`嵌套响应式对象也能拍出可克隆的纯快照`, () => {
    // Vue 的响应式对象读嵌套属性会再套一层 Proxy，
    // 而 structuredClone 克隆不了 Proxy，toRaw 又只解顶层
    const wrap = <T extends object>(target: T): T => new Proxy(target, {
      get(object, key, receiver) {
        const value = Reflect.get(object, key, receiver)
        return value && typeof value === `object` ? wrap(value as object) : value
      },
    })

    const raw = {
      activeValue: `preset-a`,
      snapshot: {
        preset: { label: `内置 · 观点专栏`, headingStyles: { h2: `underline` } },
        visualDraft: { tokens: { paragraph: { fontSize: `16px` } } },
      },
    }
    const reactiveLike = wrap(raw)

    expect(() => structuredClone(reactiveLike)).toThrow()

    const plain = toPlainSnapshot(reactiveLike)
    expect(() => structuredClone(plain)).not.toThrow()
    expect(plain).toEqual(raw)
  })

  it(`同一轮提交只保留最后一次任务`, () => {
    const runs: string[] = []
    const queued: Array<() => void> = []
    const schedule = createLatestTaskScheduler((flush) => {
      queued.push(flush)
    })

    schedule(() => runs.push(`a`))
    schedule(() => runs.push(`b`))
    schedule(() => runs.push(`c`))

    expect(runs).toEqual([])
    expect(queued).toHaveLength(1)
    queued[0]()
    expect(runs).toEqual([`c`])
  })

  it(`进行中的任务未结束时只保留最后一次，不并行开跑`, async () => {
    const runs: string[] = []
    const queued: Array<() => void> = []
    let releaseFirst!: () => void
    const schedule = createLatestAsyncScheduler((flush) => {
      queued.push(flush)
    })

    schedule(() => {
      runs.push(`first`)
      return new Promise<void>((resolve) => {
        releaseFirst = resolve
      })
    })
    queued[0]()
    expect(runs).toEqual([`first`])
    expect(queued).toHaveLength(1)

    schedule(() => {
      runs.push(`mid`)
    })
    schedule(() => {
      runs.push(`last`)
    })
    expect(queued).toHaveLength(1)

    releaseFirst()
    await Promise.resolve()
    await Promise.resolve()

    expect(runs).toEqual([`first`, `last`])
  })

  it(`只有图注、引用、代码标注等渲染器字段变了才需要整篇重渲`, () => {
    const cssOnly = {
      legend: `alt`,
      isShowCodeLanguage: true,
      isShowLineNumber: false,
      isCiteStatus: false,
    }

    expect(shouldRefreshAfterStyleApply(cssOnly, { ...cssOnly })).toBe(false)
    expect(shouldRefreshAfterStyleApply(cssOnly, { ...cssOnly, isCiteStatus: true })).toBe(true)
    expect(shouldRefreshAfterStyleApply(cssOnly, { ...cssOnly, legend: `title` })).toBe(true)
    expect(shouldRefreshAfterStyleApply(cssOnly, { ...cssOnly, isShowLineNumber: true })).toBe(true)
  })

  it(`换版式退出方案后，下拉回传当前自定义不能当成取消`, () => {
    expect(shouldIgnorePresetSelectValue(`__custom__`, `__custom__`, {
      isApplying: false,
      pendingType: `layout`,
      hasPresetSession: true,
    })).toBe(true)
    expect(shouldIgnorePresetSelectValue(`__custom__`, `__custom__`, {
      isApplying: false,
      pendingType: null,
      hasPresetSession: false,
    })).toBe(true)
    expect(shouldIgnorePresetSelectValue(`__custom__`, `__custom__`, {
      isApplying: false,
      pendingType: null,
      hasPresetSession: true,
    })).toBe(false)
    expect(shouldIgnorePresetSelectValue(`tutorial`, `__custom__`, {
      isApplying: false,
      pendingType: null,
      hasPresetSession: true,
    })).toBe(false)
  })

  it(`正在应用时只挡下拉的自我回写，用户又点一个仍要排队`, () => {
    expect(shouldIgnorePresetSelectValue(`insight`, `__custom__`, {
      isApplying: true,
      pendingType: `preset`,
      hasPresetSession: true,
      currentValue: `insight`,
    })).toBe(true)
    expect(shouldIgnorePresetSelectValue(`brand`, `__custom__`, {
      isApplying: true,
      pendingType: `preset`,
      hasPresetSession: true,
      currentValue: `insight`,
    })).toBe(false)
  })

  it(`把内置与自定义版式展平成分类加名称的选项`, () => {
    expect(buildThemeSelectOptions([...categories], [{ id: `mine`, name: `夜读` }])).toEqual([
      { label: `编辑 · 编辑黑白`, value: `theme:default` },
      { label: `专业 · 行业洞察`, value: `theme:insight` },
      { label: `我的版式 · 夜读`, value: `custom:mine` },
    ])
  })

  it(`滚轮按顺序切换并在首尾停止`, () => {
    const options = buildThemeSelectOptions([...categories])

    expect(stepSelectValue(options, `theme:default`, 1)).toBe(`theme:insight`)
    expect(stepSelectValue(options, `theme:insight`, 1)).toBe(`theme:insight`)
    expect(stepSelectValue(options, `theme:insight`, -1)).toBe(`theme:default`)
    expect(stepSelectValue(options, `theme:default`, -1)).toBe(`theme:default`)
  })

  it(`校验空名和重名`, () => {
    const builtIn = [{ label: `教程拆解` }]
    const custom = [{ label: `我的专栏` }]

    expect(validateStylePresetName(`  `, builtIn, custom)).toBe(`方案名称不能为空`)
    expect(validateStylePresetName(`教程拆解`, builtIn, custom)).toBe(`已有同名内置方案`)
    expect(validateStylePresetName(`我的专栏`, builtIn, custom)).toBe(`已有同名我的方案`)
    expect(validateStylePresetName(`新方案`, builtIn, custom)).toBeNull()
  })

  it(`应用方案后的相关字段变化会退出方案`, () => {
    expect(shouldClearStylePreset(`tutorial`, `custom`, `signature-a`, `signature-b`)).toBe(true)
    expect(shouldClearStylePreset(`tutorial`, `custom`, `signature-a`, `signature-a`)).toBe(false)
    expect(shouldClearStylePreset(`custom`, `custom`, null, `signature-b`)).toBe(false)
  })

  it(`存储异常可转换成失败结果且坏数据安全回落`, () => {
    const brokenStorage = {
      getItem: () => `{broken`,
      setItem: () => {
        throw new Error(`quota`)
      },
    }

    expect(loadStylePresets(brokenStorage, `presets`)).toEqual([])
    expect(persistStylePresets(brokenStorage, `presets`, [])).toBe(false)
  })

  it(`保存成功后可以从同一存储键恢复`, () => {
    let value: string | null = null
    const memoryStorage = {
      getItem: () => value,
      setItem: (_key: string, next: string) => {
        value = next
      },
    }
    const preset = { label: `我的方案` } as unknown as IStylePreset

    expect(persistStylePresets(memoryStorage, `presets`, [preset])).toBe(true)
    expect(loadStylePresets(memoryStorage, `presets`)).toEqual([preset])
  })

  it(`删除保存项后可按原位置恢复`, () => {
    const first = { value: `first`, label: `第一项` }
    const second = { value: `second`, label: `第二项` }
    const third = { value: `third`, label: `第三项` }

    const removed = removeSavedItem([first, second, third], item => item.value === `second`)

    expect(removed).toEqual({
      items: [first, third],
      removal: { item: second, index: 1 },
    })
    expect(restoreSavedItem(removed!.items, removed!.removal)).toEqual([first, second, third])
  })

  it(`多个方案之间切换时保留首次应用前快照`, () => {
    const original = { fontSize: `13px` }
    const first = createStylePresetSession(null, `tutorial`, original)
    const switched = createStylePresetSession(first, `column`, { fontSize: `16px` })

    expect(switched).toEqual({ activeValue: `column`, snapshot: original })
  })

  it(`方案激活会话可持久化、刷新读取并清除`, () => {
    const values = new Map<string, string>()
    const memoryStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    const session = { activeValue: `tutorial`, snapshot: { fontSize: `13px` } }

    expect(persistStylePresetSession(memoryStorage, `session`, session)).toBe(true)
    expect(loadStylePresetSession(memoryStorage, `session`)).toEqual(session)
    expect(clearStylePresetSession(memoryStorage, `session`)).toBe(true)
    expect(loadStylePresetSession(memoryStorage, `session`)).toBeNull()
  })

  it(`简洁样式面板只留字体字号主题色`, () => {
    const styles = readFileSync(resolve(process.cwd(), `apps/web/src/components/editor/RightSlider.vue`), `utf8`)

    expect(styles).toContain(`v-if="isSimpleWorkspace"`)
    expect(styles).toContain(`<StyleQuickControls v-if="isSimpleWorkspace" variant="compact"`)
    expect(styles).toContain(`<template v-else>`)
    expect(styles).toContain(`ThemeDraftControls`)
    expect(styles).toContain(`ThemeDesignerGroupCard`)
    expect(styles).toContain(`data-theme-select-trigger`)
  })

  it(`连点方案和版式时只应用最后一次、版式不整篇重渲、退出方案回传不当取消`, () => {
    const styles = readFileSync(resolve(process.cwd(), `apps/web/src/components/editor/RightSlider.vue`), `utf8`)
    const layoutFn = styles.match(/async function applyLayoutBaseline[\s\S]*?\nasync function commitLayoutSelect/)?.[0]

    expect(styles).toContain(`:modal="false"`)
    expect(styles).toContain(`createLatestAsyncScheduler`)
    expect(styles).toContain(`shouldIgnorePresetSelectValue`)
    expect(styles).toContain(`scheduleStyleApply`)
    expect(styles).not.toContain(`suppressSelectFeedback`)
    expect(styles).not.toMatch(/watch\(blockSelection,\s*\(selection\)\s*=>\s*\{[\s\S]*activeInspectorPanel\.value = `component`/)
    expect(layoutFn).toContain(`finishStyleApply(false)`)
    expect(layoutFn).not.toContain(`editorRefresh`)
  })

  it(`第一层五套映射现有主题且 23 套与别名仍在`, () => {
    const theme = readFileSync(resolve(process.cwd(), `packages/shared/src/configs/theme.ts`), `utf8`)
    const themeCss = readFileSync(resolve(process.cwd(), `packages/shared/src/configs/theme-css/index.ts`), `utf8`)
    const themeMapKeys = [...themeCss.matchAll(/^\s+'([a-z]+)'\s*:/gm)].map(match => match[1])

    expect(theme).toContain(`featuredThemeOptions`)
    expect(theme).toContain(`label: \`专栏\`, value: \`default\``)
    expect(theme).toContain(`label: \`科技\`, value: \`blueprint\``)
    expect(theme).toContain(`label: \`教程\`, value: \`sequence\``)
    expect(theme).toContain(`label: \`克制\`, value: \`minimalist\``)
    expect(theme).toContain(`label: \`中式\`, value: \`ink\``)
    expect(theme).toContain(`export const legacyThemeAliasMap`)
    expect(themeMapKeys).toHaveLength(23)
    expect(themeMapKeys).toEqual(expect.arrayContaining([`default`, `insight`, `cyber`, `vermilion`]))
  })
})
