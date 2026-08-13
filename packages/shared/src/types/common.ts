import type { Token } from 'marked'

/**
 * 渲染器选项（新主题系统）
 * 主题样式通过 CSS 注入，不再通过 JS 对象传递
 * 注意：isUseIndent 和 isUseJustify 现在通过 CSS 变量系统处理，不需要传递给渲染器
 */
export interface IOpts {
  legend?: string
  citeStatus?: boolean
  countStatus?: boolean
  isShowCodeLanguage?: boolean
  isShowLineNumber?: boolean
  themeMode?: `light` | `dark`
  headingDecorationStatus?: boolean
  headingDecorationUrl?: string
  headingDecorationPosition?: `left` | `above` | `below`
}

export interface IConfigOption<VT = string> {
  label: string
  value: VT
  desc: string
}

/**
 * Options for the `markedAlert` extension.
 */
export interface AlertOptions {
  className?: string
  variants?: AlertVariantItem[]
  withoutStyle?: boolean
}

/**
 * Configuration for an alert type.
 */
export interface AlertVariantItem {
  type: string
  icon: string
  title?: string
  titleClassName?: string
}

/**
 * Represents an alert token.
 */
export interface Alert {
  type: `alert`
  meta: {
    className: string
    variant: string
    icon: string
    title: string
    titleClassName: string
  }
  raw: string
  text: string
  tokens: Token[]
}
