import type { DesktopUpdateState } from '@mobi/shared/types/desktop'

interface UpdateInfo {
  version: string
  releaseNotes?: string | Array<{ note?: string }> | null
}

interface ProgressInfo {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

export interface DesktopUpdaterAdapter {
  checkForUpdates: () => Promise<unknown>
  downloadUpdate: () => Promise<unknown>
  quitAndInstall: () => void
  on: {
    (event: `checking-for-update`, listener: () => void): unknown
    (event: `update-available`, listener: (info: UpdateInfo) => void): unknown
    (event: `update-not-available`, listener: (info: UpdateInfo) => void): unknown
    (event: `download-progress`, listener: (progress: ProgressInfo) => void): unknown
    (event: `update-downloaded`, listener: (info: UpdateInfo) => void): unknown
    (event: `error`, listener: (error: unknown) => void): unknown
  }
}

function releaseNotesToText(releaseNotes: UpdateInfo[`releaseNotes`]): string {
  if (typeof releaseNotes === `string`) {
    return releaseNotes
  }
  if (Array.isArray(releaseNotes)) {
    return releaseNotes.map(item => item.note || ``).filter(Boolean).join(`\n`)
  }
  return ``
}

export function createDesktopUpdateController(
  updater: DesktopUpdaterAdapter,
  emit: (state: DesktopUpdateState) => void,
) {
  let version = ``
  let releaseNotes = ``

  updater.on(`checking-for-update`, () => emit({ status: `checking` }))
  updater.on(`update-available`, (info: UpdateInfo) => {
    version = info.version
    releaseNotes = releaseNotesToText(info.releaseNotes)
    emit({ status: `available`, version, releaseNotes })
  })
  updater.on(`update-not-available`, (info: UpdateInfo) => {
    emit({ status: `not-available`, version: info.version })
  })
  updater.on(`download-progress`, (progress: ProgressInfo) => {
    emit({
      status: `downloading`,
      version,
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })
  updater.on(`update-downloaded`, (info: UpdateInfo) => {
    version = info.version
    releaseNotes = releaseNotesToText(info.releaseNotes) || releaseNotes
    emit({ status: `downloaded`, version, releaseNotes })
  })
  updater.on(`error`, (error: unknown) => {
    emit({
      status: `error`,
      message: error instanceof Error ? error.message : String(error),
    })
  })

  return {
    async check() {
      await updater.checkForUpdates()
    },
    async download() {
      await updater.downloadUpdate()
    },
    install() {
      updater.quitAndInstall()
    },
  }
}
