import { useEditorStore } from '@/stores/editor'

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

    editorStore.importContent(merged)
    toast.success(validFiles.length > 1 ? `已导入 ${validFiles.length} 个 Markdown 文件` : `Markdown 已导入`)
    return true
  }

  return {
    importMarkdownFiles,
    isSupportedMarkdownFile,
  }
}
