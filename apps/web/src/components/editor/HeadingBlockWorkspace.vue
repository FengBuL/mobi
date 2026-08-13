<script setup lang="ts">
import type { BlockPreset, BlockState, ParsedBlock } from '@/utils/blocks/types'
import { Check, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-vue-next'
import { useBlockSelectionStore } from '@/stores/blockSelection'
import { useEditorStore } from '@/stores/editor'
import { usePostStore } from '@/stores/post'
import { useRenderStore } from '@/stores/render'
import {
  blockCategories,
  buildBlockMarkup,
  parseBlockEntries,
} from '@/utils/blocks/registry'

const props = withDefaults(defineProps<{
  categoryId?: string
}>(), {
  categoryId: `heading`,
})

const editorStore = useEditorStore()
const blockSelectionStore = useBlockSelectionStore()
const postStore = usePostStore()
const renderStore = useRenderStore()
const { selection: blockSelection } = storeToRefs(blockSelectionStore)
const category = computed(() => blockCategories.find(item => item.id === props.categoryId) ?? blockCategories[0])
const presets = computed(() => category.value.presets)
const selectedPresetId = ref(presets.value[0].id)
const state = reactive<BlockState>(category.value.createDefaultState(presets.value[0]))
const editingRange = ref<{ from: number, to: number } | null>(null)

const selectedPreset = computed(() => presets.value.find(preset => preset.id === selectedPresetId.value) ?? presets.value[0])
const previewMarkup = computed(() => buildBlockMarkup(selectedPreset.value, state, true))

/**
 * 缩略图直接渲染板块本体，再整体缩到栏宽。
 *
 * 之前这里是一个「色块 + 竖条 + 名字前四个字」的占位，20 个预设长得完全一样，
 * 只有取自 palette 的颜色不同，挑样式只能靠读描述。
 *
 * 用 `zoom` 而不是 `transform: scale`：缩放要参与布局，否则外层留下原始高度的空白。
 */
const READER_WIDTH = 375
const presetGrid = ref<HTMLElement | null>(null)
const { width: gridWidth } = useElementSize(presetGrid)
const thumbZoom = computed(() => {
  const inner = gridWidth.value - 36
  return inner > 0 ? Math.min(1, Number((inner / READER_WIDTH).toFixed(3))) : 0.6
})

const thumbnails = computed(() => new Map(
  presets.value.map(preset => [
    preset.id,
    buildBlockMarkup(preset, category.value.createDefaultState(preset), true),
  ]),
))
const content = computed(() => postStore.currentPost?.content ?? editorStore.getContent())
const existingBlocks = computed(() => parseBlockEntries(content.value).filter(block => block.category === category.value.id))

watch(selectedPreset, (preset) => {
  const next = category.value.createDefaultState(preset)
  Object.keys(next).forEach((key) => {
    if (!(key in state)) {
      state[key] = next[key]
    }
  })
})

watch([category, blockSelection], ([nextCategory, selection]) => {
  if (!selection || selection.category !== nextCategory.id) {
    const preset = nextCategory.presets[0]
    selectedPresetId.value = preset.id
    Object.assign(state, nextCategory.createDefaultState(preset))
    editingRange.value = null
    return
  }

  const preset = selection.presetId
    ? nextCategory.presets.find(item => item.id === selection.presetId)
    : nextCategory.presets[0]
  if (!preset) {
    return
  }

  selectedPresetId.value = preset.id
  Object.assign(state, nextCategory.createDefaultState(preset), selection.state)
  editingRange.value = { from: selection.from, to: selection.to }
}, { immediate: true })

function selectPreset(preset: BlockPreset) {
  const previous = selectedPreset.value
  selectedPresetId.value = preset.id

  const next = category.value.createDefaultState(preset)
  Object.keys(next).forEach((key) => {
    if (!(key in state)) {
      state[key] = next[key]
    }
  })

  if (editingRange.value) {
    writeBlock(preset, `${category.value.name}板块已换成「${preset.name}」`)
    return
  }

  if (previous.id !== preset.id) {
    Object.assign(state, next)
  }
  writeBlock(preset, `已插入「${preset.name}」，可继续修改内容`)
}

function resetState() {
  Object.assign(state, category.value.createDefaultState(selectedPreset.value))
}

function editBlock(block: ParsedBlock) {
  const preset = presets.value.find(item => item.id === block.presetId)
  if (!preset) {
    toast.error(`该板块预设已不可用`)
    return
  }
  blockSelectionStore.select({
    category: block.category,
    from: block.from,
    to: block.to,
    presetId: block.presetId,
    state: { ...block.state },
    title: block.title,
  })
}

// 删除时连带吃掉板块前后的空行，否则正文里会留下越积越多的空白
function removeRange(from: number, to: number) {
  const current = editorStore.getContent()
  let start = from
  let end = to
  while (start > 0 && /[\t ]/.test(current[start - 1])) {
    start -= 1
  }
  while (end < current.length && /[\t ]/.test(current[end])) {
    end += 1
  }
  if (current[start - 1] === `\n` && current[end] === `\n`) {
    end += 1
  }
  persistContent(`${current.slice(0, start)}${current.slice(end)}`)
}

function deleteBlock(block: ParsedBlock) {
  removeRange(block.from, block.to)
  if (blockSelection.value?.from === block.from) {
    blockSelectionStore.clear()
  }
  editingRange.value = null
  toast.success(`已删除「${block.title || category.value.name}」`)
}

function deleteSelected() {
  if (!editingRange.value) {
    return
  }
  removeRange(editingRange.value.from, editingRange.value.to)
  editingRange.value = null
  blockSelectionStore.clear()
  Object.assign(state, category.value.createDefaultState(selectedPreset.value))
  toast.success(`已删除当前${category.value.name}板块`)
}

function persistContent(nextContent: string) {
  editorStore.importContent(nextContent)
  if (postStore.currentPost) {
    postStore.updatePostContent(postStore.currentPost.id, nextContent)
  }
  renderStore.render(nextContent)
}

function writeBlock(preset: BlockPreset, message: string) {
  const markup = buildBlockMarkup(preset, state)
  const current = editorStore.getContent()

  if (editingRange.value) {
    const { from, to } = editingRange.value
    persistContent(`${current.slice(0, from)}${markup}${current.slice(to)}`)
    editingRange.value = { from, to: from + markup.length }
    blockSelectionStore.select({
      category: category.value.id,
      from,
      to: from + markup.length,
      presetId: preset.id,
      state: { ...state },
      title: String(state.title ?? state.quote ?? state.item1 ?? preset.name),
    })
    toast.success(message)
    return
  }

  editorStore.insertBlockAtCursor(markup)
  const nextContent = editorStore.getContent()
  if (postStore.currentPost) {
    postStore.updatePostContent(postStore.currentPost.id, nextContent)
  }
  renderStore.render(nextContent)

  const from = nextContent.indexOf(markup)
  editingRange.value = from === -1 ? null : { from, to: from + markup.length }
  toast.success(message)
}

function applyBlock() {
  writeBlock(selectedPreset.value, `${category.value.name}板块已更新`)
}
</script>

<template>
  <div class="heading-block-workspace">
    <section class="heading-block-section">
      <div class="heading-block-section__head">
        <div>
          <h3>选择{{ category.name }}样式</h3>
          <p>{{ editingRange ? '点任意样式，原地替换当前板块。' : '点任意样式，直接生成到光标位置。' }}</p>
        </div>
        <span class="heading-block-count">{{ presets.length }} 种</span>
      </div>

      <div ref="presetGrid" class="heading-block-preset-grid">
        <button
          v-for="preset in presets"
          :key="preset.id"
          type="button"
          class="heading-block-preset"
          :class="{ 'heading-block-preset--active': preset.id === selectedPresetId }"
          :title="preset.description"
          @click="selectPreset(preset)"
        >
          <div class="heading-block-preset__thumb">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="heading-block-preset__canvas" :style="{ zoom: thumbZoom }" v-html="thumbnails.get(preset.id)" />
          </div>
          <div class="heading-block-preset__meta">
            <strong>{{ preset.name }}</strong>
            <span>{{ preset.cue }}</span>
            <Check v-if="preset.id === selectedPresetId" class="size-3.5 shrink-0" />
          </div>
        </button>
      </div>
    </section>

    <section class="heading-block-section">
      <div class="heading-block-section__head">
        <div>
          <h3>{{ editingRange ? '编辑当前板块' : '填写内容' }}</h3>
          <p>{{ editingRange ? '改完点下方按钮更新，换样式会原地替换。' : '点上方任意样式即可直接生成。' }}</p>
        </div>
        <Button variant="ghost" size="sm" @click="resetState">
          <RotateCcw class="mr-2 size-3.5" />
          重置
        </Button>
      </div>

      <div class="heading-block-fields">
        <div v-for="field in selectedPreset.fields" :key="field.key" class="grid gap-2">
          <Label :for="`heading-block-${field.key}`">{{ field.label }}</Label>
          <Textarea
            v-if="field.type === 'textarea'"
            :id="`heading-block-${field.key}`"
            v-model="state[field.key] as string"
            :placeholder="field.placeholder"
          />
          <Input
            v-else
            :id="`heading-block-${field.key}`"
            v-model="state[field.key] as string"
            :placeholder="field.placeholder"
          />
        </div>
      </div>

      <div class="heading-block-preview">
        <div v-html="previewMarkup" />
      </div>

      <div class="heading-block-actions">
        <Button class="flex-1" :disabled="!editingRange" @click="applyBlock">
          <Pencil v-if="editingRange" class="mr-2 size-4" />
          <Plus v-else class="mr-2 size-4" />
          {{ editingRange ? '更新到正文' : '点上方样式即可生成' }}
        </Button>
        <Button v-if="editingRange" variant="outline" @click="deleteSelected">
          <Trash2 class="mr-2 size-4" />
          删除
        </Button>
      </div>
    </section>

    <section v-if="existingBlocks.length" class="heading-block-section">
      <div class="heading-block-section__head">
        <div>
          <h3>正文中的{{ category.name }}板块</h3>
          <p>点条目回填编辑，点垃圾桶从正文里移除。</p>
        </div>
        <span class="heading-block-count">{{ existingBlocks.length }} 个</span>
      </div>
      <div
        v-for="block in existingBlocks"
        :key="`${block.from}-${block.presetId}`"
        class="heading-block-existing"
      >
        <button type="button" class="heading-block-existing__main" @click="editBlock(block)">
          <span>{{ block.title }}</span>
          <small>编辑板块</small>
        </button>
        <button
          type="button"
          class="heading-block-existing__remove"
          title="从正文中删除"
          @click.stop="deleteBlock(block)"
        >
          <Trash2 class="size-3.5" />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped lang="less">
.heading-block-workspace {
  display: grid;
  gap: 1rem;
}

.heading-block-section {
  padding: 1rem;
  border: 1px solid hsl(var(--border) / 0.78);
  border-radius: 24px;
  background: hsl(var(--background) / 0.9);
}

.heading-block-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.heading-block-section__head h3 {
  margin: 0;
  font-size: 0.96rem;
  font-weight: 700;
}

.heading-block-section__head p {
  margin: 0.3rem 0 0;
  font-size: 0.76rem;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.heading-block-count {
  padding: 0.28rem 0.58rem;
  border-radius: 999px;
  background: hsl(var(--secondary));
  font-size: 0.7rem;
  white-space: nowrap;
  color: hsl(var(--muted-foreground));
}

.heading-block-preset-grid {
  display: grid;
  gap: 0.65rem;
}

.heading-block-preset {
  display: grid;
  gap: 0.4rem;
  padding: 0.4rem;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  text-align: left;
  background: hsl(var(--background));
  transition: border-color 0.15s, box-shadow 0.15s;
}

.heading-block-preset:hover,
.heading-block-preset--active {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--accent) / 0.3);
}

.heading-block-preset__thumb {
  position: relative;
  max-height: 11rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
}

/* 裁掉高板块的下沿。不溢出时这层白到白的渐变看不出来，所以不用判断是否溢出 */
.heading-block-preset__thumb::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1.6rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), #ffffff);
  pointer-events: none;
}

.heading-block-preset__canvas {
  width: 375px;
}

.heading-block-preset__canvas :deep(.md-block) {
  margin: 0 !important;
}

.heading-block-preset__meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.15rem;
}

.heading-block-preset__meta strong {
  overflow: hidden;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heading-block-preset__meta span {
  overflow: hidden;
  flex: 1;
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: hsl(var(--muted-foreground));
}

.heading-block-fields {
  display: grid;
  gap: 0.75rem;
}

.heading-block-preview {
  margin: 1rem 0;
  padding: 0.8rem;
  border-radius: 18px;
  background: #ffffff;
}

.heading-block-existing {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.55rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--background));
  text-align: left;
}

.heading-block-existing__main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  text-align: left;
}

.heading-block-existing span {
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heading-block-existing small {
  font-size: 0.68rem;
  white-space: nowrap;
  color: hsl(var(--muted-foreground));
}

.heading-block-existing__remove {
  display: flex;
  width: 1.75rem;
  height: 1.75rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: hsl(var(--muted-foreground));
  transition: color 0.15s, background-color 0.15s;
}

.heading-block-existing__remove:hover {
  background: hsl(var(--destructive) / 0.12);
  color: hsl(var(--destructive));
}

.heading-block-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
