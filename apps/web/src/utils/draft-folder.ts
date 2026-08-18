export const BROWSER_DRAFT_EXPORT_REMIND_MS = 14 * 24 * 60 * 60 * 1000
export const ARCHIVE_FOLDER_NAME = `归档`

export function describeFolderPickerBlocker(input: {
  hasDesktopFolders: boolean
  isSecureContext: boolean
  hasDirectoryPicker: boolean
  origin: string
}) {
  if (input.hasDesktopFolders) {
    return ``
  }
  if (!input.isSecureContext) {
    return `这个地址（${input.origin}）不能选本机文件夹。请用 http://localhost:5173/mobi/ 打开。`
  }
  if (!input.hasDirectoryPicker) {
    return `这个浏览器不能选本机文件夹。请用 Chrome / Edge，或桌面版。`
  }
  return ``
}

export function shouldRemindBrowserDraftExport(input: {
  canUseFolderApi: boolean
  draftCount: number
  now: number
  lastRemindedAt: number | null
  lastExportedAt: number | null
}) {
  if (input.canUseFolderApi || input.draftCount <= 0) {
    return false
  }
  const last = Math.max(input.lastRemindedAt ?? 0, input.lastExportedAt ?? 0)
  if (last <= 0) {
    return true
  }
  return input.now - last >= BROWSER_DRAFT_EXPORT_REMIND_MS
}

export function parentDraftDirectory(filePath: string) {
  const parts = filePath.split(`/`).filter(Boolean)
  if (parts.length <= 1) {
    return ``
  }
  return parts.slice(0, -1).join(`/`)
}

export function draftFileName(filePath: string) {
  const parts = filePath.split(`/`).filter(Boolean)
  return parts[parts.length - 1] ?? ``
}

export function joinDraftPath(directoryPath: string, fileName: string) {
  const dir = directoryPath.replace(/\/+$/u, ``)
  const name = fileName.replace(/^\/+/u, ``)
  if (!dir) {
    return name
  }
  if (!name) {
    return dir
  }
  return `${dir}/${name}`
}

export function archiveDirectoryPath(rootPath: string, archiveName = ARCHIVE_FOLDER_NAME) {
  return joinDraftPath(rootPath.replace(/[\\/]+$/u, ``), archiveName)
}

export function isArchiveDirectory(
  directoryPath: string,
  rootPath: string,
  archiveName = ARCHIVE_FOLDER_NAME,
) {
  if (!rootPath || !directoryPath) {
    return false
  }
  const archiveDir = archiveDirectoryPath(rootPath, archiveName)
  const dir = directoryPath.replace(/[\\/]+$/u, ``)
  return dir === archiveDir
}

export function isArchivedDraftPath(
  filePath: string,
  rootPath: string,
  archiveName = ARCHIVE_FOLDER_NAME,
) {
  if (!rootPath || !filePath || isArchiveDirectory(filePath, rootPath, archiveName)) {
    return false
  }
  return isPathInsideDirectory(filePath, archiveDirectoryPath(rootPath, archiveName))
}

export function unarchiveDraftPath(filePath: string, rootPath: string) {
  return joinDraftPath(rootPath.replace(/[\\/]+$/u, ``), draftFileName(filePath) || `未命名.md`)
}

export function archiveDraftPath(
  filePath: string,
  archiveName = ARCHIVE_FOLDER_NAME,
  rootPath?: string,
) {
  const fileName = draftFileName(filePath) || `未命名.md`
  if (rootPath) {
    const archiveDir = joinDraftPath(rootPath.replace(/[\\/]+$/u, ``), archiveName)
    if (isPathInsideDirectory(filePath, archiveDir)) {
      return filePath
    }
    return joinDraftPath(archiveDir, fileName)
  }
  const parts = filePath.split(`/`).filter(Boolean)
  if (parts.length === 0) {
    return `${archiveName}/未命名.md`
  }
  if (parts.length >= 2 && parts[1] === archiveName) {
    return filePath
  }
  return `${parts[0]}/${archiveName}/${fileName}`
}

export function canDeleteDraftDirectory(rootPath: string, directoryPath: string) {
  const root = rootPath.replace(/[\\/]+$/u, ``)
  const dir = directoryPath.replace(/[\\/]+$/u, ``)
  return Boolean(dir) && dir !== root && (dir.startsWith(`${root}/`) || dir.startsWith(`${root}\\`))
}

export function isPathInsideDirectory(filePath: string, directoryPath: string) {
  const dir = directoryPath.replace(/[\\/]+$/u, ``)
  const file = filePath.replace(/[\\/]+$/u, ``)
  return file === dir || file.startsWith(`${dir}/`) || file.startsWith(`${dir}\\`)
}

export function relocateDraftPath(fromPath: string, destinationDirectory: string) {
  return joinDraftPath(destinationDirectory, draftFileName(fromPath))
}

export function rewritePathPrefix(path: string, fromPrefix: string, toPrefix: string) {
  const from = fromPrefix.replace(/[\\/]+$/u, ``)
  const to = toPrefix.replace(/[\\/]+$/u, ``)
  const current = path.replace(/[\\/]+$/u, ``)
  if (current === from) {
    return to
  }
  if (current.startsWith(`${from}/`)) {
    return `${to}/${current.slice(from.length + 1)}`
  }
  if (current.startsWith(`${from}\\`)) {
    return `${to}\\${current.slice(from.length + 1)}`
  }
  return path
}

export function displayDraftPath(rootPath: string, path: string) {
  const root = rootPath.replace(/[\\/]+$/u, ``)
  const current = path.replace(/[\\/]+$/u, ``)
  if (!current || current === root) {
    return `根目录`
  }
  if (current.startsWith(`${root}/`) || current.startsWith(`${root}\\`)) {
    return current.slice(root.length + 1)
  }
  return current
}

export function canMoveDraftEntry(rootPath: string, fromPath: string, destinationDirectory: string) {
  const root = rootPath.replace(/[\\/]+$/u, ``)
  const from = fromPath.replace(/[\\/]+$/u, ``)
  const dest = destinationDirectory.replace(/[\\/]+$/u, ``)
  if (!from || !dest || from === root || isArchiveDirectory(from, root)) {
    return false
  }
  if (dest !== root && !dest.startsWith(`${root}/`) && !dest.startsWith(`${root}\\`)) {
    return false
  }
  if (dest === from || dest.startsWith(`${from}/`) || dest.startsWith(`${from}\\`)) {
    return false
  }
  return parentDraftDirectory(from) !== dest
}

export function listMoveTargets(input: {
  rootPath: string
  fromPath: string
  directories: Array<{ path: string, name: string }>
}) {
  return input.directories
    .filter(directory => canMoveDraftEntry(input.rootPath, input.fromPath, directory.path))
    .map(directory => ({
      path: directory.path,
      label: displayDraftPath(input.rootPath, directory.path),
    }))
}

export function listMoveTargetsForMany(input: {
  rootPath: string
  fromPaths: string[]
  directories: Array<{ path: string, name: string }>
}) {
  if (input.fromPaths.length === 0) {
    return []
  }
  const [first, ...rest] = input.fromPaths
  return listMoveTargets({
    rootPath: input.rootPath,
    fromPath: first ?? ``,
    directories: input.directories,
  }).filter(target => rest.every(fromPath => canMoveDraftEntry(input.rootPath, fromPath, target.path)))
}

export function collectVisibleFilePaths(
  nodes: Array<{ path: string, type: string, children?: unknown[] }>,
  expandedPaths: Iterable<string>,
): string[] {
  const expanded = new Set(expandedPaths)
  const files: string[] = []
  const walk = (list: Array<{ path: string, type: string, children?: unknown[] }>) => {
    for (const node of list) {
      if (node.type === `file`) {
        files.push(node.path)
      }
      if (node.type === `directory` && expanded.has(node.path) && Array.isArray(node.children)) {
        walk(node.children as Array<{ path: string, type: string, children?: unknown[] }>)
      }
    }
  }
  walk(nodes)
  return files
}

export function nextCheckedPaths(input: {
  current: string[]
  path: string
  visiblePaths: string[]
  additive: boolean
  range: boolean
  anchor?: string | null
}) {
  if (input.range && input.anchor) {
    const from = input.visiblePaths.indexOf(input.anchor)
    const to = input.visiblePaths.indexOf(input.path)
    if (from >= 0 && to >= 0) {
      const start = Math.min(from, to)
      const end = Math.max(from, to)
      return {
        paths: input.visiblePaths.slice(start, end + 1),
        anchor: input.anchor,
      }
    }
  }
  if (input.additive) {
    const next = new Set(input.current)
    if (next.has(input.path)) {
      next.delete(input.path)
    }
    else {
      next.add(input.path)
    }
    return { paths: [...next], anchor: input.path }
  }
  return { paths: [input.path], anchor: input.path }
}

export function resolveWriteDirectory(input: {
  rootPath: string
  selectedPath: string | null | undefined
  selectedType?: `file` | `directory` | null
}) {
  if (!input.selectedPath) {
    return input.rootPath
  }
  if (input.selectedType === `directory`) {
    return input.selectedPath
  }
  return parentDraftDirectory(input.selectedPath) || input.rootPath
}
