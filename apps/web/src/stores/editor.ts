import type { EditorView } from '@codemirror/view'
import { Annotation } from '@codemirror/state'
import { formatDoc } from '@/utils'

export const blockSelectionTransaction = Annotation.define<boolean>()

interface EditorMutationOptions {
  preserveBlockSelection?: boolean
}

/**
 * 编辑器 Store
 * 负责管理 CodeMirror 编辑器实例和基础操作
 */
export const useEditorStore = defineStore(`editor`, () => {
  // 内容编辑器实例
  const editor = ref<EditorView | null>(null)

  // 格式化文档
  const formatContent = async () => {
    if (!editor.value)
      return

    const doc = await formatDoc(editor.value.state.doc.toString())
    editor.value.dispatch({
      changes: { from: 0, to: editor.value.state.doc.length, insert: doc },
    })
    return doc
  }

  // 导入默认文档
  const importContent = (content: string, options: EditorMutationOptions = {}) => {
    if (!editor.value)
      return

    editor.value.dispatch({
      changes: { from: 0, to: editor.value.state.doc.length, insert: content },
      annotations: options.preserveBlockSelection ? blockSelectionTransaction.of(true) : undefined,
    })
  }

  // 清空内容
  const clearContent = () => {
    if (!editor.value)
      return

    editor.value.dispatch({
      changes: { from: 0, to: editor.value.state.doc.length, insert: `` },
    })
    toast.success(`内容已清空`)
  }

  // 获取当前内容
  const getContent = () => {
    return editor.value?.state.doc.toString() ?? ``
  }

  // 获取选中的文本
  const getSelection = () => {
    if (!editor.value)
      return ``

    const selection = editor.value.state.selection.main
    return editor.value.state.doc.sliceString(selection.from, selection.to)
  }

  // 替换选中的文本
  const replaceSelection = (text: string) => {
    if (!editor.value)
      return

    editor.value.dispatch(editor.value.state.replaceSelection(text))
  }

  // 在光标位置插入文本
  const insertAtCursor = (text: string) => {
    if (!editor.value)
      return

    const selection = editor.value.state.selection.main
    editor.value.dispatch({
      changes: { from: selection.from, to: selection.to, insert: text },
      selection: { anchor: selection.from + text.length },
    })
    editor.value.focus()
  }

  /**
   * 插入独立成段的内容，前后补足空行。
   *
   * CommonMark 的 HTML 块要遇到空行才结束。只垫一个换行的话，紧跟在板块后面的
   * 那一行 Markdown 会被吞进 HTML 块当原文输出，正文里就会冒出一行 `## 标题`。
   */
  const insertBlockAtCursor = (markup: string, options: EditorMutationOptions = {}) => {
    if (!editor.value)
      return

    const { state } = editor.value
    const { from, to } = state.selection.main
    const before = state.doc.sliceString(Math.max(0, from - 2), from)
    const after = state.doc.sliceString(to, Math.min(state.doc.length, to + 2))

    const countEdgeNewlines = (value: string, fromEnd: boolean) => {
      let count = 0
      while (count < 2 && count < value.length) {
        const char = fromEnd ? value[value.length - 1 - count] : value[count]
        if (char !== `\n`)
          break
        count += 1
      }
      return count
    }

    const leading = from === 0 ? `` : `\n`.repeat(2 - countEdgeNewlines(before, true))
    const trailing = `\n`.repeat(2 - countEdgeNewlines(after, false))
    const text = `${leading}${markup}${trailing}`

    editor.value.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
      annotations: options.preserveBlockSelection ? blockSelectionTransaction.of(true) : undefined,
    })
    editor.value.focus()
    return { from: from + leading.length, to: from + leading.length + markup.length }
  }

  return {
    editor,
    formatContent,
    importContent,
    clearContent,
    getContent,
    getSelection,
    replaceSelection,
    insertAtCursor,
    insertBlockAtCursor,
  }
})
