/**
 * 侧栏按像素定宽，再换算成分栏组件要的百分比。
 * 纯百分比在 1280 上把样式栏压到 250px 挤成一列，在 2560 上又摊到 600px 空一半。
 */

export interface RailPixelSpec {
  /** 想要的宽度 */
  target: number
  /** 再窄就摆不下控件 */
  min: number
  /** 再宽只是留白 */
  max: number
}

export interface RailPercentSizes {
  default: number
  min: number
  max: number
}

export const STYLE_RAIL_PX: RailPixelSpec = { target: 340, min: 280, max: 460 }
export const POST_RAIL_PX: RailPixelSpec = { target: 250, min: 200, max: 360 }
export const FOLDER_RAIL_PX: RailPixelSpec = { target: 270, min: 210, max: 400 }

function toPercent(px: number, containerWidth: number) {
  return (px / containerWidth) * 100
}

function clamp(value: number, lower: number, upper: number) {
  return Math.min(Math.max(value, lower), upper)
}

/**
 * 把像素规格换成百分比。容器太窄时按比例收，保证三个值仍是 min <= default <= max，
 * 而且侧栏绝不超过容器的一半，编辑器和预览始终占大头。
 */
export function railPercentSizes(spec: RailPixelSpec, containerWidth: number): RailPercentSizes {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return { default: 24, min: 20, max: 50 }
  }

  const max = clamp(toPercent(spec.max, containerWidth), 10, 50)
  const min = clamp(toPercent(spec.min, containerWidth), 8, max)
  const preferred = clamp(toPercent(spec.target, containerWidth), min, max)

  return {
    default: round(preferred),
    min: round(min),
    max: round(max),
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100
}
