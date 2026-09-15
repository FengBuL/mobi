import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildGithubIssueUrl,
  collectFeedbackContext,
  FEEDBACK_TYPES,
  validateFeedbackDraft,
} from '@/utils/feedback'
import {
  canShowNudge,
  EMPTY_NUDGE_STATE,
  isReturnAfterCopy,
  markAnswered,
  markShown,
  NUDGE_ARM_WINDOW_MS,
  NUDGE_MAX_IGNORED,
  NUDGE_MIN_AWAY_MS,
  NUDGE_MIN_INTERVAL_MS,
  NUDGE_SNOOZE_AFTER_ANSWER_MS,
  shouldShowEntryDot,
} from '@/utils/feedback-nudge'
import { bucketCount, bucketViewportWidth } from '@/utils/telemetry'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`应用内反馈入口`, () => {
  it(`反馈从帮助菜单拎到顶栏，带图标，帮助里不再有反馈项`, () => {
    const header = readSource(`apps/web/src/components/editor/editor-header/index.vue`)
    const help = readSource(`apps/web/src/components/editor/editor-header/HelpDropdown.vue`)

    expect(help).not.toContain(`反馈`)
    expect(help).not.toContain(`/issues`)
    expect(header).toContain(`class="feedback-entry"`)
    expect(header).toContain(`MessageSquareText`)
    expect(header).toContain(`<FeedbackDialog`)
    // 桌面顶栏：帮助菜单之后紧跟反馈
    expect(header.indexOf(`<HelpDropdown @open-about`)).toBeLessThan(header.indexOf(`class="feedback-entry"`))
    // 移动端汉堡菜单也有反馈
    expect(header.split(`handleOpenFeedback`).length).toBeGreaterThan(3)
  })

  it(`反馈弹窗不跳 GitHub 就能提交，且没有通道时退回 GitHub`, () => {
    const dialog = readSource(`apps/web/src/components/editor/editor-header/FeedbackDialog.vue`)
    expect(dialog).toContain(`submitFeedback(`)
    expect(dialog).toContain(`buildGithubIssueUrl(`)
    expect(dialog).toContain(`isFeedbackChannelAvailable()`)
  })

  it(`弹窗一屏两段：标签多选 + 选填正文；不要联系方式；环境信息不展示但一定带`, () => {
    const dialog = readSource(`apps/web/src/components/editor/editor-header/FeedbackDialog.vue`)
    expect(dialog).toContain(`哪里不对`)
    expect(dialog).toContain(`aria-pressed`)
    expect(dialog).toContain(`function toggle(type: FeedbackType)`)
    expect(dialog).toContain(`选填`)
    expect(dialog).not.toContain(`联系方式`)
    expect(dialog).not.toContain(`<Switch`)
    expect(dialog).not.toContain(`includeContext`)
    expect(dialog).toContain(`feedbackPreset`)
    expect(dialog).toContain(`preset.types`)
    expect(dialog).toContain(`preset.seed`)
    expect(dialog).toContain(`step === 'done'`)
    expect(FEEDBACK_TYPES.length).toBeGreaterThanOrEqual(6)
    for (const type of FEEDBACK_TYPES) {
      expect(type.label.length).toBeLessThanOrEqual(6)
      expect(type.hint.length).toBeGreaterThan(4)
    }

    const feedback = readSource(`apps/web/src/utils/feedback.ts`)
    expect(feedback).toContain(`context,`)
    expect(feedback).not.toContain(`contact`)
  })

  it(`勾了标签正文可空；没勾标签至少 10 字；两样都没有不能发`, () => {
    expect(validateFeedbackDraft({ types: [], message: `` })).not.toBe(``)
    expect(validateFeedbackDraft({ types: [], message: `太短` })).not.toBe(``)
    expect(validateFeedbackDraft({ types: [`image`], message: `` })).toBe(``)
    expect(validateFeedbackDraft({ types: [`image`, `paste`], message: `短` })).toBe(``)
    expect(validateFeedbackDraft({ types: [], message: `标题下划线贴进公众号后没了，主题是奢刊衬线。` })).toBe(``)
    expect(validateFeedbackDraft({ types: [`other`], message: `字`.repeat(4001) })).not.toBe(``)
  })

  it(`弹窗状态放在 ui store，复制提示和错误提示都能带预设打开`, () => {
    const ui = readSource(`apps/web/src/stores/ui.ts`)
    expect(ui).toContain(`function openFeedback(preset: FeedbackPreset`)

    const copy = readSource(`apps/web/src/composables/useEditorCopyActions.ts`)
    expect(copy).toContain(`armCopyNudge(`)
    expect(copy).toContain(`source: \`error\``)

    const nudge = readSource(`apps/web/src/composables/useCopyNudge.ts`)
    expect(nudge).toContain(`copy_verdict`)
    expect(nudge).toContain(`source: \`nudge\``)
    expect(nudge).toContain(`visibilitychange`)
  })

  it(`顶栏入口前几次带红点，点过即灭`, () => {
    expect(shouldShowEntryDot({ sessions: 1, opened: false })).toBe(true)
    expect(shouldShowEntryDot({ sessions: 3, opened: false })).toBe(true)
    expect(shouldShowEntryDot({ sessions: 4, opened: false })).toBe(false)
    expect(shouldShowEntryDot({ sessions: 1, opened: true })).toBe(false)
    expect(readSource(`apps/web/src/components/editor/editor-header/index.vue`)).toContain(`feedback-entry__dot`)
  })
})

describe(`复制后微提示频控`, () => {
  const now = 1_800_000_000_000

  it(`只在复制后离开又回来时问，太快回来或过期都不问`, () => {
    expect(isReturnAfterCopy({ armedAt: 0, leftAt: 0 }, now)).toBe(false)
    expect(isReturnAfterCopy({ armedAt: now - 10_000, leftAt: 0 }, now)).toBe(false)
    expect(isReturnAfterCopy({ armedAt: now - 10_000, leftAt: now - NUDGE_MIN_AWAY_MS + 500 }, now)).toBe(false)
    expect(isReturnAfterCopy({ armedAt: now - 10_000, leftAt: now - NUDGE_MIN_AWAY_MS }, now)).toBe(true)
    // 离开发生在复制之前不算
    expect(isReturnAfterCopy({ armedAt: now - 10_000, leftAt: now - 20_000 }, now)).toBe(false)
    expect(isReturnAfterCopy({ armedAt: now - NUDGE_ARM_WINDOW_MS - 1, leftAt: now - 5_000 }, now)).toBe(false)
  })

  it(`每会话一次、24 小时一次、回答后 30 天不问、连续忽略 3 次后 30 天不问`, () => {
    expect(canShowNudge(EMPTY_NUDGE_STATE, { shown: false }, now)).toBe(true)
    expect(canShowNudge(EMPTY_NUDGE_STATE, { shown: true }, now)).toBe(false)

    const shownOnce = markShown(EMPTY_NUDGE_STATE, now - 1000)
    expect(shownOnce.ignoredStreak).toBe(1)
    expect(canShowNudge(shownOnce, { shown: false }, now)).toBe(false)
    expect(canShowNudge(shownOnce, { shown: false }, now + NUDGE_MIN_INTERVAL_MS)).toBe(true)

    const answered = markAnswered(shownOnce, now)
    expect(answered.ignoredStreak).toBe(0)
    expect(canShowNudge(answered, { shown: false }, now + NUDGE_MIN_INTERVAL_MS * 2)).toBe(false)
    expect(canShowNudge(answered, { shown: false }, now + NUDGE_SNOOZE_AFTER_ANSWER_MS)).toBe(true)

    let ignored = { ...EMPTY_NUDGE_STATE }
    for (let i = 0; i < NUDGE_MAX_IGNORED; i++)
      ignored = markShown(ignored, now - (NUDGE_MAX_IGNORED - i) * NUDGE_MIN_INTERVAL_MS)
    expect(ignored.ignoredStreak).toBe(NUDGE_MAX_IGNORED)
    expect(canShowNudge(ignored, { shown: false }, now + NUDGE_MIN_INTERVAL_MS)).toBe(false)
    expect(canShowNudge(ignored, { shown: false }, now + NUDGE_SNOOZE_AFTER_ANSWER_MS)).toBe(true)
  })
})

describe(`gitHub 退路`, () => {
  it(`预填所有标签、正文和环境`, () => {
    const context = collectFeedbackContext({ theme: `magazine`, mode: `simple` })
    const url = new URL(buildGithubIssueUrl({
      types: [`image`, `paste`],
      message: `插了三张本地图，复制后提示 2 张没转存。`,
    }, context))

    expect(url.origin + url.pathname).toBe(`https://github.com/FengBuL/mobi/issues/new`)
    expect(url.searchParams.get(`title`)).toBe(`[图丢了 · 贴进去不一样] `)
    expect(url.searchParams.get(`body`)).toContain(`## 环境`)
    expect(url.searchParams.get(`body`)).toContain(`- theme: magazine`)
    expect(url.searchParams.get(`body`)).not.toContain(`source`)
    expect(url.searchParams.get(`labels`)).toBe(`feedback`)
    expect(FEEDBACK_TYPES.map(item => item.value)).toEqual([`paste`, `image`, `copy_fail`, `theme`, `block`, `style_panel`, `suggestion`, `other`])
  })
})

describe(`观测分桶`, () => {
  it(`视口宽度按常见显示器分桶`, () => {
    expect(bucketViewportWidth(390)).toBe(`<=768`)
    expect(bucketViewportWidth(1024)).toBe(`769-1279`)
    expect(bucketViewportWidth(1280)).toBe(`1280-1439`)
    expect(bucketViewportWidth(1366)).toBe(`1280-1439`)
    expect(bucketViewportWidth(1440)).toBe(`1440-1679`)
    expect(bucketViewportWidth(1512)).toBe(`1440-1679`)
    expect(bucketViewportWidth(1920)).toBe(`1920-2559`)
    expect(bucketViewportWidth(2560)).toBe(`>=2560`)
  })

  it(`字数分桶不存精确字数`, () => {
    expect(bucketCount(0)).toBe(`0-299`)
    expect(bucketCount(299)).toBe(`0-299`)
    expect(bucketCount(300)).toBe(`300-799`)
    expect(bucketCount(9000)).toBe(`>=6000`)
  })
})

describe(`观测埋点覆盖`, () => {
  it(`打开、点选、样式调整、复制上下文、错误都有埋点`, () => {
    expect(readSource(`apps/web/src/App.vue`)).toContain(`trackAppOpen(`)
    expect(readSource(`apps/web/src/stores/blockSelection.ts`)).toContain(`trackEvent(\`block_select\``)
    expect(readSource(`apps/web/src/stores/themeDesigner.ts`)).toContain(`style_token_adjust`)
    expect(readSource(`apps/web/src/stores/ui.ts`)).toContain(`trackEvent(\`panel_open\``)

    const rightSlider = readSource(`apps/web/src/components/editor/RightSlider.vue`)
    for (const control of [`indent`, `justify`, `code_block_theme`, `code_language`, `line_number`, `cite_links`, `word_count`, `reset_text_group`, `reset_detail_group`, `preset_save`]) {
      expect(rightSlider, control).toContain(`trackAdjust(\`${control}\``)
    }
    expect(rightSlider).toContain(`style_tab_open`)

    const quick = readSource(`apps/web/src/components/editor/StyleQuickControls.vue`)
    for (const control of [`font_family`, `font_size`, `primary_color`, `primary_color_follow_theme`]) {
      expect(quick, control).toContain(`trackAdjust(\`${control}\``)
    }

    const copy = readSource(`apps/web/src/composables/useEditorCopyActions.ts`)
    expect(copy).toContain(`describeCopyContext(`)
    expect(copy).toContain(`trackError(\`copy_clipboard\``)
  })
})
