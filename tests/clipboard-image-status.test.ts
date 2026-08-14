import { describe, expect, it } from 'vitest'

import { isBlockingClipboardImageFailure, isUnsafeClipboardImage } from '../apps/web/src/utils/clipboard-image-status'

describe('clipboard image safety', () => {
  it('reports a failed crop upload even when the fallback URL contains a WeChat host', () => {
    const src = 'https://wsrv.nl?url=https%3A%2F%2Fmmbiz.qpic.cn%2Fmmbiz_png%2Fexample%2F0'

    expect(isUnsafeClipboardImage(src, '公众号图片代理连接失败')).toBe(true)
  })

  it('accepts a direct WeChat-hosted image without an upload error', () => {
    expect(isUnsafeClipboardImage('https://mmbiz.qpic.cn/mmbiz_png/example/0', '')).toBe(false)
  })

  it('blocks copying when a configured upload failed', () => {
    expect(isBlockingClipboardImageFailure('公众号图片代理连接失败', true)).toBe(true)
    expect(isBlockingClipboardImageFailure('', true)).toBe(false)
    expect(isBlockingClipboardImageFailure('公众号图片代理连接失败', false)).toBe(false)
  })
})
