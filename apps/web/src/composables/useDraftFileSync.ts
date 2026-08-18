import type { InjectionKey } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useFolderSourceStore } from '@/stores/folderSource'
import { usePostStore } from '@/stores/post'
import { allocateMarkdownFileName } from '@/utils/draft-file'
import {
  ARCHIVE_FOLDER_NAME,
  archiveDirectoryPath,
  archiveDraftPath,
  displayDraftPath,
  draftFileName,
  isArchivedDraftPath,
  isPathInsideDirectory,
  joinDraftPath,
  parentDraftDirectory,
  resolveWriteDirectory,
  rewritePathPrefix,
  unarchiveDraftPath,
} from '@/utils/draft-folder'

export const draftFileSyncKey: InjectionKey<ReturnType<typeof useDraftFileSync>> = Symbol(`draftFileSync`)

/**
 * 本地文件夹是导入源和整理盘。编辑器里的改稿、版式不写回原文件。
 */
export function useDraftFileSync() {
  const postStore = usePostStore()
  const folderStore = useFolderSourceStore()
  const editorStore = useEditorStore()
  const writing = ref(false)
  const conflictPaths = ref<string[]>([])

  const canWriteFolder = computed(() => Boolean(folderStore.currentFolderHandle))

  function writeDirectoryPath() {
    const rootPath = folderStore.fileTree[0]?.path ?? ``
    const selectedPath = folderStore.selectedFilePath || null
    const selected = selectedPath
      ? folderStore.findNodeByPath(folderStore.fileTree, selectedPath)
      : null
    return resolveWriteDirectory({
      rootPath,
      selectedPath,
      selectedType: selected?.type ?? null,
    })
  }

  function existingFileNames(directoryPath = writeDirectoryPath()) {
    return folderStore.markdownNamesInDirectory(directoryPath)
  }

  function rememberImport(id: string, filePath: string) {
    const post = postStore.getPostById(id)
    if (!post) {
      return
    }
    post.importedFrom = filePath
    post.filePath = null
    post.syncedHash = ``
    post.updateDatetime = new Date()
  }

  async function ensurePostHasFile(_id: string) {
    // 编辑器只导入，新建稿不写进文件夹
  }

  async function exportAllPostsToFolder() {
    if (!folderStore.isFileSystemAPISupported) {
      toast.error(`这个浏览器不能写本地文件夹。稿子还在浏览器里，清缓存会丢，请改用 Chrome / Edge，或先导出 Markdown。`)
      return
    }
    if (!canWriteFolder.value) {
      await folderStore.selectFolder()
    }
    if (!canWriteFolder.value) {
      return
    }

    let count = 0
    writing.value = true
    try {
      for (const post of postStore.posts) {
        const directoryPath = writeDirectoryPath()
        const fileName = allocateMarkdownFileName(post.title, existingFileNames(directoryPath))
        await folderStore.createMarkdownFile(fileName, post.content, directoryPath)
        count += 1
      }
      toast.success(`已导出 ${count} 篇副本到文件夹，原文件没有改`)
    }
    finally {
      writing.value = false
    }
  }

  async function openFileAsDraft(node: { name: string, path: string }) {
    const content = await folderStore.readFile(node.path)
    const title = node.name.replace(/\.md$/i, ``)
    const existing = postStore.posts.find(post => post.importedFrom === node.path || post.filePath === node.path)
    if (existing) {
      postStore.currentPostId = existing.id
      postStore.updatePostContent(existing.id, content)
      rememberImport(existing.id, node.path)
      editorStore.importContent(content)
      return
    }

    postStore.addPost(title)
    postStore.updatePostContent(postStore.currentPostId, content)
    rememberImport(postStore.currentPostId, node.path)
    editorStore.importContent(content)
  }

  async function reloadBoundPost(id: string) {
    const post = postStore.getPostById(id)
    const source = post?.importedFrom || post?.filePath
    if (!source) {
      return
    }
    const content = await folderStore.readFile(source)
    postStore.updatePostContent(id, content)
    rememberImport(id, source)
    if (postStore.currentPostId === id) {
      editorStore.importContent(content)
    }
    toast.success(`已重新导入「${post?.title}」`)
  }

  function retargetImportedPosts(fromPath: string, toPath: string) {
    for (const post of postStore.posts) {
      if (post.importedFrom && isPathInsideDirectory(post.importedFrom, fromPath)) {
        post.importedFrom = rewritePathPrefix(post.importedFrom, fromPath, toPath)
      }
      if (post.filePath && isPathInsideDirectory(post.filePath, fromPath)) {
        post.filePath = null
      }
    }
  }

  async function archiveFile(filePath: string, options?: { reload?: boolean, silent?: boolean }) {
    if (!canWriteFolder.value) {
      if (!options?.silent) {
        toast.error(`先打开一个本地文件夹`)
      }
      return
    }
    const rootPath = folderStore.fileTree[0]?.path ?? ``
    const nextPath = archiveDraftPath(filePath, ARCHIVE_FOLDER_NAME, rootPath || undefined)
    if (nextPath === filePath) {
      if (!options?.silent) {
        toast.info(`这篇已经在归档里`)
      }
      return nextPath
    }
    try {
      const moved = await folderStore.moveMarkdownFile(filePath, nextPath, { reload: options?.reload })
      retargetImportedPosts(filePath, moved)
      folderStore.selectedFilePath = moved
      if (!options?.silent) {
        toast.success(`已归档到「${ARCHIVE_FOLDER_NAME}」`)
      }
      return moved
    }
    catch (error) {
      if (!options?.silent) {
        toast.error(`归档失败：${(error as Error).message}`)
        return
      }
      throw error
    }
  }

  async function unarchiveFile(filePath: string, options?: { reload?: boolean, silent?: boolean }) {
    if (!canWriteFolder.value) {
      if (!options?.silent) {
        toast.error(`先打开一个本地文件夹`)
      }
      return
    }
    const rootPath = folderStore.fileTree[0]?.path ?? ``
    if (filePath === archiveDirectoryPath(rootPath) || filePath === rootPath) {
      if (!options?.silent) {
        toast.error(`不能取消归档这个文件夹，请点里面的稿`)
      }
      return
    }
    if (!isArchivedDraftPath(filePath, rootPath)) {
      if (!options?.silent) {
        toast.info(`这篇不在归档里`)
      }
      return filePath
    }
    let nextPath = unarchiveDraftPath(filePath, rootPath)
    const taken = folderStore.markdownNamesInDirectory(rootPath)
    const fileName = draftFileName(nextPath)
    if (taken.some(name => name.toLowerCase() === fileName.toLowerCase())) {
      nextPath = joinDraftPath(rootPath, allocateMarkdownFileName(fileName.replace(/\.md$/i, ``), taken))
    }
    try {
      const moved = await folderStore.moveMarkdownFile(filePath, nextPath, { reload: options?.reload })
      retargetImportedPosts(filePath, moved)
      folderStore.selectedFilePath = moved
      if (!options?.silent) {
        toast.success(`已取消归档`)
      }
      return moved
    }
    catch (error) {
      if (!options?.silent) {
        toast.error(`取消归档失败：${(error as Error).message}`)
        return
      }
      throw error
    }
  }

  async function archiveFiles(filePaths: string[]) {
    const paths = [...new Set(filePaths.filter(Boolean))]
    if (paths.length === 0) {
      return
    }
    const rootPath = folderStore.fileTree[0]?.path ?? ``
    const archived = paths.every(path => isArchivedDraftPath(path, rootPath))
    const run = archived ? unarchiveFile : archiveFile
    let last: string | undefined
    let count = 0
    try {
      for (const [index, path] of paths.entries()) {
        const moved = await run(path, {
          reload: index === paths.length - 1,
          silent: true,
        })
        if (moved && moved !== path) {
          count += 1
        }
        last = moved
      }
      toast.success(archived
        ? `已取消归档 ${count} 篇`
        : count > 0 ? `已归档 ${count} 篇到「${ARCHIVE_FOLDER_NAME}」` : `这些已经在归档里`)
      return last
    }
    catch (error) {
      await folderStore.reloadCurrentFolder()
      toast.error(`${archived ? `取消归档` : `归档`}失败：${(error as Error).message}`)
    }
  }

  async function archiveCurrentPost() {
    const selected = folderStore.selectedFilePath
    const node = selected ? folderStore.findNodeByPath(folderStore.fileTree, selected) : null
    if (node?.type === `file`) {
      return isArchivedDraftPath(node.path, folderStore.fileTree[0]?.path ?? ``)
        ? unarchiveFile(node.path)
        : archiveFile(node.path)
    }
    toast.error(`先在左边点选一篇文件夹里的稿`)
  }

  async function createSubfolder(name: string) {
    const folderName = name.trim()
    if (!folderName) {
      toast.error(`先写子文件夹的名字`)
      return
    }
    if (!canWriteFolder.value) {
      toast.error(`先打开一个本地文件夹`)
      return
    }
    const directoryPath = joinDraftPath(writeDirectoryPath(), folderName)
    await folderStore.createDirectory(directoryPath)
    folderStore.selectedFilePath = directoryPath
    toast.success(`已新建「${folderName}」`)
  }

  async function deleteSubfolder(directoryPath: string) {
    if (!canWriteFolder.value) {
      toast.error(`先打开一个本地文件夹`)
      return
    }
    if (await folderStore.directoryHasMarkdown(directoryPath)) {
      toast.error(`这个文件夹里还有稿。请先移动到别处，再删这个空文件夹。`)
      return
    }
    if (folderStore.selectedFilePath && isPathInsideDirectory(folderStore.selectedFilePath, directoryPath)) {
      folderStore.selectedFilePath = parentDraftDirectory(directoryPath)
    }
    try {
      await folderStore.removeDirectory(directoryPath)
    }
    catch (error) {
      toast.error(`删不掉这个子文件夹：${(error as Error).message}`)
      return
    }
    toast.success(`已删除这个空文件夹`)
  }

  async function moveEntry(fromPath: string, destinationDirectory: string, options?: { reload?: boolean, silent?: boolean }) {
    if (!canWriteFolder.value) {
      if (!options?.silent) {
        toast.error(`先打开一个本地文件夹`)
      }
      return
    }
    try {
      const toPath = await folderStore.moveEntry(fromPath, destinationDirectory, { reload: options?.reload })
      retargetImportedPosts(fromPath, toPath)
      if (folderStore.selectedFilePath && isPathInsideDirectory(folderStore.selectedFilePath, fromPath)) {
        folderStore.selectedFilePath = rewritePathPrefix(folderStore.selectedFilePath, fromPath, toPath)
      }
      if (!options?.silent) {
        toast.success(`已移到「${displayDraftPath(folderStore.fileTree[0]?.path ?? ``, destinationDirectory)}」`)
      }
      return toPath
    }
    catch (error) {
      if (!options?.silent) {
        toast.error(`移不过去：${(error as Error).message}`)
        return
      }
      throw error
    }
  }

  async function moveEntries(fromPaths: string[], destinationDirectory: string) {
    const paths = [...new Set(fromPaths.filter(Boolean))]
    if (paths.length === 0) {
      return
    }
    let last: string | undefined
    try {
      for (const [index, path] of paths.entries()) {
        last = await moveEntry(path, destinationDirectory, {
          reload: index === paths.length - 1,
          silent: true,
        })
      }
      toast.success(`已移走 ${paths.length} 项到「${displayDraftPath(folderStore.fileTree[0]?.path ?? ``, destinationDirectory)}」`)
      return last
    }
    catch (error) {
      await folderStore.reloadCurrentFolder()
      toast.error(`移不过去：${(error as Error).message}`)
    }
  }

  return {
    canWriteFolder,
    writing,
    conflictPaths,
    exportAllPostsToFolder,
    openFileAsDraft,
    reloadBoundPost,
    ensurePostHasFile,
    archiveCurrentPost,
    archiveFile,
    unarchiveFile,
    archiveFiles,
    createSubfolder,
    deleteSubfolder,
    moveEntry,
    moveEntries,
  }
}
