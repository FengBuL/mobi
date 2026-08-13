/**
 * CSS 变量生成工具
 * 根据配置动态生成 CSS 变量样式
 */

import type { HeadingLevel, HeadingStyles, HeadingStyleType } from '@md/shared/configs'

export interface CSSVariableConfig {
  primaryColor: string
  fontFamily: string
  fontSize: string
  isUseIndent?: boolean
  isUseJustify?: boolean
  headingStyles?: HeadingStyles
}

/**
 * 生成 CSS 变量样式
 * @param config - 配置对象
 * @returns CSS 变量字符串
 */
export function generateCSSVariables(config: CSSVariableConfig): string {
  return `
:root {
  /* 动态配置变量 */
  --md-primary-color: ${config.primaryColor};
  --md-font-family: ${config.fontFamily};
  --md-font-size: ${config.fontSize};
}

/* 段落缩进和对齐 */
#output p {
  ${config.isUseIndent ? `text-indent: 2em;` : ``}
  ${config.isUseJustify ? `text-align: justify;` : ``}
}
  `.trim()
}

/**
 * 生成标题样式 CSS（单独导出，用于在主题 CSS 之后应用）
 */
export function generateHeadingStyles(config: CSSVariableConfig): string {
  return generateHeadingStylesCSS(config.headingStyles)
}

/**
 * 生成标题样式 CSS
 */
function generateHeadingStylesCSS(headingStyles?: HeadingStyles): string {
  if (!headingStyles)
    return ``

  const levels: HeadingLevel[] = [`h1`, `h2`, `h3`, `h4`, `h5`, `h6`]
  const cssRules: string[] = []

  for (const level of levels) {
    const style = headingStyles[level]
    // 自定义样式由用户在 CSS 编辑器中直接编辑，这里只处理预设样式
    if (style && style !== `default` && style !== `custom`) {
      cssRules.push(generateHeadingCSS(level, style))
    }
  }

  return cssRules.join(`\n\n`)
}

/**
 * 生成单个标题级别的样式 CSS
 */
function generateHeadingCSS(level: HeadingLevel, style: HeadingStyleType): string {
  const selector = `#output section ${level}, #output ${level}`
  const primarySelector = `#output section ${level}`
  const resetRule = `${selector} {
  position: relative;
  display: block;
  box-sizing: border-box;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}`
  const resetPseudoRule = `${primarySelector}::before,
${primarySelector}::after,
#output ${level}::before,
#output ${level}::after {
  content: none;
}`

  const buildRule = (declarations: string, pseudoRules: string[] = []) => {
    return [resetRule, resetPseudoRule, `${selector} {\n${declarations}\n}`, ...pseudoRules].join(`\n\n`)
  }

  switch (style) {
    case `color-only`:
      return buildRule(`  color: var(--md-primary-color);`)

    case `border-bottom`:
      return buildRule(`  padding-bottom: 0.42em;
  color: color-mix(in srgb, var(--md-primary-color) 88%, #111);
  border-bottom: 2px solid color-mix(in srgb, var(--md-primary-color) 72%, white);
  box-shadow: inset 0 -0.72em 0 color-mix(in srgb, var(--md-primary-color) 10%, white);`)

    case `border-left`:
      return buildRule(`  padding: 0.24em 0 0.24em 0.95em;
  color: color-mix(in srgb, var(--md-primary-color) 84%, #111);
  border-left: 4px solid var(--md-primary-color);
  background: linear-gradient(90deg, color-mix(in srgb, var(--md-primary-color) 12%, white), transparent 72%);
  border-radius: 0 16px 16px 0;`)

    case `solid-banner`:
      return buildRule(`  padding: 0.58em 0.9em;
  color: #fff;
  border-radius: 18px 8px 18px 8px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--md-primary-color) 84%, #151515),
    color-mix(in srgb, var(--md-primary-color) 58%, #151515)
  );
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.14);`)

    case `soft-banner`:
      return buildRule(`  padding: 0.58em 0.9em;
  color: color-mix(in srgb, var(--md-primary-color) 82%, #1f2937);
  border: 1px solid color-mix(in srgb, var(--md-primary-color) 24%, #d9d9d9);
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--md-primary-color) 15%, white),
    color-mix(in srgb, var(--md-primary-color) 5%, white)
  );
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);`)

    case `capsule-outline`:
      return buildRule(`  display: inline-block;
  max-width: 100%;
  padding: 0.34em 0.95em;
  color: color-mix(in srgb, var(--md-primary-color) 84%, #111);
  border: 1.5px solid color-mix(in srgb, var(--md-primary-color) 74%, #111);
  border-radius: 999px;
  background: color-mix(in srgb, var(--md-primary-color) 8%, white);
  vertical-align: top;`)

    case `marker`:
      return buildRule(`  display: inline-block;
  max-width: 100%;
  padding: 0 0.18em 0.08em 0;
  color: color-mix(in srgb, var(--md-primary-color) 84%, #111);
  border-radius: 0.28em 0.14em 0.36em 0.08em;
  background: linear-gradient(
    180deg,
    transparent 0,
    transparent 56%,
    color-mix(in srgb, var(--md-primary-color) 36%, white) 56%,
    color-mix(in srgb, var(--md-primary-color) 36%, white) 92%,
    transparent 92%
  );
  vertical-align: top;`)

    case `eyebrow-line`:
      return buildRule(`  padding-top: 0.78em;
  color: color-mix(in srgb, var(--md-primary-color) 84%, #111);`, [`${primarySelector}::before,
#output ${level}::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 2.4em;
  height: 0.24em;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--md-primary-color), color-mix(in srgb, var(--md-primary-color) 25%, white));
}`])

    case `double-line`:
      return buildRule(`  padding: 0.46em 0;
  color: color-mix(in srgb, var(--md-primary-color) 82%, #111);
  border-top: 1px solid color-mix(in srgb, var(--md-primary-color) 46%, #bfbfbf);
  border-bottom: 1px solid color-mix(in srgb, var(--md-primary-color) 46%, #bfbfbf);`)

    case `underline-glow`:
      return buildRule(`  padding-bottom: 0.4em;
  color: color-mix(in srgb, var(--md-primary-color) 86%, #111);
  border-bottom: 3px solid var(--md-primary-color);
  box-shadow: inset 0 -0.78em 0 color-mix(in srgb, var(--md-primary-color) 12%, white);`, [`${primarySelector}::after,
#output ${level}::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -0.08em;
  width: 3.2em;
  height: 0.36em;
  border-radius: 999px;
  background: color-mix(in srgb, var(--md-primary-color) 46%, white);
  filter: blur(8px);
  opacity: 0.95;
}`])

    case `corner-tag`:
      return buildRule(`  padding: 0.56em 0.92em 0.48em 1.05em;
  color: color-mix(in srgb, var(--md-primary-color) 84%, #111);
  border: 1px solid color-mix(in srgb, var(--md-primary-color) 22%, #d9d9d9);
  border-radius: 0 18px 18px 18px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--md-primary-color) 13%, white),
    color-mix(in srgb, var(--md-primary-color) 4%, white)
  );
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);`, [`${primarySelector}::before,
#output ${level}::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 0.9em;
  height: 0.9em;
  border-radius: 0 0 0.7em 0;
  background: var(--md-primary-color);
}`])

    default:
      return ``
  }
}
