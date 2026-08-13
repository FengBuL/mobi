import { addPrefix } from '@/utils'
import { store } from '@/utils/storage'

export type WorkspaceMode = 'simple' | 'professional'

/** 简洁模式下共用一个抽屉位置的辅助面板 */
export type AuxPanel = 'posts' | 'folder' | 'blocks' | 'css' | 'style'

const WORKSPACE_MODE_KEY = addPrefix(`workspace_mode`)

/**
 * UI 状态 Store
 * 负责管理全局 UI 状态，包括深色模式、侧边栏、对话框等
 */
export const useUIStore = defineStore(`ui`, () => {
  // ==================== 全局 UI 状态 ====================
  const mobileKeyboardInset = ref(0)
  const isMobileKeyboardOpen = computed(() => mobileKeyboardInset.value > 0)
  const hasFocusedEditable = ref(false)
  const mobileViewportBaselineHeight = ref(0)

  // 是否开启深色模式
  const isDark = useDark()
  const toggleDark = useToggle(isDark)

  // 是否在左侧编辑
  const isEditOnLeft = store.reactive(`isEditOnLeft`, true)
  const toggleEditOnLeft = useToggle(isEditOnLeft)

  // 是否打开右侧滑块
  const isOpenRightSlider = store.reactive(addPrefix(`is_open_right_slider`), false)

  // 是否打开文章列表滑块
  const isOpenPostSlider = store.reactive(addPrefix(`is_open_post_slider`), false)

  // 是否打开本地文件夹面板
  const isOpenFolderPanel = store.reactive(addPrefix(`is_open_folder_panel`), false)

  // 是否为移动端
  const isMobile = store.reactive(`isMobile`, false)

  // 视图模式：edit（纯编辑）| split（双屏）| preview（纯预览）
  const viewMode = store.reactive<'edit' | 'split' | 'preview'>(`viewMode`, `split`)

  function setViewMode(mode: `edit` | `split` | `preview`) {
    viewMode.value = mode
  }

  // 预览设备：desktop（电脑端）| mobile（移动端模拟）
  const previewDevice = store.reactive<'desktop' | 'mobile'>(`previewDevice`, `mobile`)

  function setPreviewDevice(device: `desktop` | `mobile`) {
    previewDevice.value = device
  }

  function togglePreviewDevice() {
    previewDevice.value = previewDevice.value === `desktop` ? `mobile` : `desktop`
  }

  // 是否固定显示浮动目录
  const isPinFloatingToc = store.reactive(addPrefix(`isPinFloatingToc`), false)
  const togglePinFloatingToc = useToggle(isPinFloatingToc)

  // 是否显示浮动目录
  const isShowFloatingToc = store.reactive(addPrefix(`isShowFloatingToc`), true)
  const toggleShowFloatingToc = useToggle(isShowFloatingToc)

  // 是否启用图片转存（默认关闭）
  const enableImageReupload = store.reactive(addPrefix(`enableImageReupload`), false)
  const toggleImageReupload = useToggle(enableImageReupload)

  // ==================== 对话框状态 ====================
  // 是否展示 CSS 编辑器
  const isShowCssEditor = store.reactive(`isShowCssEditor`, false)
  const toggleShowCssEditor = useToggle(isShowCssEditor)

  // 是否展示插入表格对话框
  const isShowInsertFormDialog = ref(false)
  const toggleShowInsertFormDialog = useToggle(isShowInsertFormDialog)

  // 是否展示插入公众号名片对话框
  const isShowInsertMpCardDialog = ref(false)
  const toggleShowInsertMpCardDialog = useToggle(isShowInsertMpCardDialog)

  // 是否展示上传图片对话框
  const isShowUploadImgDialog = ref(false)
  const toggleShowUploadImgDialog = useToggle(isShowUploadImgDialog)

  // 是否展示图片排版对话框
  const isShowImageLayoutDialog = ref(false)
  const toggleShowImageLayoutDialog = useToggle(isShowImageLayoutDialog)

  // 是否展示导入 Markdown 对话框
  const isShowImportMdDialog = ref(false)
  const toggleShowImportMdDialog = useToggle(isShowImportMdDialog)
  /** 通过 URL 参数 open 打开时传入的待导入链接，对话框打开后会据此自动执行导入 */
  const importMdOpenUrl = ref<string | null>(null)

  // 是否展示模板管理对话框
  const isShowTemplateDialog = ref(false)
  const toggleShowTemplateDialog = useToggle(isShowTemplateDialog)

  // 是否打开重置样式确认对话框
  const isOpenConfirmDialog = ref(false)

  // ==================== 工作区模式 ====================
  // simple 只留写作和预览，professional 解锁全部侧栏
  const workspaceMode = store.reactive<WorkspaceMode>(WORKSPACE_MODE_KEY, `simple`)
  const hasChosenWorkspaceMode = store.reactive(addPrefix(`workspace_mode_chosen`), false)

  // 板块库，专业模式下占编辑器与预览之间的一栏
  const isOpenBlockWorkspace = ref(false)

  // 移动端只有一栏，专业模式的多栏布局在这里没有落脚点
  const isSimpleWorkspace = computed(() => isMobile.value || workspaceMode.value === `simple`)

  const auxPanelFlags = {
    posts: isOpenPostSlider,
    folder: isOpenFolderPanel,
    blocks: isOpenBlockWorkspace,
    css: isShowCssEditor,
    style: isOpenRightSlider,
  }

  function closeAuxPanels(except?: AuxPanel) {
    for (const [name, flag] of Object.entries(auxPanelFlags)) {
      if (name !== except)
        flag.value = false
    }
  }

  // 专业模式下同时开三栏，编辑器和预览会被压到不到 200px，预览一行放不下几个字。
  // 分栏仍然可拖拽，这里只挡住「越开越窄直到不能用」这条路。
  const MAX_OPEN_RAILS = 2
  const railOpenOrder = ref<AuxPanel[]>([])

  for (const [key, flag] of Object.entries(auxPanelFlags)) {
    const name = key as AuxPanel
    watch(flag, (open) => {
      if (!open) {
        railOpenOrder.value = railOpenOrder.value.filter(item => item !== name)
        return
      }

      // 简洁模式下这些面板共用同一个抽屉位置，同时开会叠在一起
      if (isSimpleWorkspace.value) {
        closeAuxPanels(name)
        railOpenOrder.value = [name]
        return
      }

      const next = [...railOpenOrder.value.filter(item => item !== name), name]
      const overflow = next.splice(0, Math.max(0, next.length - MAX_OPEN_RAILS))
      railOpenOrder.value = next
      overflow.forEach((item) => {
        auxPanelFlags[item].value = false
      })
    })
  }

  const activeAuxPanel = computed(() => {
    const names = Object.keys(auxPanelFlags) as AuxPanel[]
    return names.find(name => auxPanelFlags[name].value) ?? null
  })

  function setWorkspaceMode(mode: WorkspaceMode, remember = true) {
    workspaceMode.value = mode
    // 选中的正好是当前值时持久化 watch 不会触发，本地存储里会一直缺这条记录
    void store.set(WORKSPACE_MODE_KEY, mode)

    if (remember)
      hasChosenWorkspaceMode.value = true

    closeAuxPanels()
  }

  // 搜索面板状态
  const searchTabRequest = ref<{ word: string, showReplace: boolean } | null>(null)

  function openSearchTab(searchWord: string = ``, showReplace: boolean = false) {
    searchTabRequest.value = { word: searchWord, showReplace }
  }

  function clearSearchTabRequest() {
    searchTabRequest.value = null
  }

  // ==================== 从预览反查样式 ====================
  /**
   * 在预览里点到某个元素时，把样式面板翻到管这个元素的设置组。
   *
   * 只在面板已经打开时才跟随：写作时点预览是为了定位原文，
   * 这时候弹出面板反而碍事。
   */
  const styleFocusRequest = ref<{ panel: string, groupId?: string, headingLevel?: string, seq: number } | null>(null)
  let styleFocusSeq = 0

  function focusStyleGroup(panel: string, groupId?: string, headingLevel?: string) {
    if (!isOpenRightSlider.value) {
      return
    }

    styleFocusSeq += 1
    styleFocusRequest.value = { panel, groupId, headingLevel, seq: styleFocusSeq }
  }

  /**
   * 在预览里点到标题、引用这类能换板块样式的元素时，把板块库叫出来。
   *
   * 标题、引用这些类别由板块库自己跟着 blockSelection 切，不用传 category；
   * 图片走的是图文排版那套，不在 blockSelection 的类型里，得显式指定。
   */
  const blockLibraryCategoryRequest = ref<{ category: string, mediaBlockIndex?: number, seq: number } | null>(null)
  let blockLibrarySeq = 0

  function focusBlockLibrary(category?: string, mediaBlockIndex?: number) {
    // 移动端板块库是全屏对话框，自动弹出会盖住正文
    if (isMobile.value) {
      return
    }

    // 简洁模式下侧边只有一个抽屉位，样式面板开着就说明用户在调样式，别抢
    if (isSimpleWorkspace.value && isOpenRightSlider.value) {
      return
    }

    isOpenBlockWorkspace.value = true

    if (category) {
      blockLibrarySeq += 1
      blockLibraryCategoryRequest.value = { category, mediaBlockIndex, seq: blockLibrarySeq }
    }
  }

  // ==================== 工具函数 ====================
  // 处理窗口大小变化
  function handleResize() {
    isMobile.value = window.innerWidth <= 768
    if (isMobile.value && viewMode.value === `split`) {
      viewMode.value = `edit`
    }
    if (!isMobile.value) {
      mobileViewportBaselineHeight.value = 0
    }
    updateMobileKeyboardInset()
  }

  function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement))
      return false

    if (target.isContentEditable)
      return true

    if (target.closest(`.cm-editor`))
      return true

    if (target instanceof HTMLTextAreaElement)
      return true

    if (target instanceof HTMLInputElement) {
      return ![`button`, `checkbox`, `color`, `file`, `hidden`, `radio`, `range`, `reset`, `submit`].includes(target.type)
    }

    return false
  }

  function updateFocusedEditableState() {
    hasFocusedEditable.value = isEditableTarget(document.activeElement)
  }

  function updateMobileKeyboardInset() {
    const viewport = window.visualViewport
    if (!viewport || !isMobile.value) {
      mobileKeyboardInset.value = 0
      return
    }

    const viewportHeight = Math.round(viewport.height)
    if (mobileViewportBaselineHeight.value === 0) {
      mobileViewportBaselineHeight.value = viewportHeight
    }

    if (!hasFocusedEditable.value) {
      mobileViewportBaselineHeight.value = Math.max(mobileViewportBaselineHeight.value, viewportHeight)
    }

    const baselineHeight = Math.max(mobileViewportBaselineHeight.value, viewportHeight)
    const heightLoss = Math.max(0, baselineHeight - viewportHeight)
    const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)

    // iPhone Safari 的地址栏/工具栏变化不应被视为软键盘。
    // 只有当可编辑元素聚焦且可视高度明显少于“无输入时基准高度”时，才认定键盘打开。
    const isLikelyKeyboard = hasFocusedEditable.value && heightLoss > 220
    mobileKeyboardInset.value = isLikelyKeyboard ? Math.round(Math.max(inset, heightLoss)) : 0
  }

  onMounted(() => {
    handleResize()
    updateFocusedEditableState()
    window.addEventListener(`resize`, handleResize)
    window.visualViewport?.addEventListener(`resize`, updateMobileKeyboardInset)
    window.visualViewport?.addEventListener(`scroll`, updateMobileKeyboardInset)
    document.addEventListener(`focusin`, updateFocusedEditableState, true)
    document.addEventListener(`focusout`, updateFocusedEditableState, true)
  })

  onBeforeUnmount(() => {
    window.removeEventListener(`resize`, handleResize)
    window.visualViewport?.removeEventListener(`resize`, updateMobileKeyboardInset)
    window.visualViewport?.removeEventListener(`scroll`, updateMobileKeyboardInset)
    document.removeEventListener(`focusin`, updateFocusedEditableState, true)
    document.removeEventListener(`focusout`, updateFocusedEditableState, true)
  })

  return {
    // ==================== 全局 UI 状态 ====================
    mobileKeyboardInset,
    isMobileKeyboardOpen,
    isDark,
    isEditOnLeft,
    isOpenRightSlider,
    isOpenPostSlider,
    isMobile,
    viewMode,
    previewDevice,
    isPinFloatingToc,
    isShowFloatingToc,
    isOpenFolderPanel,
    enableImageReupload,

    // ==================== 工作区模式 ====================
    workspaceMode,
    hasChosenWorkspaceMode,
    isOpenBlockWorkspace,
    isSimpleWorkspace,
    activeAuxPanel,
    closeAuxPanels,
    setWorkspaceMode,

    // ==================== 对话框状态 ====================
    isShowCssEditor,
    toggleShowCssEditor,
    isShowInsertFormDialog,
    toggleShowInsertFormDialog,
    isShowInsertMpCardDialog,
    toggleShowInsertMpCardDialog,
    isShowUploadImgDialog,
    toggleShowUploadImgDialog,
    isShowImageLayoutDialog,
    toggleShowImageLayoutDialog,
    isShowImportMdDialog,
    toggleShowImportMdDialog,
    importMdOpenUrl,
    isShowTemplateDialog,
    toggleShowTemplateDialog,
    isOpenConfirmDialog,

    // ==================== 搜索面板 ====================
    searchTabRequest,
    openSearchTab,
    clearSearchTabRequest,

    // ==================== 从预览反查样式 ====================
    styleFocusRequest,
    focusStyleGroup,
    focusBlockLibrary,
    blockLibraryCategoryRequest,

    // ==================== Actions ====================
    toggleDark,
    toggleEditOnLeft,
    togglePinFloatingToc,
    toggleShowFloatingToc,
    toggleImageReupload,
    setViewMode,
    setPreviewDevice,
    togglePreviewDevice,
  }
})
