import type { MediaAspectRatio } from './image-layouts'

const ASPECT_RATIO_VALUES: Record<Exclude<MediaAspectRatio, 'auto'>, number> = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:4': 3 / 4,
  '9:16': 9 / 16,
}

export function resolveCenterCrop(
  sourceWidth: number,
  sourceHeight: number,
  aspectRatio: MediaAspectRatio,
) {
  if (aspectRatio === `auto` || sourceWidth <= 0 || sourceHeight <= 0) {
    return undefined
  }

  const ratio = ASPECT_RATIO_VALUES[aspectRatio]
  const sourceRatio = sourceWidth / sourceHeight
  const sourceCropWidth = sourceRatio > ratio ? sourceHeight * ratio : sourceWidth
  const sourceCropHeight = sourceRatio > ratio ? sourceHeight : sourceWidth / ratio

  return {
    sourceX: (sourceWidth - sourceCropWidth) / 2,
    sourceY: (sourceHeight - sourceCropHeight) / 2,
    sourceWidth: sourceCropWidth,
    sourceHeight: sourceCropHeight,
    outputWidth: Math.round(sourceCropWidth),
    outputHeight: Math.round(sourceCropHeight),
    ratio,
  }
}

export function buildClipboardImageCacheKey(sourceUrl: string, aspectRatio: MediaAspectRatio) {
  return aspectRatio === `auto`
    ? sourceUrl
    : `${sourceUrl}#mobi-crop=${encodeURIComponent(aspectRatio)}`
}

export function resolveClipboardImageUploadPlan(sourceUrl: string, aspectRatio: MediaAspectRatio) {
  const isWechatHosted = /mmbiz\.q(?:pic|logo)\.cn|res\.wx\.qq\.com/iu.test(sourceUrl)
  return {
    shouldUpload: Boolean(sourceUrl) && (!isWechatHosted || aspectRatio !== `auto`),
    cacheKey: buildClipboardImageCacheKey(sourceUrl, aspectRatio),
  }
}

export function parseClipboardCropAspect(value: string | null): MediaAspectRatio {
  return value && value in ASPECT_RATIO_VALUES
    ? value as MediaAspectRatio
    : `auto`
}

function replaceFileExtension(filename: string, extension: string) {
  return /\.[a-z0-9]+$/iu.test(filename)
    ? filename.replace(/\.[a-z0-9]+$/iu, `.${extension}`)
    : `${filename}.${extension}`
}

export async function cropImageFileToAspectRatio(file: File, aspectRatio: MediaAspectRatio) {
  if (aspectRatio === `auto`) {
    return { file, width: 0, height: 0 }
  }

  const bitmap = await createImageBitmap(file)
  try {
    const crop = resolveCenterCrop(bitmap.width, bitmap.height, aspectRatio)
    if (!crop) {
      return { file, width: bitmap.width, height: bitmap.height }
    }

    const maxDimension = 4096
    const scale = Math.min(1, maxDimension / Math.max(crop.outputWidth, crop.outputHeight))
    const outputWidth = Math.max(1, Math.round(crop.outputWidth * scale))
    const outputHeight = Math.max(1, Math.round(crop.outputHeight * scale))
    const canvas = document.createElement(`canvas`)
    canvas.width = outputWidth
    canvas.height = outputHeight

    const context = canvas.getContext(`2d`)
    if (!context) {
      throw new Error(`浏览器无法创建图片裁切画布`)
    }

    context.drawImage(
      bitmap,
      crop.sourceX,
      crop.sourceY,
      crop.sourceWidth,
      crop.sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    )

    const outputType = file.type.toLowerCase() === `image/png` ? `image/png` : `image/jpeg`
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        result => result ? resolve(result) : reject(new Error(`图片裁切失败`)),
        outputType,
        0.92,
      )
    })
    const extension = outputType === `image/png` ? `png` : `jpg`

    return {
      file: new File([blob], replaceFileExtension(file.name, extension), { type: outputType }),
      width: outputWidth,
      height: outputHeight,
    }
  }
  finally {
    bitmap.close()
  }
}
