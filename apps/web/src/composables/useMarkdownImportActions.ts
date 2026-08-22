import { useEditorStore } from '@/stores/editor'
import { usePostStore } from '@/stores/post'
import { titleFromImportedMarkdown } from '@/utils/imported-markdown'

const MARKDOWN_FILE_PATTERN = /\.(md|markdown|txt)$/i

function isSupportedMarkdownFile(file: File) {
  return MARKDOWN_FILE_PATTERN.test(file.name)
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsText(file, `UTF-8`)
    reader.onload = event => resolve((event.target?.result as string) || ``)
    reader.onerror = () => resolve(``)
  })
}

export function useMarkdownImportActions() {
  const editorStore = useEditorStore()
  const postStore = usePostStore()

  function applyImportedMarkdown(content: string, fallbackTitle = `未命名`) {
    const current = editorStore.getContent().trim()
    if (current && !window.confirm(`导入会替换当前正文，标题卡和列表名也会按文稿改。继续？`))
      return false
    editorStore.importContent(content)
    const post = postStore.currentPost
    if (post) {
      postStore.updatePostContent(post.id, content)
      postStore.renamePost(post.id, titleFromImportedMarkdown(content, fallbackTitle))
    }
    return true
  }

  async function importMarkdownFiles(files: File[]) {
    const validFiles = files.filter(isSupportedMarkdownFile)
    if (validFiles.length === 0) {
      toast.error(`请选择 Markdown 文件（.md / .markdown / .txt）`)
      return false
    }

    const contents = await Promise.all(validFiles.map(readFileAsText))
    const merged = contents.filter(content => content.trim()).join(`\n\n`)
    if (!merged) {
      toast.error(`导入失败，文件内容为空`)
      return false
    }

    const fallback = validFiles[0]?.name.replace(/\.(md|markdown|txt)$/i, ``) || `未命名`
    if (!applyImportedMarkdown(merged, fallback))
      return false
    toast.success(validFiles.length > 1 ? `已导入 ${validFiles.length} 个 Markdown 文件` : `Markdown 已导入`)
    return true
  }

  return {
    importMarkdownFiles,
    applyImportedMarkdown,
    isSupportedMarkdownFile,
  }
}
