/**
 * 自定义协议的常量。preload 里也要用，所以这里不能碰 electron 的 app 对象
 * （preload 起来的时候 app 还不在它的作用域里）。
 */

export const APP_SCHEME = `mobi`
export const APP_HOST = `app`

/** 打包后渲染进程跑在这个源上。注册成 standard + secure，isSecureContext 才是 true，剪贴板 API 才可用 */
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`

/** 复制链路会拼成 `${IMAGE_FETCH_ORIGIN}/fetch-image?url=...`，路径要和 mp-proxy 对齐 */
export const IMAGE_FETCH_ORIGIN = `${APP_ORIGIN}/__mp`
export const IMAGE_FETCH_PATHNAME = `/__mp/fetch-image`
