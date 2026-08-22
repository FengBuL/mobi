/**
 * 引用块回车 / 接表格或代码时，要不要把 `>` 带下去。
 * 手打会走 CodeMirror 的续行；粘贴不走这条路。
 */

import type { EditorView } from '@codemirror/view'

const EMPTY_QUOTE_LINE = /^\s*>\s*$/u
const NEXT_BLOCK_MARK = /^(?:```|~~~|\|)/u

export function isEmptyBlockquoteLine(lineText: string) {
  return EMPTY_QUOTE_LINE.test(lineText)
}

export function shouldExitBlockquoteOnEnter(lineText: string) {
  return isEmptyBlockquoteLine(lineText)
}

export function shouldStripBlockquoteBeforeTypedBlock(lineText: string, inserted: string) {
  return isEmptyBlockquoteLine(lineText) && NEXT_BLOCK_MARK.test(inserted)
}

export function stripBlockquoteMarker(lineText: string) {
  return lineText.replace(/^\s*>\s*/u, ``)
}

export function handleBlockquoteEnter(view: EditorView): boolean {
  const range = view.state.selection.main
  if (!range.empty)
    return false

  const line = view.state.doc.lineAt(range.head)
  if (!shouldExitBlockquoteOnEnter(line.text))
    return false

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: `` },
    selection: { anchor: line.from },
    userEvent: `delete.forward`,
  })
  return true
}

export function handleBlockquoteTypedBlock(
  view: EditorView,
  from: number,
  to: number,
  text: string,
): boolean {
  const line = view.state.doc.lineAt(from)
  if (!shouldStripBlockquoteBeforeTypedBlock(line.text, text))
    return false

  view.dispatch({
    changes: { from: line.from, to, insert: text },
    selection: { anchor: line.from + text.length },
    userEvent: `input.type`,
  })
  return true
}
