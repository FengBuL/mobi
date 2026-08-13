/**
 * highlight.js 的主题样式和语言包跟着应用一起打包，运行时从自己的产物里取。
 *
 * 地址要按文档基址解析：网页版挂在 /mobi/ 这类子路径下，桌面版跑在 mobi://app 上，
 * 写死绝对路径两边都会错。相对路径也不行——动态 import 的相对说明符是按
 * 发起模块的地址算的，而那是 static/js/ 里的某个 chunk，会解析到错误的层级。
 */
export function localAssetUrl(subPath: string): string {
  if (typeof document === `undefined`) {
    return `/${subPath}`
  }

  return new URL(subPath, document.baseURI).href
}

export const HLJS_ASSET_BASE = `static/hljs`
