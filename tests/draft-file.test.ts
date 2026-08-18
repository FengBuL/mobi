import { describe, expect, it } from 'vitest'
import { allocateMarkdownFileName, hashText, toMarkdownFileName } from '@/utils/draft-file'

describe(`稿件文件名`, () => {
  it(`空标题落成未命名.md，非法字符换成下划线`, () => {
    expect(toMarkdownFileName(``)).toBe(`未命名.md`)
    expect(toMarkdownFileName(`a/b:c`)).toBe(`a_b_c.md`)
  })

  it(`重名时在后面加序号`, () => {
    expect(allocateMarkdownFileName(`未命名`, [`未命名.md`])).toBe(`未命名-2.md`)
    expect(allocateMarkdownFileName(`未命名`, [`未命名.md`, `未命名-2.md`])).toBe(`未命名-3.md`)
  })

  it(`相同正文得到相同哈希`, () => {
    expect(hashText(`hello`)).toBe(hashText(`hello`))
    expect(hashText(`hello`)).not.toBe(hashText(`world`))
  })
})
