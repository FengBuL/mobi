import type { NudgeSession } from '@/utils/feedback-nudge'
import { useUIStore } from '@/stores/ui'
import {
  canShowNudge,
  isReturnAfterCopy,
  markAnswered,
  markShown,
  readNudgeState,
  writeNudgeState,
} from '@/utils/feedback-nudge'
import { trackEvent } from '@/utils/telemetry'

/** 会话级状态。模块单例：复制动作和窗口监听不在同一个组件里 */
const session: NudgeSession = { shown: false, armedAt: 0, leftAt: 0 }

let lastTheme = ``

/** 复制到公众号成功时调用：记下时间，等用户贴完回来再问 */
export function armCopyNudge(theme: string) {
  session.armedAt = Date.now()
  session.leftAt = 0
  lastTheme = theme
}

function answer(verdict: `ok` | `bad`, toastId: string | number) {
  writeNudgeState(markAnswered(readNudgeState()))
  trackEvent(`copy_verdict`, { verdict, theme: lastTheme })
  toast.dismiss(toastId)

  if (verdict === `ok`) {
    toast.success(`好，谢谢。`, { duration: 1800 })
    return
  }

  useUIStore().openFeedback({ source: `nudge`, types: [`paste`] })
}

function showNudge() {
  session.shown = true
  session.armedAt = 0
  writeNudgeState(markShown(readNudgeState()))

  const id = toast(`贴进公众号后，和预览一样吗？`, {
    description: `点一下就行。不一样的话告诉我们哪里不对，这是最需要知道的事。`,
    duration: 20_000,
    // sonner 把 cancel 画成浅色放左边、action 画成深色放右边；「不一样」才是想要的回答，给它深色
    cancel: { label: `👍 一样`, onClick: () => answer(`ok`, id) },
    action: { label: `👎 不一样`, onClick: () => answer(`bad`, id) },
  })
}

/** 一处挂上就够：监听离开 / 回来 */
export function useCopyNudge() {
  function onLeave() {
    if (session.armedAt)
      session.leftAt = Date.now()
  }

  function onReturn() {
    if (document.visibilityState !== `visible`)
      return
    if (!isReturnAfterCopy(session))
      return
    if (!canShowNudge(readNudgeState(), session)) {
      session.armedAt = 0
      return
    }
    showNudge()
  }

  function onVisibility() {
    if (document.visibilityState === `hidden`)
      onLeave()
    else
      onReturn()
  }

  onMounted(() => {
    window.addEventListener(`blur`, onLeave)
    window.addEventListener(`focus`, onReturn)
    document.addEventListener(`visibilitychange`, onVisibility)
  })

  onBeforeUnmount(() => {
    window.removeEventListener(`blur`, onLeave)
    window.removeEventListener(`focus`, onReturn)
    document.removeEventListener(`visibilitychange`, onVisibility)
  })
}

/** 只给测试用 */
export function __resetCopyNudgeSession() {
  session.shown = false
  session.armedAt = 0
  session.leftAt = 0
}
