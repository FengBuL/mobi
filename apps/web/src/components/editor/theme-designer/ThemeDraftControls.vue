<script setup lang="ts">
import type { ThemeName } from '@md/shared/configs'
import { themeMap, themeOptionsMap } from '@md/shared/configs'
import { Download, GitCompareArrows, Palette, Redo2, RotateCcw, Save, TriangleAlert, Undo2, Upload } from 'lucide-vue-next'
import { useThemeStore } from '@/stores/theme'
import { useThemeDesignerStore } from '@/stores/themeDesigner'
import {
  exportCustomThemeAsCSS,
  exportCustomThemeAsJSON,
  parseCustomThemeFile,
} from '@/utils/theme-designer'

const designerStore = useThemeDesignerStore()
const themeStore = useThemeStore()

const { draft } = storeToRefs(designerStore)
const { primaryColor, theme } = storeToRefs(themeStore)

const isDiffOpen = ref(false)
const isSaveAsOpen = ref(false)
const saveAsName = ref(``)
const fileInput = useTemplateRef<HTMLInputElement>(`fileInput`)

const baseThemeLabel = computed(() => themeOptionsMap[draft.value.baseTheme as ThemeName]?.label || draft.value.baseTheme)

function buildSnapshot() {
  return {
    id: draft.value.sourceId || `draft`,
    name: draft.value.name || `我的${baseThemeLabel.value}`,
    baseTheme: draft.value.baseTheme,
    tokens: designerStore.tokens,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function applyPalette() {
  designerStore.applyPalette(String(primaryColor.value))
  toast.success(`已按主色重新生成配色`)
}

function save() {
  if (!designerStore.hasOverrides) {
    toast.warning(`还没有任何调整，先改点什么再保存`)
    return
  }

  if (designerStore.sourceTheme) {
    designerStore.updateDraftSource()
    toast.success(`主题「${designerStore.sourceTheme.name}」已更新`)
    return
  }

  openSaveAs()
}

function openSaveAs() {
  saveAsName.value = draft.value.name || `我的${baseThemeLabel.value}`
  isSaveAsOpen.value = true
}

function confirmSaveAs() {
  const name = saveAsName.value.trim()
  if (!name) {
    toast.error(`主题名称不能为空`)
    return
  }

  if (designerStore.isNameTaken(name)) {
    toast.error(`已经有同名主题了`)
    return
  }

  const created = designerStore.saveDraftAsNew(name)
  isSaveAsOpen.value = false
  toast.success(`主题「${created.name}」已保存，可以在上面的「我的主题」里找到`)
}

function exportJSON() {
  exportCustomThemeAsJSON(buildSnapshot())
  toast.success(`已导出 JSON`)
}

function exportCSS() {
  const baseCSS = themeMap[draft.value.baseTheme as ThemeName] || themeMap.default
  exportCustomThemeAsCSS(buildSnapshot(), baseCSS, baseThemeLabel.value)
  toast.success(`已导出 CSS`)
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ``

  if (!file)
    return

  const parsed = parseCustomThemeFile(await file.text())
  if (!parsed) {
    toast.error(`解析失败，请确认是本编辑器导出的 JSON`)
    return
  }

  const created = designerStore.importThemeFile(parsed, draft.value.baseTheme)
  designerStore.loadCustomTheme(created.id)
  themeStore.theme = created.baseTheme as ThemeName
  themeStore.applyCurrentTheme()
  toast.success(`已导入主题「${created.name}」并应用`)
}

// 草稿始终跟着当前版式走，换主题时精细调整保留在新版式之上
watch(theme, (value) => {
  designerStore.setBaseTheme(String(value))
})
</script>

<template>
  <div class="style-card space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-sm font-semibold">
          存成我的主题
        </h2>
        <p class="text-xs leading-5 text-muted-foreground">
          下面各页的精细调整会累积在这里，{{ designerStore.modifiedCount }} 项生效中。
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          class="size-8 p-0"
          :disabled="!designerStore.canUndo"
          title="撤销"
          @click="designerStore.undo()"
        >
          <Undo2 class="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="size-8 p-0"
          :disabled="!designerStore.canRedo"
          title="重做"
          @click="designerStore.redo()"
        >
          <Redo2 class="size-3.5" />
        </Button>
      </div>
    </div>

    <Input
      :model-value="draft.name"
      class="h-9 text-sm"
      placeholder="给这套调整起个名字"
      @update:model-value="value => designerStore.setDraftName(String(value))"
    />

    <div class="rounded-xl border p-3">
      <div class="flex items-center gap-2">
        <Palette class="size-4 shrink-0 text-muted-foreground" />
        <span class="text-sm font-medium">按主色一键换肤</span>
        <span class="ml-auto size-4 shrink-0 rounded-full border" :style="{ background: String(primaryColor) }" />
        <Button variant="secondary" size="sm" class="h-7 shrink-0 px-2.5 text-xs" @click="applyPalette">
          生成配色
        </Button>
      </div>
      <p class="mt-2 text-xs leading-5 text-muted-foreground">
        用当前主题色推导标题、引用、表格、链接和代码的配套颜色，全部算成实色，粘贴到公众号也不会掉色。
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <Button variant="outline" size="sm" class="h-8 px-2.5 text-xs" :disabled="!designerStore.hasOverrides" @click="isDiffOpen = true">
        <GitCompareArrows class="mr-1.5 size-3.5" />
        看改动
      </Button>
      <Button variant="outline" size="sm" class="h-8 px-2.5 text-xs" @click="triggerImport">
        <Upload class="mr-1.5 size-3.5" />
        导入
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="h-8 px-2.5 text-xs" :disabled="!designerStore.hasOverrides">
            <Download class="mr-1.5 size-3.5" />
            导出
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem @click="exportCSS">
            导出为 CSS
          </DropdownMenuItem>
          <DropdownMenuItem @click="exportJSON">
            导出为 JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="sm" class="h-8 px-2.5 text-xs" :disabled="!designerStore.hasOverrides" @click="designerStore.resetAll()">
        <RotateCcw class="mr-1.5 size-3.5" />
        清空
      </Button>
    </div>

    <div class="flex gap-2">
      <Button variant="outline" size="sm" class="h-8 flex-1 text-xs" :disabled="!designerStore.hasOverrides" @click="openSaveAs">
        另存为新主题
      </Button>
      <Button size="sm" class="h-8 flex-1 text-xs" @click="save">
        <Save class="mr-1.5 size-3.5" />
        {{ designerStore.sourceTheme ? '保存修改' : '保存主题' }}
      </Button>
    </div>

    <div
      v-if="designerStore.wechatRisks.length"
      class="space-y-1 rounded-xl border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <div class="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
        <TriangleAlert class="size-3.5" />
        {{ designerStore.wechatRisks.length }} 项设置在公众号里可能失效
      </div>
      <p v-for="risk in designerStore.wechatRisks" :key="risk" class="text-[11px] leading-4 text-amber-700/90 dark:text-amber-400/90">
        {{ risk }}
      </p>
    </div>

    <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="handleImport">

    <ThemeDesignerDiffDialog v-model:open="isDiffOpen" />

    <Dialog v-model:open="isSaveAsOpen">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>保存为自定义主题</DialogTitle>
          <DialogDescription>
            保存后会出现在上面的「我的主题」里，可以随时切换回来。
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <label class="text-sm font-medium">主题名称</label>
          <Input v-model="saveAsName" placeholder="输入主题名称" @keydown.enter="confirmSaveAs" />
          <p class="text-xs text-muted-foreground">
            基于「{{ baseThemeLabel }}」，包含 {{ designerStore.modifiedCount }} 项调整。
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isSaveAsOpen = false">
            取消
          </Button>
          <Button @click="confirmSaveAs">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
