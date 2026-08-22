/** 第一层色块卡宽度，与 ThemeQuickBar.vue 里 `.theme-card` 一致 */
export const THEME_CARD_WIDTH_REM = 3.9
export const THEME_CARD_GAP_REM = 0.4
export const FEATURED_THEME_COUNT = 5

function widthForCards(count: number, rem: number, withMore: boolean) {
  const card = THEME_CARD_WIDTH_REM * rem
  const gap = THEME_CARD_GAP_REM * rem
  if (count <= 0) {
    return 0
  }
  if (withMore) {
    return count * card + count * gap + card
  }
  return count * card + Math.max(0, count - 1) * gap
}

/**
 * 主题条能露出几套。窄栏保持第一层 5 套，栏够宽再往外加；
 * 全部放得下就不再留「更多」。
 */
export function countVisibleThemeCards(
  trackWidth: number,
  rem: number,
  featuredCount = FEATURED_THEME_COUNT,
  totalCount = featuredCount,
) {
  const safeFeatured = Math.min(Math.max(featuredCount, 0), totalCount)
  if (trackWidth <= 0 || rem <= 0 || totalCount <= 0) {
    return safeFeatured
  }

  if (widthForCards(totalCount, rem, false) <= trackWidth) {
    return totalCount
  }

  let visible = Math.min(safeFeatured, totalCount)
  while (visible > 1 && widthForCards(visible, rem, true) > trackWidth) {
    visible -= 1
  }
  while (visible < totalCount - 1 && widthForCards(visible + 1, rem, true) <= trackWidth) {
    visible += 1
  }
  return visible
}
