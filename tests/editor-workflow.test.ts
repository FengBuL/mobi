import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`编辑工作流`, () => {
  it(`编辑现有板块时字段和字号直接同步到正文`, () => {
    const source = readSource(`apps/web/src/components/editor/HeadingBlockWorkspace.vue`)

    expect(source).toContain(`function updateField(`)
    expect(source).toContain(`function persistEditingBlock(`)
    expect(source).not.toContain(`更新到正文`)
  })

  it(`本地文件夹只作为只读导入源`, () => {
    const panel = readSource(`apps/web/src/components/editor/FolderSourcePanel.vue`)
    const store = readSource(`apps/web/src/stores/folderSource.ts`)

    expect(panel).not.toContain(`useFolderFileSync`)
    expect(store).toContain("mode: `read`")
    expect(store).not.toContain("handle.requestPermission({ mode: `read` })")
    expect(store).toContain(`typeof mostRecent.handle.queryPermission`)
    expect(store).not.toContain(`createWritable`)
    expect(store).not.toContain(`writeFile,`)
    expect(store).toContain(`loadDirectoryChildren`)
    expect(store).not.toContain(`await buildFileTree(entry as FileSystemDirectoryHandle`)
    expect(store).toContain(`void saveFolderHandle({`)
    expect(store).toContain(`getDesktopBridge()?.folders`)
    expect(store).toContain(`loadNativeFileTree`)
  })

  it(`插入动作位于内容工具栏，最近图片位于文件菜单`, () => {
    const toolbar = readSource(`apps/web/src/components/editor/MarkdownToolbar.vue`)
    const fileMenu = readSource(`apps/web/src/components/editor/editor-header/FileDropdown.vue`)
    const settingsMenu = readSource(`apps/web/src/components/editor/editor-header/SettingsDropdown.vue`)
    const header = readSource(`apps/web/src/components/editor/editor-header/index.vue`)

    for (const label of [`插入图片`, `批量插入图片`, `按链接插入图片`, `插入表格`, `公众号名片`]) {
      expect(toolbar).toContain(label)
    }
    expect(fileMenu).toContain(`最近使用的图片`)
    expect(settingsMenu).toContain(`图床配置`)
    expect(settingsMenu).not.toContain(`排版样式`)
    expect(header).toContain(`<SettingsDropdown`)
    expect(header).not.toContain(`<InsertDropdown`)
  })

  it(`图床设置不再包含上传入口`, () => {
    const settings = readSource(`apps/web/src/components/editor/UploadImgDialog.vue`)
    const editor = readSource(`apps/web/src/views/CodemirrorEditor.vue`)

    expect(settings).toContain(`<DialogTitle>图床设置</DialogTitle>`)
    expect(settings).not.toContain(`<TabsTrigger value="upload"`)
    expect(settings).not.toContain(`点击上传`)
    expect(editor).not.toContain(`@upload-image="uploadImage"`)
  })

  it(`单张、批量和链接入口打开互不重叠的独立模式`, () => {
    const toolbar = readSource(`apps/web/src/components/editor/MarkdownToolbar.vue`)
    const quickInsert = readSource(`apps/web/src/components/editor/ImageQuickInsertDialog.vue`)

    expect(toolbar).toContain("openQuickInsert(`single`)")
    expect(toolbar).toContain("openQuickInsert(`batch`)")
    expect(toolbar).toContain("openQuickInsert(`link`)")
    expect(quickInsert).not.toContain(`<Tabs v-model="activeTab"`)
    expect(quickInsert).toContain(`activeTab === 'single'`)
    expect(quickInsert).toContain(`:multiple="activeTab === 'batch'"`)
  })

  it(`预览中的普通图片和图文排版复用板块删除浮层`, () => {
    const editor = readSource(`apps/web/src/views/CodemirrorEditor.vue`)

    expect(editor).toContain(`[data-src-kind="image"]`)
    expect(editor).toContain(`section.md-media-block`)
    expect(editor).toContain(`resolveMarkdownSourceRange(current, sourceKind, sourceOrdinal)`)
    expect(editor).toContain(`parseMediaLayoutBlocks(current)`)
  })

  it(`内容管理桌面栏可以直接收起`, () => {
    const posts = readSource(`apps/web/src/components/editor/post-slider/index.vue`)

    expect(posts).toContain(`PanelLeftClose`)
    expect(posts).toContain(`收起内容管理`)
    expect(posts).toContain(`@click="isOpenPostSlider = false"`)
  })

  it(`文件菜单不再展示正文模板入口`, () => {
    const fileMenu = readSource(`apps/web/src/components/editor/editor-header/FileDropdown.vue`)

    expect(fileMenu).not.toContain(`正文模板`)
    expect(fileMenu).not.toContain(`openTemplateDialog`)
  })

  it(`内容工具栏靠左排列并提供可见的横向滚动条`, () => {
    const toolbar = readSource(`apps/web/src/components/editor/MarkdownToolbar.vue`)

    expect(toolbar).not.toContain(`文字工具`)
    expect(toolbar).not.toContain(`先选中文字，再点格式`)
    expect(toolbar).not.toContain(`markdown-toolbar__lead`)
    expect(toolbar).toContain(`scrollbar-width: thin`)
    expect(toolbar).toContain(`::-webkit-scrollbar`)
  })

  it(`编辑区、样式区和板块库顶部只保留必要信息`, () => {
    const editor = readSource(`apps/web/src/views/CodemirrorEditor.vue`)
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const blocks = readSource(`apps/web/src/components/editor/ImageLayoutWorkspace.vue`)

    expect(editor).not.toContain(`viewModeLabel`)
    expect(styles).not.toContain(`在右侧预览里点任意文字、图片或代码`)
    expect(blocks).not.toContain(`选样式、填内容，像拼积木一样组合公众号排版。`)
    expect(blocks).not.toContain(`独立配色`)
  })
})
