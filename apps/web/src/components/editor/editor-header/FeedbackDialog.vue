<script setup lang="ts">
import type { FeedbackType } from '@/utils/feedback'
import { Check, ExternalLink, Loader2 } from 'lucide-vue-next'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'
import {
  buildGithubIssueUrl,
  collectFeedbackContext,
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_TYPES,
  isFeedbackChannelAvailable,
  submitFeedback,
  validateFeedbackDraft,
} from '@/utils/feedback'
import { store } from '@/utils/storage'
import { getTelemetryAnonId } from '@/utils/telemetry'

const themeStore = useThemeStore()
const uiStore = useUIStore()
const { theme } = storeToRefs(themeStore)
const { workspaceMode, isShowFeedbackDialog, feedbackPreset } = storeToRefs(uiStore)
const imgHost = store.reactive(`imgHost`, `default`)

const channelAvailable = isFeedbackChannelAvailable()

type Step = `write` | `done`

const step = ref<Step>(`write`)
const types = ref<FeedbackType[]>([])
const message = ref(``)
const submitting = ref(false)
const errorText = ref(``)
const resultIssueUrl = ref<string | null>(null)
const messageField = ref<{ $el?: HTMLElement } | HTMLElement | null>(null)

const context = computed(() => collectFeedbackContext({
  theme: theme.value,
  mode: workspaceMode.value,
  imgHost: imgHost.value,
  source: feedbackPreset.value.source,
}))

const draft = computed(() => ({ types: types.value, message: message.value }))
const remaining = computed(() => FEEDBACK_MAX_LENGTH - message.value.length)
const canSubmit = computed(() => !submitting.value && validateFeedbackDraft(draft.value) === ``)

const placeholder = computed(() => {
  if (types.value.includes(`suggestion`))
    return `想要什么功能，它帮你解决什么问题？`
  if (types.value.length)
    return `发生了什么、用的哪套主题、贴到哪一步不对。不写也能发。`
  return `发生了什么、你期望是什么样。`
})

function focusMessage() {
  nextTick(() => {
    const node = messageField.value
    const el: HTMLElement | undefined = node instanceof HTMLElement ? node : node?.$el
    const textarea = el instanceof HTMLTextAreaElement ? el : el?.querySelector<HTMLTextAreaElement>(`textarea`)
    textarea?.focus()
  })
}

function toggle(type: FeedbackType) {
  types.value = types.value.includes(type)
    ? types.value.filter(item => item !== type)
    : [...types.value, type]
  errorText.value = ``
}

function reset() {
  step.value = `write`
  types.value = []
  message.value = ``
  errorText.value = ``
  resultIssueUrl.value = null
  submitting.value = false
}

function close() {
  isShowFeedbackDialog.value = false
}

function onUpdate(open: boolean) {
  if (!open) {
    close()
    // 关闭动画结束后再清空，避免内容闪一下
    window.setTimeout(reset, 250)
  }
}

async function submit() {
  errorText.value = validateFeedbackDraft(draft.value)
  if (errorText.value)
    return

  if (!channelAvailable) {
    window.open(buildGithubIssueUrl(draft.value, context.value), `_blank`, `noopener`)
    step.value = `done`
    return
  }

  submitting.value = true
  const result = await submitFeedback(draft.value, context.value, getTelemetryAnonId())
  submitting.value = false

  if (!result.ok) {
    errorText.value = ({
      too_many: `一小时内提交太多次了，稍后再试。`,
      rejected: `提交被拒绝。`,
      no_channel: `当前构建没有配置反馈通道。`,
    } as Record<string, string>)[result.error ?? ``] ?? `没发出去（${result.error ?? `网络问题`}）。可以直接去 GitHub 提。`
    return
  }

  resultIssueUrl.value = result.issueUrl ?? null
  step.value = `done`
}

function openGithubFallback() {
  window.open(buildGithubIssueUrl(draft.value, context.value), `_blank`, `noopener`)
}

// 从复制后提示 / 出错提示进来的，先把标签勾上、把出错信息填进去
watch(isShowFeedbackDialog, (visible) => {
  if (!visible)
    return
  errorText.value = ``
  const preset = feedbackPreset.value
  if (preset.types?.length)
    types.value = [...new Set([...types.value, ...preset.types])]
  if (preset.seed && !message.value)
    message.value = `${preset.seed}\n\n`
  focusMessage()
})
</script>

<template>
  <Dialog :open="isShowFeedbackDialog" @update:open="onUpdate">
    <DialogContent class="feedback-dialog sm:max-w-lg" :data-step="step">
      <DialogHeader class="text-left">
        <DialogTitle>{{ step === 'done' ? '收到了' : '反馈' }}</DialogTitle>
        <DialogDescription>
          <template v-if="step === 'done'">
            {{ channelAvailable ? '改了会写在更新日志里。' : '已经带到 GitHub 新建 Issue 页，提交一下就行。' }}
          </template>
          <template v-else>
            勾几个标签就能发；愿意多说两句更好。不用跳去 GitHub。
          </template>
        </DialogDescription>
      </DialogHeader>

      <div v-if="step === 'write'" class="space-y-5 py-1">
        <!-- 第一段：哪里不对，多选 -->
        <section class="space-y-2">
          <h3 class="feedback-section__title">
            哪里不对
            <span v-if="types.length" class="feedback-section__count">已选 {{ types.length }}</span>
          </h3>
          <div class="feedback-tags" role="group" aria-label="哪里不对">
            <button
              v-for="item in FEEDBACK_TYPES"
              :key="item.value"
              type="button"
              class="feedback-tag"
              :class="{ 'feedback-tag--on': types.includes(item.value) }"
              :aria-pressed="types.includes(item.value)"
              :title="item.hint"
              @click="toggle(item.value)"
            >
              <Check v-if="types.includes(item.value)" class="size-3.5" />
              {{ item.label }}
            </button>
          </div>
        </section>

        <!-- 第二段：写两句，非必填 -->
        <section class="space-y-1.5">
          <h3 class="feedback-section__title">
            多说两句 <span class="feedback-section__optional">选填</span>
          </h3>
          <Textarea
            ref="messageField"
            v-model="message"
            class="min-h-24 resize-y"
            :maxlength="FEEDBACK_MAX_LENGTH"
            :placeholder="placeholder"
            :aria-invalid="Boolean(errorText)"
            @keydown.meta.enter.prevent="canSubmit && submit()"
            @keydown.ctrl.enter.prevent="canSubmit && submit()"
          />
          <div v-if="errorText || message.length" class="flex items-center justify-between text-xs">
            <p v-if="errorText" role="alert" class="text-destructive">
              {{ errorText }}
            </p>
            <span v-else />
            <span v-if="message.length" class="text-muted-foreground tabular-nums" :class="{ 'text-destructive': remaining < 0 }">{{ remaining }}</span>
          </div>
        </section>

        <p v-if="!channelAvailable" class="text-xs leading-5 text-muted-foreground">
          这个构建没有配置反馈通道，点「提交」会把内容带到 GitHub 新建 Issue 页。
        </p>
      </div>

      <!-- 回执 -->
      <div v-else class="feedback-receipt">
        <span class="feedback-receipt__mark"><Check class="size-5" /></span>
        <div class="space-y-2">
          <p class="text-sm leading-6">
            <template v-if="resultIssueUrl">
              这条反馈同时建成了一个公开的 Issue，后续进展在那儿看。
            </template>
            <template v-else-if="channelAvailable">
              已经进到我们的反馈列表了，会尽快看。
            </template>
            <template v-else>
              如果新标签页没打开，点下面的按钮再试一次。
            </template>
          </p>
          <div class="flex flex-wrap gap-3 text-sm">
            <a
              v-if="resultIssueUrl"
              :href="resultIssueUrl"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              打开 Issue <ExternalLink class="size-3.5" />
            </a>
            <button v-if="!channelAvailable" type="button" class="text-primary underline-offset-4 hover:underline" @click="openGithubFallback">
              再去 GitHub
            </button>
            <button type="button" class="text-muted-foreground underline-offset-4 hover:underline" @click="reset">
              再提一条
            </button>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2 sm:justify-between">
        <Button
          v-if="step === 'write' && channelAvailable"
          variant="ghost"
          size="sm"
          class="text-xs text-muted-foreground"
          @click="openGithubFallback"
        >
          改去 GitHub 提
        </Button>
        <span v-else />
        <div class="flex gap-2">
          <Button variant="outline" @click="onUpdate(false)">
            {{ step === 'done' ? '关闭' : '取消' }}
          </Button>
          <Button v-if="step === 'write'" :disabled="!canSubmit" @click="submit">
            <Loader2 v-if="submitting" class="mr-2 size-4 animate-spin" />
            {{ channelAvailable ? '发送' : '去 GitHub 提交' }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style lang="less" scoped>
.feedback-section__title {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.feedback-section__count,
.feedback-section__optional {
  font-size: 0.6875rem;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
}

.feedback-section__count {
  color: hsl(var(--primary));
}

.feedback-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feedback-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  background: hsl(var(--background));
  font-size: 0.8125rem;
  line-height: 1;
  color: hsl(var(--foreground));
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;

  &:hover,
  &:focus-visible {
    border-color: hsl(var(--foreground) / 0.6);
    outline: none;
  }

  &:active {
    transform: scale(0.97);
  }

  &--on {
    border-color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.1);
    color: hsl(var(--primary));
    font-weight: 600;

    &:hover,
    &:focus-visible {
      border-color: hsl(var(--primary));
    }
  }
}

.feedback-receipt {
  display: flex;
  gap: 0.875rem;
  padding: 0.5rem 0 0.25rem;

  &__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 999px;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    animation: pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.3) both;
  }
}

@keyframes pop {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .feedback-tag,
  .feedback-receipt__mark {
    transition: none;
    animation: none;
  }
}
</style>
