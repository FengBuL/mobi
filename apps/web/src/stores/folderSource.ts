import type { FolderTreeNode } from '@/utils/folder-tree'
import { getDesktopBridge } from '@/services/desktop/bridge'
import {
  deleteFolderHandle,
  listSavedFolderHandles,
  saveFolderHandle,
} from '@/services/folder/handleStore'
import { addPrefix } from '@/utils'
import { canDeleteDraftDirectory, canMoveDraftEntry, describeFolderPickerBlocker, draftFileName, joinDraftPath, parentDraftDirectory, relocateDraftPath } from '@/utils/draft-folder'
import { releaseFolderNodeHandles, removeChildDirectory } from '@/utils/folder-handle'
import { readFolderLevel } from '@/utils/folder-tree'
import { store } from '@/utils/storage'

/**
 * 文件系统节点接口
 */
export type FileSystemNode = FolderTreeNode

/**
 * 运行时文件夹信息（包含 handle，仅在内存中）
 */
interface RuntimeFolderInfo {
  id: string
  name: string
  handle?: FileSystemDirectoryHandle
  nativePath?: string
}

/**
 * 本地文件夹源 Store
 * 负责读写用户指定的本地文件夹。稿件落成磁盘上的 Markdown 文件。
 */
export const useFolderSourceStore = defineStore(`folderSource`, () => {
  // 内存中的运行时文件夹信息（不持久化）
  const runtimeFolderMap = new Map<string, RuntimeFolderInfo>()
  const lastNativeFolderPath = store.reactive(addPrefix(`draft_folder_path`), ``)

  // 当前激活的文件夹 ID（不持久化）
  const currentFolderId = ref<string | null>(null)

  // 当前文件夹的文件树（不持久化，因为包含不可序列化的 handle）
  const fileTree = ref<FileSystemNode[]>([])

  // 选中的文件路径
  const selectedFilePath = ref<string>(``)

  // 是否正在加载
  const isLoading = ref(false)

  // 加载错误信息
  const loadError = ref<string>(``)
  const createFolderDialogOpen = ref(false)
  const pendingDeletePath = ref(``)
  const pendingMovePath = ref(``)

  // 当前运行时文件夹
  const currentRuntimeFolder = computed(() => {
    if (!currentFolderId.value)
      return null
    return runtimeFolderMap.get(currentFolderId.value) || null
  })

  const currentFolderHandle = computed(() => {
    if (!currentRuntimeFolder.value)
      return null
    return {
      id: currentRuntimeFolder.value.id,
      name: currentRuntimeFolder.value.name,
      handle: currentRuntimeFolder.value.handle,
      nativePath: currentRuntimeFolder.value.nativePath,
      permission: true,
    }
  })

  // 检查浏览器是否支持 File System Access API
  const isFileSystemAPISupported = computed(() => {
    return Boolean(getDesktopBridge()?.folders)
      || (typeof window !== `undefined` && `showDirectoryPicker` in window)
  })

  /**
   * 选择并打开本地文件夹
   */
  async function selectFolder() {
    const blocker = describeFolderPickerBlocker({
      hasDesktopFolders: Boolean(getDesktopBridge()?.folders),
      isSecureContext: typeof window !== `undefined` && window.isSecureContext,
      hasDirectoryPicker: typeof window !== `undefined` && `showDirectoryPicker` in window,
      origin: typeof location !== `undefined` ? location.origin : ``,
    })
    if (blocker) {
      toast.error(blocker)
      return
    }

    try {
      isLoading.value = true
      loadError.value = ``

      const desktopFolders = getDesktopBridge()?.folders
      if (desktopFolders) {
        const selected = await desktopFolders.choose()
        if (!selected) {
          return
        }
        const existingFolder = Array.from(runtimeFolderMap.values())
          .find(folder => folder.nativePath === selected.path)
        const folderId = existingFolder?.id ?? generateFolderId()
        runtimeFolderMap.set(folderId, {
          id: folderId,
          name: selected.name,
          nativePath: selected.path,
        })
        currentFolderId.value = folderId
        lastNativeFolderPath.value = selected.path
        await loadNativeFileTree(selected.name, selected.path)
        toast.success(`文件夹「${selected.name}」已打开，稿子会写进这里`)
        return
      }

      const handle = await window.showDirectoryPicker({
        mode: `readwrite`,
        startIn: `documents`,
      })
      if (typeof handle.requestPermission === `function`) {
        const permission = await handle.requestPermission({ mode: `readwrite` })
        if (permission !== `granted`) {
          toast.error(`没有写入权限，文件夹没有打开`)
          return
        }
      }

      // 检查是否已经打开过这个文件夹
      let folderId: string
      const existingFolder = Array.from(runtimeFolderMap.values()).find(f => f.name === handle.name)

      if (existingFolder) {
        folderId = existingFolder.id
        // 更新 handle
        existingFolder.handle = handle
      }
      else {
        // 创建新文件夹信息
        folderId = generateFolderId()
        const folderInfo: RuntimeFolderInfo = {
          id: folderId,
          name: handle.name,
          handle,
        }
        runtimeFolderMap.set(folderId, folderInfo)
      }

      currentFolderId.value = folderId

      // 加载文件树
      await loadFileTree(handle)

      // 记住授权属于附加能力；部分 Electron/Chromium 版本会让 FileSystemHandle
      // 的 IndexedDB 写入迟迟不结束，不能因此把首次导入一直锁在“加载中”。
      void saveFolderHandle({
        id: folderId,
        name: handle.name,
        handle,
        lastOpenedAt: Date.now(),
      })

      toast.success(`文件夹「${handle.name}」已打开，稿子会写进这里`)
    }
    catch (error: any) {
      if (error.name === `AbortError`) {
        toast.message(`没有选文件夹`)
        return
      }
      loadError.value = error.message || `打开文件夹失败`
      toast.error(`打开文件夹失败: ${error.message}`)
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * 关闭当前文件夹
   */
  function closeFolder() {
    currentFolderId.value = null
    fileTree.value = []
    selectedFilePath.value = ``
  }

  /**
   * 从列表中移除文件夹
   */
  function removeFolder(folderId: string) {
    runtimeFolderMap.delete(folderId)
    void deleteFolderHandle(folderId)

    // 如果关闭的是当前文件夹，清空当前状态
    if (currentFolderId.value === folderId) {
      closeFolder()
    }
  }

  /**
   * 恢复上次打开的文件夹。
   *
   * handle 存得住，权限存不住：取回来的 handle 权限会退回 prompt，
   * 而重新申请权限必须挂在用户手势上，没法在启动时静默完成。
   * 所以这里只在权限仍然有效时自动恢复——桌面版由主进程放行，
   * 走到这一步就是无感的；浏览器里则是等用户自己再点一次「打开文件夹」。
   */
  async function restoreSavedFolders(): Promise<void> {
    if (!isFileSystemAPISupported.value || currentFolderId.value) {
      return
    }

    const desktopFolders = getDesktopBridge()?.folders
    if (desktopFolders) {
      if (!lastNativeFolderPath.value) {
        return
      }
      const selected = await desktopFolders.remember(lastNativeFolderPath.value)
      if (!selected) {
        return
      }
      const folderId = generateFolderId()
      runtimeFolderMap.set(folderId, {
        id: folderId,
        name: selected.name,
        nativePath: selected.path,
      })
      currentFolderId.value = folderId
      await loadNativeFileTree(selected.name, selected.path)
      return
    }

    const saved = await listSavedFolderHandles()
    for (const entry of saved) {
      runtimeFolderMap.set(entry.id, {
        id: entry.id,
        name: entry.name,
        handle: entry.handle,
      })
    }

    const mostRecent = saved[0]
    if (!mostRecent) {
      return
    }

    try {
      if (typeof mostRecent.handle.queryPermission === `function`) {
        const permission = await mostRecent.handle.queryPermission({ mode: `readwrite` })
        if (permission !== `granted`) {
          return
        }
      }

      currentFolderId.value = mostRecent.id
      await loadFileTree(mostRecent.handle)
    }
    catch (error: any) {
      // 目录被删掉或者移走了，别把启动流程也带崩
      console.error(`恢复上次的文件夹失败`, error)
      currentFolderId.value = null
      await deleteFolderHandle(mostRecent.id)
      runtimeFolderMap.delete(mostRecent.id)
    }
  }

  /**
   * 加载文件树
   */
  async function loadFileTree(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      const tree: FileSystemNode = {
        name: handle.name,
        path: handle.name,
        type: `directory`,
        handle,
        children: await readFolderLevel(handle, handle.name),
      }
      fileTree.value = [tree]
    }
    catch (error: any) {
      loadError.value = error.message || `加载文件树失败`
      throw error
    }
  }

  async function loadNativeFileTree(name: string, nativePath: string): Promise<void> {
    const folders = getDesktopBridge()?.folders
    if (!folders) {
      throw new Error(`桌面文件夹服务不可用`)
    }
    const children = await folders.readDirectory(nativePath)
    fileTree.value = [{
      name,
      path: nativePath,
      nativePath,
      type: `directory`,
      children: children.map(entry => ({ ...entry, nativePath: entry.path })),
    }]
  }

  async function reloadCurrentFolder(expandedPaths?: Iterable<string>): Promise<void> {
    const current = currentRuntimeFolder.value
    if (!current) {
      return
    }
    if (current.nativePath) {
      await loadNativeFileTree(current.name, current.nativePath)
    }
    else if (current.handle) {
      await loadFileTree(current.handle)
    }
    if (expandedPaths) {
      await restoreExpandedDirectories(expandedPaths)
    }
  }

  async function restoreExpandedDirectories(expandedPaths: Iterable<string>): Promise<void> {
    const paths = [...expandedPaths].sort((left, right) => (
      left.split(/[\\/]/u).length - right.split(/[\\/]/u).length
    ))
    for (const path of paths) {
      const node = findNodeByPath(fileTree.value, path)
      if (node?.type === `directory` && !node.children) {
        await loadDirectoryChildren(node)
      }
    }
  }

  async function loadDirectoryChildren(node: FileSystemNode): Promise<void> {
    if (node.type !== `directory` || node.children) {
      return
    }
    if (node.nativePath) {
      const folders = getDesktopBridge()?.folders
      if (!folders) {
        throw new Error(`桌面文件夹服务不可用`)
      }
      const children = await folders.readDirectory(node.nativePath)
      node.children = children.map(entry => ({ ...entry, nativePath: entry.path }))
      return
    }
    const handle = node.handle as FileSystemDirectoryHandle | undefined
    if (!handle) {
      throw new Error(`文件夹句柄不可用: ${node.path}`)
    }
    node.children = await readFolderLevel(handle, node.path)
  }

  /**
   * 读取文件内容
   */
  async function readFile(filePath: string): Promise<string> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    try {
      // 直接从文件树中查找节点
      const node = findNodeByPath(fileTree.value, filePath)
      if (!node) {
        throw new Error(`文件不存在: ${filePath}`)
      }

      if (node.type !== `file`) {
        throw new Error(`不是文件: ${filePath}`)
      }

      if (node.nativePath) {
        const folders = getDesktopBridge()?.folders
        if (!folders) {
          throw new Error(`桌面文件夹服务不可用`)
        }
        return await folders.readFile(node.nativePath)
      }

      // 使用节点中存储的文件句柄
      const fileHandle = node.handle as FileSystemFileHandle
      const file = await fileHandle.getFile()
      return await file.text()
    }
    catch (error: any) {
      toast.error(`读取文件失败: ${error.message}`)
      throw error
    }
  }

  async function resolveFileHandle(filePath: string, create: boolean): Promise<FileSystemFileHandle> {
    const root = currentRuntimeFolder.value?.handle
    if (!root) {
      throw new Error(`未选择文件夹`)
    }
    const parts = filePath.split(`/`).filter(Boolean)
    const segments = parts[0] === root.name ? parts.slice(1) : parts
    if (segments.length === 0) {
      throw new Error(`无效的文件路径`)
    }
    let directory = root
    for (const segment of segments.slice(0, -1)) {
      directory = await directory.getDirectoryHandle(segment, { create })
    }
    return directory.getFileHandle(segments[segments.length - 1], { create })
  }

  function joinNativePath(fileName: string) {
    const root = currentRuntimeFolder.value?.nativePath
    if (!root) {
      throw new Error(`未选择文件夹`)
    }
    return `${root.replace(/[/\\]$/u, ``)}/${fileName}`
  }

  /**
   * 把正文写回已经打开的 Markdown 文件。
   */
  async function writeFile(filePath: string, content: string): Promise<void> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }

    if (currentRuntimeFolder.value.nativePath) {
      const folders = getDesktopBridge()?.folders
      if (!folders) {
        throw new Error(`桌面文件夹服务不可用`)
      }
      await folders.writeFile(filePath, content)
      return
    }

    const fileHandle = await resolveFileHandle(filePath, true)
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  /**
   * 在指定目录（默认根目录）新建一稿。
   */
  async function createMarkdownFile(
    fileName: string,
    content: string,
    directoryPath?: string,
  ): Promise<string> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }
    const filePath = directoryPath
      ? joinDraftPath(directoryPath, fileName)
      : currentRuntimeFolder.value.nativePath
        ? joinNativePath(fileName)
        : `${currentRuntimeFolder.value.name}/${fileName}`
    await writeFile(filePath, content)
    await reloadCurrentFolder()
    return filePath
  }

  async function createDirectory(directoryPath: string, options?: { reload?: boolean }): Promise<void> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }
    if (currentRuntimeFolder.value.nativePath) {
      const folders = getDesktopBridge()?.folders
      if (!folders?.ensureDirectory) {
        throw new Error(`当前桌面版还不能新建子文件夹`)
      }
      await folders.ensureDirectory(directoryPath)
      if (options?.reload !== false) {
        await reloadCurrentFolder()
      }
      return
    }
    const root = currentRuntimeFolder.value.handle
    if (!root) {
      throw new Error(`未选择文件夹`)
    }
    const parts = directoryPath.split(`/`).filter(Boolean)
    const segments = parts[0] === root.name ? parts.slice(1) : parts
    let directory = root
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create: true })
    }
    if (options?.reload !== false) {
      await reloadCurrentFolder()
    }
  }

  async function removeDirectory(directoryPath: string, options?: { reload?: boolean }): Promise<void> {
    const rootPath = fileTree.value[0]?.path ?? currentRuntimeFolder.value?.name ?? ``
    if (!canDeleteDraftDirectory(rootPath, directoryPath)) {
      throw new Error(`不能删除已打开的根目录`)
    }
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }
    if (currentRuntimeFolder.value.nativePath) {
      const folders = getDesktopBridge()?.folders
      if (!folders?.deleteDirectory) {
        throw new Error(`当前桌面版还不能删除子文件夹`)
      }
      await folders.deleteDirectory(directoryPath)
      if (options?.reload !== false) {
        await reloadCurrentFolder()
      }
      return
    }
    const root = currentRuntimeFolder.value.handle
    if (!root) {
      throw new Error(`未选择文件夹`)
    }
    const node = findNodeByPath(fileTree.value, directoryPath)
    const parentPath = parentDraftDirectory(directoryPath)
    const parentNode = parentPath
      ? findNodeByPath(fileTree.value, parentPath)
      : fileTree.value[0]
    const name = draftFileName(directoryPath)
    if (!name) {
      throw new Error(`不能删除已打开的根目录`)
    }
    const targetHandle = node?.handle as (FileSystemDirectoryHandle & {
      remove?: (options?: { recursive?: boolean }) => Promise<void>
    }) | undefined
    if (typeof targetHandle?.remove === `function`) {
      try {
        await targetHandle.remove({ recursive: true })
        if (options?.reload !== false) {
          await reloadCurrentFolder()
        }
        return
      }
      catch {
        // 句柄还被树握着时，走下面放开后再删
      }
    }
    releaseFolderNodeHandles(node)
    const parentHandle = (parentNode?.handle as FileSystemDirectoryHandle | undefined) ?? root
    await removeChildDirectory(parentHandle, name)
    if (options?.reload !== false) {
      await reloadCurrentFolder()
    }
  }

  async function removeMarkdownFile(filePath: string): Promise<void> {
    if (!currentRuntimeFolder.value) {
      throw new Error(`未选择文件夹`)
    }
    if (currentRuntimeFolder.value.nativePath) {
      const folders = getDesktopBridge()?.folders
      if (!folders?.deleteFile) {
        throw new Error(`当前桌面版还不能归档到子目录`)
      }
      await folders.deleteFile(filePath)
      return
    }
    const root = currentRuntimeFolder.value.handle
    if (!root) {
      throw new Error(`未选择文件夹`)
    }
    const parts = filePath.split(`/`).filter(Boolean)
    const segments = parts[0] === root.name ? parts.slice(1) : parts
    if (segments.length === 0) {
      throw new Error(`无效的文件路径`)
    }
    let directory = root
    for (const segment of segments.slice(0, -1)) {
      directory = await directory.getDirectoryHandle(segment)
    }
    await directory.removeEntry(segments[segments.length - 1])
  }

  async function moveMarkdownFile(fromPath: string, toPath: string, options?: { reload?: boolean }): Promise<string> {
    if (fromPath === toPath) {
      return fromPath
    }
    const content = await readFile(fromPath)
    await writeFile(toPath, content)
    await removeMarkdownFile(fromPath)
    if (options?.reload !== false) {
      await reloadCurrentFolder()
    }
    return toPath
  }

  async function ensureChildrenLoaded(node: FileSystemNode): Promise<void> {
    if (node.type !== `directory`) {
      return
    }
    await loadDirectoryChildren(node)
    for (const child of node.children ?? []) {
      if (child.type === `directory`) {
        await ensureChildrenLoaded(child)
      }
    }
  }

  function collectDirectoryNodes(nodes: FileSystemNode[] = fileTree.value): FileSystemNode[] {
    const directories: FileSystemNode[] = []
    for (const node of nodes) {
      if (node.type !== `directory`) {
        continue
      }
      directories.push(node)
      if (node.children) {
        directories.push(...collectDirectoryNodes(node.children))
      }
    }
    return directories
  }

  async function directoryHasMarkdown(directoryPath: string): Promise<boolean> {
    const node = findNodeByPath(fileTree.value, directoryPath)
    if (!node || node.type !== `directory`) {
      return false
    }
    await ensureChildrenLoaded(node)
    return getAllMarkdownFiles([node]).length > 0
  }

  async function listMoveDirectories() {
    const root = fileTree.value[0]
    if (root) {
      await ensureChildrenLoaded(root)
    }
    return collectDirectoryNodes().map(node => ({
      path: node.path,
      name: node.name,
    }))
  }

  async function collectMoveJobs(fromPath: string, toPath: string): Promise<Array<{ from: string, to: string, type: `file` | `directory` }>> {
    const node = findNodeByPath(fileTree.value, fromPath)
    if (!node) {
      throw new Error(`找不到要移动的项`)
    }
    if (node.type === `file`) {
      return [{ from: fromPath, to: toPath, type: `file` }]
    }
    await ensureChildrenLoaded(node)
    const jobs: Array<{ from: string, to: string, type: `file` | `directory` }> = [
      { from: fromPath, to: toPath, type: `directory` },
    ]
    for (const child of node.children ?? []) {
      jobs.push(...await collectMoveJobs(child.path, joinDraftPath(toPath, child.name)))
    }
    return jobs
  }

  async function moveEntry(fromPath: string, destinationDirectory: string, options?: { reload?: boolean }): Promise<string> {
    const rootPath = fileTree.value[0]?.path ?? currentRuntimeFolder.value?.name ?? ``
    if (!canMoveDraftEntry(rootPath, fromPath, destinationDirectory)) {
      throw new Error(`不能移到这里`)
    }
    const toPath = relocateDraftPath(fromPath, destinationDirectory)
    const destinationNode = findNodeByPath(fileTree.value, destinationDirectory)
    if (destinationNode?.type === `directory`) {
      await loadDirectoryChildren(destinationNode)
    }
    if (findNodeByPath(fileTree.value, toPath)) {
      throw new Error(`目标里已经有同名的「${draftFileName(fromPath)}」`)
    }
    const jobs = await collectMoveJobs(fromPath, toPath)
    for (const job of jobs) {
      if (job.type === `directory`) {
        await createDirectory(job.to, { reload: false })
      }
    }
    for (const job of jobs) {
      if (job.type === `file`) {
        const content = await readFile(job.from)
        await writeFile(job.to, content)
        await removeMarkdownFile(job.from)
      }
    }
    for (const job of [...jobs].reverse()) {
      if (job.type === `directory`) {
        await removeDirectory(job.from, { reload: false })
      }
    }
    if (options?.reload !== false) {
      await reloadCurrentFolder()
    }
    return toPath
  }

  function markdownNamesInDirectory(directoryPath: string) {
    return getAllMarkdownFiles()
      .filter(node => parentDraftDirectory(node.path) === directoryPath)
      .map(node => node.name || draftFileName(node.path))
  }

  /**
   * 在文件树中查找节点
   */
  function findNodeByPath(nodes: FileSystemNode[], path: string): FileSystemNode | null {
    for (const node of nodes) {
      if (node.path === path) {
        return node
      }
      if (node.children) {
        const found = findNodeByPath(node.children, path)
        if (found)
          return found
      }
    }
    return null
  }

  /**
   * 获取所有 Markdown 文件列表
   */
  function getAllMarkdownFiles(nodes: FileSystemNode[] = fileTree.value): FileSystemNode[] {
    const files: FileSystemNode[] = []
    for (const node of nodes) {
      if (node.type === `file`) {
        files.push(node)
      }
      if (node.children) {
        files.push(...getAllMarkdownFiles(node.children))
      }
    }
    return files
  }

  /**
   * 生成文件夹 ID
   */
  function generateFolderId(): string {
    return `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  return {
    // State
    currentFolderHandle,
    fileTree,
    selectedFilePath,
    isLoading,
    loadError,
    createFolderDialogOpen,
    pendingDeletePath,
    pendingMovePath,

    // Computed
    isFileSystemAPISupported,

    // Actions
    selectFolder,
    restoreSavedFolders,
    closeFolder,
    removeFolder,
    loadFileTree,
    reloadCurrentFolder,
    restoreExpandedDirectories,
    loadDirectoryChildren,
    readFile,
    writeFile,
    createMarkdownFile,
    createDirectory,
    removeDirectory,
    moveMarkdownFile,
    moveEntry,
    directoryHasMarkdown,
    listMoveDirectories,
    markdownNamesInDirectory,
    findNodeByPath,
    getAllMarkdownFiles,
  }
})
