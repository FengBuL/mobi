import academicCSS from './academic.css?raw'
import baseCSS from './base.css?raw'
import bloomCSS from './bloom.css?raw'
import blueprintCSS from './blueprint.css?raw'
import candyCSS from './candy.css?raw'
import cyberCSS from './cyber.css?raw'
import defaultCSS from './default.css?raw'
import galleryCSS from './gallery.css?raw'
import inkCSS from './ink.css?raw'
import insightCSS from './insight.css?raw'
import launchCSS from './launch.css?raw'
import legalCSS from './legal.css?raw'
import magazineCSS from './magazine.css?raw'
import minimalistCSS from './minimalist.css?raw'
import neonCSS from './neon.css?raw'
import popCSS from './pop.css?raw'
import porcelainCSS from './porcelain.css?raw'
import pressCSS from './press.css?raw'
import scoreboardCSS from './scoreboard.css?raw'
import sequenceCSS from './sequence.css?raw'
import skeletonCSS from './skeleton.css?raw'
import swissCSS from './swiss.css?raw'
import terminalCSS from './terminal.css?raw'
import vermilionCSS from './vermilion.css?raw'
import xuanCSS from './xuan.css?raw'

/**
 * 基础样式 CSS
 */
export const baseCSSContent = baseCSS

/**
 * 参数化骨架层 CSS
 * 在 base 之后、主题之前注入，主题可以逐条覆盖
 */
export const skeletonCSSContent = skeletonCSS

/**
 * CSS 主题映射表
 */
export const themeMap = {
  // 编辑
  'default': defaultCSS,
  'magazine': magazineCSS,
  'press': pressCSS,
  // 专业
  'insight': insightCSS,
  'launch': launchCSS,
  'legal': legalCSS,
  // 科技
  'cyber': cyberCSS,
  'blueprint': blueprintCSS,
  'terminal': terminalCSS,
  // 克制
  'minimalist': minimalistCSS,
  'academic': academicCSS,
  'swiss': swissCSS,
  // 中式
  'ink': inkCSS,
  'vermilion': vermilionCSS,
  'xuan': xuanCSS,
  'porcelain': porcelainCSS,
  // 活力
  'bloom': bloomCSS,
  'candy': candyCSS,
  'pop': popCSS,
  'neon': neonCSS,
  // 档案
  'sequence': sequenceCSS,
  'gallery': galleryCSS,
  'scoreboard': scoreboardCSS,
} as const

export type ThemeName = keyof typeof themeMap
