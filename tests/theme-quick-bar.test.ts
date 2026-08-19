import { describe, expect, it } from 'vitest'
import {
  countVisibleThemeCards,
  FEATURED_THEME_COUNT,
  THEME_CARD_GAP_REM,
  THEME_CARD_WIDTH_REM,
} from '@/utils/theme-quick-bar'

const rem = 16
const card = THEME_CARD_WIDTH_REM * rem
const gap = THEME_CARD_GAP_REM * rem

describe(`主题条露出数量`, () => {
  it(`窄栏保持第一层 5 套`, () => {
    expect(countVisibleThemeCards(card * 3, rem, FEATURED_THEME_COUNT, 23)).toBe(5)
    expect(countVisibleThemeCards(0, rem, FEATURED_THEME_COUNT, 23)).toBe(5)
  })

  it(`栏够宽时露出超过 5 套，但还留「更多」`, () => {
    const eightPlusMore = 8 * card + 8 * gap + card
    expect(countVisibleThemeCards(eightPlusMore, rem, FEATURED_THEME_COUNT, 23)).toBe(8)
    expect(countVisibleThemeCards(eightPlusMore, rem, FEATURED_THEME_COUNT, 23)).toBeLessThan(23)
  })

  it(`全部放得下就一次露完`, () => {
    const all = 23 * card + 22 * gap
    expect(countVisibleThemeCards(all, rem, FEATURED_THEME_COUNT, 23)).toBe(23)
  })
})
