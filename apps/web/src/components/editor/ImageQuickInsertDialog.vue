<script setup lang="ts">
import type { RecentImageEntry } from '@/utils/image-library'
import { ImagePlus, Trash2, UploadCloud, X } from 'lucide-vue-next'
import { useImageQuickInsert } from '@/composables/useImageQuickInsert'
import { useImageUploader } from '@/composables/useImageUploader'
import { useEditorStore } from '@/stores/editor'
import { usePostStore } from '@/stores/post'
import { useUIStore } from '@/stores/ui'
import { checkImage } from '@/utils'
import { isConfiguredImageHost } from '@/utils/clipboard-image-status'
import {
  buildMediaLayoutMarkup,
  createMediaLayoutStateFromImages,
  MEDIA_LAYOUT_MAX_SLOTS,
  mediaLayoutPresets,
  resolveAutoMediaLayoutPresetId,
} from '@/utils/image-layouts'
import {
  clearRecentImages,
  extractImageUrls,
  readRecentImages,
  rememberRecentImages,
  removeRecentImage,
} from '@/utils/image-library'
import { store } from '@/utils/storage'

interface PendingImage {
  id: string
  url: string
  alt: string
}

const { isOpen, activeTab, setOpen } = useImageQuickInsert()

const insertModes: Array<{ id: typeof activeTab.value, label: string }> = [
  { id: `single`, label: `单张` },
  { id: `batch`, label: `批量` },
  { id: `link`, label: `链接` },
  { id: `recent`, label: `最近` },
]
const { upload } = useImageUploader()
const editorStore = useEditorStore()
const postStore = usePostStore()
const uiStore = useUIStore()
const imgHost = store.reactive(`imgHost`, `default`)
const hasImageHost = computed(() => isConfiguredImageHost(imgHost.value))

const pendingImages = ref<PendingImage[]>([])
const recentImages = ref<RecentImageEntry[]>([])
const linkInput = ref(``)
const insertMode = ref(`auto`)
const migrateLinks = ref(false)
const isDropActive = ref(false)
const busyLabel = ref(``)
const fileInputRef = ref<HTMLInputElement | null>(null)

const dialogCopy = computed(() => {
  const hostReady = hasImageHost.value
  return {
    single: {
      title: hostReady ? `上传单张图片` : `插入图片`,
      description: hostReady
        ? `选择一张本地图片上传到当前图床，再插入正文。`
        : `还没选图床。本地图要先去「设置 → 图床配置」；也可以切到「链接」，以外链插入。`,
    },
    batch: {
      title: hostReady ? `批量上传图片` : `插入图片`,
      description: hostReady
        ? `一次选择多张本地图片上传，并按顺序插入正文。`
        : `还没选图床。本地图要先去「设置 → 图床配置」；也可以切到「链接」，以外链插入。`,
    },
    link: {
      title: `按链接插入图片`,
      description: hostReady
        ? `粘贴图片地址，可选择直接使用或转存到当前图床。`
        : `粘贴图片地址，以外链插入。还没选图床，不能转存。`,
    },
    recent: {
      title: `最近使用的图片`,
      description: `从最近插入过的图片中重新选择。`,
    },
  }[activeTab.value]
})

watch(hasImageHost, (ready) => {
  if (!ready)
    migrateLinks.value = false
})

const insertModeOptions = computed(() => {
  const layoutOptions = mediaLayoutPresets
    .filter(preset => preset.textMode === `plain`)
    .map(preset => ({
      value: preset.id,
      label: `套用「${preset.name}」·${preset.slotCount} 图一组`,
    }))

  return [
    { value: `plain`, label: `逐张插入（普通 Markdown 图片）` },
    { value: `auto`, label: `自动套版（按张数挑版式）` },
    ...layoutOptions,
  ]
})

const groupPlan = computed(() => {
  if (insertMode.value === `plain` || !pendingImages.value.length) {
    return []
  }
  return planLayoutGroups(pendingImages.value)
})

const planSummary = computed(() => {
  if (!pendingImages.value.length) {
    return `还没有待插入的图片`
  }
  if (insertMode.value === `plain`) {
    return `将插入 ${pendingImages.value.length} 张普通 Markdown 图片`
  }

  const names = groupPlan.value.map(group => group.presetName)
  const counted = names.reduce<Record<string, number>>((acc, name) => {
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})
  const detail = Object.entries(counted).map(([name, count]) => `${name} × ${count}`).join(`，`)
  return `将生成 ${groupPlan.value.length} 组排版：${detail}`
})

const canInsert = computed(() => pendingImages.value.length > 0 && !busyLabel.value)

watch(isOpen, (open) => {
  if (open) {
    recentImages.value = readRecentImages()
    return
  }
  pendingImages.value = []
  linkInput.value = ``
  isDropActive.value = false
  busyLabel.value = ``
})

function onUpdate(open: boolean) {
  setOpen(open)
}

function createPendingId() {
  return `pending-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function addPendingImages(images: Array<{ url: string, alt?: string }>) {
  const existing = new Set(pendingImages.value.map(item => item.url))
  const next = images
    .filter(item => item.url.trim() && !existing.has(item.url.trim()))
    .map(item => ({
      id: createPendingId(),
      url: item.url.trim(),
      alt: (item.alt ?? ``).trim(),
    }))

  if (!next.length) {
    return 0
  }

  pendingImages.value = activeTab.value === `single`
    ? next.slice(0, 1)
    : [...pendingImages.value, ...next]
  return next.length
}

function removePending(id: string) {
  pendingImages.value = pendingImages.value.filter(item => item.id !== id)
}

function clearPending() {
  pendingImages.value = []
}

function triggerFilePicker() {
  fileInputRef.value?.click()
}

async function uploadFiles(files: File[]) {
  const validFiles: File[] = []
  for (const file of files) {
    const result = checkImage(file)
    if (!result.ok) {
      toast.error(`${file.name}：${result.msg}`)
      continue
    }
    validFiles.push(file)
  }

  if (!validFiles.length) {
    return
  }

  let done = 0
  for (const file of validFiles) {
    busyLabel.value = `正在上传 ${done + 1}/${validFiles.length}`
    try {
      const url = await upload(file)
      addPendingImages([{ url, alt: file.name.replace(/\.[^.]+$/u, ``) }])
      done += 1
    }
    catch (error) {
      toast.error(`${file.name} 上传失败：${(error as Error).message || `未知错误`}`)
    }
  }

  busyLabel.value = ``
  if (done > 0) {
    toast.success(`已上传 ${done} 张图片`)
  }
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = Array.from(input.files ?? [])
  const files = activeTab.value === `single` ? selected.slice(0, 1) : selected
  input.value = ``
  await uploadFiles(files)
}

async function handleDrop(event: DragEvent) {
  isDropActive.value = false
  const dropped = Array.from(event.dataTransfer?.files ?? []).filter(file => file.type.startsWith(`image/`))
  const files = activeTab.value === `single` ? dropped.slice(0, 1) : dropped
  if (files.length) {
    await uploadFiles(files)
    return
  }

  const text = event.dataTransfer?.getData(`text/plain`) ?? ``
  if (text) {
    const added = addPendingImages(extractImageUrls(text))
    if (added) {
      toast.success(`已加入 ${added} 张图片`)
    }
  }
}

async function parseLinkInput() {
  const parsed = extractImageUrls(linkInput.value)
  if (!parsed.length) {
    toast.error(`没有识别到可用的图片链接`)
    return
  }

  if (!hasImageHost.value)
    migrateLinks.value = false

  if (migrateLinks.value && !hasImageHost.value)
    migrateLinks.value = false

  if (!migrateLinks.value) {
    const added = addPendingImages(parsed)
    linkInput.value = ``
    toast.success(added ? `已加入 ${added} 张图片` : `这些图片已经在待插入列表里`)
    return
  }

  let done = 0
  for (const item of parsed) {
    busyLabel.value = `正在转存 ${done + 1}/${parsed.length}`
    try {
      const url = await upload(item.url)
      addPendingImages([{ url, alt: item.alt }])
      done += 1
    }
    catch (error) {
      toast.error(`${item.url} 转存失败：${(error as Error).message || `未知错误`}`)
      addPendingImages([item])
    }
  }

  busyLabel.value = ``
  linkInput.value = ``
  toast.success(`已处理 ${parsed.length} 个链接，其中 ${done} 张完成转存`)
}

function toggleRecentImage(entry: RecentImageEntry) {
  const matched = pendingImages.value.find(item => item.url === entry.url)
  if (matched) {
    removePending(matched.id)
    return
  }
  addPendingImages([{ url: entry.url, alt: entry.alt }])
}

function isRecentSelected(entry: RecentImageEntry) {
  return pendingImages.value.some(item => item.url === entry.url)
}

function dropRecentImage(entry: RecentImageEntry) {
  recentImages.value = removeRecentImage(entry.url)
}

function dropAllRecentImages() {
  recentImages.value = clearRecentImages()
  toast.success(`已清空最近使用的图片`)
}

function findPreset(presetId: string) {
  return mediaLayoutPresets.find(preset => preset.id === presetId) ?? mediaLayoutPresets[0]
}

function planLayoutGroups(images: PendingImage[]) {
  const groups: Array<{ presetId: string, presetName: string, images: PendingImage[] }> = []
  let rest = [...images]

  const takeAuto = () => {
    const size = Math.min(rest.length, MEDIA_LAYOUT_MAX_SLOTS)
    const preset = findPreset(resolveAutoMediaLayoutPresetId(size))
    groups.push({ presetId: preset.id, presetName: preset.name, images: rest.slice(0, preset.slotCount) })
    rest = rest.slice(preset.slotCount)
  }

  if (insertMode.value !== `auto`) {
    const preset = findPreset(insertMode.value)
    while (rest.length >= preset.slotCount) {
      groups.push({ presetId: preset.id, presetName: preset.name, images: rest.slice(0, preset.slotCount) })
      rest = rest.slice(preset.slotCount)
    }
  }

  while (rest.length) {
    takeAuto()
  }

  return groups
}

function buildInsertMarkdown() {
  if (insertMode.value === `plain`) {
    return pendingImages.value.map(item => `![${item.alt}](${item.url})`).join(`\n\n`)
  }

  return planLayoutGroups(pendingImages.value)
    .map((group) => {
      const preset = findPreset(group.presetId)
      return buildMediaLayoutMarkup(preset, createMediaLayoutStateFromImages(preset, group.images))
    })
    .filter(Boolean)
    .join(`\n\n`)
}

function insertImages() {
  if (!canInsert.value) {
    return
  }

  const markdown = buildInsertMarkdown()
  if (!markdown) {
    toast.error(`没有生成可插入的内容`)
    return
  }

  editorStore.insertAtCursor(`\n${markdown}\n`)

  const currentPost = postStore.currentPost
  if (currentPost) {
    postStore.updatePostContent(currentPost.id, editorStore.getContent())
  }

  recentImages.value = rememberRecentImages(pendingImages.value)
  toast.success(`已插入 ${pendingImages.value.length} 张图片`)
  setOpen(false)
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="onUpdate">
    <DialogContent class="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
      <DialogHeader class="border-b px-6 pt-6 pb-4">
        <DialogTitle class="flex items-center gap-2">
          <ImagePlus class="size-5" />
          {{ dialogCopy.title }}
        </DialogTitle>
        <DialogDescription>
          {{ dialogCopy.description }}
        </DialogDescription>
        <div class="mt-3 flex flex-wrap gap-1">
          <button
            v-for="item in insertModes"
            :key="item.id"
            type="button"
            class="rounded-md border px-2.5 py-1 text-xs"
            :class="activeTab === item.id
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground hover:text-foreground'"
            @click="activeTab = item.id"
          >
            {{ item.label }}
          </button>
        </div>
      </DialogHeader>

      <div class="flex-1 space-y-5 overflow-auto px-6 py-5">
        <div
          v-if="(activeTab === 'single' || activeTab === 'batch') && !hasImageHost"
          class="quick-insert-dropzone rounded-2xl border border-dashed p-8 text-center"
        >
          <UploadCloud class="mx-auto size-8 text-muted-foreground" />
          <p class="mt-3 text-sm font-semibold">
            还没选图床
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            本地图片要先选一个图床才能上传。也可以切到「链接」，以外链插进稿里。
          </p>
          <Button class="mt-4 h-9" @click="uiStore.toggleShowUploadImgDialog(true)">
            去设置图床
          </Button>
        </div>
        <div
          v-else-if="activeTab === 'single' || activeTab === 'batch'"
          class="quick-insert-dropzone rounded-2xl border border-dashed p-8 text-center"
          :class="{ 'quick-insert-dropzone--active': isDropActive }"
          @dragover.prevent="isDropActive = true"
          @dragleave.prevent="isDropActive = false"
          @drop.prevent="handleDrop"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            :multiple="activeTab === 'batch'"
            class="hidden"
            @change="handleFileChange"
          >
          <UploadCloud class="mx-auto size-8 text-muted-foreground" />
          <p class="mt-3 text-sm font-semibold">
            {{ activeTab === 'single' ? '把一张图片拖到这里，或者点击按钮选择' : '把多张图片拖到这里，或者点击按钮一次选择多张' }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            图片会上传到当前配置的图床，完成后进入待插入列表。
          </p>
          <Button class="mt-4 h-9" :disabled="Boolean(busyLabel)" @click="triggerFilePicker">
            选择图片
          </Button>
        </div>

        <div v-else-if="activeTab === 'link'" class="space-y-3">
          <Textarea
            v-model="linkInput"
            class="min-h-[132px]"
            placeholder="一行一个图片链接，也可以直接粘贴 ![](url) 这样的 Markdown 图片"
          />
          <div class="flex flex-wrap items-center justify-between gap-3">
            <label class="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch v-model:checked="migrateLinks" :disabled="!hasImageHost" />
              {{ hasImageHost ? `同时转存到当前图床（可绕开外链防盗链）` : `还没选图床，不能转存，只会以外链插入` }}
            </label>
            <Button size="sm" class="h-8 px-3 text-xs" :disabled="Boolean(busyLabel)" @click="parseLinkInput">
              解析并加入
            </Button>
          </div>
        </div>

        <div v-else-if="activeTab === 'recent'" class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs text-muted-foreground">
              这里记录你最近插入过的图片，点一下即可重新加入。
            </p>
            <Button
              v-if="recentImages.length"
              variant="ghost"
              size="sm"
              class="h-8 px-3 text-xs"
              @click="dropAllRecentImages"
            >
              <Trash2 class="mr-2 size-3.5" />
              清空记录
            </Button>
          </div>

          <div v-if="recentImages.length" class="quick-insert-recent-grid">
            <div
              v-for="entry in recentImages"
              :key="entry.url"
              class="quick-insert-recent-card"
              :class="{ 'quick-insert-recent-card--active': isRecentSelected(entry) }"
            >
              <button type="button" class="quick-insert-recent-card__thumb" @click="toggleRecentImage(entry)">
                <img :src="entry.url" :alt="entry.alt || '最近使用的图片'">
              </button>
              <button type="button" class="quick-insert-recent-card__remove" @click="dropRecentImage(entry)">
                <X class="size-3" />
              </button>
            </div>
          </div>

          <div v-else class="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            还没有记录。用这个面板插入过图片之后，就会出现在这里。
          </div>
        </div>

        <div class="rounded-2xl border p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold">
                待插入图片
              </h3>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ busyLabel || planSummary }}
              </p>
            </div>
            <Button
              v-if="pendingImages.length"
              variant="ghost"
              size="sm"
              class="h-8 px-3 text-xs"
              @click="clearPending"
            >
              清空
            </Button>
          </div>

          <div v-if="pendingImages.length" class="quick-insert-pending-grid mt-4">
            <div v-for="(item, index) in pendingImages" :key="item.id" class="quick-insert-pending-card">
              <div class="quick-insert-pending-card__thumb">
                <img :src="item.url" :alt="item.alt || `图片 ${index + 1}`">
                <span class="quick-insert-pending-card__index">{{ index + 1 }}</span>
              </div>
              <button type="button" class="quick-insert-pending-card__remove" @click="removePending(item.id)">
                <X class="size-3" />
              </button>
            </div>
          </div>

          <div v-else class="mt-4 rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
            {{ activeTab === 'single' ? '上传一张图片后会显示在这里。' : activeTab === 'batch' ? '上传的多张图片会按顺序显示在这里。' : activeTab === 'link' ? '解析图片链接后会显示在这里。' : '从最近图片中选择后会显示在这里。' }}
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
        <div class="min-w-[260px] flex-1">
          <Select v-model="insertMode">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择插入方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in insertModeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" @click="setOpen(false)">
            取消
          </Button>
          <Button :disabled="!canInsert" @click="insertImages">
            插入到正文
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped lang="less">
.quick-insert-dropzone {
  border-color: hsl(var(--border));
  background: hsl(var(--muted) / 0.28);
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.quick-insert-dropzone--active {
  border-color: hsl(var(--ring));
  background: hsl(var(--accent) / 0.4);
}

.quick-insert-recent-grid,
.quick-insert-pending-grid {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
}

.quick-insert-recent-card,
.quick-insert-pending-card {
  position: relative;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--muted) / 0.5);
}

.quick-insert-recent-card--active {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--accent) / 0.5);
}

.quick-insert-recent-card__thumb,
.quick-insert-pending-card__thumb {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
}

.quick-insert-recent-card__thumb img,
.quick-insert-pending-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.quick-insert-pending-card__index {
  position: absolute;
  left: 0.3rem;
  bottom: 0.3rem;
  display: inline-flex;
  min-width: 1.15rem;
  align-items: center;
  justify-content: center;
  padding: 0.1rem 0.3rem;
  border-radius: 999px;
  background: hsl(var(--primary));
  font-size: 0.64rem;
  font-weight: 700;
  color: hsl(var(--primary-foreground));
}

.quick-insert-recent-card__remove,
.quick-insert-pending-card__remove {
  position: absolute;
  right: 0.28rem;
  top: 0.28rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border-radius: 999px;
  background: hsl(var(--background) / 0.86);
  color: hsl(var(--muted-foreground));
}

.quick-insert-recent-card__remove:hover,
.quick-insert-pending-card__remove:hover {
  color: hsl(var(--destructive));
}
</style>
