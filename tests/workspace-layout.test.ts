import { describe, expect, it } from 'vitest'
import { buildMoreThemeSamples } from '@/utils/theme-sample'
import {
  FOLDER_RAIL_PX,
  POST_RAIL_PX,
  railPercentSizes,
  STYLE_RAIL_PX,
} from '@/utils/workspace-layout'

function pxOf(percent: number, container: number) {
  return (percent / 100) * container
}

describe(`侧栏按像素定宽`, () => {
  it(`1280 和 2560 上样式栏落在同一个像素区间，不随屏幕等比放大`, () => {
    const narrow = railPercentSizes(STYLE_RAIL_PX, 1280)
    const wide = railPercentSizes(STYLE_RAIL_PX, 2560)

    expect(pxOf(narrow.default, 1280)).toBeCloseTo(STYLE_RAIL_PX.target, 0)
    expect(pxOf(wide.default, 2560)).toBeCloseTo(STYLE_RAIL_PX.target, 0)
    expect(pxOf(narrow.min, 1280)).toBeCloseTo(STYLE_RAIL_PX.min, 0)
    expect(pxOf(wide.max, 2560)).toBeCloseTo(STYLE_RAIL_PX.max, 0)
    expect(wide.default).toBeLessThan(narrow.default)
  })

  it(`三个值保持 min <= default <= max，且侧栏不超过容器一半`, () => {
    for (const spec of [STYLE_RAIL_PX, POST_RAIL_PX, FOLDER_RAIL_PX]) {
      for (const width of [600, 900, 1024, 1280, 1366, 1440, 1920, 2560, 3840]) {
        const sizes = railPercentSizes(spec, width)
        expect(sizes.min).toBeLessThanOrEqual(sizes.default)
        expect(sizes.default).toBeLessThanOrEqual(sizes.max)
        expect(sizes.max).toBeLessThanOrEqual(50)
        expect(sizes.min).toBeGreaterThan(0)
      }
    }
  })

  it(`还没量到宽度时退回旧的百分比默认值`, () => {
    expect(railPercentSizes(STYLE_RAIL_PX, 0)).toEqual({ default: 24, min: 20, max: 50 })
    expect(railPercentSizes(STYLE_RAIL_PX, Number.NaN)).toEqual({ default: 24, min: 20, max: 50 })
  })
})

describe(`主题条被挤出去的主打主题`, () => {
  it(`默认「更多」里不含主打主题`, () => {
    const ids = buildMoreThemeSamples([], []).flatMap(c => c.themes.map(t => t.id))
    expect(ids).not.toContain(`minimalist`)
    expect(ids).not.toContain(`ink`)
  })

  it(`栏窄到第一层放不下时，被挤走的主打主题在「更多」里补回来`, () => {
    const ids = buildMoreThemeSamples([], [], [`minimalist`, `ink`]).flatMap(c => c.themes.map(t => t.id))
    expect(ids).toContain(`minimalist`)
    expect(ids).toContain(`ink`)
    expect(ids).not.toContain(`default`)
  })
})
