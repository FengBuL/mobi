import { useEditorStore } from '@/stores/editor'
import { useExportStore } from '@/stores/export'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'
import { addPrefix, generatePureHTML, processClipboardContent } from '@/utils'
import { formatLostWechatImageHint, isLocalClipboardImageSrc, isUnsafeClipboardImage } from '@/utils/clipboard-image-status'
import { hasMpUploadConfig } from '@/utils/file'
import { store } from '@/utils/storage'
import { trackEvent } from '@/utils/telemetry'
import { createWeChatClipboardBlobs } from '@/utils/wechat-compat'

type CopyMode = 'txt' | 'html' | 'html-without-style' | 'html-and-style' | 'md'

interface UseEditorCopyActionsOptions {
  onStart?: () => void
  onEnd?: () => void
}

export function useEditorCopyActions(options: UseEditorCopyActionsOptions = {}) {
  const editorStore = useEditorStore()
  const themeStore = useThemeStore()
  const renderStore = useRenderStore()
  const exportStore = useExportStore()
  const uiStore = useUIStore()

  const { editor } = storeToRefs(editorStore)
  const { output } = storeToRefs(renderStore)
  const { primaryColor } = storeToRefs(themeStore)

  const copyMode = store.reactive<CopyMode>(addPrefix(`copyMode`), `txt`)

  const { copy: copyContent } = useClipboard({
    legacy: true,
  })

  const delay = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms))
  const finish = () => options.onEnd?.()
  const start = () => options.onStart?.()
  const normalizeErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))
  // 复制中止时只报一个数字，用户根本不知道是哪张图卡住了。
  // 长图版式尤其容易踩：一张几 MB 的长海报会被公众号图床接口拒收，
  // 于是「滚动图复制不成功」，而提示语只说「仍是外链或本地地址」。
  const describeClipboardImage = (image: HTMLImageElement, index: number) => {
    const src = image.getAttribute(`src`)?.trim() || ``
    const isLocal = isLocalClipboardImageSrc(src)
    const scheme = src.startsWith(`data:`) ? `内嵌图片` : src.startsWith(`blob:`) ? `本地图片` : src.split(`/`)[2] || src.slice(0, 40)
    const width = image.naturalWidth
    const height = image.naturalHeight
    const shape = width && height ? `${width}×${height}` : `尺寸未知`
    const isLong = width > 0 && height / width >= 3

    return {
      src,
      isLocal,
      error: image.getAttribute(`data-mp-upload-error`) || ``,
      label: `第 ${index + 1} 张（${scheme}，${shape}${isLong ? `，长图` : ``}）`,
      isLong,
    }
  }

  const getUnsafeClipboardImages = (root: HTMLElement) => {
    return Array.from(root.querySelectorAll<HTMLImageElement>(`img`))
      .map(describeClipboardImage)
      .filter(item => item.src && isUnsafeClipboardImage(item.src, item.error))
  }

  function editorRefresh() {
    themeStore.updateCodeTheme()
    renderStore.render(renderStore.resolvePreviewContent(editorStore.getContent()))
  }

  async function writeClipboardItems(items: ClipboardItem[]) {
    if (!navigator.clipboard?.write) {
      throw new Error(`Clipboard API not available.`)
    }

    await delay(0)
    await navigator.clipboard.write(items)
  }

  function fallbackCopyUsingExecCommand(htmlContent: string) {
    const selection = window.getSelection()

    if (!selection) {
      return false
    }

    const tempContainer = document.createElement(`div`)
    tempContainer.innerHTML = htmlContent
    tempContainer.style.position = `fixed`
    tempContainer.style.left = `-9999px`
    tempContainer.style.top = `0`
    tempContainer.style.opacity = `0`
    tempContainer.style.pointerEvents = `none`
    tempContainer.style.setProperty(`background-color`, `#ffffff`, `important`)
    tempContainer.style.setProperty(`color`, `#000000`, `important`)

    document.body.appendChild(tempContainer)

    const htmlElement = document.documentElement
    const wasDark = htmlElement.classList.contains(`dark`)
    let successful = false

    try {
      if (wasDark) {
        htmlElement.classList.remove(`dark`)
      }

      const range = document.createRange()
      range.selectNodeContents(tempContainer)
      selection.removeAllRanges()
      selection.addRange(range)

      successful = document.execCommand(`copy`)
    }
    catch {
      successful = false
    }
    finally {
      selection.removeAllRanges()
      tempContainer.remove()

      if (wasDark) {
        htmlElement.classList.add(`dark`)
      }
    }

    return successful
  }

  async function copy(mode: CopyMode = `txt`) {
    copyMode.value = mode

    if (copyMode.value === `md`) {
      const mdContent = editor.value?.state.doc.toString() || ``
      await copyContent(mdContent)
      toast.success(`已复制 Markdown 源码到剪贴板。`)
      trackEvent(`copy`, { mode: `md` })
      return
    }

    start()

    setTimeout(() => {
      nextTick(async () => {
        try {
          await processClipboardContent(primaryColor.value)
        }
        catch (error) {
          toast.error(`处理 HTML 失败，请联系开发者。${normalizeErrorMessage(error)}`)
          editorRefresh()
          finish()
          return
        }

        const clipboardDiv = document.getElementById(`output`)

        if (!clipboardDiv) {
          toast.error(`未找到复制输出区域，请刷新页面后重试。`)
          editorRefresh()
          finish()
          return
        }

        if (copyMode.value === `txt`) {
          const unsafeImages = getUnsafeClipboardImages(clipboardDiv)
          // 未转存图（本地 data/blob 和外链非 mmbiz）仍复制，只警告张数，不用 toast.error 拦住。
          const localImages = unsafeImages.filter(item => item.isLocal)
          const remoteImages = unsafeImages.filter(item => !item.isLocal)

          if (unsafeImages.length > 0) {
            const hasConfig = await hasMpUploadConfig()
            const blocker = unsafeImages.find(item => item.error) || unsafeImages[0]
            const longHint = unsafeImages.some(item => item.isLong)
              ? `长图容易超过公众号图床的体积上限，可以先压缩或裁短。`
              : ``
            const lostHint = `${formatLostWechatImageHint(unsafeImages.length)}。`

            if (localImages.length > 0 && remoteImages.length === 0) {
              toast.warning(
                `${lostHint}${localImages.length} 张还是本地地址（${blocker.label}）。已照常复制。真机后台本机图有时还能看见，发出去或换环境不一定稳。`,
                {
                  duration: 10000,
                  action: { label: `去配置图床`, onClick: () => uiStore.openUploadImgDialog(`mp`) },
                },
              )
            }
            else if (hasConfig) {
              toast.warning(
                `${lostHint}${unsafeImages.length} 张没能转成公众号地址，卡在${blocker.label}。${blocker.error ? `原因：${blocker.error}。` : ``}已按外链复制。微信不会保证自动转存：能热链的可能还在，防盗链的会丢。${longHint}`,
                { duration: 10000 },
              )
            }
            else {
              toast.warning(
                `${lostHint}不配图床也可以直接贴。微信会留下能打开的外链，防盗链或插入失败的会丢。要稳再配「公众号图床」。${longHint}`,
                {
                  duration: 12000,
                  action: { label: `去配置图床`, onClick: () => uiStore.openUploadImgDialog(`mp`) },
                },
              )
            }
          }
        }

        clipboardDiv.focus()
        window.getSelection()?.removeAllRanges()

        const temp = clipboardDiv.innerHTML

        if (copyMode.value === `txt`) {
          try {
            if (typeof ClipboardItem === `undefined`) {
              throw new TypeError(`ClipboardItem is not supported in this browser.`)
            }

            const clipboardItem = new ClipboardItem(createWeChatClipboardBlobs(clipboardDiv))

            await writeClipboardItems([clipboardItem])
          }
          catch (error) {
            const fallbackSucceeded = fallbackCopyUsingExecCommand(temp)
            if (!fallbackSucceeded) {
              clipboardDiv.innerHTML = output.value
              window.getSelection()?.removeAllRanges()
              editorRefresh()
              toast.error(`复制失败，请联系开发者。${normalizeErrorMessage(error)}`)
              finish()
              return
            }
          }
        }

        clipboardDiv.innerHTML = output.value

        if (copyMode.value === `html`) {
          await copyContent(temp)
        }
        else if (copyMode.value === `html-without-style`) {
          await copyContent(await generatePureHTML(editor.value!.state.doc.toString()))
        }
        else if (copyMode.value === `html-and-style`) {
          await copyContent(exportStore.editorContent2HTML())
        }

        toast.success(
          copyMode.value === `html`
            ? `已复制 HTML 源码，请进行下一步操作。`
            : `已复制渲染后的内容到剪贴板，可直接到公众号后台粘贴。`,
        )
        trackEvent(`copy`, { mode: copyMode.value })

        window.dispatchEvent(
          new CustomEvent(`copyToMp`, {
            detail: {
              content: output.value,
            },
          }),
        )

        editorRefresh()
        finish()
      })
    }, 350)
  }

  return {
    copyMode,
    handleCopy: copy,
    copyToWeChat: () => copy(`txt`),
  }
}
