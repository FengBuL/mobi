/**
 * 主题可视化编辑器的数据模型
 * token 采用「只存用户显式设置的项」的稀疏结构，未设置的项继承基础主题
 */

export type ThemeTokenValue = string | number | boolean

export type ThemeTokenGroupValues = Record<string, ThemeTokenValue>

export type ThemeTokens = Record<string, ThemeTokenGroupValues>

export interface ThemeCssRule {
  selector: string
  declarations: string[]
}

export interface ThemeFieldContext {
  selector: string
  get: (key: string) => ThemeTokenValue
  color: (value: ThemeTokenValue) => string
}

export type ThemeFieldEmit = (value: ThemeTokenValue, ctx: ThemeFieldContext) => ThemeCssRule[]

export type ThemeFieldType = 'color' | 'number' | 'select' | 'switch'

export interface ThemeFieldOption {
  label: string
  value: string
  desc?: string
  /** 该选项特有的微信兼容性风险 */
  wechatHint?: string
}

export interface ThemeField {
  key: string
  label: string
  type: ThemeFieldType
  defaultValue: ThemeTokenValue
  /** 补充说明，展示在控件下方 */
  hint?: string
  /** 微信公众号兼容性风险提示，非空时 UI 上会出现警告标记 */
  wechatHint?: string
  min?: number
  max?: number
  step?: number
  /** 数值控件右侧展示的单位 */
  suffix?: string
  options?: ThemeFieldOption[]
  /** 仅在满足条件时展示（例如装饰色只在选了装饰后才有意义） */
  showIf?: (values: ThemeTokenGroupValues) => boolean
  emit: ThemeFieldEmit
}

export interface ThemeGroup {
  id: string
  label: string
  desc: string
  selector: string
  fields: ThemeField[]
}

export interface ThemeGroupCategory {
  id: string
  label: string
  groupIds: string[]
}

export interface ThemeDraft {
  /** 关联的自定义主题 id，null 表示尚未保存的临时调整 */
  sourceId: string | null
  name: string
  baseTheme: string
  tokens: ThemeTokens
}

export interface CustomTheme {
  id: string
  name: string
  baseTheme: string
  tokens: ThemeTokens
  createdAt: number
  updatedAt: number
}

export interface CustomThemeFilePayload {
  format: `md-visual-theme`
  version: 1
  name: string
  baseTheme: string
  tokens: ThemeTokens
  exportedAt: string
}

export interface ThemeTokenDiffItem {
  groupId: string
  groupLabel: string
  fieldKey: string
  fieldLabel: string
  value: ThemeTokenValue
  display: string
}
