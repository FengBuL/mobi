<script setup lang="ts">
import { Archive, Download, FileCode, FileText, FolderInput, FolderKanban, FolderOpen, FolderPlus, Trash2, Upload } from 'lucide-vue-next'
import { useBrowserDraftExportReminder } from '@/composables/useBrowserDraftExportReminder'
import { draftFileSyncKey } from '@/composables/useDraftFileSync'
import { getDesktopBridge } from '@/services/desktop/bridge'
import { useEditorStore } from '@/stores/editor'
import { useExportStore } from '@/stores/export'
import { useFolderSourceStore } from '@/stores/folderSource'
import { useUIStore } from '@/stores/ui'
import { canDeleteDraftDirectory, describeFolderActionDisabledReason, describeFolderPickerBlocker } from '@/utils/draft-folder'

const props = withDefaults(defineProps<{
  asSub?: boolean
}>(), {
  asSub: false,
})

const { asSub } = toRefs(props)

const editorStore = useEditorStore()
const exportStore = useExportStore()
const uiStore = useUIStore()
const folderStore = useFolderSourceStore()
const draftFileSync = inject(draftFileSyncKey)
const { maybeRemind, markExported } = useBrowserDraftExportReminder()
const { currentFolderHandle } = storeToRefs(folderStore)

const folderBlocker = computed(() => describeFolderPickerBlocker({
  hasDesktopFolders: Boolean(getDesktopBridge()?.folders),
  isSecureContext: typeof window !== `undefined` && window.isSecureContext,
  hasDirectoryPicker: typeof window !== `undefined` && `showDirectoryPicker` in window,
  origin: typeof location !== `undefined` ? location.origin : ``,
}))
const hasOpenFolder = computed(() => Boolean(currentFolderHandle.value))
const folderActionReason = computed(() => folderBlocker.value || describeFolderActionDisabledReason(hasOpenFolder.value))
const folderActionsDisabled = computed(() => Boolean(folderActionReason.value))
const openFolderDisabled = computed(() => Boolean(folderBlocker.value))

onMounted(() => {
  maybeRemind()
})

const { isOpenPostSlider, isOpenFolderPanel } = storeToRefs(uiStore)
const { toggleShowImportMdDialog } = uiStore

// Export functions
function exportEditorContent2HTML() {
  exportStore.exportEditorContent2HTML()
}

function exportEditorContent2PureHTML() {
  exportStore.exportEditorContent2PureHTML(editorStore.getContent())
}

function exportEditorContent2MD() {
  exportStore.exportEditorContent2MD(editorStore.getContent())
  markExported()
}

function downloadAsCardImage() {
  exportStore.downloadAsCardImage()
}

function exportEditorContent2PDF() {
  exportStore.exportEditorContent2PDF()
}

function openFolder() {
  isOpenFolderPanel.value = true
}

async function ensureFolderOpen() {
  isOpenFolderPanel.value = true
  if (currentFolderHandle.value) {
    return true
  }
  await folderStore.selectFolder()
  return Boolean(currentFolderHandle.value)
}

async function archiveDraft() {
  if (!(await ensureFolderOpen()) || !draftFileSync) {
    return
  }
  await draftFileSync.archiveCurrentPost()
}

async function createSubfolder() {
  if (!(await ensureFolderOpen())) {
    return
  }
  await nextTick()
  folderStore.createFolderDialogOpen = true
}

async function deleteSelectedSubfolder() {
  if (!(await ensureFolderOpen())) {
    return
  }
  await nextTick()
  const rootPath = folderStore.fileTree[0]?.path ?? ``
  const selectedPath = folderStore.selectedFilePath
  if (!selectedPath || !canDeleteDraftDirectory(rootPath, selectedPath)) {
    toast.error(`先在左边点选要删的子文件夹`)
    return
  }
  folderStore.pendingDeletePath = selectedPath
}

async function moveSelected() {
  if (!(await ensureFolderOpen())) {
    return
  }
  await nextTick()
  const rootPath = folderStore.fileTree[0]?.path ?? ``
  const selectedPath = folderStore.selectedFilePath
  if (!selectedPath || selectedPath === rootPath) {
    toast.error(`先在左边点选要移动的稿或子文件夹`)
    return
  }
  folderStore.pendingMovePath = selectedPath
}
</script>

<template>
  <!-- 作为 MenubarSub 使用 -->
  <MenubarSub v-if="asSub">
    <MenubarSubTrigger>
      文件
    </MenubarSubTrigger>
    <MenubarSubContent class="w-56">
      <MenubarItem :disabled="openFolderDisabled" :title="folderBlocker || undefined" @click="openFolder">
        <FolderOpen class="mr-2 size-4" />
        打开文件夹
      </MenubarItem>
      <MenubarItem
        v-if="folderActionReason"
        disabled
        class="text-xs text-muted-foreground whitespace-normal"
      >
        {{ folderActionReason }}
      </MenubarItem>
      <MenubarItem :disabled="folderActionsDisabled" :title="folderActionReason || undefined" @click="createSubfolder">
        <FolderPlus class="mr-2 size-4" />
        新建子文件夹
      </MenubarItem>
      <MenubarItem :disabled="folderActionsDisabled" :title="folderActionReason || undefined" @click="moveSelected">
        <FolderInput class="mr-2 size-4" />
        移动到…
      </MenubarItem>
      <MenubarItem :disabled="folderActionsDisabled" :title="folderActionReason || undefined" @click="deleteSelectedSubfolder">
        <Trash2 class="mr-2 size-4" />
        删除子文件夹
      </MenubarItem>
      <MenubarItem :disabled="folderActionsDisabled" :title="folderActionReason || undefined" @click="archiveDraft">
        <Archive class="mr-2 size-4" />
        归档这篇
      </MenubarItem>

      <MenubarSeparator />

      <MenubarItem class="text-foreground" @click="toggleShowImportMdDialog(true)">
        <Upload class="mr-2 size-4" />
        导入 Markdown
      </MenubarItem>

      <!-- 导出子菜单 -->
      <MenubarSub>
        <MenubarSubTrigger>
          <Download class="mr-2 size-4" />
          导出
        </MenubarSubTrigger>
        <MenubarSubContent class="w-56">
          <MenubarItem @click="exportEditorContent2MD()">
            <FileText class="mr-2 size-4" />
            Markdown 文件
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem @click="exportEditorContent2HTML()">
            <FileCode class="mr-2 size-4" />
            HTML 文件
          </MenubarItem>
          <MenubarItem @click="exportEditorContent2PureHTML()">
            <FileCode class="mr-2 size-4" />
            HTML（无样式）
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem @click="exportEditorContent2PDF()">
            <FileText class="mr-2 size-4" />
            PDF 文档
          </MenubarItem>
          <MenubarItem @click="downloadAsCardImage()">
            <Download class="mr-2 size-4" />
            PNG 图片
          </MenubarItem>
        </MenubarSubContent>
      </MenubarSub>

      <MenubarSeparator />

      <!-- 内容管理 -->
      <MenubarItem @click="isOpenPostSlider = !isOpenPostSlider">
        <FolderKanban class="mr-2 size-4" />
        内容管理
      </MenubarItem>
    </MenubarSubContent>
  </MenubarSub>

  <!-- 作为 MenubarMenu 使用（默认） -->
  <MenubarMenu v-else>
    <MenubarTrigger>
      文件
    </MenubarTrigger>
    <MenubarContent class="w-56" align="start">
      <MenubarItem :disabled="openFolderDisabled" :title="folderBlocker || undefined" @click="openFolder">
        <FolderOpen class="mr-2 size-4" />
        打开文件夹
      </MenubarItem>
      <MenubarItem
        v-if="folderActionReason"
        disabled
        class="text-xs text-muted-foreground whitespace-normal"
      >
        {{ folderActionReason }}
      </MenubarItem>
      <MenubarItem :disabled="folderActionsDisabled" :title="folderActionReason || undefined" @click="createSubfolder">
        <FolderPlus class="mr-2 size-4" />
        新建子文件夹
      </MenubarItem>
      <MenubarItem :disabled="folderActionsDisabled" :title="folderActionReason || undefined" @click="moveSelected">
        <FolderInput class="mr-2 size-4" />
        移动到…
      </MenubarItem>
      <MenubarItem :disabled="folderActionsDisabled" :title="folderActionReason || undefined" @click="deleteSelectedSubfolder">
        <Trash2 class="mr-2 size-4" />
        删除子文件夹
      </MenubarItem>
      <MenubarItem :disabled="folderActionsDisabled" :title="folderActionReason || undefined" @click="archiveDraft">
        <Archive class="mr-2 size-4" />
        归档这篇
      </MenubarItem>

      <MenubarSeparator />

      <MenubarItem class="text-foreground" @click="toggleShowImportMdDialog(true)">
        <Upload class="mr-2 size-4" />
        导入 Markdown
      </MenubarItem>

      <!-- 导出子菜单 -->
      <MenubarSub>
        <MenubarSubTrigger>
          <Download class="mr-2 size-4" />
          导出
        </MenubarSubTrigger>
        <MenubarSubContent class="w-56">
          <MenubarItem @click="exportEditorContent2MD()">
            <FileText class="mr-2 size-4" />
            Markdown 文件
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem @click="exportEditorContent2HTML()">
            <FileCode class="mr-2 size-4" />
            HTML 文件
          </MenubarItem>
          <MenubarItem @click="exportEditorContent2PureHTML()">
            <FileCode class="mr-2 size-4" />
            HTML（无样式）
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem @click="exportEditorContent2PDF()">
            <FileText class="mr-2 size-4" />
            PDF 文档
          </MenubarItem>
          <MenubarItem @click="downloadAsCardImage()">
            <Download class="mr-2 size-4" />
            PNG 图片
          </MenubarItem>
        </MenubarSubContent>
      </MenubarSub>

      <MenubarSeparator />

      <!-- 内容管理 -->
      <MenubarItem @click="isOpenPostSlider = !isOpenPostSlider">
        <FolderKanban class="mr-2 size-4" />
        内容管理
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</template>
