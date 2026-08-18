interface ReleasableFolderNode {
  handle?: unknown
  children?: ReleasableFolderNode[]
}

export function releaseFolderNodeHandles(node: ReleasableFolderNode | null | undefined) {
  if (!node) {
    return
  }
  node.handle = undefined
  if (!node.children) {
    return
  }
  for (const child of node.children) {
    releaseFolderNodeHandles(child)
  }
}

export async function removeChildDirectory(
  parent: FileSystemDirectoryHandle,
  name: string,
) {
  try {
    await parent.removeEntry(name, { recursive: true })
    return
  }
  catch {
    // 树里还握着子目录句柄时，Chrome 会拦一次性递归删除。先清空再删。
  }

  const directory = await parent.getDirectoryHandle(name)
  const files: string[] = []
  const directories: string[] = []
  for await (const entry of directory.values()) {
    if (entry.kind === `directory`) {
      directories.push(entry.name)
    }
    else {
      files.push(entry.name)
    }
  }
  for (const fileName of files) {
    await directory.removeEntry(fileName)
  }
  for (const directoryName of directories) {
    await removeChildDirectory(directory, directoryName)
  }
  await parent.removeEntry(name)
}
