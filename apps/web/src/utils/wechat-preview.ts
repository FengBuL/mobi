export function resolveWechatPreviewFrame(_options: {
  device: 'mobile' | 'desktop'
  compactViewport: boolean
}) {
  if (_options.device !== `mobile`) {
    return undefined
  }

  return {
    width: _options.compactViewport ? `100%` : `393px`,
    maxWidth: `100%`,
    paddingLeft: `18px`,
    paddingRight: `18px`,
    boxSizing: `border-box` as const,
    border: `0`,
  }
}

function splitCssLayers(value: string) {
  const layers: string[] = []
  let depth = 0
  let current = ``

  for (const char of value) {
    if (char === `(`) {
      depth += 1
    }
    else if (char === `)`) {
      depth = Math.max(0, depth - 1)
    }

    if (char === `,` && depth === 0) {
      const layer = current.trim()
      if (layer) {
        layers.push(layer)
      }
      current = ``
      continue
    }

    current += char
  }

  const last = current.trim()
  if (last) {
    layers.push(last)
  }

  return layers
}

/**
 * 公众号粘贴保不住 SVG data URI 底图、repeating 纸纹和叠层网格。
 * 单层 linear-gradient 色块 / 荧光笔、外链背景图仍按能留下处理。
 */
export function isWeChatUnpastableTexture(backgroundImage: string) {
  const value = backgroundImage.trim()
  if (!value || /^none$/i.test(value)) {
    return false
  }

  if (/url\s*\(\s*['"]?data:/i.test(value)) {
    return true
  }

  if (/repeating-(?:linear|radial|conic)-gradient\s*\(/i.test(value)) {
    return true
  }

  return splitCssLayers(value).length >= 2
}

export function applyWechatPreviewTextureDowngrade(root: HTMLElement) {
  const targets = [root, ...Array.from(root.querySelectorAll<HTMLElement>(`*`))]

  targets.forEach((element) => {
    if (!isWeChatUnpastableTexture(getComputedStyle(element).backgroundImage)) {
      return
    }

    element.style.setProperty(`background-image`, `none`, `important`)
  })
}

/** 板块库缩略图、检查器预览也走同一套降级，避免选择器里看见贴不进去的纹路。 */
export function applyWechatPreviewTextureDowngradeToHtml(html: string) {
  const root = document.createElement(`div`)
  root.innerHTML = html
  applyWechatPreviewTextureDowngrade(root)
  return root.innerHTML
}
