import { history, isolateHistory } from '@codemirror/commands'
import { Annotation } from '@codemirror/state'

export { isolateHistory }

export const blockFieldEditSession = Annotation.define<boolean>()

let joinBlockFieldEdits = false
let lastTypingTime = 0

export function armBlockFieldEditJoin() {
  joinBlockFieldEdits = true
}

export function resetBlockFieldEditJoin() {
  joinBlockFieldEdits = false
}

export function editorHistory() {
  return history({
    newGroupDelay: 24 * 60 * 60 * 1000,
    joinToEvent(tr, isAdjacent) {
      if (tr.annotation(blockFieldEditSession))
        return joinBlockFieldEdits

      const now = Date.now()
      const join = isAdjacent && now - lastTypingTime < 500
      lastTypingTime = now
      return join
    },
  })
}
