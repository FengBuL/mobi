const WECHAT_IMAGE_HOST_PATTERN = /^(?:mmbiz\.q(?:pic|logo)\.cn|res\.wx\.qq\.com)$/i

export function isDirectWechatHostedImage(src: string) {
  try {
    return WECHAT_IMAGE_HOST_PATTERN.test(new URL(src).hostname)
  }
  catch {
    return false
  }
}

export function isUnsafeClipboardImage(src: string, uploadError = ``) {
  return Boolean(uploadError) || !isDirectWechatHostedImage(src)
}

export function isBlockingClipboardImageFailure(uploadError: string, hasUploadConfig: boolean) {
  return hasUploadConfig && Boolean(uploadError.trim())
}
