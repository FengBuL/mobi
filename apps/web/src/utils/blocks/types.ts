export const BLOCK_CATEGORY_IDS = [
  `heading`,
  `quote`,
  `list`,
  `card`,
  `data`,
  `interactive`,
  `divider`,
  `image`,
] as const

export type BlockCategoryId = typeof BLOCK_CATEGORY_IDS[number]
export type BlockFieldType = `text` | `textarea` | `url` | `number` | `switch`
export type BlockState = Record<string, string | number | boolean>

export interface BlockFieldSchema {
  key: string
  label: string
  type: BlockFieldType
  required?: boolean
  placeholder?: string
  defaultValue: string | number | boolean
  min?: number
  max?: number
  step?: number
}

export interface BlockPalette {
  primary: string
  secondary: string
  ink: string
  muted: string
  surface: string
  border: string
}

export interface BlockPreset {
  id: string
  category: Exclude<BlockCategoryId, `image`>
  name: string
  description: string
  cue: string
  fields: BlockFieldSchema[]
  palette: BlockPalette
  thumbnail: {
    background: string
    foreground: string
    accent: string
  }
}

export interface ParsedBlock {
  raw: string
  from: number
  to: number
  category: Exclude<BlockCategoryId, `image`>
  presetId: string
  state: BlockState
  title: string
}

export interface BlockRenderContext {
  mode: `editor` | `preview`
}

export interface BlockWeChatContext {
  primaryColor?: string
}

export interface BlockCategoryDefinition {
  id: Exclude<BlockCategoryId, `image`>
  name: string
  description: string
  presets: BlockPreset[]
  createDefaultState: (preset: BlockPreset) => BlockState
  build: (preset: BlockPreset, state: BlockState, context?: BlockRenderContext) => string
  parse: (raw: string) => Omit<ParsedBlock, `raw` | `from` | `to`> | null
  toWeChat: (preset: BlockPreset, state: BlockState, context?: BlockWeChatContext) => string
}
