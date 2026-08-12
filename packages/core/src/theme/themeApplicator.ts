/**
 * 主题应用工具
 * 负责将主题样式应用到页面
 */

import type { ThemeName } from '@md/shared/configs'
import type { CSSVariableConfig } from './cssVariables'
import { baseCSSContent, skeletonCSSContent, themeMap } from '@md/shared/configs'
import { processCSS } from './cssProcessor'
import { wrapCSSWithScope } from './cssScopeWrapper'
import { generateCSSVariables, generateHeadingStyles } from './cssVariables'
import { getThemeInjector } from './themeInjector'

export interface ThemeConfig {
  themeName: string // 主题名称
  customCSS?: string // 用户自定义 CSS
  overridesCSS?: string // 主题可视化编辑器生成的覆盖层
  variables: CSSVariableConfig
}

/**
 * 应用主题
 * @param config - 主题配置
 */
export async function applyTheme(config: ThemeConfig): Promise<void> {
  // 1. 生成 CSS 变量
  const variablesCSS = generateCSSVariables(config.variables)

  // 2. 每个主题独立生效，不再叠加 default，避免风格串味
  const themeCSS = themeMap[config.themeName as ThemeName] || themeMap.default

  // 3. 给骨架层和主题 CSS 添加作用域（只影响 #output 预览区域）
  //    骨架层排在主题之前，两者特异性相同，主题里写了什么就盖掉什么
  const scopedSkeletonCSS = wrapCSSWithScope(skeletonCSSContent, `#output`)
  const scopedThemeCSS = wrapCSSWithScope(themeCSS, `#output`)

  // 4. 生成标题样式 CSS（在主题 CSS 之后应用，确保覆盖主题默认样式）
  const headingStylesCSS = generateHeadingStyles(config.variables)

  // 5. 处理主题可视化编辑器的覆盖层（添加作用域）
  const scopedOverridesCSS = config.overridesCSS
    ? wrapCSSWithScope(config.overridesCSS, `#output`)
    : ``

  // 6. 处理用户自定义 CSS（添加作用域）
  const scopedCustomCSS = config.customCSS
    ? wrapCSSWithScope(config.customCSS, `#output`)
    : ``

  // 7. 拼接完整 CSS（用户自定义 CSS 在最后，优先级最高）
  let mergedCSS = [
    variablesCSS, // CSS 变量（全局）
    baseCSSContent, // 基础样式（全局）
    scopedSkeletonCSS, // 参数化骨架层（限制在 #output）
    scopedThemeCSS, // 主题样式（限制在 #output）
    headingStylesCSS, // 标题样式
    scopedOverridesCSS, // 可视化编辑器覆盖层（覆盖主题和标题预设）
    scopedCustomCSS, // 用户自定义 CSS（最后应用，可覆盖预设样式）
  ].filter(Boolean).join(`\n\n`)

  // 8. 使用 PostCSS 处理 CSS（简化 calc() 表达式等）
  mergedCSS = await processCSS(mergedCSS)

  // 9. 注入到页面
  const injector = getThemeInjector()
  injector.inject(mergedCSS)
}
