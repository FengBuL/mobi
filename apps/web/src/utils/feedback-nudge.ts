/**
 * 复制后「贴进去正常吗 👍/👎」微提示的频控与时机。
 *
 * 时机：复制成功那一刻用户还没去贴，问了没意义。所以复制时只「上膛」，
 * 等用户离开再回到这个窗口（去公众号后台贴完回来）才真的问。
 *
 * 频控：每会话最多 1 次；两次之间至少 24 小时；用户回答过（不管 👍👎）就 30 天不再问；
 * 连续 3 次不理也 30 天不问。
 *
 * 纯函数 + 一层 localStorage 读写，便于测试。
 */

const NUDGE_KEY = `MOBI__feedback_nudge`

export const NUDGE_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000
export const NUDGE_SNOOZE_AFTER_ANSWER_MS = 30 * 24 * 60 * 60 * 1000
export const NUDGE_MAX_IGNORED = 3
/** 复制后多久之内回到窗口才算「贴完回来」 */
export const NUDGE_ARM_WINDOW_MS = 15 * 60 * 1000
/** 复制后至少离开这么久才问，太快回来大概率是误切窗口 */
export const NUDGE_MIN_AWAY_MS = 3 * 1000

export interface NudgeState {
  /** 上次真的弹出来的时间 */
  lastShownAt: number
  /** 上次用户点了 👍 或 👎 的时间 */
  lastAnsweredAt: number
  /** 自上次回答以来，弹出但没理的次数 */
  ignoredStreak: number
}

export interface NudgeSession {
  shown: boolean
  armedAt: number
  leftAt: number
}

export const EMPTY_NUDGE_STATE: NudgeState = { lastShownAt: 0, lastAnsweredAt: 0, ignoredStreak: 0 }

export function readNudgeState(): NudgeState {
  try {
    const raw = localStorage.getItem(NUDGE_KEY)
    if (!raw)
      return { ...EMPTY_NUDGE_STATE }
    const parsed = JSON.parse(raw) as Partial<NudgeState>
    return {
      lastShownAt: Number(parsed.lastShownAt) || 0,
      lastAnsweredAt: Number(parsed.lastAnsweredAt) || 0,
      ignoredStreak: Number(parsed.ignoredStreak) || 0,
    }
  }
  catch {
    return { ...EMPTY_NUDGE_STATE }
  }
}

export function writeNudgeState(state: NudgeState): void {
  try {
    localStorage.setItem(NUDGE_KEY, JSON.stringify(state))
  }
  catch {
    // 存不下就当没记，最多多问一次
  }
}

/** 纯判断：现在能不能问 */
export function canShowNudge(state: NudgeState, session: Pick<NudgeSession, `shown`>, now = Date.now()): boolean {
  if (session.shown)
    return false
  if (state.lastAnsweredAt && now - state.lastAnsweredAt < NUDGE_SNOOZE_AFTER_ANSWER_MS)
    return false
  if (state.ignoredStreak >= NUDGE_MAX_IGNORED && now - state.lastShownAt < NUDGE_SNOOZE_AFTER_ANSWER_MS)
    return false
  if (state.lastShownAt && now - state.lastShownAt < NUDGE_MIN_INTERVAL_MS)
    return false
  return true
}

/** 纯判断：回到窗口这一刻，是不是「复制后出去贴了一趟回来」 */
export function isReturnAfterCopy(session: Pick<NudgeSession, `armedAt` | `leftAt`>, now = Date.now()): boolean {
  if (!session.armedAt || now - session.armedAt > NUDGE_ARM_WINDOW_MS)
    return false
  if (!session.leftAt || session.leftAt < session.armedAt)
    return false
  return now - session.leftAt >= NUDGE_MIN_AWAY_MS
}

export function markShown(state: NudgeState, now = Date.now()): NudgeState {
  return { ...state, lastShownAt: now, ignoredStreak: state.ignoredStreak + 1 }
}

export function markAnswered(state: NudgeState, now = Date.now()): NudgeState {
  return { ...state, lastAnsweredAt: now, ignoredStreak: 0 }
}

// ---------- 顶栏入口红点 ----------

const ENTRY_KEY = `MOBI__feedback_entry`
/** 前几次打开带红点，之后回落成普通按钮 */
export const ENTRY_DOT_SESSIONS = 3

export interface EntryState {
  sessions: number
  opened: boolean
}

export function readEntryState(): EntryState {
  try {
    const parsed = JSON.parse(localStorage.getItem(ENTRY_KEY) || `{}`) as Partial<EntryState>
    return { sessions: Number(parsed.sessions) || 0, opened: Boolean(parsed.opened) }
  }
  catch {
    return { sessions: 0, opened: false }
  }
}

export function writeEntryState(state: EntryState): void {
  try {
    localStorage.setItem(ENTRY_KEY, JSON.stringify(state))
  }
  catch {}
}

export function shouldShowEntryDot(state: EntryState): boolean {
  return !state.opened && state.sessions <= ENTRY_DOT_SESSIONS
}
