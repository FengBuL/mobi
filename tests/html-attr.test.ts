import { describe, expect, it } from 'vitest'
import { escapeHtmlAttr } from '../apps/web/src/utils/html-attr'

describe(`名片属性转义`, () => {
  it(`引号和尖括号不会破开属性`, () => {
    expect(escapeHtmlAttr(`张"三<`)).toBe(`张&quot;三&lt;`)
  })
})
