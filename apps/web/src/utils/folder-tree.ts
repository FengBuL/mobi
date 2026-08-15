export interface FolderTreeNode {
  name: string
  path: string
  type: `file` | `directory`
  children?: FolderTreeNode[]
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle
  nativePath?: string
}

export async function readFolderLevel(
  handle: FileSystemDirectoryHandle,
  path: string,
): Promise<FolderTreeNode[]> {
  const children: FolderTreeNode[] = []
  for await (const entry of handle.values()) {
    const entryPath = `${path}/${entry.name}`
    if (entry.kind === `directory`) {
      children.push({
        name: entry.name,
        path: entryPath,
        type: `directory`,
        handle: entry as FileSystemDirectoryHandle,
      })
    }
    else if (entry.name.toLowerCase().endsWith(`.md`)) {
      children.push({
        name: entry.name,
        path: entryPath,
        type: `file`,
        handle: entry as FileSystemFileHandle,
      })
    }
  }

  return children.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === `directory` ? -1 : 1
    }
    return left.name.localeCompare(right.name, `zh-CN`)
  })
}
