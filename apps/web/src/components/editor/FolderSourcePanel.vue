<script setup lang="ts">
import {
  Archive,
  FolderClosed,
  FolderInput,
  FolderOpen,
  FolderPlus,
  FolderTree as FolderTreeIcon,
  HelpCircle,
  Loader2,
  PanelLeftClose,
  RefreshCw,
  Trash2,
} from 'lucide-vue-next'
import { useBrowserDraftExportReminder } from '@/composables/useBrowserDraftExportReminder'
import { draftFileSyncKey } from '@/composables/useDraftFileSync'
import { useFolderSourceStore } from '@/stores/folderSource'
import { useUIStore } from '@/stores/ui'
import {
  ARCHIVE_FOLDER_NAME,
  canDeleteDraftDirectory,
  collectVisibleFilePaths,
  isArchivedDraftPath,
  isArchiveDirectory,
  listMoveTargets,
  listMoveTargetsForMany,
  nextCheckedPaths,
} from '@/utils/draft-folder'
import FolderTree from './FolderTree.vue'

const folderSourceStore = useFolderSourceStore()
const uiStore = useUIStore()
const draftFileSync = inject(draftFileSyncKey)
const { maybeRemind } = useBrowserDraftExportReminder()
const folderNameDraft = ref(``)
const deleteDialogOpen = ref(false)
const confirmedDeletePath = ref(``)
const moveDialogOpen = ref(false)
const helpDialogOpen = ref(false)
const confirmedMovePaths = ref<string[]>([])
const moveTargetPath = ref(``)
const moveTargets = ref<Array<{ path: string, label: string }>>([])
const checkedPaths = ref<string[]>([])
const checkAnchor = ref<string | null>(null)

const {
  currentFolderHandle,
  fileTree,
  selectedFilePath,
  isLoading,
  loadError,
  isFileSystemAPISupported,
  createFolderDialogOpen,
  pendingDeletePath,
  pendingMovePath,
} = storeToRefs(folderSourceStore)

const expandedPaths = ref<Set<string>>(new Set())
const selectedNode = computed(() => {
  if (!selectedFilePath.value) {
    return null
  }
  return folderSourceStore.findNodeByPath(fileTree.value, selectedFilePath.value)
})
const canDeleteSelectedFolder = computed(() => {
  return selectedNode.value?.type === `directory`
    && canDeleteDraftDirectory(fileTree.value[0]?.path ?? ``, selectedNode.value.path)
})
const canMoveSelected = computed(() => {
  if (checkedPaths.value.length > 0) {
    return true
  }
  const path = selectedNode.value?.path
  const rootPath = fileTree.value[0]?.path ?? ``
  return Boolean(path && path !== rootPath && !isArchiveDirectory(path, rootPath))
})
const checkedCount = computed(() => checkedPaths.value.length)
const rootPath = computed(() => fileTree.value[0]?.path ?? ``)
const checkedAreArchived = computed(() => {
  return checkedCount.value > 0
    && checkedPaths.value.every(path => isArchivedDraftPath(path, rootPath.value))
})
const selectedFileIsArchived = computed(() => {
  return selectedNode.value?.type === `file`
    && isArchivedDraftPath(selectedNode.value.path, rootPath.value)
})
const archiveButtonLabel = computed(() => {
  if (checkedAreArchived.value) {
    return checkedCount.value > 1 ? `取消归档 ${checkedCount.value} 篇` : `取消归档`
  }
  if (checkedCount.value > 1) {
    return `归档选中 ${checkedCount.value} 篇`
  }
  if (selectedFileIsArchived.value) {
    return `取消归档`
  }
  return `归档这篇`
})

// 恢复放在面板挂载时而不是应用启动时：没人看这块面板就没必要去读盘
onMounted(async () => {
  maybeRemind()
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
    await folderSourceStore.reloadCurrentFolder(expandedPaths.value)
  }
}

// 只收起面板，不卸载文件夹：再打开时树还在，不用重新授权也不用重新翻目录
function handleCollapsePanel() {
  uiStore.isOpenFolderPanel = false
}

function applyCheck(path: string, event?: MouseEvent, additive = false) {
  const next = nextCheckedPaths({
    current: checkedPaths.value,
    path,
    visiblePaths: collectVisibleFilePaths(fileTree.value, expandedPaths.value),
    additive: additive || Boolean(event?.metaKey || event?.ctrlKey),
    range: Boolean(event?.shiftKey),
    anchor: checkAnchor.value,
  })
  checkedPaths.value = next.paths
  checkAnchor.value = next.anchor
}

function clearChecked() {
  checkedPaths.value = []
  checkAnchor.value = null
}

function checkVisibleFiles() {
  checkedPaths.value = collectVisibleFilePaths(fileTree.value, expandedPaths.value)
  checkAnchor.value = checkedPaths.value[0] ?? null
}

function handleToggleCheck(node: { path: string }, event: MouseEvent) {
  applyCheck(node.path, event, true)
}

async function handleSelectNode(node: any, event?: MouseEvent) {
  if (node.type === `file` && (event?.metaKey || event?.ctrlKey || event?.shiftKey)) {
    applyCheck(node.path, event)
    folderSourceStore.selectedFilePath = node.path
    return
  }
  if (node.type === `directory`) {
    folderSourceStore.selectedFilePath = node.path
    return
  }
  try {
    if (!draftFileSync) {
      toast.error(`还不能从文件夹导入，请先打开本地文件夹`)
      return
    }
    await draftFileSync.openFileAsDraft(node)
    folderSourceStore.selectedFilePath = node.path
  }
  catch (error) {
    console.error(`打开文件失败:`, error)
  }
}

async function revealPath(path: string) {
  expandAncestors(path)
  const parentPath = path.split(`/`).slice(0, -1).join(`/`)
  const directoryPath = folderSourceStore.findNodeByPath(fileTree.value, path)?.type === `directory`
    ? path
    : parentPath
  const node = folderSourceStore.findNodeByPath(fileTree.value, directoryPath)
  if (node?.type === `directory`) {
    await folderSourceStore.loadDirectoryChildren(node)
    expandedPaths.value.add(node.path)
    expandedPaths.value = new Set(expandedPaths.value)
  }
}

async function handleArchive() {
  if (!draftFileSync) {
    toast.error(`还不能整理文件夹`)
    return
  }
  const moved = await draftFileSync.archiveCurrentPost()
  if (moved) {
    await revealPath(moved)
  }
}

async function handleArchiveFile(path: string) {
  if (!draftFileSync) {
    toast.error(`还不能整理文件夹`)
    return
  }
  const moved = isArchivedDraftPath(path, rootPath.value)
    ? await draftFileSync.unarchiveFile(path)
    : await draftFileSync.archiveFile(path)
  checkedPaths.value = checkedPaths.value.filter(item => item !== path)
  if (moved) {
    await revealPath(moved)
  }
}

async function handleArchiveChecked() {
  if (!draftFileSync) {
    toast.error(`还不能整理文件夹`)
    return
  }
  const paths = [...checkedPaths.value]
  if (paths.length === 0) {
    await handleArchive()
    return
  }
  const moved = await draftFileSync.archiveFiles(paths)
  clearChecked()
  if (moved) {
    await revealPath(moved)
  }
}

async function confirmCreateFolder() {
  if (!draftFileSync) {
    toast.error(`还不能整理文件夹`)
    return
  }
  await draftFileSync.createSubfolder(folderNameDraft.value)
  folderNameDraft.value = ``
  createFolderDialogOpen.value = false
}

function expandAncestors(path: string) {
  const parts = path.split(`/`).filter(Boolean)
  let current = ``
  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    expandedPaths.value.add(current)
  }
  expandedPaths.value = new Set(expandedPaths.value)
}

watch(fileTree, () => {
  void folderSourceStore.restoreExpandedDirectories(expandedPaths.value)
})

watch(selectedFilePath, (path) => {
  if (path) {
    expandAncestors(path)
  }
})

watch(pendingDeletePath, (path) => {
  if (path && !deleteDialogOpen.value) {
    void askDeleteFolder(path)
  }
})

watch(pendingMovePath, (path) => {
  if (path) {
    void openMoveDialog(path)
  }
})

async function askDeleteFolder(path: string) {
  if (!canDeleteDraftDirectory(fileTree.value[0]?.path ?? ``, path)) {
    toast.error(`不能删除已打开的根目录`)
    return
  }
  if (await folderSourceStore.directoryHasMarkdown(path)) {
    toast.error(`这个文件夹里还有稿。请先移动到别处，再删这个空文件夹。`)
    pendingDeletePath.value = ``
    return
  }
  confirmedDeletePath.value = path
  pendingDeletePath.value = path
  deleteDialogOpen.value = true
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false
  pendingDeletePath.value = ``
}

async function confirmDeleteFolder() {
  const path = confirmedDeletePath.value
  if (!draftFileSync || !path) {
    return
  }
  await draftFileSync.deleteSubfolder(path)
  confirmedDeletePath.value = ``
  deleteDialogOpen.value = false
  pendingDeletePath.value = ``
}

async function openMoveDialog(path: string | string[]) {
  const rootPath = fileTree.value[0]?.path ?? ``
  const paths = (Array.isArray(path) ? path : [path]).filter(item => item && item !== rootPath)
  if (paths.length === 0) {
    toast.error(`先点选要移动的稿或子文件夹`)
    return
  }
  const directories = await folderSourceStore.listMoveDirectories()
  const targets = paths.length === 1
    ? listMoveTargets({
        rootPath,
        fromPath: paths[0] ?? ``,
        directories,
      })
    : listMoveTargetsForMany({
        rootPath,
        fromPaths: paths,
        directories,
      })
  if (targets.length === 0) {
    toast.error(`没有可以移到的位置。先新建另一个子文件夹。`)
    pendingMovePath.value = ``
    return
  }
  confirmedMovePaths.value = paths
  pendingMovePath.value = paths[0] ?? ``
  moveTargets.value = targets
  const preferred = targets.find(target => target.label === ARCHIVE_FOLDER_NAME || target.label.endsWith(`/${ARCHIVE_FOLDER_NAME}`))
  moveTargetPath.value = preferred?.path ?? targets[0]?.path ?? ``
  moveDialogOpen.value = true
}

function askMove(path?: string) {
  if (checkedPaths.value.length > 0) {
    void openMoveDialog(checkedPaths.value)
    return
  }
  if (path) {
    void openMoveDialog(path)
  }
}

function closeMoveDialog() {
  moveDialogOpen.value = false
  pendingMovePath.value = ``
}

async function confirmMove() {
  const fromPaths = confirmedMovePaths.value
  const destination = moveTargetPath.value
  if (!draftFileSync || fromPaths.length === 0 || !destination) {
    return
  }
  const moved = fromPaths.length === 1
    ? await draftFileSync.moveEntry(fromPaths[0] ?? ``, destination)
    : await draftFileSync.moveEntries(fromPaths, destination)
  confirmedMovePaths.value = []
  clearChecked()
  closeMoveDialog()
  if (moved) {
    await revealPath(moved)
  }
}

async function handleExportAll() {
  if (!draftFileSync) {
    toast.error(`还不能整理文件夹`)
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
        <div class="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            class="h-7 w-7 p-0"
            title="怎么用本地文件夹"
            @click="helpDialogOpen = true"
          >
            <HelpCircle class="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 w-7 p-0"
            title="收起面板，之后从「文件 → 打开文件夹」打开"
            @click="handleCollapsePanel"
          >
            <PanelLeftClose class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          class="flex-1 text-xs"
          :disabled="isLoading"
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
          title="把编辑器里的稿导出成副本，不改文件夹里已有的文件"
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
      <div v-if="currentFolderHandle" class="mt-1 flex flex-col gap-1">
        <div class="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            class="flex-1 text-xs"
            @click="createFolderDialogOpen = true"
          >
            新建子文件夹
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="flex-1 text-xs"
            :disabled="!canMoveSelected"
            title="先勾选或点选要移动的稿或子文件夹"
            @click="askMove(selectedNode?.path)"
          >
            <FolderInput class="h-3 w-3 mr-1" />
            移动到…
          </Button>
        </div>
        <div class="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            class="flex-1 text-xs"
            @click="checkedCount > 0 ? handleArchiveChecked() : handleArchive()"
          >
            <Archive class="h-3 w-3 mr-1" />
            {{ archiveButtonLabel }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="flex-1 text-xs text-destructive"
            :disabled="!canDeleteSelectedFolder"
            title="空文件夹才能删。里面有稿请先移动。"
            @click="void askDeleteFolder(selectedNode!.path)"
          >
            <Trash2 class="h-3 w-3 mr-1" />
            删除子文件夹
          </Button>
        </div>
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
          稿子存在浏览器里，清缓存会丢。请用 Chrome / Edge 打开本站，不要用局域网地址；或用桌面版。
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
        <p class="text-xs mt-1 mb-3">
          点下面按钮选一个本机目录。打开后可以整理子文件夹；点文件只导入到编辑器，不会改原文件。
        </p>
        <Button
          variant="default"
          size="sm"
          class="text-xs"
          :disabled="isLoading"
          @click="handleSelectFolder"
        >
          打开文件夹
        </Button>
      </div>

      <!-- 文件树 -->
      <div v-else class="file-tree-container">
        <div
          v-if="checkedCount > 0"
          class="mb-2 flex flex-wrap items-center gap-3 px-2 text-sm text-foreground"
        >
          <span>已选 {{ checkedCount }} 篇</span>
          <button type="button" class="underline" @click="checkVisibleFiles">
            全选可见
          </button>
          <button type="button" class="underline" @click="clearChecked">
            取消选择
          </button>
        </div>
        <FolderTree
          :nodes="fileTree"
          :selected-path="selectedFilePath"
          :expanded-paths="expandedPaths"
          :checked-paths="checkedPaths"
          :root-path="rootPath"
          @select="handleSelectNode"
          @toggle-expand="handleToggleExpand"
          @toggle-check="handleToggleCheck"
          @remove="void askDeleteFolder($event.path)"
          @move="askMove($event.path)"
          @archive="void handleArchiveFile($event.path)"
        />
      </div>
    </div>

    <Dialog :open="helpDialogOpen" @update:open="value => helpDialogOpen = value">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            本地文件夹
          </DialogTitle>
        </DialogHeader>
        <p class="text-base leading-7">
          点文件只导入到编辑器，改稿和版式不会写回原文件。勾选多篇可一起归档或移动。
        </p>
        <DialogFooter>
          <Button @click="helpDialogOpen = false">
            知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="createFolderDialogOpen" @update:open="value => createFolderDialogOpen = value">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            新建子文件夹
          </DialogTitle>
          <DialogDescription>
            会建在当前选中的目录下。之后新稿也可以写进这里。
          </DialogDescription>
        </DialogHeader>
        <Input
          v-model="folderNameDraft"
          maxlength="40"
          placeholder="例如：归档、专栏"
          @keyup.enter="confirmCreateFolder"
        />
        <DialogFooter>
          <Button variant="outline" @click="createFolderDialogOpen = false">
            取消
          </Button>
          <Button @click="confirmCreateFolder">
            新建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="deleteDialogOpen" @update:open="value => !value && closeDeleteDialog()">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            删除子文件夹
          </DialogTitle>
          <DialogDescription>
            只删空文件夹。里面还有稿时，请先用「移动到…」把稿挪走，避免磁盘上的文章消失。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="closeDeleteDialog">
            取消
          </Button>
          <Button variant="destructive" @click="confirmDeleteFolder">
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="moveDialogOpen" @update:open="value => !value && closeMoveDialog()">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            移动到…
          </DialogTitle>
          <DialogDescription>
            稿和子文件夹都会一起挪过去，编辑器里的对应关系也会改。
          </DialogDescription>
        </DialogHeader>
        <div class="max-h-56 overflow-y-auto rounded-md border">
          <button
            v-for="target in moveTargets"
            :key="target.path"
            type="button"
            class="flex w-full items-center px-3 py-2 text-left text-sm"
            :class="moveTargetPath === target.path ? 'bg-accent' : 'hover:bg-accent/50'"
            @click="moveTargetPath = target.path"
          >
            {{ target.label }}
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="closeMoveDialog">
            取消
          </Button>
          <Button :disabled="!moveTargetPath" @click="confirmMove">
            移动
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
