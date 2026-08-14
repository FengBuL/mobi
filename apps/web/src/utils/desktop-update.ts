import type { DesktopUpdateState } from '@mobi/shared/types/desktop'

export function shouldPresentUpdate(state: DesktopUpdateState, ignoredVersion: string): boolean {
  if (state.status === `available`) {
    return state.version !== ignoredVersion
  }
  return state.status === `downloading` || state.status === `downloaded`
}

export function formatUpdateProgress(percent: number): string {
  return `${Math.min(100, Math.max(0, percent)).toFixed(1)}%`
}
