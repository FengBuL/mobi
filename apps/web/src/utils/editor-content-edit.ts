import type { Transaction } from '@codemirror/state'
import type { ContentEditKind } from '@/utils/telemetry'
import { PASTE_AS_DRAFT_MIN_CHARS } from '@/utils/telemetry'

/**
 * 从一次编辑器更新里挑出「用户亲手改正文」的那一笔。
 *
 * CodeMirror 只给键盘输入、删除、粘贴、拖放这类 DOM 事件打 userEvent 标记；
 * 程序化 dispatch（加载默认稿、切主题重写、插板块、图文排版改写）没有标记，
 * 撤销 / 重做也不算新改动。这样默认稿加载、切主题、插板块都不会触发 content_edit。
 *
 * 返回 null 表示这次更新里没有用户改动。
 */
export function resolveUserContentEdit(transactions: readonly Transaction[]): { kind: ContentEditKind, chars: number } | null {
  let matched: Transaction | null = null
  for (const transaction of transactions) {
    if (!transaction.docChanged)
      continue
    if (transaction.isUserEvent(`input`) || transaction.isUserEvent(`delete`) || transaction.isUserEvent(`move`)) {
      matched = transaction
      break
    }
  }
  if (!matched)
    return null

  let inserted = 0
  matched.changes.iterChanges((_fromA, _toA, _fromB, _toB, text) => {
    inserted += text.length
  })

  const isPaste = matched.isUserEvent(`input.paste`) || matched.isUserEvent(`input.drop`)
  return {
    kind: isPaste && inserted >= PASTE_AS_DRAFT_MIN_CHARS ? `paste` : `type`,
    chars: matched.newDoc.length,
  }
}
