import academicCSS from './academic.css?raw'
import auroraCSS from './aurora.css?raw'
import baseCSS from './base.css?raw'
import businessCSS from './business.css?raw'
import cyberCSS from './cyber.css?raw'
import defaultCSS from './default.css?raw'
import financeCSS from './finance.css?raw'
import legalCSS from './legal.css?raw'
import magazineCSS from './magazine.css?raw'
import minimalistCSS from './minimalist.css?raw'
import techCSS from './tech.css?raw'

/**
 * 基础样式 CSS
 */
export const baseCSSContent = baseCSS

/**
 * CSS 主题映射表
 */
export const themeMap = {
  'default': defaultCSS,
  'business': businessCSS,
  'tech': techCSS,
  'finance': financeCSS,
  'cyber': cyberCSS,
  'aurora': auroraCSS,
  'minimalist': minimalistCSS,
  'academic': academicCSS,
  'magazine': magazineCSS,
  'legal': legalCSS,
} as const

export type ThemeName = keyof typeof themeMap
