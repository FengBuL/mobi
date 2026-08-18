import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`板块库点选`, () => {
  it(`没选中时只提示点右边再换样子`, () => {
    const source = readSource(`apps/web/src/components/editor/ImageLayoutWorkspace.vue`)

    expect(source).toContain(`点右边稿子里的标题、引用或列表，再来换样子。`)
    expect(source).toContain(`v-if="showEmptyHint"`)
    expect(source).toContain(`const showEmptyHint = computed(() => !hasReplaceTarget.value && !isInsertingNewBlock.value)`)
  })

  it(`无选中且非插入路时不渲染预设网格`, () => {
    const source = readSource(`apps/web/src/components/editor/ImageLayoutWorkspace.vue`)
    const emptyHintIndex = source.indexOf(`点右边稿子里的标题、引用或列表，再来换样子。`)
    const workspaceIndex = source.indexOf(`<HeadingBlockWorkspace`)
    const imageStudioIndex = source.indexOf(`class="media-layout-workspace"`)

    expect(emptyHintIndex).toBeGreaterThan(-1)
    expect(workspaceIndex).toBeGreaterThan(emptyHintIndex)
    expect(imageStudioIndex).toBeGreaterThan(workspaceIndex)
    expect(source).toContain(`v-else-if="activeLibraryCategory !== 'image' && registeredBlockCategoryIds.has(activeLibraryCategory)"`)
    expect(source).toContain(`<nav v-if="showLibraryNav"`)
    expect(source).toContain(`const showLibraryNav = computed(() => isInsertingNewBlock.value && !hasReplaceTarget.value)`)
  })

  it(`简洁第一层导航只留标题、引用、列表、分隔、图`, () => {
    const source = readSource(`apps/web/src/components/editor/ImageLayoutWorkspace.vue`)

    expect(source).toContain(`const PRIMARY_LIBRARY_CATEGORY_IDS: BlockCategoryId[] = [\`heading\`, \`quote\`, \`list\`, \`divider\`, \`image\`]`)
    expect(source).toContain(`const SECONDARY_LIBRARY_CATEGORY_IDS: BlockCategoryId[] = [\`card\`, \`data\`, \`interactive\`]`)
    expect(source).toContain(`return PRIMARY_LIBRARY_CATEGORY_IDS`)
    expect(source).toContain(`插入新板块`)
  })

  it(`已套预设的块显示单独处理说明`, () => {
    const workspace = readSource(`apps/web/src/components/editor/HeadingBlockWorkspace.vue`)

    expect(workspace).toContain(`这一块是单独处理的，所以还是它自己的颜色。`)
    expect(workspace).toContain(`const showCustomBlockThemeNote = computed(() => {`)
    expect(workspace).toContain(`editingRange.value && blockSelection.value?.presetId`)
  })
})
