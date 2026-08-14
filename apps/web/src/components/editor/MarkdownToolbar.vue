<script setup lang="ts">
import type { MarkdownToolbarCommand } from '@/utils/markdown-toolbar'
import {
  Bold,
  Code2,
  Contact,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Table,
} from 'lucide-vue-next'
import { useImageQuickInsert } from '@/composables/useImageQuickInsert'
import { useEditorStore } from '@/stores/editor'
import { useUIStore } from '@/stores/ui'
import { applyMarkdownCommand } from '@/utils/markdown-toolbar'

const editorStore = useEditorStore()
const uiStore = useUIStore()
const { open: openQuickInsert } = useImageQuickInsert()

const groups: Array<Array<{
  command: MarkdownToolbarCommand
  label: string
  icon: typeof Bold
}>> = [
  [
    { command: `bold`, label: `加粗`, icon: Bold },
    { command: `italic`, label: `斜体`, icon: Italic },
    { command: `strike`, label: `删除线`, icon: Strikethrough },
    { command: `code`, label: `行内代码`, icon: Code2 },
    { command: `link`, label: `链接`, icon: Link2 },
  ],
  [
    { command: `heading-1`, label: `一级标题`, icon: Heading1 },
    { command: `heading-2`, label: `二级标题`, icon: Heading2 },
    { command: `heading-3`, label: `三级标题`, icon: Heading3 },
  ],
  [
    { command: `quote`, label: `引用`, icon: Quote },
    { command: `unordered-list`, label: `无序列表`, icon: List },
    { command: `ordered-list`, label: `有序列表`, icon: ListOrdered },
  ],
]

function runCommand(command: MarkdownToolbarCommand) {
  const view = editorStore.editor
  if (!view)
    return

  const selection = view.state.selection.main
  const result = applyMarkdownCommand(
    view.state.doc.toString(),
    { from: selection.from, to: selection.to },
    command,
  )
  view.dispatch({
    changes: { from: result.from, to: result.to, insert: result.insert },
    selection: result.selection,
    scrollIntoView: true,
  })
  view.focus()
}

function insertImage() {
  uiStore.openUploadImgDialog()
}

function insertImageBatch() {
  openQuickInsert(`upload`)
}

function insertImageByLink() {
  openQuickInsert(`link`)
}

function insertTable() {
  uiStore.toggleShowInsertFormDialog(true)
}

function insertMpCard() {
  uiStore.toggleShowInsertMpCardDialog(true)
}
</script>

<template>
  <nav class="markdown-toolbar" aria-label="Markdown 快捷格式">
    <div class="markdown-toolbar__lead">
      <span>文字工具</span>
      <small>先选中文字，再点格式</small>
    </div>
    <div class="markdown-toolbar__rail">
      <div v-for="(group, groupIndex) in groups" :key="groupIndex" class="markdown-toolbar__group">
        <button
          v-for="item in group"
          :key="item.command"
          type="button"
          class="markdown-toolbar__button"
          :aria-label="item.label"
          :title="item.label"
          @mousedown.prevent
          @click="runCommand(item.command)"
        >
          <component :is="item.icon" class="size-4" />
        </button>
      </div>
      <div class="markdown-toolbar__group markdown-toolbar__group--insert">
        <button
          type="button"
          class="markdown-toolbar__button markdown-toolbar__button--image"
          aria-label="插入图片"
          title="插入图片"
          @mousedown.prevent
          @click="insertImage"
        >
          <ImagePlus class="size-4" />
          <span>插入图片</span>
        </button>
        <button
          type="button"
          class="markdown-toolbar__button"
          title="批量插入图片"
          @mousedown.prevent
          @click="insertImageBatch"
        >
          <ImagePlus class="size-4" />
          <span>批量图片</span>
        </button>
        <button
          type="button"
          class="markdown-toolbar__button"
          title="按链接插入图片"
          @mousedown.prevent
          @click="insertImageByLink"
        >
          <Link2 class="size-4" />
          <span>图片链接</span>
        </button>
        <button
          type="button"
          class="markdown-toolbar__button"
          title="插入表格"
          @mousedown.prevent
          @click="insertTable"
        >
          <Table class="size-4" />
          <span>表格</span>
        </button>
        <button
          type="button"
          class="markdown-toolbar__button"
          title="公众号名片"
          @mousedown.prevent
          @click="insertMpCard"
        >
          <Contact class="size-4" />
          <span>名片</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped lang="less">
.markdown-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid hsl(var(--border) / 0.75);
  background:
    linear-gradient(90deg, hsl(var(--secondary) / 0.52), transparent 24%),
    hsl(var(--background) / 0.88);
}

.markdown-toolbar__lead {
  display: grid;
  flex: 0 0 auto;
  padding-right: 0.8rem;
  border-right: 1px solid hsl(var(--border));
  line-height: 1.15;
}

.markdown-toolbar__lead span {
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  color: hsl(var(--foreground));
}

.markdown-toolbar__lead small {
  margin-top: 0.22rem;
  font-size: 0.62rem;
  color: hsl(var(--muted-foreground));
}

.markdown-toolbar__rail {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.markdown-toolbar__rail::-webkit-scrollbar {
  display: none;
}

.markdown-toolbar__group {
  display: inline-flex;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 9px;
  background: hsl(var(--background));
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.04);
}

.markdown-toolbar__button {
  display: inline-flex;
  height: 2rem;
  min-width: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.45rem;
  border: 0;
  border-left: 1px solid hsl(var(--border));
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, transform 0.14s ease;
}

.markdown-toolbar__button:first-child {
  border-left: 0;
}

.markdown-toolbar__button:hover {
  background: hsl(var(--secondary));
  color: hsl(var(--foreground));
}

.markdown-toolbar__button:active {
  transform: translateY(1px);
}

.markdown-toolbar__button--image {
  padding-inline: 0.65rem;
  color: hsl(var(--primary));
}

.markdown-toolbar__group--insert span {
  font-size: 0.68rem;
  font-weight: 700;
}

@media (max-width: 900px) {
  .markdown-toolbar__lead {
    display: none;
  }
}
</style>
