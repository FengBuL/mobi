<script setup lang="ts">
import { altSign, ctrlSign, shiftSign } from '@mobi/shared/configs'
import {
  Images,
  Redo2,
  Replace,
  Search,
  Undo2,
  WandSparkles,
} from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import { usePostStore } from '@/stores/post'
import { useUIStore } from '@/stores/ui'

const props = withDefaults(defineProps<{
  asSub?: boolean
}>(), {
  asSub: false,
})

const { asSub } = toRefs(props)

const editorStore = useEditorStore()
const postStore = usePostStore()
const uiStore = useUIStore()

const { editor } = storeToRefs(editorStore)

// Format content function
async function formatContent() {
  const doc = await editorStore.formatContent()
  if (doc && postStore.currentPost) {
    postStore.updatePostContent(postStore.currentPostId, doc)
  }
}

// Search/Replace - 使用项目已有的 SearchTab 组件
function openSearch() {
  if (editor.value) {
    const selection = editor.value.state.selection.main
    const selected = editor.value.state.doc.sliceString(selection.from, selection.to).trim()

    uiStore.openSearchTab(selected)
  }
}

function openReplace() {
  if (editor.value) {
    const selection = editor.value.state.selection.main
    const selected = editor.value.state.doc.sliceString(selection.from, selection.to).trim()

    uiStore.openSearchTab(selected, true)
  }
}

function openBlockLibrary() {
  uiStore.toggleBlockLibrary()
}

function undoEdit() {
  editorStore.undoEdit()
}

function redoEdit() {
  editorStore.redoEdit()
}
</script>

<template>
  <!-- 作为 MenubarSub 使用 -->
  <MenubarSub v-if="asSub">
    <MenubarSubTrigger>
      编辑
    </MenubarSubTrigger>
    <MenubarSubContent class="w-64">
      <MenubarItem @click="undoEdit()">
        <Undo2 class="mr-2 h-4 w-4" />
        撤销
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ ctrlSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">Z</kbd>
        </MenubarShortcut>
      </MenubarItem>
      <MenubarItem @click="redoEdit()">
        <Redo2 class="mr-2 h-4 w-4" />
        重做
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ ctrlSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ shiftSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">Z</kbd>
        </MenubarShortcut>
      </MenubarItem>

      <MenubarSeparator />

      <MenubarItem @click="formatContent()">
        <WandSparkles class="mr-2 h-4 w-4" />
        格式化文档
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ altSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ shiftSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">F</kbd>
        </MenubarShortcut>
      </MenubarItem>

      <MenubarSeparator />

      <MenubarItem @click="openSearch()">
        <Search class="mr-2 h-4 w-4" />
        查找
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ ctrlSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">F</kbd>
        </MenubarShortcut>
      </MenubarItem>
      <MenubarItem @click="openReplace()">
        <Replace class="mr-2 h-4 w-4" />
        替换
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ ctrlSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">H</kbd>
        </MenubarShortcut>
      </MenubarItem>

      <MenubarSeparator />

      <MenubarItem @click="openBlockLibrary()">
        <Images class="mr-2 h-4 w-4" />
        换样子
      </MenubarItem>
    </MenubarSubContent>
  </MenubarSub>

  <!-- 作为 MenubarMenu 使用（默认） -->
  <MenubarMenu v-else>
    <MenubarTrigger>
      编辑
    </MenubarTrigger>
    <MenubarContent class="w-64" align="start">
      <MenubarItem @click="undoEdit()">
        <Undo2 class="mr-2 h-4 w-4" />
        撤销
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ ctrlSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">Z</kbd>
        </MenubarShortcut>
      </MenubarItem>
      <MenubarItem @click="redoEdit()">
        <Redo2 class="mr-2 h-4 w-4" />
        重做
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ ctrlSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ shiftSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">Z</kbd>
        </MenubarShortcut>
      </MenubarItem>

      <MenubarSeparator />

      <MenubarItem @click="formatContent()">
        <WandSparkles class="mr-2 h-4 w-4" />
        格式化文档
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ altSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ shiftSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">F</kbd>
        </MenubarShortcut>
      </MenubarItem>

      <MenubarSeparator />

      <MenubarItem @click="openSearch()">
        <Search class="mr-2 h-4 w-4" />
        查找
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ ctrlSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">F</kbd>
        </MenubarShortcut>
      </MenubarItem>
      <MenubarItem @click="openReplace()">
        <Replace class="mr-2 h-4 w-4" />
        替换
        <MenubarShortcut>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">{{ ctrlSign }}</kbd>
          <kbd class="mx-1 bg-gray-2 dark:bg-stone-9">H</kbd>
        </MenubarShortcut>
      </MenubarItem>

      <MenubarSeparator />

      <MenubarItem @click="openBlockLibrary()">
        <Images class="mr-2 h-4 w-4" />
        换样子
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</template>
