/**
 * CSS 运行时处理工具（浏览器兼容版）
 * 注意：PostCSS 依赖 Node.js 的 fs 模块，无法在浏览器中运行。
 * 此版本跳过 PostCSS 处理，直接返回原始 CSS。
 */

/**
 * 处理 CSS 字符串（浏览器兼容版，直接返回原始 CSS）
 * @param css - 原始 CSS 字符串
 * @returns 处理后的 CSS 字符串
 */
export async function processCSS(css: string): Promise<string> {
  // PostCSS 需要 Node.js 环境（fs, path 等），无法在浏览器中运行
  // 浏览器原生支持 CSS 自定义属性（CSS variables），无需 postcss-custom-properties 转换
  return css
}
