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
