import { afterEach, describe, expect, it, vi } from 'vitest'
import { processClipboardContent } from '@/utils'
import { blockCategories, convertBlocksForWeChat, getBlockPreset } from '@/utils/blocks/registry'
import {
  buildWeChatClipboardPayload,
  createWeChatClipboardBlobs,
  materializeWeChatDecorations,
} from '@/utils/wechat-compat'

vi.mock(`@/utils/file`, () => ({
  getMpUploadConfig: vi.fn(async () => null),
  hasMpUploadConfig: vi.fn(async () => false),
  uploadFileToMp: vi.fn(),
}))

vi.mock(`@/utils/storage`, () => ({
  store: {
    getJSON: vi.fn(async () => ({})),
    setJSON: vi.fn(async () => undefined),
  },
}))

function installClipboardFixture(html: string, css: string) {
  document.head.innerHTML = `<style id="md-theme">${css}</style>`
  document.body.innerHTML = `<section id="output">${html}</section>`
  return document.querySelector<HTMLElement>(`#output`)!
}

afterEach(() => {
  document.head.innerHTML = ``
  document.body.innerHTML = ``
})

describe(`公众号复制兼容`, () => {
  it.each([
    [`保留默认副标题`, `用一句短句交代这一节的重点`],
    [`不回填已删除副标题`, ``],
    [`保留用户副标题`, `用户自己的章节说明`],
  ])(`几何坐标%s`, (_name, subtitle) => {
    const preset = getBlockPreset(`heading-geometry-dots`)!
    const category = blockCategories.find(item => item.id === `heading`)!
    const root = installClipboardFixture(category.build(preset, {
      ...category.createDefaultState(preset),
      subtitle,
    }), ``)

    convertBlocksForWeChat(root)
    const payload = buildWeChatClipboardPayload(root)

    expect(payload.html.includes(`用一句短句交代这一节的重点`)).toBe(subtitle === `用一句短句交代这一节的重点`)
    expect(payload.plainText.includes(`用一句短句交代这一节的重点`)).toBe(subtitle === `用一句短句交代这一节的重点`)
    if (subtitle) {
      expect(payload.html).toContain(subtitle)
      expect(payload.plainText).toContain(subtitle)
    }
  })

  it.each([
    [`内置标题预设`, `#output h1::before { content:""; display:block; width:42px; height:4px; margin-bottom:8px; background:#c2352b; }`],
    [`用户自定义主题`, `#output h1::before { content:""; position:absolute; top:0; left:0; width:15px; height:15px; background:var(--md-primary-color); transform:rotate(45deg); }`],
  ])(`%s 的伪元素会进入真实复制 HTML`, async (_name, css) => {
    const output = installClipboardFixture(
      `<h1>文章开头标题</h1><p>普通段落</p>`,
      `#output { --md-primary-color:#1e6bb8; } ${css}`,
    )

    await processClipboardContent(`#1e6bb8`)

    const heading = output.querySelector(`h1`)!
    const decoration = heading.querySelector<HTMLElement>(`[data-mobi-clipboard-decoration="true"]`)
    expect(decoration).toBeTruthy()
    expect(decoration?.textContent).not.toBe(``)
    expect(decoration?.style.width).toBeTruthy()
    expect(decoration?.style.height).toBeTruthy()
    expect(decoration?.style.position).toBe(``)
    expect(heading.textContent).toContain(`文章开头标题`)
  })

  it(`装饰物化重复执行产物稳定`, () => {
    const root = installClipboardFixture(
      `<span style="display:inline-block;width:8px;height:8px;background-color:#1e6bb8;"></span>`,
      ``,
    )

    materializeWeChatDecorations(root)
    const once = root.innerHTML
    materializeWeChatDecorations(root)

    expect(root.innerHTML).toBe(once)
    expect(root.querySelectorAll(`[data-mobi-clipboard-decoration]`)).toHaveLength(1)
  })

  it(`html 与纯文本载荷同时保留文章语义且排除装饰占位`, async () => {
    const root = installClipboardFixture(`
      <h1><span style="display:block;width:42px;height:4px;background-color:#c2352b;"></span>文章标题</h1>
      <p>普通段落 <a href="https://example.com">链接文字</a></p>
      <ul><li>列表一</li><li>列表二</li></ul>
      <p><img src="https://example.com/cover.png" alt="封面图"></p>
    `, ``)
    materializeWeChatDecorations(root)

    const payload = buildWeChatClipboardPayload(root)
    const blobs = createWeChatClipboardBlobs(root)

    expect(payload.html).toContain(`data-mobi-clipboard-decoration="true"`)
    expect(payload.plainText).toContain(`文章标题`)
    expect(payload.plainText).toContain(`普通段落 链接文字`)
    expect(payload.plainText).toContain(`列表一`)
    expect(payload.plainText).toContain(`列表二`)
    expect(payload.plainText).toContain(`封面图`)
    expect(payload.plainText).not.toContain(`\u00A0`)
    expect(Object.keys(blobs)).toEqual([`text/html`, `text/plain`])
    expect(blobs[`text/html`].type).toBe(`text/html`)
    expect(blobs[`text/plain`].type).toBe(`text/plain`)
    expect(await blobs[`text/html`].text()).toBe(payload.html)
    expect(await blobs[`text/plain`].text()).toBe(payload.plainText)
  })

  it(`纯文本列表不重复渲染预览标记`, () => {
    const root = installClipboardFixture(
      `<ul><li><span class="listitem-marker">• </span>列表一</li></ul>`,
      ``,
    )

    const { plainText } = buildWeChatClipboardPayload(root)

    expect(plainText).toContain(`- 列表一`)
    expect(plainText).not.toContain(`- •`)
  })
})
