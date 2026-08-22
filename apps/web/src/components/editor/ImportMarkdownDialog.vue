<script setup lang="ts">
import { FileText, Globe, Loader2, Upload } from 'lucide-vue-next'
import { useMarkdownImportActions } from '@/composables/useMarkdownImportActions'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const { importMarkdownFiles, applyImportedMarkdown } = useMarkdownImportActions()

const { isShowImportMdDialog } = storeToRefs(uiStore)

// 当前选中的 tab
const activeTab = ref<'url' | 'file'>(`file`)

// ==================== 网络链接导入 ====================
const url = ref(``)
const isUrlLoading = ref(false)
const urlError = ref(``)
let abortController: AbortController | null = null

/** 判断链接是否直接指向 Markdown 文件 */
function isMarkdownUrl(rawUrl: string): boolean {
  try {
    const { pathname } = new URL(rawUrl)
    return /\.(?:md|markdown|txt)$/i.test(pathname)
  }
  catch {
    return false
  }
}

/** 直接获取 Markdown 文件内容 */
async function fetchMarkdownFile(rawUrl: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(rawUrl, { signal })
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }
  const content = await response.text()
  if (!content.trim()) {
    throw new Error(`该链接返回的内容为空`)
  }
  return content
}

async function importFromUrl() {
  const rawUrl = url.value.trim()
  if (!rawUrl) {
    urlError.value = `请输入链接`
    return
  }

  if (!URL.canParse(rawUrl) || !/^https?:\/\//i.test(rawUrl)) {
    urlError.value = `请输入有效的 URL 地址（仅支持 http/https）`
    return
  }

  if (!isMarkdownUrl(rawUrl)) {
    urlError.value = `只能导入 .md / .markdown / .txt 的直链，网页请先自行转成 Markdown`
    return
  }

  urlError.value = ``
  isUrlLoading.value = true
  abortController?.abort()
  abortController = new AbortController()
  const { signal } = abortController

  try {
    const content = await fetchMarkdownFile(rawUrl, signal)

    if (!applyImportedMarkdown(content, `未命名`))
      return
    closeDialog()
  }
  catch (err) {
    if ((err as Error).name === `AbortError`)
      return
    urlError.value = (err as Error).message || `导入失败，请检查链接是否有效`
  }
  finally {
    isUrlLoading.value = false
  }
}

// ==================== 本地文件导入 ====================
const isDragover = ref(false)
const { open: openFileDialog, reset: resetFileDialog, onChange: onFileChange } = useFileDialog({
  accept: `.md,.markdown,.txt`,
  multiple: true,
})

onFileChange((files) => {
  if (files == null || files.length === 0)
    return
  handleLocalFiles(Array.from(files))
})

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragover.value = false

  const files = event.dataTransfer?.files
  if (!files || files.length === 0)
    return

  handleLocalFiles(Array.from(files))
}

function handleLocalFiles(files: File[]) {
  importMarkdownFiles(files).then((success) => {
    if (success) {
      closeDialog()
    }
  })
}

// ==================== 对话框控制 ====================
function closeDialog() {
  abortController?.abort()
  abortController = null
  isShowImportMdDialog.value = false
  url.value = ``
  urlError.value = ``
  isUrlLoading.value = false
  isDragover.value = false
  resetFileDialog()
}

function onOpenChange(val: boolean) {
  if (!val) {
    closeDialog()
  }
}

// URL 参数 open 传入的链接：打开对话框时自动填入并执行导入
watch(isShowImportMdDialog, (visible) => {
  if (!visible || !uiStore.importMdOpenUrl)
    return
  const urlToImport = uiStore.importMdOpenUrl
  uiStore.importMdOpenUrl = null
  url.value = urlToImport
  activeTab.value = `url`
  urlError.value = ``
  nextTick(() => importFromUrl())
})
</script>

<template>
  <Dialog :open="isShowImportMdDialog" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>导入 Markdown</DialogTitle>
        <DialogDescription>
          从本地文件或 Markdown 直链导入。只收 .md / .markdown / .txt，公众号文章请先转成 Markdown 再导入。
        </DialogDescription>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="file">
            <span class="inline-flex items-center">
              <Upload class="mr-2 size-4 shrink-0" />
              本地文件
            </span>
          </TabsTrigger>
          <TabsTrigger value="url">
            <span class="inline-flex items-center">
              <Globe class="mr-2 size-4 shrink-0" />
              网络链接
            </span>
          </TabsTrigger>
        </TabsList>

        <!-- 本地文件导入 -->
        <TabsContent value="file" class="mt-4">
          <div
            class="relative flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
            :class="{
              'border-primary bg-primary/5': isDragover,
              'border-muted-foreground/25 hover:border-muted-foreground/50': !isDragover,
            }"
            @click="openFileDialog()"
            @dragover.prevent="isDragover = true"
            @dragleave.prevent="isDragover = false"
            @drop="handleDrop"
          >
            <FileText class="mb-3 size-10 text-muted-foreground" />
            <p class="text-sm text-muted-foreground">
              点击选择文件或拖拽文件到此处
            </p>
            <p class="mt-1 text-xs text-muted-foreground/70">
              支持 .md、.markdown、.txt 格式
            </p>
          </div>
        </TabsContent>

        <!-- 网络链接导入 -->
        <TabsContent value="url" class="mt-4">
          <div class="space-y-4">
            <div class="space-y-2">
              <Input
                v-model="url"
                placeholder="如：https://example.com/notes/article.md"
                :class="{ 'border-destructive': urlError }"
                @keydown.enter="importFromUrl"
                @input="urlError = ``"
              />
              <p v-if="urlError" class="text-xs text-destructive">
                {{ urlError }}
              </p>
              <p v-else class="text-xs text-muted-foreground">
                填 Markdown 文件的直链，支持 .md / .markdown / .txt
              </p>
            </div>
            <Button
              class="w-full"
              :disabled="isUrlLoading || !url.trim()"
              @click="importFromUrl"
            >
              <Loader2 v-if="isUrlLoading" class="mr-2 size-4 animate-spin" />
              {{ isUrlLoading ? '导入中...' : '导入' }}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
