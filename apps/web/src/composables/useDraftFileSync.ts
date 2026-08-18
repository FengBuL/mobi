import type { InjectionKey } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useFolderSourceStore } from '@/stores/folderSource'
import { usePostStore } from '@/stores/post'
import { allocateMarkdownFileName, hashText } from '@/utils/draft-file'

export const draftFileSyncKey: InjectionKey<ReturnType<typeof useDraftFileSync>> = Symbol(`draftFileSync`)

const WRITE_DELAY_MS = 800

/**
 * 打开了本地文件夹之后，当前稿自动写回对应的 Markdown 文件。
 * localStorage 仍做缓存。文件在外部被改过只提示重载。
 */
export function useDraftFileSync() {
  const postStore = usePostStore()
  const folderStore = useFolderSourceStore()
  const editorStore = useEditorStore()
  const writing = ref(false)
  const conflictPaths = ref<string[]>([])

  const canWriteFolder = computed(() => Boolean(folderStore.currentFolderHandle))

  function existingFileNames() {
    return folderStore.getAllMarkdownFiles().map(node => node.name)
  }

  async function bindPostToPath(id: string, filePath: string, content: string) {
    const post = postStore.getPostById(id)
    if (!post) {
      return
    }
    post.filePath = filePath
    post.syncedHash = hashText(content)
    post.updateDatetime = new Date()
  }

  async function writeBoundPost(id: string, content: string) {
    const post = postStore.getPostById(id)
    if (!post?.filePath || !canWriteFolder.value) {
      return
    }
    const nextHash = hashText(content)
    if (post.syncedHash === nextHash) {
      return
    }
    writing.value = true
    try {
      await folderStore.writeFile(post.filePath, content)
      post.syncedHash = nextHash
    }
    finally {
      writing.value = false
    }
  }

  async function ensurePostHasFile(id: string) {
    const post = postStore.getPostById(id)
    if (!post || post.filePath || !canWriteFolder.value) {
      return
    }
    const fileName = allocateMarkdownFileName(post.title, existingFileNames())
    const filePath = await folderStore.createMarkdownFile(fileName, post.content)
    await bindPostToPath(id, filePath, post.content)
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
    for (const post of postStore.posts) {
      if (post.filePath) {
        await writeBoundPost(post.id, post.content)
        count += 1
        continue
      }
      const fileName = allocateMarkdownFileName(post.title, existingFileNames())
      const filePath = await folderStore.createMarkdownFile(fileName, post.content)
      await bindPostToPath(post.id, filePath, post.content)
      count += 1
    }
    toast.success(`已把 ${count} 篇写进文件夹`)
  }

  async function openFileAsDraft(node: { name: string, path: string }) {
    const content = await folderStore.readFile(node.path)
    const title = node.name.replace(/\.md$/i, ``)
    const existing = postStore.posts.find(post => post.filePath === node.path)
    if (existing) {
      const diskHash = hashText(content)
      if (diskHash !== hashText(existing.content) && diskHash !== existing.syncedHash) {
        conflictPaths.value = [...new Set([...conflictPaths.value, node.path])]
        toast.warning(`「${title}」在外部被改过，已停止写入。点重新加载可换成磁盘上的版本。`)
        postStore.currentPostId = existing.id
        return
      }
      postStore.currentPostId = existing.id
      if (diskHash !== hashText(existing.content)) {
        postStore.updatePostContent(existing.id, content)
        existing.syncedHash = diskHash
        editorStore.importContent(content)
      }
      return
    }

    postStore.addPost(title)
    postStore.updatePostContent(postStore.currentPostId, content)
    await bindPostToPath(postStore.currentPostId, node.path, content)
    editorStore.importContent(content)
  }

  async function reloadBoundPost(id: string) {
    const post = postStore.getPostById(id)
    if (!post?.filePath) {
      return
    }
    const content = await folderStore.readFile(post.filePath)
    postStore.updatePostContent(id, content)
    post.syncedHash = hashText(content)
    conflictPaths.value = conflictPaths.value.filter(path => path !== post.filePath)
    if (postStore.currentPostId === id) {
      editorStore.importContent(content)
    }
    toast.success(`已重新加载「${post.title}」`)
  }

  async function checkExternalChange(id: string) {
    const post = postStore.getPostById(id)
    if (!post?.filePath || !canWriteFolder.value) {
      return
    }
    const disk = await folderStore.readFile(post.filePath)
    const diskHash = hashText(disk)
    if (diskHash === hashText(post.content) || diskHash === post.syncedHash) {
      return
    }
    conflictPaths.value = [...new Set([...conflictPaths.value, post.filePath])]
    toast.warning(`「${post.title}」在外部被改过，已停止写入。点文件夹里的文件可重新加载。`, {
      action: {
        label: `重新加载`,
        onClick: () => {
          void reloadBoundPost(id)
        },
      },
    })
  }

  watchDebounced(
    () => [postStore.currentPostId, postStore.currentPost?.content, postStore.currentPost?.filePath] as const,
    async ([id, content, filePath]) => {
      if (!id || content == null) {
        return
      }
      if (!filePath || conflictPaths.value.includes(filePath)) {
        return
      }
      try {
        await writeBoundPost(id, content)
      }
      catch (error) {
        toast.error(`写回文件夹失败：${(error as Error).message}`)
      }
    },
    { debounce: WRITE_DELAY_MS },
  )

  useEventListener(window, `focus`, () => {
    if (postStore.currentPostId) {
      void checkExternalChange(postStore.currentPostId)
    }
  })

  return {
    canWriteFolder,
    writing,
    conflictPaths,
    exportAllPostsToFolder,
    openFileAsDraft,
    reloadBoundPost,
    ensurePostHasFile,
  }
}
