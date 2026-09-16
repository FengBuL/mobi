export type CopyMode = 'txt' | 'html' | 'html-without-style' | 'html-and-style' | 'md'

/** 除「复制到公众号」（txt）之外的四种格式，收在「文件 → 复制为…」里 */
export const SECONDARY_COPY_FORMATS: ReadonlyArray<{ mode: Exclude<CopyMode, 'txt'>, label: string }> = [
  { mode: `html`, label: `HTML 源码` },
  { mode: `html-without-style`, label: `纯 HTML` },
  { mode: `html-and-style`, label: `带样式 HTML` },
  { mode: `md`, label: `Markdown 源码` },
]
