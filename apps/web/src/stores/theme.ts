import type { HeadingLevel, HeadingStyles, HeadingStyleType, ThemeName } from '@md/shared/configs'
import { applyTheme } from '@md/core'
import { defaultStyleConfig, resolveThemeName, widthOptions } from '@md/shared/configs'
import { useCssEditorStore } from '@/stores/cssEditor'
import { addPrefix } from '@/utils'
import { store } from '@/utils/storage'

/**
 * 主题和样式配置 Store
 * 负责管理所有与主题、字体、颜色相关的配置
 */
export const useThemeStore = defineStore(`theme`, () => {
  // 文本主题
  const theme = store.reactive<ThemeName>(addPrefix(`theme`), defaultStyleConfig.theme)
  theme.value = resolveThemeName(theme.value)
  watch(theme, (value) => {
    const normalized = resolveThemeName(value)
    if (normalized !== value) {
      theme.value = normalized
    }
  })

  // 文本字体
  const fontFamily = store.reactive(`fonts`, defaultStyleConfig.fontFamily)

  // 文本大小
  const fontSize = store.reactive(`size`, defaultStyleConfig.fontSize)

  // 主色
  const primaryColor = store.reactive(`color`, defaultStyleConfig.primaryColor)

  // 代码块主题
  const codeBlockTheme = store.reactive(`codeBlockTheme`, defaultStyleConfig.codeBlockTheme)

  // 图注格式
  const legend = store.reactive(`legend`, defaultStyleConfig.legend)

  // 是否开启 Mac 代码块
  const isMacCodeBlock = store.reactive(`isMacCodeBlock`, defaultStyleConfig.isMacCodeBlock)

  // 是否开启代码块行号显示
  const isShowLineNumber = store.reactive(`isShowLineNumber`, defaultStyleConfig.isShowLineNumber)

  // 是否开启微信外链接底部引用
  const isCiteStatus = store.reactive(`isCiteStatus`, defaultStyleConfig.isCiteStatus)

  // 是否统计字数和阅读时间
  const isCountStatus = store.reactive(`isCountStatus`, defaultStyleConfig.isCountStatus)

  // 是否开启段落首行缩进
  const isUseIndent = store.reactive(addPrefix(`use_indent`), false)

  // 是否开启两端对齐
  const isUseJustify = store.reactive(addPrefix(`use_justify`), false)

  // 预览宽度
  const previewWidth = store.reactive(`previewWidth`, widthOptions[0].value)

  // 标题样式
  const headingStyles = store.reactive<HeadingStyles>(`headingStyles`, defaultStyleConfig.headingStyles)

  // ========== 表头装饰 ==========
  const isHeadingDecorationStatus = store.reactive(addPrefix(`heading_decoration_status`), false)
  const headingDecorationUrl = store.reactive(addPrefix(`heading_decoration_url`), ``)
  const headingDecorationPosition = store.reactive<'left' | 'above' | 'below'>(addPrefix(`heading_decoration_position`), `above`)

  // ========== 收藏/隐藏/保存 ==========
  const favoriteThemes = ref<string[]>(JSON.parse(localStorage.getItem(`md_favoriteThemes`) || `[]`))
  const hiddenThemes = ref<string[]>(JSON.parse(localStorage.getItem(`md_hiddenThemes`) || `[]`))
  const favoriteColors = ref<string[]>(JSON.parse(localStorage.getItem(`md_favoriteColors`) || `[]`))
  const hiddenColors = ref<string[]>(JSON.parse(localStorage.getItem(`md_hiddenColors`) || `[]`))
  const savedCustomColors = ref<string[]>(JSON.parse(localStorage.getItem(`md_savedCustomColors`) || `[]`))

  watch(favoriteThemes, v => localStorage.setItem(`md_favoriteThemes`, JSON.stringify(v)), { deep: true })
  watch(hiddenThemes, v => localStorage.setItem(`md_hiddenThemes`, JSON.stringify(v)), { deep: true })
  watch(favoriteColors, v => localStorage.setItem(`md_favoriteColors`, JSON.stringify(v)), { deep: true })
  watch(hiddenColors, v => localStorage.setItem(`md_hiddenColors`, JSON.stringify(v)), { deep: true })
  watch(savedCustomColors, v => localStorage.setItem(`md_savedCustomColors`, JSON.stringify(v)), { deep: true })

  // 计算属性
  const fontSizeNumber = computed(() => Number(fontSize.value.replace(`px`, ``)))

  // Toggle 方法
  const toggleMacCodeBlock = useToggle(isMacCodeBlock)
  const toggleShowLineNumber = useToggle(isShowLineNumber)
  const toggleCiteStatus = useToggle(isCiteStatus)
  const toggleCountStatus = useToggle(isCountStatus)
  const toggleUseIndent = useToggle(isUseIndent)
  const toggleUseJustify = useToggle(isUseJustify)
  const toggleHeadingDecorationStatus = useToggle(isHeadingDecorationStatus)

  // 重置样式
  const resetStyle = () => {
    isCiteStatus.value = defaultStyleConfig.isCiteStatus
    isMacCodeBlock.value = defaultStyleConfig.isMacCodeBlock
    isShowLineNumber.value = defaultStyleConfig.isShowLineNumber
    isCountStatus.value = defaultStyleConfig.isCountStatus

    theme.value = defaultStyleConfig.theme
    fontFamily.value = defaultStyleConfig.fontFamily
    fontSize.value = defaultStyleConfig.fontSize
    primaryColor.value = defaultStyleConfig.primaryColor
    codeBlockTheme.value = defaultStyleConfig.codeBlockTheme
    legend.value = defaultStyleConfig.legend
    headingStyles.value = { ...defaultStyleConfig.headingStyles }

    isUseIndent.value = false
    isUseJustify.value = false
    isHeadingDecorationStatus.value = false
    headingDecorationUrl.value = ``
    headingDecorationPosition.value = `above`
  }

  // 设置标题样式
  const setHeadingStyle = (level: HeadingLevel, style: HeadingStyleType) => {
    headingStyles.value = {
      ...headingStyles.value,
      [level]: style === `default` ? undefined : style,
    }
  }

  // 获取标题样式
  const getHeadingStyle = (level: HeadingLevel): HeadingStyleType => {
    return headingStyles.value[level] || `default`
  }

  // 切换 highlight.js 代码主题
  const updateCodeTheme = () => {
    const cssUrl = codeBlockTheme.value
    const el = document.querySelector(`#hljs`)

    if (el) {
      el.setAttribute(`href`, cssUrl)
    }
    else {
      const link = document.createElement(`link`)
      link.setAttribute(`type`, `text/css`)
      link.setAttribute(`rel`, `stylesheet`)
      link.setAttribute(`href`, cssUrl)
      link.setAttribute(`id`, `hljs`)
      document.head.appendChild(link)
    }
  }

  /**
   * 应用当前主题配置（新主题系统）
   * 使用 CSS 注入而非内联样式
   */
  const applyCurrentTheme = async () => {
    try {
      const cssEditorStore = useCssEditorStore()
      const customCSS = cssEditorStore.getCurrentTabContent()

      await applyTheme({
        themeName: theme.value,
        customCSS,
        variables: {
          primaryColor: primaryColor.value,
          fontFamily: fontFamily.value,
          fontSize: fontSize.value,
          isUseIndent: isUseIndent.value,
          isUseJustify: isUseJustify.value,
          headingStyles: headingStyles.value,
        },
      })
    }
    catch (error) {
      console.error(`[applyCurrentTheme] 主题应用失败:`, error)
    }
  }

  return {
    // State
    theme,
    fontFamily,
    fontSize,
    fontSizeNumber,
    primaryColor,
    codeBlockTheme,
    legend,
    isMacCodeBlock,
    isShowLineNumber,
    isCiteStatus,
    isCountStatus,
    isUseIndent,
    isUseJustify,
    previewWidth,
    headingStyles,
    isHeadingDecorationStatus,
    headingDecorationUrl,
    headingDecorationPosition,

    // 收藏/隐藏/保存
    favoriteThemes,
    hiddenThemes,
    favoriteColors,
    hiddenColors,
    savedCustomColors,

    // Actions
    toggleMacCodeBlock,
    toggleShowLineNumber,
    toggleCiteStatus,
    toggleCountStatus,
    toggleUseIndent,
    toggleUseJustify,
    toggleHeadingDecorationStatus,
    resetStyle,
    updateCodeTheme,
    applyCurrentTheme,
    setHeadingStyle,
    getHeadingStyle,
  }
})
