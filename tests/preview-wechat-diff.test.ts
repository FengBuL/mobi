import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { processClipboardContent, stripEditorOnlyWechatDiffMarkers } from '@/utils'
import {
  applyWechatPreviewDiffHints,
  buildMediaLayoutMarkup,
  createDefaultMediaLayoutState,
  mediaLayoutPresets,
  WECHAT_EDITOR_ONLY_ATTR,
  WECHAT_PREVIEW_DIFF_ADVICE,
  WECHAT_PREVIEW_DIFF_ATTR,
  WECHAT_PREVIEW_DIFF_EXPAND_SCROLL_ACTION,
  WECHAT_PREVIEW_DIFF_HINT_CLASS,
  WECHAT_PREVIEW_DIFF_LABELS,
  WECHAT_PREVIEW_DIFF_SLICE_SCROLL_ACTION,
} from '@/utils/image-layouts'

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

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

function stateWithImages(slotCount: number) {
  const form = createDefaultMediaLayoutState()
  form.images.forEach((slot, index) => {
    if (index < slotCount) {
      slot.url = `https://example.com/pic-${index + 1}.png`
      slot.alt = `示例图 ${index + 1}`
      slot.caption = `图注 ${index + 1}`
    }
  })
  return form
}

function installClipboardFixture(html: string) {
  document.head.innerHTML = `<style id="md-theme">#output { --md-primary-color:#1e6bb8; }</style>`
  document.body.innerHTML = `<section id="output">${html}</section>`
  return document.querySelector<HTMLElement>(`#output`)!
}

afterEach(() => {
  document.head.innerHTML = ``
  document.body.innerHTML = ``
})

describe(`预览微信差异打标`, () => {
  it(`源码含三类标记文案`, () => {
    const source = [
      readSource(`apps/web/src/utils/image-layouts.ts`),
      readSource(`apps/web/src/utils/preview-text.ts`),
      readSource(`apps/web/src/views/CodemirrorEditor.vue`),
      readSource(`apps/web/src/utils/index.ts`),
      readSource(`apps/web/src/stores/ui.ts`),
    ].join(`\n`)

    expect(source).toContain(WECHAT_PREVIEW_DIFF_LABELS.crop)
    expect(source).toContain(WECHAT_PREVIEW_DIFF_LABELS.scroll)
    expect(source).toContain(WECHAT_PREVIEW_DIFF_LABELS.badge)
    expect(source).toContain(WECHAT_PREVIEW_DIFF_LABELS.overlay)
    expect(source).toContain(WECHAT_PREVIEW_DIFF_ADVICE.crop)
    expect(source).toContain(WECHAT_PREVIEW_DIFF_ADVICE.scroll)
    expect(source).toContain(WECHAT_PREVIEW_DIFF_ADVICE.badge)
    expect(source).toContain(WECHAT_PREVIEW_DIFF_ADVICE.overlay)
    expect(source).toContain(`改成整幅长图`)
    expect(source).toContain(`切成多张`)
    expect(source).toContain(`点这里换样子`)
    expect(source).toContain(`preview_block_pick_hint_seen`)
    expect(source).toContain(`readPreviewElementText`)
    expect(source).toContain(`block-pick-hint`)
    expect(source).toContain(`stripEditorOnlyWechatDiffMarkers`)
    expect(source).toContain(`applyWechatPreviewDiffHints`)
  })

  it(`图文版式给裁切、长图、压图角标、渐变标题条打 data 标记`, () => {
    const cropPreset = mediaLayoutPresets.find(item => item.id === `hero-image`)!
    const scrollPreset = mediaLayoutPresets.find(item => item.id === `scroll-window`)!
    const badgePreset = mediaLayoutPresets.find(item => item.id === `numbered-figure`)!
    const overlayPreset = mediaLayoutPresets.find(item => item.id === `gradient-caption`)!

    const crop = buildMediaLayoutMarkup(cropPreset, stateWithImages(cropPreset.slotCount))
    const scroll = buildMediaLayoutMarkup(scrollPreset, stateWithImages(scrollPreset.slotCount))
    const badge = buildMediaLayoutMarkup(badgePreset, stateWithImages(badgePreset.slotCount))
    const overlay = buildMediaLayoutMarkup(overlayPreset, stateWithImages(overlayPreset.slotCount))

    expect(crop).toContain(`${WECHAT_PREVIEW_DIFF_ATTR}="crop"`)
    expect(scroll).toContain(`${WECHAT_PREVIEW_DIFF_ATTR}="scroll"`)
    expect(badge).toContain(`${WECHAT_PREVIEW_DIFF_ATTR}="crop badge"`)
    expect(badge).toContain(`${WECHAT_PREVIEW_DIFF_ATTR}="badge"`)
    expect(overlay).toContain(`${WECHAT_PREVIEW_DIFF_ATTR}="crop overlay"`)
    expect(overlay).toContain(`md-media-x-gradient`)
  })

  it(`预览会插入三类角标，剥离函数会去掉 editor-only 标记`, () => {
    const cropPreset = mediaLayoutPresets.find(item => item.id === `hero-image`)!
    const scrollPreset = mediaLayoutPresets.find(item => item.id === `scroll-window`)!
    const badgePreset = mediaLayoutPresets.find(item => item.id === `numbered-figure`)!
    const overlayPreset = mediaLayoutPresets.find(item => item.id === `gradient-caption`)!
    const html = [
      buildMediaLayoutMarkup(cropPreset, stateWithImages(cropPreset.slotCount)),
      buildMediaLayoutMarkup(scrollPreset, stateWithImages(scrollPreset.slotCount)),
      buildMediaLayoutMarkup(badgePreset, stateWithImages(badgePreset.slotCount)),
      buildMediaLayoutMarkup(overlayPreset, stateWithImages(overlayPreset.slotCount)),
    ].join(`\n`)

    const root = installClipboardFixture(html)
    applyWechatPreviewDiffHints(root)

    expect(root.innerHTML).toContain(WECHAT_PREVIEW_DIFF_LABELS.crop)
    expect(root.innerHTML).toContain(WECHAT_PREVIEW_DIFF_LABELS.scroll)
    expect(root.innerHTML).toContain(WECHAT_PREVIEW_DIFF_LABELS.badge)
    expect(root.innerHTML).toContain(WECHAT_PREVIEW_DIFF_LABELS.overlay)
    expect(root.innerHTML).toContain(WECHAT_PREVIEW_DIFF_ADVICE.crop)
    expect(root.innerHTML).toContain(WECHAT_PREVIEW_DIFF_ADVICE.badge)
    expect(root.innerHTML).toContain(WECHAT_PREVIEW_DIFF_ADVICE.overlay)
    expect(root.innerHTML).toContain(`改成整幅长图`)
    expect(root.innerHTML).toContain(`切成多张`)
    expect(root.querySelector(`[data-mobi-wechat-diff-action="${WECHAT_PREVIEW_DIFF_EXPAND_SCROLL_ACTION}"]`)).toBeTruthy()
    expect(root.querySelector(`[data-mobi-wechat-diff-action="${WECHAT_PREVIEW_DIFF_SLICE_SCROLL_ACTION}"]`)).toBeTruthy()
    expect(root.querySelectorAll(`.${WECHAT_PREVIEW_DIFF_HINT_CLASS}`).length).toBeGreaterThan(0)

    stripEditorOnlyWechatDiffMarkers(root)

    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_HINT_CLASS)
    expect(root.innerHTML).not.toContain(WECHAT_EDITOR_ONLY_ATTR)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_ATTR)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_LABELS.crop)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_LABELS.scroll)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_LABELS.badge)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_LABELS.overlay)
  })

  it(`复制产物不含 editor-only 角标，也不新增非法 CSS`, async () => {
    const cropPreset = mediaLayoutPresets.find(item => item.id === `hero-image`)!
    const scrollPreset = mediaLayoutPresets.find(item => item.id === `scroll-window`)!
    const badgePreset = mediaLayoutPresets.find(item => item.id === `numbered-figure`)!
    const overlayPreset = mediaLayoutPresets.find(item => item.id === `gradient-caption`)!
    const html = [
      buildMediaLayoutMarkup(cropPreset, stateWithImages(cropPreset.slotCount)),
      buildMediaLayoutMarkup(scrollPreset, stateWithImages(scrollPreset.slotCount)),
      buildMediaLayoutMarkup(badgePreset, stateWithImages(badgePreset.slotCount)),
      buildMediaLayoutMarkup(overlayPreset, stateWithImages(overlayPreset.slotCount)),
    ].join(`\n`)

    const root = installClipboardFixture(html)
    applyWechatPreviewDiffHints(root)
    await processClipboardContent(`#1e6bb8`)

    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_HINT_CLASS)
    expect(root.innerHTML).not.toContain(WECHAT_EDITOR_ONLY_ATTR)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_ATTR)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_LABELS.crop)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_LABELS.scroll)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_LABELS.badge)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_LABELS.overlay)
    expect(root.innerHTML).not.toContain(`preview-wechat-diff-hint`)
    expect(root.innerHTML).not.toContain(`.md-wechat-diff-hint`)
  })

  it(`配了图床时不再打裁切标，长图和角标仍打`, () => {
    const cropPreset = mediaLayoutPresets.find(item => item.id === `hero-image`)!
    const scrollPreset = mediaLayoutPresets.find(item => item.id === `scroll-window`)!
    const badgePreset = mediaLayoutPresets.find(item => item.id === `numbered-figure`)!
    const html = [
      buildMediaLayoutMarkup(cropPreset, stateWithImages(cropPreset.slotCount)),
      buildMediaLayoutMarkup(scrollPreset, stateWithImages(scrollPreset.slotCount)),
      buildMediaLayoutMarkup(badgePreset, stateWithImages(badgePreset.slotCount)),
    ].join(`\n`)

    const root = installClipboardFixture(html)
    applyWechatPreviewDiffHints(root, { suppressCrop: true })

    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_LABELS.crop)
    expect(root.innerHTML).not.toContain(WECHAT_PREVIEW_DIFF_ADVICE.crop)
    expect(root.innerHTML).toContain(WECHAT_PREVIEW_DIFF_LABELS.scroll)
    expect(root.innerHTML).toContain(WECHAT_PREVIEW_DIFF_LABELS.badge)
  })
})
