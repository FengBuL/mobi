import type { DesktopFolderEntry, DesktopFolderRoot } from '@mobi/shared/types/desktop'
import type { BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { dialog } from 'electron'

const approvedRoots = new Set<string>()

async function assertApprovedPath(candidate: string): Promise<string> {
  const resolved = await fs.realpath(path.resolve(candidate))
  const approved = Array.from(approvedRoots).some(root => (
    resolved === root || resolved.startsWith(`${root}${path.sep}`)
  ))
  if (!approved) {
    throw new Error(`该路径尚未获得用户授权`)
  }
  return resolved
}

export async function chooseFolder(parent: BrowserWindow | null): Promise<DesktopFolderRoot | null> {
  const options: Electron.OpenDialogOptions = {
    title: `选择本地 Markdown 文件夹`,
    properties: [`openDirectory`],
  }
  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)
  const selected = result.filePaths[0]
  if (result.canceled || !selected) {
    return null
  }

  const resolved = await fs.realpath(path.resolve(selected))
  approvedRoots.add(resolved)
  return { name: path.basename(resolved), path: resolved }
}

export async function readDirectory(directoryPath: string): Promise<DesktopFolderEntry[]> {
  const resolved = await assertApprovedPath(directoryPath)
  const entries = await fs.readdir(resolved, { withFileTypes: true })

  return entries
    .filter(entry => entry.isDirectory() || (entry.isFile() && entry.name.toLowerCase().endsWith(`.md`)))
    .map(entry => ({
      name: entry.name,
      path: path.join(resolved, entry.name),
      type: entry.isDirectory() ? `directory` as const : `file` as const,
    }))
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === `directory` ? -1 : 1
      }
      return left.name.localeCompare(right.name, `zh-CN`)
    })
}

export async function readFolderFile(filePath: string): Promise<string> {
  const resolved = await assertApprovedPath(filePath)
  if (!resolved.toLowerCase().endsWith(`.md`)) {
    throw new Error(`仅支持读取 Markdown 文件`)
  }
  return fs.readFile(resolved, `utf8`)
}
