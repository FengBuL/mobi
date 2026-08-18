import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildClipboardImageCacheKey,
  describeSlicedImageFallback,
  planVerticalSlices,
  resolveCenterCrop,
  resolveClipboardImageUploadPlan,
  resolveSlicedImageUrl,
} from '@/utils/clipboard-image-crop'
import { createDefaultMediaLayoutState } from '@/utils/image-layouts'
import { buildExtendedWeChatMediaBody } from '@/utils/wechat-media'

describe(`公众号图片实体裁切`, () => {
  it(`把方图按中心裁成 16:9 的真实像素区域`, () => {
    expect(resolveCenterCrop(1200, 1200, `16:9`)).toEqual({
      sourceX: 0,
      sourceY: 262.5,
      sourceWidth: 1200,
      sourceHeight: 675,
      outputWidth: 1200,
      outputHeight: 675,
      ratio: 16 / 9,
    })
  })

  it(`同一原图的原始版与裁切版使用不同上传缓存`, () => {
    expect(buildClipboardImageCacheKey(`https://example.com/a.png`, `auto`))
      .toBe(`https://example.com/a.png`)
    expect(buildClipboardImageCacheKey(`https://example.com/a.png`, `16:9`))
      .toBe(`https://example.com/a.png#mobi-crop=16%3A9`)
  })

  it(`微信已托管的原图在需要裁切时仍会重新上传`, () => {
    expect(resolveClipboardImageUploadPlan(
      `https://mmbiz.qpic.cn/example.png`,
      `16:9`,
    )).toEqual({
      shouldUpload: true,
      cacheKey: `https://mmbiz.qpic.cn/example.png#mobi-crop=16%3A9`,
    })
    expect(resolveClipboardImageUploadPlan(
      `https://mmbiz.qpic.cn/example.png`,
      `auto`,
    ).shouldUpload).toBe(false)
  })

  it(`公众号图文版式产物携带需要实体裁切的比例`, () => {
    const form = createDefaultMediaLayoutState()
    form.images[0].url = `https://example.com/a.png`
    form.images[0].aspectRatio = `16:9`

    const html = buildExtendedWeChatMediaBody(`polaroid-single`, form, `#c43b2b`)
    expect(html).toContain(`data-mobi-crop-aspect="16:9"`)
  })

  it(`按切片高度把长图切成若干段，不够长则只有一段`, () => {
    expect(planVerticalSlices(800, 4000, 1600)).toEqual([
      { sourceY: 0, sourceHeight: 1334, outputWidth: 800, outputHeight: 1334 },
      { sourceY: 1334, sourceHeight: 1334, outputWidth: 800, outputHeight: 1334 },
      { sourceY: 2668, sourceHeight: 1332, outputWidth: 800, outputHeight: 1332 },
    ])
    expect(planVerticalSlices(800, 1200, 1600)).toEqual([
      { sourceY: 0, sourceHeight: 1200, outputWidth: 800, outputHeight: 1200 },
    ])
  })

  it(`公众号 IP 白名单失败时切片落到本机图，并写出人话`, async () => {
    const file = new File([`slice`], `slice.jpg`, { type: `image/jpeg` })
    const result = await resolveSlicedImageUrl(file, {
      toDataUrl: async () => `data:image/jpeg;base64,abc`,
      uploadToMp: async () => {
        throw new Error(`invalid ip 123.146.171.195 ipv6 ::ffff:123.146.171.195, not in whitelist rid: 6a845c22`)
      },
    })

    expect(result.url).toBe(`data:image/jpeg;base64,abc`)
    expect(result.fallback).toContain(`123.146.171.195`)
    expect(result.fallback).toContain(`白名单`)
    expect(result.fallback).not.toContain(`not in whitelist`)
    expect(describeSlicedImageFallback(new Error(`40164 invalid ip`))).toContain(`40164`)
    const editor = readFileSync(resolve(process.cwd(), `apps/web/src/views/CodemirrorEditor.vue`), `utf8`)
    expect(editor).toContain(`resolveSlicedImageUrl`)
  })
})
