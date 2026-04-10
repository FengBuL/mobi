<script setup lang="ts">
import type { MediaLayoutCategory, MediaLayoutFormState, MediaLayoutPreset } from '@/utils/image-layouts'
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Images,
  Link2,
  Newspaper,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-vue-next'
import { useImageUploader } from '@/composables/useImageUploader'
import { useEditorStore } from '@/stores/editor'
import { usePostStore } from '@/stores/post'
import { useUIStore } from '@/stores/ui'
import { addPrefix, checkImage } from '@/utils'
import {
  buildMediaLayoutMarkup,
  cloneMediaLayoutState,
  createDefaultMediaLayoutState,
  mediaAspectRatioOptions,
  mediaLayoutPresets,
  normalizeMediaLayoutState,
} from '@/utils/image-layouts'

interface SavedMediaLayoutPreset {
  id: string
  name: string
  category: MediaLayoutCategory
  presetId: string
  form: MediaLayoutFormState
  createdAt: string
  updatedAt: string
}

const MEDIA_LAYOUT_PRESET_STORAGE_KEY = addPrefix(`media-layout-custom-presets`)

const uiStore = useUIStore()
const editorStore = useEditorStore()
const postStore = usePostStore()
const { upload } = useImageUploader()

const activeCategory = ref<MediaLayoutCategory>(`image`)
const selectedPresetId = ref(`hero-image`)
const selectedSavedPresetId = ref(``)
const customPresetName = ref(``)
const formState = reactive(createDefaultMediaLayoutState())
const slotInputRefs = ref<Array<HTMLInputElement | null>>([])
const slotBusyKey = ref<string | null>(null)
const dragSlotIndex = ref<number | null>(null)

const savedPresets = ref<SavedMediaLayoutPreset[]>(readSavedPresets())

const activePresets = computed(() => {
  return mediaLayoutPresets.filter(preset => preset.category === activeCategory.value)
})

const selectedPreset = computed<MediaLayoutPreset>(() => {
  return mediaLayoutPresets.find(preset => preset.id === selectedPresetId.value) ?? mediaLayoutPresets[0]
})

const activeImageSlots = computed(() => {
  return formState.images.slice(0, selectedPreset.value.slotCount)
})

const previewMarkup = computed(() => {
  return buildMediaLayoutMarkup(selectedPreset.value, formState, true)
})

const activeSavedPresets = computed(() => {
  return savedPresets.value.filter(item => item.category === activeCategory.value)
})

const currentSavedPreset = computed(() => {
  return savedPresets.value.find(item => item.id === selectedSavedPresetId.value) ?? null
})

const presetPreviewMarkupMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  mediaLayoutPresets.forEach((preset) => {
    map[preset.id] = buildMediaLayoutMarkup(preset, createPreviewState(preset), true)
  })
  return map
})

watch(
  savedPresets,
  (value) => {
    localStorage.setItem(MEDIA_LAYOUT_PRESET_STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

watch(activeCategory, (category) => {
  const nextPreset = mediaLayoutPresets.find(preset => preset.category === category)
  if (nextPreset) {
    selectedPresetId.value = nextPreset.id
  }

  if (currentSavedPreset.value?.category !== category) {
    selectedSavedPresetId.value = ``
  }
})

watch(selectedSavedPresetId, (id) => {
  if (!id) {
    return
  }

  const savedPreset = savedPresets.value.find(item => item.id === id)
  if (!savedPreset) {
    return
  }

  customPresetName.value = savedPreset.name
  activeCategory.value = savedPreset.category
  selectedPresetId.value = savedPreset.presetId
  applyFormState(savedPreset.form)
})

function readSavedPresets(): SavedMediaLayoutPreset[] {
  try {
    const raw = localStorage.getItem(MEDIA_LAYOUT_PRESET_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item, index) => normalizeSavedPreset(item, index))
      .filter((item): item is SavedMediaLayoutPreset => item !== null)
  }
  catch {
    return []
  }
}

function normalizeSavedPreset(value: any, index: number): SavedMediaLayoutPreset | null {
  if (!value || typeof value !== `object`) {
    return null
  }

  const presetId = typeof value.presetId === `string` ? value.presetId : `hero-image`
  const matchedPreset = mediaLayoutPresets.find(preset => preset.id === presetId)

  return {
    id: typeof value.id === `string` ? value.id : `media-layout-${index + 1}`,
    name: typeof value.name === `string` && value.name.trim() ? value.name.trim() : `我的模板 ${index + 1}`,
    category: matchedPreset?.category ?? (value.category === `mixed` ? `mixed` : `image`),
    presetId: matchedPreset?.id ?? `hero-image`,
    form: normalizeMediaLayoutState(value.form),
    createdAt: typeof value.createdAt === `string` ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === `string` ? value.updatedAt : new Date().toISOString(),
  }
}

function createPreviewState(preset: MediaLayoutPreset) {
  const state = createDefaultMediaLayoutState()
  state.sectionLabel = preset.category === `image` ? `图片排版` : `图文排版`
  state.sectionTitle = preset.name
  state.sectionLead = preset.description
  state.bodyTitle = `这里是标题`
  state.bodyText = `两三句话说明图片和文案的组合方式。`
  state.secondaryText = `拖入图片后还可以继续微调内容和顺序。`
  state.ctaText = `查看详情`
  state.images = state.images.map((slot, index) => ({
    ...slot,
    alt: `${preset.name} ${index + 1}`,
    caption: index === 0 ? `模块缩略预览` : `图片说明`,
    title: `示例标题 ${index + 1}`,
    summary: `这一格会跟随你当前填写的文案一起插入正文。`,
  }))
  return state
}

function applyFormState(nextState: MediaLayoutFormState) {
  const normalized = normalizeMediaLayoutState(nextState)
  Object.assign(formState, normalized)
}

function resetFormState() {
  applyFormState(createDefaultMediaLayoutState())
}

function onUpdate(open: boolean) {
  if (!open) {
    uiStore.toggleShowImageLayoutDialog(false)
  }
}

function setSlotInputRef(el: HTMLInputElement | null, index: number) {
  slotInputRefs.value[index] = el
}

function triggerSlotUpload(index: number) {
  slotInputRefs.value[index]?.click()
}

function setPreset(preset: MediaLayoutPreset) {
  activeCategory.value = preset.category
  selectedPresetId.value = preset.id
  selectedSavedPresetId.value = ``
}

function getSlotBusyLabel(index: number) {
  if (slotBusyKey.value === `file-${index}`) {
    return `上传中...`
  }
  if (slotBusyKey.value === `url-${index}`) {
    return `转存中...`
  }
  return ``
}

async function handleSlotFileChange(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  const checkResult = checkImage(file)
  if (!checkResult.ok) {
    toast.error(checkResult.msg)
    input.value = ``
    return
  }

  slotBusyKey.value = `file-${index}`
  try {
    const url = await upload(file)
    formState.images[index].url = url
    toast.success(`图片 ${index + 1} 上传成功`)
  }
  catch (error) {
    toast.error((error as Error).message || `图片上传失败`)
  }
  finally {
    slotBusyKey.value = null
    input.value = ``
  }
}

async function migrateSlotUrl(index: number) {
  const currentUrl = formState.images[index].url.trim()
  if (!currentUrl) {
    toast.error(`请先填写图片链接`)
    return
  }

  slotBusyKey.value = `url-${index}`
  try {
    const nextUrl = await upload(currentUrl)
    formState.images[index].url = nextUrl
    toast.success(`图片 ${index + 1} 已转存`)
  }
  catch (error) {
    toast.error((error as Error).message || `图片转存失败`)
  }
  finally {
    slotBusyKey.value = null
  }
}

function clearSlot(index: number) {
  formState.images[index].url = ``
}

function moveSlot(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  reorderSlot(index, targetIndex)
}

function reorderSlot(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) {
    return
  }

  const maxIndex = selectedPreset.value.slotCount - 1
  if (fromIndex < 0 || toIndex < 0 || fromIndex > maxIndex || toIndex > maxIndex) {
    return
  }

  const [moved] = formState.images.splice(fromIndex, 1)
  formState.images.splice(toIndex, 0, moved)
}

function handleSlotDragStart(index: number, event: DragEvent) {
  dragSlotIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.setData(`text/plain`, String(index))
    event.dataTransfer.effectAllowed = `move`
  }
}

function handleSlotDrop(index: number) {
  if (dragSlotIndex.value === null) {
    return
  }

  reorderSlot(dragSlotIndex.value, index)
  dragSlotIndex.value = null
}

function handleSlotDragEnd() {
  dragSlotIndex.value = null
}

function saveCurrentPreset() {
  const name = customPresetName.value.trim()
  if (!name) {
    toast.error(`请先填写模板名称`)
    return
  }

  const now = new Date().toISOString()
  const current = currentSavedPreset.value
  const nextPreset: SavedMediaLayoutPreset = {
    id: current?.id ?? `media-layout-${Date.now().toString(36)}`,
    name,
    category: activeCategory.value,
    presetId: selectedPreset.value.id,
    form: cloneMediaLayoutState(formState),
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  }

  const targetIndex = savedPresets.value.findIndex(item => item.id === nextPreset.id)
  if (targetIndex >= 0) {
    savedPresets.value.splice(targetIndex, 1, nextPreset)
    toast.success(`已更新我的模板`)
  }
  else {
    savedPresets.value.unshift(nextPreset)
    toast.success(`已保存为我的模板`)
  }

  selectedSavedPresetId.value = nextPreset.id
}

function removeCurrentPreset() {
  if (!currentSavedPreset.value) {
    toast.error(`请先选择一个我的模板`)
    return
  }

  const presetName = currentSavedPreset.value.name
  savedPresets.value = savedPresets.value.filter(item => item.id !== currentSavedPreset.value?.id)
  selectedSavedPresetId.value = ``
  customPresetName.value = ``
  toast.success(`已删除模板「${presetName}」`)
}

function createNewPresetDraft() {
  selectedSavedPresetId.value = ``
  customPresetName.value = ``
}

function validateBeforeInsert() {
  const missingIndexes: number[] = []
  for (let index = 0; index < selectedPreset.value.requiredImageCount; index += 1) {
    if (!formState.images[index]?.url.trim()) {
      missingIndexes.push(index + 1)
    }
  }

  if (missingIndexes.length > 0) {
    toast.error(`请先补齐图片 ${missingIndexes.join(`、`)} 的链接或上传图片`)
    return false
  }

  return true
}

function insertLayout() {
  if (!validateBeforeInsert()) {
    return
  }

  const markup = buildMediaLayoutMarkup(selectedPreset.value, formState)
  editorStore.insertAtCursor(`\n${markup}\n`)

  const currentPost = postStore.currentPost
  if (currentPost) {
    postStore.updatePostContent(currentPost.id, editorStore.getContent())
  }

  toast.success(`已插入${activeCategory.value === `image` ? `图片排版` : `图文排版`}模块`)
  uiStore.toggleShowImageLayoutDialog(false)
}
</script>

<template>
  <Dialog :open="uiStore.isShowImageLayoutDialog" @update:open="onUpdate">
    <DialogContent class="max-w-6xl max-h-[92vh] flex flex-col overflow-hidden p-0" @pointer-down-outside="event => event.preventDefault()">
      <DialogHeader class="border-b px-6 pt-6 pb-4">
        <DialogTitle class="flex items-center gap-2">
          <Sparkles class="size-5" />
          图片排版模块
        </DialogTitle>
        <DialogDescription>
          现在支持图片排版、图文排版、自定义模板保存、图片排序和比例控制，插入后可直接进入正文继续编辑。
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-auto px-6 py-5">
        <div class="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside class="space-y-4">
            <Tabs v-model="activeCategory" class="w-full">
              <TabsList class="grid w-full grid-cols-2">
                <TabsTrigger value="image" class="gap-2">
                  <Images class="size-4" />
                  图片排版
                </TabsTrigger>
                <TabsTrigger value="mixed" class="gap-2">
                  <Newspaper class="size-4" />
                  图文排版
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div class="rounded-2xl border p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold">
                    我的模板
                  </h3>
                  <p class="mt-1 text-xs text-muted-foreground leading-5">
                    选中当前组合后可保存到本地，后续直接套用。
                  </p>
                </div>
                <span class="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {{ activeSavedPresets.length }} 个
                </span>
              </div>

              <div class="mt-4 grid gap-3">
                <Select v-model="selectedSavedPresetId" :disabled="activeSavedPresets.length === 0">
                  <SelectTrigger class="w-full">
                    <SelectValue :placeholder="activeSavedPresets.length === 0 ? '当前分类还没有自定义模板' : '选择一个我的模板'" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="preset in activeSavedPresets" :key="preset.id" :value="preset.id">
                      {{ preset.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Input v-model="customPresetName" placeholder="输入模板名称后保存" />

                <div class="flex flex-wrap gap-2">
                  <Button type="button" size="sm" class="h-8 px-3 text-xs" @click="saveCurrentPreset">
                    <BookmarkPlus class="mr-2 size-3.5" />
                    保存当前模板
                  </Button>
                  <Button type="button" variant="outline" size="sm" class="h-8 px-3 text-xs" @click="createNewPresetDraft">
                    新建副本
                  </Button>
                  <Button type="button" variant="ghost" size="sm" class="h-8 px-3 text-xs" :disabled="!currentSavedPreset" @click="removeCurrentPreset">
                    <Trash2 class="mr-2 size-3.5" />
                    删除
                  </Button>
                </div>

                <p class="text-xs leading-5 text-muted-foreground">
                  {{ currentSavedPreset ? `当前正在编辑：${currentSavedPreset.name}` : `先选择一个内置排版，再把你的图链、文案和顺序存成自己的模板。` }}
                </p>
              </div>
            </div>

            <div class="grid gap-3">
              <button
                v-for="preset in activePresets"
                :key="preset.id"
                type="button"
                class="layout-preset-card rounded-2xl border p-3 text-left transition"
                :class="{ 'layout-preset-card--active': preset.id === selectedPresetId }"
                @click="setPreset(preset)"
              >
                <div class="layout-preset-card__thumb rounded-xl border bg-muted/25 p-2">
                  <div class="md-layout-preview md-layout-preview--preset" v-html="presetPreviewMarkupMap[preset.id]" />
                </div>

                <div class="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold">
                      {{ preset.name }}
                    </p>
                    <p class="mt-1 text-xs text-muted-foreground leading-5">
                      {{ preset.description }}
                    </p>
                  </div>
                  <span class="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {{ preset.slotCount }} 图
                  </span>
                </div>
              </button>
            </div>
          </aside>

          <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div class="space-y-5">
              <div class="rounded-2xl border p-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold">
                      模块信息
                    </h3>
                    <p class="mt-1 text-xs text-muted-foreground">
                      这部分会作为版块标题和导语出现在插入内容中。
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" class="h-8 px-3 text-xs" @click="resetFormState">
                    <RefreshCw class="mr-2 size-3.5" />
                    重置示例
                  </Button>
                </div>

                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <Label for="section-label">标签</Label>
                    <Input id="section-label" v-model="formState.sectionLabel" placeholder="如：案例拆解 / 图文卡片" />
                  </div>
                  <div class="space-y-2 md:col-span-1">
                    <Label for="section-title">版块标题</Label>
                    <Input id="section-title" v-model="formState.sectionTitle" placeholder="这里填写版块标题" />
                  </div>
                  <div class="space-y-2 md:col-span-2">
                    <Label for="section-lead">版块导语</Label>
                    <Textarea id="section-lead" v-model="formState.sectionLead" class="min-h-[88px]" placeholder="这里填写导语或场景说明" />
                  </div>
                </div>
              </div>

              <div class="rounded-2xl border p-4">
                <div>
                  <h3 class="text-sm font-semibold">
                    图片槽位
                  </h3>
                  <p class="mt-1 text-xs text-muted-foreground">
                    每个槽位都支持上传、转存、拖拽排序和单独设置裁切比例。
                  </p>
                </div>

                <div class="mt-4 space-y-4">
                  <div
                    v-for="(slot, index) in activeImageSlots"
                    :key="`${index}-${slot.alt}`"
                    class="layout-slot-card rounded-2xl border bg-muted/20 p-4"
                    :class="{ 'layout-slot-card--dragging': dragSlotIndex === index }"
                    @dragover.prevent
                    @drop.prevent="handleSlotDrop(index)"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          class="inline-flex size-8 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:text-foreground"
                          :draggable="activeImageSlots.length > 1"
                          title="拖动调整图片顺序"
                          @dragstart="handleSlotDragStart(index, $event)"
                          @dragend="handleSlotDragEnd"
                        >
                          <GripVertical class="size-4" />
                        </button>
                        <p class="text-sm font-semibold">
                          图片 {{ index + 1 }}
                        </p>
                      </div>

                      <div class="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" class="size-8" :disabled="index === 0" @click="moveSlot(index, -1)">
                          <ChevronUp class="size-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" class="size-8" :disabled="index === activeImageSlots.length - 1" @click="moveSlot(index, 1)">
                          <ChevronDown class="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div class="mt-3 grid gap-3">
                      <div class="space-y-2">
                        <Label :for="`slot-url-${index}`">图片链接</Label>
                        <Input :id="`slot-url-${index}`" v-model="slot.url" placeholder="https://example.com/image.png" />
                      </div>

                      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                        <div class="flex flex-wrap gap-2">
                          <input
                            :ref="el => setSlotInputRef(el as HTMLInputElement | null, index)"
                            type="file"
                            accept="image/*"
                            class="hidden"
                            @change="handleSlotFileChange(index, $event)"
                          >
                          <Button type="button" variant="outline" size="sm" class="h-8 px-3 text-xs" :disabled="slotBusyKey !== null" @click="triggerSlotUpload(index)">
                            <UploadCloud class="mr-2 size-3.5" />
                            上传本地图片
                          </Button>
                          <Button type="button" variant="outline" size="sm" class="h-8 px-3 text-xs" :disabled="slotBusyKey !== null" @click="migrateSlotUrl(index)">
                            <Link2 class="mr-2 size-3.5" />
                            转存当前链接
                          </Button>
                          <Button type="button" variant="ghost" size="sm" class="h-8 px-3 text-xs" :disabled="slotBusyKey !== null" @click="clearSlot(index)">
                            清空
                          </Button>
                        </div>

                        <div class="space-y-2">
                          <Label :for="`slot-ratio-${index}`">裁切比例</Label>
                          <Select v-model="slot.aspectRatio">
                            <SelectTrigger :id="`slot-ratio-${index}`" class="w-full">
                              <SelectValue placeholder="选择图片比例" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem v-for="option in mediaAspectRatioOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div class="grid gap-3 md:grid-cols-2">
                        <div class="space-y-2">
                          <Label :for="`slot-alt-${index}`">Alt 文案</Label>
                          <Input :id="`slot-alt-${index}`" v-model="slot.alt" placeholder="图片 alt 文案" />
                        </div>
                        <div class="space-y-2">
                          <Label :for="`slot-caption-${index}`">图片说明</Label>
                          <Input :id="`slot-caption-${index}`" v-model="slot.caption" placeholder="用于图片下方的简短说明" />
                        </div>
                        <div class="space-y-2">
                          <Label :for="`slot-title-${index}`">卡片标题</Label>
                          <Input :id="`slot-title-${index}`" v-model="slot.title" placeholder="主要用于图文卡片类预设" />
                        </div>
                        <div class="space-y-2">
                          <Label :for="`slot-summary-${index}`">卡片摘要</Label>
                          <Input :id="`slot-summary-${index}`" v-model="slot.summary" placeholder="主要用于图文卡片类预设" />
                        </div>
                      </div>

                      <div class="flex items-center justify-between gap-3">
                        <span v-if="getSlotBusyLabel(index)" class="text-xs text-muted-foreground">
                          {{ getSlotBusyLabel(index) }}
                        </span>
                        <span v-else class="text-xs text-muted-foreground">
                          当前顺序会直接影响插入后的图文结构。
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="activeCategory === 'mixed'" class="rounded-2xl border p-4">
                <div>
                  <h3 class="text-sm font-semibold">
                    图文内容
                  </h3>
                  <p class="mt-1 text-xs text-muted-foreground">
                    这部分用于图文预设中的正文标题、摘要和跳转链接。
                  </p>
                </div>

                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <div class="space-y-2 md:col-span-2">
                    <Label for="body-title">正文标题</Label>
                    <Input id="body-title" v-model="formState.bodyTitle" placeholder="这里填写正文标题" />
                  </div>
                  <div class="space-y-2 md:col-span-2">
                    <Label for="body-text">正文摘要</Label>
                    <Textarea id="body-text" v-model="formState.bodyText" class="min-h-[92px]" placeholder="这里填写正文摘要" />
                  </div>
                  <div class="space-y-2 md:col-span-2">
                    <Label for="secondary-text">补充说明</Label>
                    <Textarea id="secondary-text" v-model="formState.secondaryText" class="min-h-[80px]" placeholder="这里填写补充说明或结论" />
                  </div>
                  <div class="space-y-2">
                    <Label for="cta-text">链接文案</Label>
                    <Input id="cta-text" v-model="formState.ctaText" placeholder="如：延伸阅读" />
                  </div>
                  <div class="space-y-2">
                    <Label for="cta-url">链接地址</Label>
                    <Input id="cta-url" v-model="formState.ctaUrl" placeholder="https://example.com" />
                  </div>
                </div>
              </div>
            </div>

            <aside class="space-y-4">
              <div class="rounded-2xl border p-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold">
                      实时预览
                    </h3>
                    <p class="mt-1 text-xs text-muted-foreground">
                      空图链会自动使用占位图；真正插入正文前仍要求补齐必填图片。
                    </p>
                  </div>
                </div>

                <div class="mt-4 rounded-2xl bg-muted/30 p-3">
                  <div class="md-layout-preview" v-html="previewMarkup" />
                </div>
              </div>

              <div class="rounded-2xl border p-4">
                <h3 class="text-sm font-semibold">
                  当前预设
                </h3>
                <p class="mt-2 text-sm font-medium">
                  {{ selectedPreset.name }}
                </p>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                  {{ selectedPreset.description }}
                </p>

                <div class="mt-4 flex gap-3">
                  <Button class="flex-1" @click="insertLayout">
                    插入到编辑器
                  </Button>
                  <Button variant="outline" @click="uiStore.toggleShowImageLayoutDialog(false)">
                    取消
                  </Button>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped lang="less">
.layout-preset-card {
  border-color: hsl(var(--border));
  background: hsl(var(--background));

  &:hover {
    border-color: hsl(var(--ring) / 0.4);
    background: hsl(var(--accent) / 0.35);
  }
}

.layout-preset-card--active {
  border-color: hsl(var(--ring));
  background: hsl(var(--accent) / 0.5);
  box-shadow: 0 0 0 1px hsl(var(--ring) / 0.22);
}

.layout-preset-card__thumb {
  height: 156px;
  overflow: hidden;
}

.layout-slot-card {
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.layout-slot-card--dragging {
  border-color: hsl(var(--ring));
  background: hsl(var(--accent) / 0.4);
  box-shadow: 0 0 0 1px hsl(var(--ring) / 0.18);
}

.md-layout-preview {
  max-height: 62vh;
  overflow: auto;
}

.md-layout-preview--preset {
  width: 225%;
  transform: scale(0.445);
  transform-origin: top left;
  pointer-events: none;
}

.layout-preset-card__thumb :deep(.md-media-block) {
  margin: 0;
}
</style>
