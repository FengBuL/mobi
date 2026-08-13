import path from 'node:path'
import { app } from 'electron'

/** 未打包时一律按开发模式处理，dev 脚本会把 Vite 的地址塞进环境变量 */
export const isDev = !app.isPackaged

export const devServerUrl = process.env.MOBI_DEV_SERVER_URL || ``

/** 产物布局：dist/main/index.cjs 与 dist/renderer/index.html 并列，打包时整个 dist 一起带走 */
export const rendererDir = path.join(__dirname, `..`, `renderer`)

export const rendererEntry = path.join(rendererDir, `index.html`)
