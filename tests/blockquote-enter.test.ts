import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  isEmptyBlockquoteLine,
  shouldExitBlockquoteOnEnter,
  shouldStripBlockquoteBeforeTypedBlock,
} from '../packages/shared/src/editor/blockquote-enter'

describe(`引用后续行`, () => {
  it(`空引用行回车应退出，表格和代码起行要先剥掉 >`, () => {
    expect(isEmptyBlockquoteLine(`>`)).toBe(true)
    expect(isEmptyBlockquoteLine(`> `)).toBe(true)
    expect(isEmptyBlockquoteLine(`> 引用`)).toBe(false)
    expect(shouldExitBlockquoteOnEnter(`> `)).toBe(true)
    expect(shouldExitBlockquoteOnEnter(`> 还没写完`)).toBe(false)
    expect(shouldStripBlockquoteBeforeTypedBlock(`> `, `| 列 |`)).toBe(true)
    expect(shouldStripBlockquoteBeforeTypedBlock(`> `, `\`\`\`js`)).toBe(true)
    expect(shouldStripBlockquoteBeforeTypedBlock(`> `, `~~~`)).toBe(true)
    expect(shouldStripBlockquoteBeforeTypedBlock(`> `, `接着写`)).toBe(false)
    expect(shouldStripBlockquoteBeforeTypedBlock(`> 引用`, `| 列 |`)).toBe(false)
  })

  it(`编辑器快捷键接到了退出引用和剥 >`, () => {
    const source = readFileSync(resolve(process.cwd(), `packages/shared/src/editor/markdown.ts`), `utf8`)
    expect(source).toContain(`handleBlockquoteEnter`)
    expect(source).toContain(`handleBlockquoteTypedBlock`)
    expect(source).toContain(`Prec.highest`)
  })
})
