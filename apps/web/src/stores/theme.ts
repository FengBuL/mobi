import type { HeadingLevel, HeadingStyles, HeadingStyleType, ThemeName } from '@mobi/shared/configs'
import { applyTheme } from '@mobi/core'
import { defaultStyleConfig, getThemeDefaultPrimaryColor, resolveCodeBlockThemeUrl, resolveThemeName, widthOptions } from '@mobi/shared/configs'
import { useThemeDesignerStore } from '@/stores/themeDesigner'
import { addPrefix } from '@/utils'
import { store } from '@/utils/storage'

/**
 * 主题和样式配置 Store
 * 负责管理所有与主题、字体、颜色相关的配置
 */
/** 主色跟随主题还是用户自己定的 */
type PrimaryColorSource = 'theme' | 'manual'

/** 收敛之前所有主题共用的出厂主色，只用于一次性迁移判断 */
const LEGACY_FACTORY_PRIMARY = `#2851E3`

const PRIMARY_COLOR_KEY = `color`
const PRIMARY_COLOR_SOURCE_KEY = addPrefix(`primary_color_source`)

export const useThemeStore = defineStore(`theme`, () => {
  const themeDesignerStore = useThemeDesignerStore()

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
  const primaryColor = store.reactive(PRIMARY_COLOR_KEY, defaultStyleConfig.primaryColor)

  // 主色来源。切主题时会把主题的出厂强调色带过去，但用户自己调过的颜色不能被覆盖，
  // 所以要把这两种状态分开存。
  const primaryColorSource = store.reactive<PrimaryColorSource | 'unset'>(
    PRIMARY_COLOR_SOURCE_KEY,
    `unset`,
  )

  // store.reactive 的持久化 watch 要等下一个微任务才挂上，setup 阶段的赋值写不进本地存储。
  // 主色来源一旦丢失，下次进来会被迁移逻辑误判成「手动设定」，切主题就再也带不动颜色了。
  function writePrimaryColorSource(next: PrimaryColorSource) {
    primaryColorSource.value = next
    void store.set(PRIMARY_COLOR_SOURCE_KEY, next)
  }

  let suppressPrimaryColorSourceUpdate = false

  function assignPrimaryColorFromTheme(themeName: string) {
    const next = getThemeDefaultPrimaryColor(themeName)
    if (primaryColor.value === next) {
      return
    }
    suppressPrimaryColorSourceUpdate = true
    primaryColor.value = next
    void store.set(PRIMARY_COLOR_KEY, next)
  }

  // 一次性迁移：老用户没有这个字段。收敛之前 23 套主题共用同一个出厂主色，
  // 存的还是那个值就说明他没动过，可以放心跟随主题；改过就当成手动设定保留下来。
  if (primaryColorSource.value === `unset`) {
    writePrimaryColorSource(primaryColor.value === LEGACY_FACTORY_PRIMARY ? `theme` : `manual`)
  }

  if (primaryColorSource.value === `theme`) {
    assignPrimaryColorFromTheme(theme.value)
  }
  // 上面这次赋值发生在 watch 注册之前，标记不会被消费掉，必须手动归位
  suppressPrimaryColorSourceUpdate = false

  // 任何不是「跟随主题」写进来的颜色，都算用户显式设定
  watch(primaryColor, () => {
    if (suppressPrimaryColorSourceUpdate) {
      suppressPrimaryColorSourceUpdate = false
      return
    }
    writePrimaryColorSource(`manual`)
  })

  watch(theme, (value) => {
    if (primaryColorSource.value !== `theme`) {
      return
    }
    assignPrimaryColorFromTheme(value)
  })

  const isPrimaryColorFollowingTheme = computed(() => primaryColorSource.value === `theme`)

  /** 把主色交还给主题，之后再换主题就会继续跟随 */
  const followThemePrimaryColor = () => {
    writePrimaryColorSource(`theme`)
    assignPrimaryColorFromTheme(theme.value)
  }

  // 代码块主题
  const codeBlockTheme = store.reactive(`codeBlockTheme`, defaultStyleConfig.codeBlockTheme)

  // 图注格式
  const legend = store.reactive(`legend`, defaultStyleConfig.legend)

  // 是否开启 Mac 代码块
  const isShowCodeLanguage = store.reactive(`isShowCodeLanguage`, defaultStyleConfig.isShowCodeLanguage)

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
  const favoriteThemes = ref<string[]>(JSON.parse(localStorage.getItem(`mobi_favoriteThemes`) || `[]`))
  const hiddenThemes = ref<string[]>(JSON.parse(localStorage.getItem(`mobi_hiddenThemes`) || `[]`))
  const favoriteColors = ref<string[]>(JSON.parse(localStorage.getItem(`mobi_favoriteColors`) || `[]`))
  const hiddenColors = ref<string[]>(JSON.parse(localStorage.getItem(`mobi_hiddenColors`) || `[]`))
  const savedCustomColors = ref<string[]>(JSON.parse(localStorage.getItem(`mobi_savedCustomColors`) || `[]`))

  watch(favoriteThemes, v => localStorage.setItem(`mobi_favoriteThemes`, JSON.stringify(v)), { deep: true })
  watch(hiddenThemes, v => localStorage.setItem(`mobi_hiddenThemes`, JSON.stringify(v)), { deep: true })
  watch(favoriteColors, v => localStorage.setItem(`mobi_favoriteColors`, JSON.stringify(v)), { deep: true })
  watch(hiddenColors, v => localStorage.setItem(`mobi_hiddenColors`, JSON.stringify(v)), { deep: true })
  watch(savedCustomColors, v => localStorage.setItem(`mobi_savedCustomColors`, JSON.stringify(v)), { deep: true })

  // 计算属性
  const fontSizeNumber = computed(() => Number(fontSize.value.replace(`px`, ``)))

  function readHljsSurfaceStyle() {
    if (typeof document === `undefined`) {
      return null
    }

    const container = document.body || document.documentElement
    if (!container) {
      return null
    }

    const probe = document.createElement(`pre`)
    probe.className = `hljs`
    probe.textContent = `const themeProbe = true`
    probe.style.position = `fixed`
    probe.style.visibility = `hidden`
    probe.style.pointerEvents = `none`
    probe.style.left = `-9999px`
    probe.style.top = `-9999px`
    probe.style.padding = `1rem`
    container.appendChild(probe)

    const computedStyle = window.getComputedStyle(probe)
    const surface = {
      backgroundColor: computedStyle.backgroundColor,
      color: computedStyle.color,
    }

    container.removeChild(probe)
    return surface
  }

  function applyCodeThemeSurfaceOverride() {
    if (typeof document === `undefined`) {
      return
    }

    const surface = readHljsSurfaceStyle()
    if (!surface) {
      return
    }

    let styleEl = document.querySelector<HTMLStyleElement>(`#hljs-surface-override`)
    if (!styleEl) {
      styleEl = document.createElement(`style`)
      styleEl.setAttribute(`id`, `hljs-surface-override`)
      document.head.appendChild(styleEl)
    }

    // 可视化编辑器接管的属性不再由代码主题强制覆盖，否则用户设的底色会被 !important 吃掉
    const surfaceRules = [
      themeDesignerStore.hasCodeBackgroundOverride ? `` : `background: ${surface.backgroundColor} !important;`,
      themeDesignerStore.hasCodeTextOverride ? `` : `color: ${surface.color} !important;`,
    ].filter(Boolean).join(`\n        `)

    styleEl.textContent = `
      ${surfaceRules
        ? `#output .hljs.code__pre {
        ${surfaceRules}
      }`
        : ``}

      #output .hljs.code__pre > code {
        background: transparent !important;
        color: inherit !important;
      }
    `
  }

  // Toggle 方法
  const toggleCodeLanguage = useToggle(isShowCodeLanguage)
  const toggleShowLineNumber = useToggle(isShowLineNumber)
  const toggleCiteStatus = useToggle(isCiteStatus)
  const toggleCountStatus = useToggle(isCountStatus)
  const toggleUseIndent = useToggle(isUseIndent)
  const toggleUseJustify = useToggle(isUseJustify)
  const toggleHeadingDecorationStatus = useToggle(isHeadingDecorationStatus)

  // 重置样式
  const resetStyle = () => {
    isCiteStatus.value = defaultStyleConfig.isCiteStatus
    isShowCodeLanguage.value = defaultStyleConfig.isShowCodeLanguage
    isShowLineNumber.value = defaultStyleConfig.isShowLineNumber
    isCountStatus.value = defaultStyleConfig.isCountStatus

    theme.value = defaultStyleConfig.theme
    fontFamily.value = defaultStyleConfig.fontFamily
    fontSize.value = defaultStyleConfig.fontSize
    writePrimaryColorSource(`theme`)
    assignPrimaryColorFromTheme(defaultStyleConfig.theme)
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
    if (typeof document === `undefined`) {
      return
    }

    const cssUrl = resolveCodeBlockThemeUrl(codeBlockTheme.value)
    const el = document.querySelector<HTMLLinkElement>(`#hljs`)

    const syncSurface = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          applyCodeThemeSurfaceOverride()
        })
      })
    }

    if (el) {
      el.setAttribute(`href`, cssUrl)
      if (el.sheet) {
        syncSurface()
      }
      else {
        el.onload = () => syncSurface()
      }
    }
    else {
      const link = document.createElement(`link`)
      link.setAttribute(`type`, `text/css`)
      link.setAttribute(`rel`, `stylesheet`)
      link.setAttribute(`href`, cssUrl)
      link.setAttribute(`id`, `hljs`)
      link.onload = () => syncSurface()
      document.head.appendChild(link)
    }
  }

  watch(codeBlockTheme, () => {
    updateCodeTheme()
  }, { immediate: true })

  /**
   * 应用当前主题配置（新主题系统）
   * 使用 CSS 注入而非内联样式
   */
  const applyCurrentTheme = async () => {
    try {
      await applyTheme({
        themeName: theme.value,
        overridesCSS: themeDesignerStore.overrideCSS,
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

  // 可视化编辑器改一个值就立刻重绘预览区，不需要点保存
  watch(() => themeDesignerStore.overrideCSS, () => {
    applyCodeThemeSurfaceOverride()
    applyCurrentTheme()
  })

  // 不管从哪个入口换内置主题，可视化草稿的基础主题都要跟着走；
  // 换成了别的底，就不再算作某个已保存的自定义主题
  watch(theme, (value) => {
    if (themeDesignerStore.draft.baseTheme === value) {
      return
    }

    themeDesignerStore.setBaseTheme(value)
    themeDesignerStore.detachSource()
  })

  return {
    // State
    theme,
    fontFamily,
    fontSize,
    fontSizeNumber,
    primaryColor,
    primaryColorSource,
    isPrimaryColorFollowingTheme,
    codeBlockTheme,
    legend,
    isShowCodeLanguage,
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
    toggleCodeLanguage,
    toggleShowLineNumber,
    toggleCiteStatus,
    toggleCountStatus,
    toggleUseIndent,
    toggleUseJustify,
    toggleHeadingDecorationStatus,
    followThemePrimaryColor,
    resetStyle,
    updateCodeTheme,
    applyCurrentTheme,
    setHeadingStyle,
    getHeadingStyle,
  }
})
