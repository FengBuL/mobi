import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyWechatPreviewTextureDowngrade,
  isWeChatUnpastableTexture,
  resolveWechatPreviewFrame,
} from '@/utils/wechat-preview'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

function installPreviewFixture(html: string, css: string) {
  document.head.innerHTML = `<style id="md-theme">#output { --md-primary-color:#1e6bb8; } ${css}</style>`
  document.body.innerHTML = `<section id="output">${html}</section>`
  return document.querySelector<HTMLElement>(`#output`)!
}

afterEach(() => {
  document.head.innerHTML = ``
  document.body.innerHTML = ``
})

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

describe(`预览藏掉公众号保不住的纹路`, () => {
  it(`认出 SVG 底图、纸纹网格和 repeating 渐变，放过单层色块渐变和外链图`, () => {
    expect(isWeChatUnpastableTexture(`none`)).toBe(false)
    expect(isWeChatUnpastableTexture(`linear-gradient(180deg, transparent 62%, #ead8cf 62%)`)).toBe(false)
    expect(isWeChatUnpastableTexture(`url("https://example.com/ring.png")`)).toBe(false)
    expect(isWeChatUnpastableTexture(`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E")`)).toBe(true)
    expect(isWeChatUnpastableTexture(`repeating-linear-gradient(90deg, #111 0, #111 2em, #c00 2em, #c00 2.4em)`)).toBe(true)
    expect(isWeChatUnpastableTexture(`linear-gradient(90deg, rgba(124, 183, 220, 0.07) 1px, transparent 1px), linear-gradient(rgba(124, 183, 220, 0.07) 1px, transparent 1px)`)).toBe(true)
  })

  it(`预览里拿掉标题 SVG 角饰和纸纹，留下底色和荧光笔`, () => {
    const root = installPreviewFixture(
      `<h1>标题</h1><strong>重点</strong><hr>`,
      `
        #output h1 {
          background-color: #ffffff;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Ccircle cx='4' cy='4' r='3' fill='%23000'/%3E%3C/svg%3E");
        }
        #output strong {
          background-image: linear-gradient(180deg, transparent 62%, #ead8cf 62%);
        }
        #output hr {
          background-color: #111111;
          background-image: repeating-linear-gradient(90deg, #111 0, #111 2em, #c00 2em, #c00 2.4em);
        }
      `,
    )

    applyWechatPreviewTextureDowngrade(root)

    const heading = root.querySelector(`h1`)!
    const mark = root.querySelector(`strong`)!
    const rule = root.querySelector(`hr`)!

    expect(getComputedStyle(heading).backgroundColor).not.toBe(`rgba(0, 0, 0, 0)`)
    expect(getComputedStyle(heading).backgroundImage).toBe(`none`)
    expect(getComputedStyle(mark).backgroundImage).toContain(`linear-gradient`)
    expect(getComputedStyle(rule).backgroundImage).toBe(`none`)
  })

  it(`板块内联 SVG 纸纹同样藏掉，单层渐变色块留下`, () => {
    const root = installPreviewFixture(
      `<div class="paper" style="background-color:#f7f4ec;background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2212%22%3E%3Ccircle cx=%220%22 cy=%226%22 r=%224%22 fill=%22%23d7b56d%22/%3E%3C/svg%3E')"></div>
       <div class="wash" style="background-color:#3b2a5a;background-image:linear-gradient(135deg,#3b2a5a,#8f0011)"></div>`,
      ``,
    )

    applyWechatPreviewTextureDowngrade(root)

    expect(getComputedStyle(root.querySelector(`.paper`)!).backgroundImage).toBe(`none`)
    expect(getComputedStyle(root.querySelector(`.wash`)!).backgroundImage).toContain(`linear-gradient`)
  })

  it(`编辑器刷新预览时会做纹路降级`, () => {
    const source = [
      readSource(`apps/web/src/utils/wechat-preview.ts`),
      readSource(`apps/web/src/views/CodemirrorEditor.vue`),
    ].join(`\n`)

    expect(source).toContain(`applyWechatPreviewTextureDowngrade`)
    expect(source).toContain(`isWeChatUnpastableTexture`)
  })
})
