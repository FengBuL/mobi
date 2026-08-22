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
    expect(source).toContain(`schedulePersist`)
    expect(source).toContain(`replaceRange`)
    expect(source).toContain(`composeHistory`)
    expect(source).toContain(`armBlockFieldEditJoin`)
    expect(source).toContain(`isOpenRightSlider`)
    const editorStore = readSource(`apps/web/src/stores/editor.ts`)
    expect(editorStore).toContain(`isolateHistory`)
    expect(editorStore).not.toContain(`from '@codemirror/commands'`)
    expect(source).not.toContain(`更新到正文`)
  })

  it(`本地文件夹是导入源，编辑器不写回原文件`, () => {
    const panel = readSource(`apps/web/src/components/editor/FolderSourcePanel.vue`)
    const store = readSource(`apps/web/src/stores/folderSource.ts`)
    const sync = readSource(`apps/web/src/composables/useDraftFileSync.ts`)

    expect(panel).toContain(`draftFileSyncKey`)
    expect(panel).toContain(`全部写出`)
    expect(panel).toContain(`不会写回原文件`)
    expect(panel).toContain(`稿子存在浏览器里，清缓存会丢`)
    expect(panel).not.toContain(`localhost:5173/mobi/`)
    expect(panel).not.toContain(`同步`)
    expect(store).toContain("mode: `readwrite`")
    expect(store).toContain(`createWritable`)
    expect(store).toContain(`writeFile,`)
    expect(store).toContain(`typeof mostRecent.handle.queryPermission`)
    expect(store).toContain(`loadDirectoryChildren`)
    expect(store).toContain(`void saveFolderHandle({`)
    expect(store).toContain(`getDesktopBridge()?.folders`)
    expect(store).toContain(`loadNativeFileTree`)
    expect(sync).toContain(`exportAllPostsToFolder`)
    expect(sync).toContain(`importedFrom`)
    expect(sync).toContain(`不写回原文件`)
    expect(sync).toContain(`unarchiveFile`)
    expect(sync).not.toContain(`writeBoundPost`)
    expect(sync).not.toContain(`watchDebounced`)
    expect(sync).not.toContain(`three-way`)
  })

  it(`插入动作位于内容工具栏，文件菜单不再单独放最近图片`, () => {
    const toolbar = readSource(`apps/web/src/components/editor/MarkdownToolbar.vue`)
    const fileMenu = readSource(`apps/web/src/components/editor/editor-header/FileDropdown.vue`)
    const settingsMenu = readSource(`apps/web/src/components/editor/editor-header/SettingsDropdown.vue`)
    const header = readSource(`apps/web/src/components/editor/editor-header/index.vue`)

    expect(toolbar).toContain(`插入图片`)
    expect(toolbar).toContain(`插入表格`)
    expect(toolbar).toContain(`公众号名片`)
    expect(toolbar).not.toContain(`批量图片`)
    expect(toolbar).not.toContain(`图片链接`)
    expect(fileMenu).not.toContain(`最近使用的图片`)
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

  it(`工具栏只保留一个插图入口，对话框内再切换模式`, () => {
    const toolbar = readSource(`apps/web/src/components/editor/MarkdownToolbar.vue`)
    const quickInsert = readSource(`apps/web/src/components/editor/ImageQuickInsertDialog.vue`)

    expect(toolbar).toContain("openQuickInsert(`single`)")
    expect(toolbar).not.toContain("openQuickInsert(`batch`)")
    expect(toolbar).not.toContain("openQuickInsert(`link`)")
    expect(quickInsert).not.toContain(`<Tabs v-model="activeTab"`)
    expect(quickInsert).toContain(`activeTab === 'single'`)
    expect(quickInsert).toContain(`:multiple="activeTab === 'batch'"`)
    expect(quickInsert).toContain(`id: \`batch\``)
    expect(quickInsert).toContain(`id: \`link\``)
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

  it(`内容工具栏窄栏换行，不再靠横滑才能点到插图和表格`, () => {
    const toolbar = readSource(`apps/web/src/components/editor/MarkdownToolbar.vue`)

    expect(toolbar).not.toContain(`文字工具`)
    expect(toolbar).not.toContain(`先选中文字，再点格式`)
    expect(toolbar).not.toContain(`markdown-toolbar__lead`)
    expect(toolbar).toContain(`flex-wrap: wrap`)
    expect(toolbar).toContain(`container-type: inline-size`)
    expect(toolbar).not.toContain(`overflow-x: auto`)
  })

  it(`板块库不占顶栏和第二栏，入口在预览上方`, () => {
    const header = readSource(`apps/web/src/components/editor/editor-header/index.vue`)
    const editor = readSource(`apps/web/src/views/CodemirrorEditor.vue`)
    const drawer = readSource(`apps/web/src/components/editor/WorkspaceDrawer.vue`)
    const editMenu = readSource(`apps/web/src/components/editor/editor-header/EditDropdown.vue`)

    expect(header).not.toContain(`板块库`)
    expect(header).toContain(`复制到公众号`)
    expect(header).toContain(`v-if="workspaceMode === 'professional' && !isMobile"`)
    expect(editor).toContain(`换样子`)
    expect(editor).toContain(`const showBlockRail = computed(() => false)`)
    expect(editor).not.toContain(`readingTimeLabel`)
    expect(editor).not.toContain(`currentPostUpdateLabel`)
    expect(drawer).toContain(`active === \`blocks\``)
    expect(drawer).toContain(`left-0`)
    expect(drawer).toContain(`translateX(-100%)`)
    expect(drawer).toContain(`panel.value === \`posts\` || panel.value === \`folder\``)
    expect(editMenu).toContain(`换样子`)
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

  it(`板块列表保持原位并把当前板块编辑器送到右侧检查器`, () => {
    const workspace = readSource(`apps/web/src/components/editor/HeadingBlockWorkspace.vue`)
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const uiStore = readSource(`apps/web/src/stores/ui.ts`)

    expect(workspace).toContain("mode?: `library` | `inspector`")
    expect(workspace).toContain(`v-if="mode === 'library'"`)
    expect(workspace).toContain(`uiStore.openBlockInspector()`)
    expect(styles).toContain(`当前组件`)
    expect(styles).toContain(`全局样式`)
    expect(styles).toContain(`id="block-inspector-slot"`)
    expect(styles).toContain(`mode="inspector"`)
    expect(uiStore).toContain(`function openBlockInspector()`)
    expect(uiStore).toContain(`isOpenRightSlider.value = true`)
    expect(uiStore).not.toContain(`isSimpleWorkspace.value && isOpenRightSlider.value`)
    expect(styles).toContain(`activeInspectorPanel.value = \`component\``)
    expect(styles).toContain(`.block-inspector-slot`)
    expect(workspace).toContain(`font-family: inherit`)
    expect(readSource(`packages/shared/src/configs/theme-css/base.css`)).toContain(`#output section`)
    expect(readSource(`packages/shared/src/configs/theme-css/base.css`)).not.toMatch(/^section,\s*$/m)
  })

  it(`点预览组件保持选中并打开检查器，不抢到全局样式`, () => {
    const editor = readSource(`apps/web/src/views/CodemirrorEditor.vue`)

    expect(editor).toContain(`uiStore.openBlockInspector()`)
    expect(editor).toContain(`不要取消选中`)
    expect(editor).toContain(`const styleTarget = resolveStyleTarget(target)`)
    expect(editor.indexOf(`uiStore.openBlockInspector()`)).toBeLessThan(editor.indexOf(`const styleTarget = resolveStyleTarget(target)`))
  })

  it(`打开封面是为编辑而生`, () => {
    const splash = readSource(`apps/web/index.html`)

    expect(splash).toContain(`为编辑而生`)
    expect(splash).not.toContain(`<p class="app-splash__tagline">写完就能贴进公众号</p>`)
  })

  it(`全局字体和主题色使用紧凑控件释放组件编辑空间`, () => {
    const controls = readSource(`apps/web/src/components/editor/StyleQuickControls.vue`)
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)

    expect(controls).not.toContain(`filteredFontOptions`)
    expect(controls).not.toContain(`selectedFontCategory`)
    expect(controls).toContain(`全局字体`)
    expect(controls).toContain(`grid-cols-8`)
    expect(styles).toContain(`grid-cols-2 gap-2`)
  })

  it(`新插入同款组件使用编辑器返回的精确范围`, () => {
    const editorStore = readSource(`apps/web/src/stores/editor.ts`)
    const workspace = readSource(`apps/web/src/components/editor/HeadingBlockWorkspace.vue`)

    expect(editorStore).toContain(`return { from: from + leading.length`)
    expect(editorStore).toContain(`const insertBlockAtEnd`)
    expect(workspace).toContain(`const insertedRange = editorStore.insertBlockAtEnd(markup, { preserveBlockSelection: true })`)
    expect(workspace).not.toContain(`nextContent.indexOf(markup)`)
  })

  it(`组件实时写回时保留当前检查器选择`, () => {
    const editorStore = readSource(`apps/web/src/stores/editor.ts`)
    const editor = readSource(`apps/web/src/views/CodemirrorEditor.vue`)
    const workspace = readSource(`apps/web/src/components/editor/HeadingBlockWorkspace.vue`)

    expect(editorStore).toContain(`Annotation.define<boolean>()`)
    expect(editorStore).toContain(`preserveBlockSelection?: boolean`)
    expect(editor).toContain(`transaction.annotation(blockSelectionTransaction)`)
    expect(workspace).toContain(`preserveBlockSelection: true`)
  })

  it(`样式面板不渲染说明、状态摘要或精细调节提示`, () => {
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const quickControls = readSource(`apps/web/src/components/editor/StyleQuickControls.vue`)
    const field = readSource(`apps/web/src/components/editor/theme-designer/ThemeDesignerField.vue`)
    const groupCard = readSource(`apps/web/src/components/editor/theme-designer/ThemeDesignerGroupCard.vue`)
    const draftControls = readSource(`apps/web/src/components/editor/theme-designer/ThemeDraftControls.vue`)
    const diffDialog = readSource(`apps/web/src/components/editor/theme-designer/ThemeDesignerDiffDialog.vue`)

    expect(styles).not.toContain(`当前状态：`)
    expect(styles).not.toContain(`引用、列表、表格这些内容块的外观`)
    expect(styles).not.toContain(`适合教程和调试类文章`)
    expect(styles).not.toContain(`右键可编辑、导出或删除`)
    expect(quickControls).not.toContain(`先确定整体阅读气质`)
    expect(quickControls).not.toContain(`当前跟随主题的出厂配色`)
    expect(field).not.toContain(`field.hint`)
    expect(field).not.toContain(`option.desc`)
    expect(groupCard).not.toContain(`group.desc`)
    expect(draftControls).not.toContain(`设置在公众号里可能失效`)
    expect(diffDialog).not.toContain(`公众号兼容性提醒`)
    expect(diffDialog).not.toContain(`当前完全等同于内置主题`)
  })

  it(`方案和版式各自只有一个紧凑选择入口`, () => {
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const helpers = readSource(`apps/web/src/utils/style-panel.ts`)

    expect(styles).toContain(`方案`)
    expect(styles).toContain(`版式`)
    expect(styles).toContain(`themeSelectOptions`)
    expect(helpers).toContain(`\${category.category} · \${theme.label}`)
    expect(styles).not.toContain(`themeCategoryNames`)
    expect(styles).not.toContain(`filteredThemeOptions`)
    expect(styles).not.toContain(`grid grid-cols-2 gap-2\">\n              <ContextMenu v-for`)
  })

  it(`版式选择器支持有边界的滚轮切换`, () => {
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)

    expect(styles).toContain(`stepSelectValue`)
    expect(styles).toContain(`handleThemeWheel`)
    expect(styles).toContain(`@wheel="handleThemeWheel"`)
    expect(styles).toContain(`@keydown.down.prevent="handleThemeKeyStep(1)"`)
    expect(styles).toContain(`@keydown.up.prevent="handleThemeKeyStep(-1)"`)
    expect(styles).toContain(`event.preventDefault()`)
  })

  it(`方案可退出且手动修改后回到当前自定义`, () => {
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)

    expect(styles).toContain(`leaveActiveStylePreset`)
    expect(styles).toContain(`cancelActiveStylePreset`)
    expect(styles).toContain(`appliedPresetSignature`)
    expect(styles).not.toContain(`<SelectItem :value="CUSTOM_STYLE_PRESET_PLACEHOLDER" disabled>`)
  })

  it(`方案使用就地命名和可见保存反馈`, () => {
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const helpers = readSource(`apps/web/src/utils/style-panel.ts`)

    expect(styles).toContain(`savePresetName`)
    expect(styles).toContain(`savePresetError`)
    expect(styles).toContain(`savePresetFeedback`)
    expect(styles).toContain(`保存方案`)
    expect(helpers).toContain(`方案名称不能为空`)
    expect(styles).toContain(`方案保存失败`)
    expect(styles).not.toContain(`window.prompt(\`请输入预设名称\``)
  })

  it(`标题预设和 H1-H6 精细设置合并到同一卡片`, () => {
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const heading = readSource(`apps/web/src/components/editor/theme-designer/ThemeDesignerHeadingCard.vue`)

    expect(styles).not.toContain(`标题装饰`)
    expect(heading).toContain(`headingStyleOptions`)
    expect(heading).toContain(`selectedHeadingStyle`)
    expect(heading).toContain("![`decoration`, `decorationColor`].includes(field.key)")
    expect(heading).toContain(`全部标题恢复默认`)
  })

  it(`预览快捷条可切换第一层主题并打开更多`, () => {
    const quickBar = readSource(`apps/web/src/components/editor/ThemeQuickBar.vue`)

    expect(quickBar).toContain(`专栏`)
    expect(quickBar).toContain(`科技`)
    expect(quickBar).toContain(`教程`)
    expect(quickBar).toContain(`克制`)
    expect(quickBar).toContain(`中式`)
    expect(quickBar).toContain(`更多`)
    expect(quickBar).toContain(`buildMoreThemeSamples`)
    expect(quickBar).toContain(`theme-sample`)
    expect(quickBar).toContain(`themeChanged`)
    expect(quickBar).toContain(`applyCurrentTheme`)
    expect(quickBar).toContain(`全局样式`)
    expect(quickBar).toContain("focusStyleGroup(`text`, `base`)")
    expect(quickBar).toContain(`countVisibleThemeCards`)
    expect(quickBar).toContain(`visibleCards`)
    expect(quickBar).not.toContain(`<StyleQuickControls`)
  })

  it(`方案删除、取消和刷新恢复共享首次应用前快照`, () => {
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)

    expect(styles).toContain(`STYLE_PRESET_SESSION_KEY`)
    expect(styles).toContain(`cancelActiveStylePreset`)
    expect(styles).toContain(`deleteCustomStylePreset`)
    expect(styles).toContain(`删除方案`)
    expect(styles).toContain(`action: { label: \`撤销\``)
    expect(styles).not.toContain(`@click="clearActiveStylePreset"`)
  })

  it(`自定义版式删除可撤销且内置版式没有删除入口`, () => {
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const designer = readSource(`apps/web/src/stores/themeDesigner.ts`)

    expect(styles).toContain(`deleteCustomVisualTheme`)
    expect(styles).toContain(`undoDeleteCustomVisualTheme`)
    expect(styles).toContain(`删除版式`)
    expect(designer).toContain(`restoreCustomTheme`)
  })

  it(`版式整体恢复进入统一历史且标题局部恢复语义明确`, () => {
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const designer = readSource(`apps/web/src/stores/themeDesigner.ts`)
    const heading = readSource(`apps/web/src/components/editor/theme-designer/ThemeDesignerHeadingCard.vue`)

    expect(styles).toContain(`restoreCurrentLayout`)
    expect(styles).toContain(`恢复当前版式`)
    expect(styles).not.toContain(`@click="resetTemplateGroup"`)
    expect(designer).toContain(`setHistoryContextAdapter`)
    expect(designer).toContain(`checkpoint`)
    expect(heading).toContain(`恢复本级标题`)
  })

  it(`自动排版位于内容工具栏首位并通过单事务更新整篇`, () => {
    const toolbar = readSource(`apps/web/src/components/editor/MarkdownToolbar.vue`)

    expect(toolbar).toContain(`autoFormatContent`)
    expect(toolbar).toContain(`createAutoFormatTransaction`)
    expect(toolbar).toContain(`aria-label="自动排版"`)
    expect(toolbar).toContain(`title="自动排版"`)
    expect(toolbar).toContain(`markdown-toolbar__button:focus-visible`)
    expect(toolbar.indexOf(`@click="autoFormatContent"`)).toBeLessThan(toolbar.indexOf(`v-for="(group, groupIndex) in groups"`))
    expect(toolbar).not.toContain(`fetch(`)
  })

  it(`切回专业会打开样式面板，文件菜单写明文件夹不可用的原因`, () => {
    const uiStore = readSource(`apps/web/src/stores/ui.ts`)
    const files = readSource(`apps/web/src/components/editor/editor-header/FileDropdown.vue`)
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const insert = readSource(`apps/web/src/components/editor/ImageQuickInsertDialog.vue`)
    const html = readSource(`apps/web/index.html`)
    const dialog = readSource(`apps/web/src/components/ui/dialog/DialogContent.vue`)
    const robots = readSource(`apps/web/public/robots.txt`)
    const sitemap = readSource(`apps/web/public/sitemap.xml`)
    const redirects = readSource(`apps/web/public/_redirects`)

    expect(uiStore).toContain(`mode === \`professional\` && !isMobile.value`)
    expect(uiStore).toContain(`isOpenRightSlider.value = true`)
    expect(files).toContain(`folderActionReason`)
    expect(files).toContain(`导入 Markdown`)
    expect(files).toContain(`:disabled="openFolderDisabled"`)
    expect(styles).toContain(`grid-cols-2`)
    expect(insert).toContain(`还没选图床`)
    expect(html).not.toContain(`user-scalable=no`)
    expect(dialog).toContain(`>关闭<`)
    expect(robots).toContain(`Sitemap: https://mobieditor.cn/sitemap.xml`)
    expect(sitemap).toContain(`https://mobieditor.cn/`)
    expect(redirects).not.toContain(`/*`)
  })

  it(`号、历史和当前组件不再串稿`, () => {
    const settings = readSource(`apps/web/src/components/editor/editor-header/SettingsDropdown.vue`)
    const profiles = readSource(`apps/web/src/stores/accountProfile.ts`)
    const posts = readSource(`apps/web/src/components/editor/post-slider/index.vue`)
    const styles = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    const drawer = readSource(`apps/web/src/components/editor/WorkspaceDrawer.vue`)

    expect(settings).toContain(`会切到新号并新建一篇「未命名」`)
    expect(settings).not.toContain(`profileStore.createProfile()`)
    expect(profiles).toContain(`if (resolved !== currentProfileId.value) {\n      return`)
    expect(posts).toContain(`belongsToCurrentProfile`)
    expect(posts).toContain(`post.profileId === currentProfileId.value`)
    expect(posts).not.toContain(`!post.profileId ||`)
    expect(posts).toContain(`没有改当前这篇`)
    expect(styles).not.toContain(`COMPONENT`)
    expect(styles).not.toContain(`从板块库选择一个组件`)
    expect(styles).toContain(`blockSelection && activeInspectorPanel === 'component'`)
    expect(drawer).toContain(`closeAuxPanel`)
  })

  it(`390 关栏、文件夹标题、查找和导出按验收收口`, () => {
    const app = readSource(`apps/web/src/App.vue`)
    const editor = readSource(`apps/web/src/views/CodemirrorEditor.vue`)
    const sync = readSource(`apps/web/src/composables/useDraftFileSync.ts`)
    const search = readSource(`apps/web/src/components/ui/search-tab/SearchTab.vue`)
    const exportStore = readSource(`apps/web/src/stores/export.ts`)
    const pdf = readSource(`apps/web/src/utils/index.ts`)
    const edit = readSource(`apps/web/src/components/editor/editor-header/EditDropdown.vue`)
    const templates = readSource(`apps/web/src/components/editor/TemplateDialog.vue`)
    const menu = readSource(`apps/web/src/components/editor/EditorContextMenu.vue`)
    const logo = readSource(`apps/web/src/components/editor/MpAccountConfigDialog.vue`)

    expect(app).toContain(`width: 100%`)
    expect(app).toContain(`overflow-x: hidden`)
    expect(app).not.toContain(`width: 100vw`)
    expect(editor).toContain(`PostSlider v-if="isOpenPostSlider"`)
    expect(editor).toContain(`handlePreviewContextMenu`)
    expect(sync).toContain(`titleFromImportedMarkdown`)
    expect(sync).not.toMatch(/if \(existing\)[\s\S]{0,400}renamePost/)
    expect(sync).not.toMatch(/if \(existing\)[\s\S]{0,400}renamePost/)
    expect(search).toContain(`findPlainMatches`)
    expect(search).toContain(`regexFlags`)
    expect(exportStore).toContain(`#111111`)
    expect(exportStore).toContain(`已下载 PNG`)
    expect(pdf).toContain(`afterprint`)
    expect(edit).toContain(`undoAction`)
    expect(templates).toContain(`应用模板会替换当前正文`)
    expect(menu).toContain(`重置文档会换成默认稿`)
    expect(logo).toContain(`value?.trim() ? value.trim() : undefined`)
  })
})
