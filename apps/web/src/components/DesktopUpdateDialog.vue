<script setup lang="ts">
import type { DesktopUpdateState } from '@mobi/shared/types/desktop'
import { toast } from 'vue-sonner'
import { getDesktopBridge } from '@/services/desktop/bridge'
import { formatUpdateProgress, shouldPresentUpdate } from '@/utils/desktop-update'

const IGNORED_VERSION_KEY = `mobi-update-ignored-version`
const state = ref<DesktopUpdateState>({ status: `idle` })
const visible = ref(false)
let unsubscribe: (() => void) | undefined

function readIgnoredVersion(): string {
  try {
    return localStorage.getItem(IGNORED_VERSION_KEY) || ``
  }
  catch {
    return ``
  }
}

function writeIgnoredVersion(version: string): void {
  try {
    localStorage.setItem(IGNORED_VERSION_KEY, version)
  }
  catch {}
}

function onState(nextState: DesktopUpdateState): void {
  state.value = nextState
  if (nextState.status === `error`) {
    visible.value = false
    toast.error(`检查更新失败：${nextState.message}`)
    return
  }
  if (shouldPresentUpdate(nextState, readIgnoredVersion())) {
    visible.value = true
  }
}

function onOpenChange(open: boolean): void {
  if (!open && state.value.status === `downloading`) {
    return
  }
  visible.value = open
}

async function downloadUpdate(): Promise<void> {
  try {
    await getDesktopBridge()?.updates.download()
  }
  catch (error) {
    toast.error((error as Error).message || `下载更新失败`)
  }
}

async function installUpdate(): Promise<void> {
  try {
    await getDesktopBridge()?.updates.install()
  }
  catch (error) {
    toast.error((error as Error).message || `安装更新失败`)
  }
}

function ignoreVersion(): void {
  if (state.value.status === `available`) {
    writeIgnoredVersion(state.value.version)
  }
  visible.value = false
}

onMounted(() => {
  const updates = getDesktopBridge()?.updates
  if (updates) {
    unsubscribe = updates.onState(onState)
  }
})

onUnmounted(() => unsubscribe?.())
</script>

<template>
  <Dialog :open="visible" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ state.status === 'downloaded' ? '更新已准备好' : '墨笔有新版本' }}
        </DialogTitle>
        <DialogDescription v-if="state.status === 'available'">
          当前可更新到 v{{ state.version }}，由你决定何时下载和安装。
        </DialogDescription>
        <DialogDescription v-else-if="state.status === 'downloading'">
          正在下载 v{{ state.version }}，请保持墨笔运行。
        </DialogDescription>
        <DialogDescription v-else-if="state.status === 'downloaded'">
          v{{ state.version }} 已下载完成，可以立即重启安装，也可以退出墨笔时安装。
        </DialogDescription>
      </DialogHeader>

      <div v-if="state.status === 'available' && state.releaseNotes" class="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-6">
        {{ state.releaseNotes }}
      </div>

      <div v-if="state.status === 'downloading'" class="space-y-2 py-2">
        <div class="flex items-center justify-between text-sm">
          <span>下载进度</span>
          <span class="font-medium tabular-nums">{{ formatUpdateProgress(state.percent) }}</span>
        </div>
        <Progress :model-value="state.percent" />
      </div>

      <DialogFooter v-if="state.status === 'available'" class="flex-wrap gap-2 sm:justify-between">
        <Button variant="ghost" @click="ignoreVersion">
          忽略此版本
        </Button>
        <div class="flex gap-2">
          <Button variant="outline" @click="visible = false">
            稍后提醒
          </Button>
          <Button @click="downloadUpdate">
            下载更新
          </Button>
        </div>
      </DialogFooter>

      <DialogFooter v-else-if="state.status === 'downloaded'" class="gap-2">
        <Button variant="outline" @click="visible = false">
          退出时安装
        </Button>
        <Button @click="installUpdate">
          立即重启并安装
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
