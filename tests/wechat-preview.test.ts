import { describe, expect, it } from 'vitest'
import { resolveWechatPreviewFrame } from '@/utils/wechat-preview'

describe(`公众号移动预览尺寸`, () => {
  it(`桌面工作区按 393px 视窗和 18px 正文边距模拟公众号`, () => {
    expect(resolveWechatPreviewFrame({ device: `mobile`, compactViewport: false })).toEqual({
      width: `393px`,
      maxWidth: `100%`,
      paddingLeft: `18px`,
      paddingRight: `18px`,
      boxSizing: `border-box`,
      border: `0`,
    })
  })

  it(`窄屏工作区保持响应式宽度并沿用公众号正文边距`, () => {
    expect(resolveWechatPreviewFrame({ device: `mobile`, compactViewport: true })?.width).toBe(`100%`)
  })

  it(`桌面画板不套用公众号移动端尺寸`, () => {
    expect(resolveWechatPreviewFrame({ device: `desktop`, compactViewport: false })).toBeUndefined()
  })
})
