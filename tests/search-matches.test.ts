import { describe, expect, it } from 'vitest'
import { findPlainMatches, regexFlags } from '../apps/web/src/utils/search-matches'

describe(`查找匹配`, () => {
  it(`选区从行中切开时，偏移按文档坐标算，不从 0 当行首`, () => {
    const doc = `前言 hello 后记`
    const searchFrom = doc.indexOf(`hello`)
    const matches = findPlainMatches(doc.slice(searchFrom), `hello`, true, searchFrom)
    expect(matches).toEqual([{ from: searchFrom, to: searchFrom + 5 }])
  })

  it(`正则替换带上区分大小写`, () => {
    expect(regexFlags(false)).toBe(`gmi`)
    expect(regexFlags(true)).toBe(`gm`)
  })
})
