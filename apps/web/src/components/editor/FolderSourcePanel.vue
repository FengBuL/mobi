<script setup lang="ts">
import {
  FolderClosed,
  FolderOpen,
  FolderPlus,
  FolderTree as FolderTreeIcon,
  Loader2,
  PanelLeftClose,
  RefreshCw,
} from 'lucide-vue-next'
import { draftFileSyncKey } from '@/composables/useDraftFileSync'
import { useFolderSourceStore } from '@/stores/folderSource'
import { useUIStore } from '@/stores/ui'
import FolderTree from './FolderTree.vue'

const folderSourceStore = useFolderSourceStore()
const uiStore = useUIStore()
const draftFileSync = inject(draftFileSyncKey)

const {
  currentFolderHandle,
  fileTree,
  selectedFilePath,
  isLoading,
  loadError,
  isFileSystemAPISupported,
} = storeToRefs(folderSourceStore)

const expandedPaths = ref<Set<string>>(new Set())

// 恢复放在面板挂载时而不是应用启动时：没人看这块面板就没必要去读盘
onMounted(async () => {
  await folderSourceStore.restoreSavedFolders()
  if (fileTree.value.length > 0) {
    expandedPaths.value.add(fileTree.value[0].path)
  }
})

async function handleToggleExpand(path: string) {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path)
  }
  else {
    const node = folderSourceStore.findNodeByPath(fileTree.value, path)
    if (node?.type === `directory`) {
      try {
        await folderSourceStore.loadDirectoryChildren(node)
      }
      catch (error) {
        toast.error(`读取子文件夹失败：${(error as Error).message}`)
        return
      }
    }
    expandedPaths.value.add(path)
  }
  // 触发响应式更新
  expandedPaths.value = new Set(expandedPaths.value)
}

async function handleSelectFolder() {
  await folderSourceStore.selectFolder()
  // 等待下一个 tick，确保 fileTree 已经更新
  await nextTick()
  // 展开根节点
  if (fileTree.value.length > 0) {
    expandedPaths.value.add(fileTree.value[0].path)
  }
}

async function handleRefreshFolder() {
  if (currentFolderHandle.value) {
    await folderSourceStore.reloadCurrentFolder()
  }
}

// 只收起面板，不卸载文件夹：再打开时树还在，不用重新授权也不用重新翻目录
function handleCollapsePanel() {
  uiStore.isOpenFolderPanel = false
}

async function handleOpenFile(node: any) {
  try {
    if (!draftFileSync) {
      toast.error(`还不能写回文件夹，请从编辑器里打开本地文件夹`)
      return
    }
    await draftFileSync.openFileAsDraft(node)
    folderSourceStore.selectedFilePath = node.path
  }
  catch (error) {
    console.error(`打开文件失败:`, error)
  }
}

async function handleExportAll() {
  if (!draftFileSync) {
    toast.error(`还不能写回文件夹`)
    return
  }
  await draftFileSync.exportAllPostsToFolder()
}
</script>

<template>
  <div class="folder-source-panel h-full flex flex-col">
    <!-- 头部工具栏 -->
    <div class="panel-header sticky top-0 z-10 bg-background border-b p-2">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold flex items-center gap-2">
          <FolderTreeIcon class="h-4 w-4" />
          本地文件夹
        </h3>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0"
          title="收起面板，之后从「文件 → 本地文件夹」打开"
          @click="handleCollapsePanel"
        >
          <PanelLeftClose class="h-3.5 w-3.5" />
        </Button>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          class="flex-1 text-xs"
          :disabled="isLoading || !isFileSystemAPISupported"
          @click="handleSelectFolder"
        >
          <FolderPlus v-if="!isLoading" class="h-3 w-3 mr-1" />
          <Loader2 v-else class="h-3 w-3 mr-1 animate-spin" />
          打开文件夹
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="!isFileSystemAPISupported"
          title="把浏览器里的旧稿全部写成这个文件夹里的文件"
          @click="handleExportAll"
        >
          全部写出
        </Button>

        <Button
          v-if="currentFolderHandle"
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="isLoading"
          @click="handleRefreshFolder"
        >
          <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': isLoading }" />
        </Button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="panel-content flex-1 overflow-y-auto p-2">
      <!-- 不支持 API 的提示 -->
      <div
        v-if="!isFileSystemAPISupported"
        class="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground"
      >
        <FolderClosed class="h-12 w-12 mb-2 opacity-50" />
        <p class="text-sm">
          这个浏览器不能把稿子写成文件夹里的文件
        </p>
        <p class="text-xs mt-1">
          稿子存在浏览器里，清缓存会丢，建议定期导出。请改用 Chrome / Edge，或用桌面版。
        </p>
      </div>

      <!-- 加载中 -->
      <div
        v-else-if="isLoading"
        class="flex flex-col items-center justify-center h-full"
      >
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
        <p class="text-sm text-muted-foreground mt-2">
          加载中...
        </p>
      </div>

      <!-- 错误提示 -->
      <div
        v-else-if="loadError"
        class="flex flex-col items-center justify-center h-full text-center p-4 text-destructive"
      >
        <p class="text-sm">
          {{ loadError }}
        </p>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!currentFolderHandle"
        class="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground"
      >
        <FolderOpen class="h-12 w-12 mb-2 opacity-50" />
        <p class="text-sm">
          未打开文件夹
        </p>
        <p class="text-xs mt-1">
          打开后，每篇稿会写成这个文件夹里的 Markdown 文件
        </p>
      </div>

      <!-- 文件树 -->
      <div v-else class="file-tree-container">
        <div class="text-xs text-muted-foreground mb-2 px-2 flex items-center justify-between gap-2">
          <span class="truncate">{{ currentFolderHandle.name }}</span>
          <Button
            variant="ghost"
            size="sm"
            class="h-6 px-1.5 text-xs shrink-0"
            @click="handleExportAll"
          >
            全部写出
          </Button>
        </div>
        <FolderTree
          :nodes="fileTree"
          :selected-path="selectedFilePath"
          :expanded-paths="expandedPaths"
          @select="handleOpenFile"
          @toggle-expand="handleToggleExpand"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-source-panel {
  background-color: hsl(var(--background));
}

.panel-header {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.panel-content {
  min-height: 0;
}

.file-tree-container {
  min-height: 100%;
}
</style>
