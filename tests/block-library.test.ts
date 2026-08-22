import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`板块库点选`, () => {
  it(`打开换样子就出分类，不再只剩空提示`, () => {
    const source = readSource(`apps/web/src/components/editor/ImageLayoutWorkspace.vue`)

    expect(source).toContain(`点预览里的标题、引用或列表可换样子。点下面样式会插到文末。`)
    expect(source).toContain(`aria-label="板块类别"`)
    expect(source).not.toContain(`点右边稿子里的标题、引用或列表，再来换样子。`)
    expect(source).not.toContain(`v-if="showEmptyHint"`)
    expect(source).not.toContain(`Image Layout Studio`)
    expect(source).toContain(`<h2>图片排版</h2>`)
  })

  it(`分类一直在，插入新板块会清掉替换目标`, () => {
    const source = readSource(`apps/web/src/components/editor/ImageLayoutWorkspace.vue`)

    expect(source).toContain(`<nav class="block-library-nav"`)
    expect(source).toContain(`blockSelectionStore.clear()`)
    expect(source).toContain(`isInsertingNewBlock.value = true`)
    expect(source).toContain(`<HeadingBlockWorkspace`)
    expect(source.indexOf(`<HeadingBlockWorkspace`)).toBeGreaterThan(source.indexOf(`aria-label="板块类别"`))
  })

  it(`八个分类都在第一层，导航是紧凑芯片`, () => {
    const source = readSource(`apps/web/src/components/editor/ImageLayoutWorkspace.vue`)

    expect(source).toContain(`const PRIMARY_LIBRARY_CATEGORY_IDS: BlockCategoryId[] = [\`heading\`, \`quote\`, \`list\`, \`divider\`, \`image\`]`)
    expect(source).toContain(`const SECONDARY_LIBRARY_CATEGORY_IDS: BlockCategoryId[] = [\`card\`, \`data\`, \`interactive\`]`)
    expect(source).toContain(`return [...PRIMARY_LIBRARY_CATEGORY_IDS, ...SECONDARY_LIBRARY_CATEGORY_IDS]`)
    expect(source).toContain(`flex: 0 0 auto`)
    expect(source).toContain(`插入新板块`)
    expect(source).not.toContain(`<h2>换样子</h2>`)
  })

  it(`图片组件库用界面字体，不跟正文主题字体`, () => {
    const source = readSource(`apps/web/src/components/editor/ImageLayoutWorkspace.vue`)

    expect(source).toContain(`class="media-layout-workspace"`)
    expect(source).toContain(`<div class="media-layout-section">`)
    expect(source).not.toContain(`<section class="media-layout-section">`)
    expect(source).toContain(`font-family: inherit`)
  })

  it(`已套预设的块显示单独处理说明`, () => {
    const workspace = readSource(`apps/web/src/components/editor/HeadingBlockWorkspace.vue`)

    expect(workspace).toContain(`这一块是单独处理的，所以还是它自己的颜色。`)
    expect(workspace).toContain(`还原为普通文本`)
    expect(workspace).toContain(`function restoreToPlainMarkdown`)
    expect(workspace).toContain(`const showCustomBlockThemeNote = computed(() => {`)
    expect(workspace).toContain(`editingRange.value && blockSelection.value?.presetId`)
    expect(workspace).toContain(`insertBlockAtEnd`)
    expect(workspace).toContain(`if (editingRange.value && preset.id === selectedPresetId.value)`)
  })

  it(`专业模式开换样子不挤掉文章列表或样式`, () => {
    const ui = readSource(`apps/web/src/stores/ui.ts`)
    expect(ui).toContain(`if (name === \`blocks\`)`)
    expect(ui).toContain(`换样子是左边抽屉，不占中间栏`)
  })
})
