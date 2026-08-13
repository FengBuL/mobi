import type { BrowserWindow, Rectangle } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { app, screen } from 'electron'

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  maximized: boolean
}

export const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1440,
  height: 900,
  maximized: false,
}

export const MIN_WINDOW_SIZE = {
  width: 1024,
  height: 680,
}

/** 落盘节流：拖动窗口会连着触发上百次 move */
const SAVE_DEBOUNCE_MS = 400

function stateFile() {
  return path.join(app.getPath(`userData`), `window-state.json`)
}

function isPositiveSize(value: unknown): value is number {
  return typeof value === `number` && Number.isFinite(value) && value > 0
}

function isCoordinate(value: unknown): value is number {
  return typeof value === `number` && Number.isFinite(value)
}

/**
 * 上次关窗时接的那块屏可能已经拔掉了，直接按旧坐标开窗会开到看不见的地方。
 * 判断一下和现有工作区有没有重叠，没有就丢掉坐标交给 Electron 居中。
 */
function isOnSomeDisplay(bounds: Rectangle) {
  return screen.getAllDisplays().some(({ workArea }) => {
    const overlapsHorizontally = bounds.x < workArea.x + workArea.width
      && bounds.x + bounds.width > workArea.x
    const overlapsVertically = bounds.y < workArea.y + workArea.height
      && bounds.y + bounds.height > workArea.y
    return overlapsHorizontally && overlapsVertically
  })
}

export function loadWindowState(): WindowState {
  let raw: unknown

  try {
    raw = JSON.parse(readFileSync(stateFile(), `utf8`))
  }
  catch {
    return { ...DEFAULT_WINDOW_STATE }
  }

  const saved = (raw ?? {}) as Partial<WindowState>
  const state: WindowState = {
    width: isPositiveSize(saved.width) ? Math.max(saved.width, MIN_WINDOW_SIZE.width) : DEFAULT_WINDOW_STATE.width,
    height: isPositiveSize(saved.height) ? Math.max(saved.height, MIN_WINDOW_SIZE.height) : DEFAULT_WINDOW_STATE.height,
    maximized: saved.maximized === true,
  }

  if (isCoordinate(saved.x) && isCoordinate(saved.y)) {
    const bounds = { x: saved.x, y: saved.y, width: state.width, height: state.height }
    if (isOnSomeDisplay(bounds)) {
      state.x = saved.x
      state.y = saved.y
    }
  }

  return state
}

function saveWindowState(window: BrowserWindow) {
  if (window.isDestroyed()) {
    return
  }

  // 最大化时 getBounds 拿到的是撑满的尺寸，还原回去窗口就再也变不小了
  const bounds = window.getNormalBounds()
  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    maximized: window.isMaximized(),
  }

  try {
    writeFileSync(stateFile(), JSON.stringify(state, null, 2), `utf8`)
  }
  catch (error) {
    console.error(`[mobi] 窗口状态保存失败`, error)
  }
}

export function trackWindowState(window: BrowserWindow): void {
  let timer: NodeJS.Timeout | undefined

  const scheduleSave = () => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(saveWindowState, SAVE_DEBOUNCE_MS, window)
  }

  window.on(`resize`, scheduleSave)
  window.on(`move`, scheduleSave)
  window.on(`maximize`, scheduleSave)
  window.on(`unmaximize`, scheduleSave)

  window.once(`close`, () => {
    if (timer) {
      clearTimeout(timer)
    }
    saveWindowState(window)
  })
}
