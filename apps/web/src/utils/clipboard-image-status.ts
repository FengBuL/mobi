const WECHAT_IMAGE_HOST_PATTERN = /^(?:mmbiz\.q(?:pic|logo)\.cn|res\.wx\.qq\.com)$/i

export interface UnsafeClipboardImage {
  src: string
  isLocal: boolean
  error: string
}

export function isDirectWechatHostedImage(src: string) {
  try {
    return WECHAT_IMAGE_HOST_PATTERN.test(new URL(src).hostname)
  }
  catch {
    return false
  }
}

export function isLocalClipboardImageSrc(src: string) {
  return src.startsWith(`data:`) || src.startsWith(`blob:`)
}

export function isUnsafeClipboardImage(src: string, uploadError = ``) {
  return Boolean(uploadError) || !isDirectWechatHostedImage(src)
}

export function isBlockingClipboardImageFailure(uploadError: string, hasUploadConfig: boolean) {
  return hasUploadConfig && Boolean(uploadError.trim())
}

export function collectUnsafeClipboardImages(root: ParentNode): UnsafeClipboardImage[] {
  return Array.from(root.querySelectorAll<HTMLImageElement>(`img`))
    .map((image) => {
      const src = image.getAttribute(`src`)?.trim() || ``
      const error = image.getAttribute(`data-mp-upload-error`) || ``
      return {
        src,
        isLocal: isLocalClipboardImageSrc(src),
        error,
      }
    })
    .filter(item => item.src && isUnsafeClipboardImage(item.src, item.error))
}

export function collectUnsafeClipboardImagesFromHtml(html: string): UnsafeClipboardImage[] {
  if (!html || typeof document === `undefined`) {
    return []
  }
  const root = document.createElement(`div`)
  root.innerHTML = html
  return collectUnsafeClipboardImages(root)
}

export function countUnsafeClipboardImagesFromHtml(html: string) {
  return collectUnsafeClipboardImagesFromHtml(html).length
}

export function formatLostWechatImageHint(count: number) {
  if (count <= 0) {
    return ``
  }
  return `还有 ${count} 张会在公众号里丢`
}
