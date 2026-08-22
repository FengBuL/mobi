import { describe, expect, it } from 'vitest'
import { titleFromImportedMarkdown } from '../apps/web/src/utils/imported-markdown'

describe(`导入标题`, () => {
  it(`优先用正文第一个标题，没有才用文件名`, () => {
    expect(titleFromImportedMarkdown(`# 正文标题\n\n一段`, `文件名`)).toBe(`正文标题`)
    expect(titleFromImportedMarkdown(`没有标题的稿`, `文件名`)).toBe(`文件名`)
  })
})
