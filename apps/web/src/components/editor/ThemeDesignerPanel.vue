<script setup lang="ts">
import type { ThemeName } from '@md/shared/configs'
import type { HeadingLevelId } from '@/utils/theme-designer'
import { themeMap, themeOptions, themeOptionsMap } from '@md/shared/configs'
import {
  ArrowLeft,
  Download,
  GitCompareArrows,
  Palette,
  Redo2,
  RotateCcw,
  Save,
  TriangleAlert,
  Undo2,
  Upload,
} from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import { useRenderStore } from '@/stores/render'
import { useThemeDesignerStore } from '@/stores/themeDesigner'
import { useThemeStore } from '@/stores/theme'
import {
  cloneThemeTokens,
  exportCustomThemeAsCSS,
  exportCustomThemeAsJSON,
  HEADING_LEVELS,
  parseCustomThemeFile,
  themeDesignerCategories,
  themeDesignerGroupMap,
} from '@/utils/theme-designer'

const designerStore = useThemeDesignerStore()
const themeStore = useThemeStore()
const editorStore = useEditorStore()
const renderStore = useRenderStore()

const { draft, activeCategory, activeHeadingLevel } = storeToRefs(designerStore)
const { primaryColor } = storeToRefs(themeStore)

const isDiffOpen = ref(false)
const isSaveAsOpen = ref(false)
const saveAsName = ref(``)
const fileInput = useTemplateRef<HTMLInputElement>(`fileInput`)

const headingGroup = computed(() => themeDesignerGroupMap[activeHeadingLevel.value])
const baseThemeLabel = computed(() => themeOptionsMap[draft.value.baseTheme as ThemeName]?.label || draft.value.baseTheme)
const statusText = computed(() => {
  if (designerStore.sourceTheme) {
    return designerStore.isDirty
      ? `${designerStore.sourceTheme.name} · 有未保存改动`
      : `${designerStore.sourceTheme.name} · 已保存`
  }

  return designerStore.hasOverrides
    ? `基于${baseThemeLabel.value} · ${designerStore.modifiedCount} 项未保存调整`
    : `基于${baseThemeLabel.value} · 还没有任何调整`
})

function editorRefresh() {
  themeStore.updateCodeTheme()
  const raw = editorStore.getContent()
  renderStore.render(renderStore.resolvePreviewContent(raw))
}

function baseThemeChanged(value: string) {
  designerStore.setBaseTheme(value)
  themeStore.theme = value as ThemeName
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function getGroup(groupId: string) {
  return themeDesignerGroupMap[groupId]
}

function selectHeadingLevel(level: HeadingLevelId) {
  activeHeadingLevel.value = level
  if (!designerStore.expandedGroups.includes(`heading`)) {
    designerStore.expandedGroups = [...designerStore.expandedGroups, `heading`]
  }
}

function syncHeadingToAll() {
  const source = designerStore.tokens[activeHeadingLevel.value]
  if (!source || !Object.keys(source).length) {
    toast.warning(`当前标题级别还没有任何调整`)
    return
  }

  const next = cloneThemeTokens(designerStore.tokens)
  for (const level of HEADING_LEVELS) {
    next[level] = { ...source }
  }
  designerStore.replaceTokens(next)
  toast.success(`已同步到 H1 - H6`)
}

function applyPalette() {
  designerStore.applyPalette(String(primaryColor.value))
  toast.success(`已按主色重新生成配色`)
}

function resetAll() {
  designerStore.resetAll()
  toast.success(`已清空全部可视化调整`)
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
  toast.success(`主题「${created.name}」已保存，可以在主题列表里找到`)
}

function exportJSON() {
  exportCustomThemeAsJSON({
    id: draft.value.sourceId || `draft`,
    name: draft.value.name || `我的${baseThemeLabel.value}`,
    baseTheme: draft.value.baseTheme,
    tokens: designerStore.tokens,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  toast.success(`已导出 JSON`)
}

function exportCSS() {
  const baseCSS = themeMap[draft.value.baseTheme as ThemeName] || themeMap.default
  exportCustomThemeAsCSS(
    {
      id: draft.value.sourceId || `draft`,
      name: draft.value.name || `我的${baseThemeLabel.value}`,
      baseTheme: draft.value.baseTheme,
      tokens: designerStore.tokens,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    baseCSS,
    baseThemeLabel.value,
  )
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
    toast.error(`解析失败，请确认是主题编辑器导出的 JSON`)
    return
  }

  const created = designerStore.importThemeFile(parsed, draft.value.baseTheme)
  designerStore.loadCustomTheme(created.id)
  themeStore.theme = created.baseTheme as ThemeName
  themeStore.applyCurrentTheme()
  editorRefresh()
  toast.success(`已导入主题「${created.name}」并应用`)
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
      <Button variant="ghost" size="sm" class="size-8 shrink-0 p-0" @click="designerStore.close()">
        <ArrowLeft class="size-4" />
      </Button>
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold">
          主题可视化编辑器
        </div>
        <div class="truncate text-[11px] text-muted-foreground">
          {{ statusText }}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="size-8 shrink-0 p-0"
        :disabled="!designerStore.canUndo"
        title="撤销"
        @click="designerStore.undo()"
      >
        <Undo2 class="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="size-8 shrink-0 p-0"
        :disabled="!designerStore.canRedo"
        title="重做"
        @click="designerStore.redo()"
      >
        <Redo2 class="size-4" />
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="space-y-3 p-3">
        <div class="space-y-2.5 rounded-2xl border bg-muted/20 p-3">
          <div class="space-y-1.5">
            <div class="text-[11px] text-muted-foreground">
              基础主题（在它之上做调整）
            </div>
            <Select :model-value="draft.baseTheme" @update:model-value="value => baseThemeChanged(String(value))">
              <SelectTrigger class="h-8 w-full text-xs">
                <SelectValue placeholder="选择基础主题" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in themeOptions" :key="option.value" :value="option.value" class="text-xs">
                  {{ option.label }}
                  <span class="ml-2 text-muted-foreground">{{ option.desc }}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <div class="text-[11px] text-muted-foreground">
              主题名称
            </div>
            <Input
              :model-value="draft.name"
              class="h-8 text-xs"
              placeholder="例如：我的专栏风格"
              @update:model-value="value => designerStore.setDraftName(String(value))"
            />
          </div>
        </div>

        <div class="space-y-2 rounded-2xl border bg-background/80 p-3">
          <div class="flex items-center gap-2">
            <Palette class="size-3.5 shrink-0 text-muted-foreground" />
            <span class="text-xs font-medium">按主色一键换肤</span>
          </div>
          <p class="text-[11px] leading-4 text-muted-foreground">
            用当前主题色推导标题、引用、表格、链接和代码的配套颜色，全部算成实色，粘贴到公众号也不会掉色。
          </p>
          <div class="flex items-center gap-2">
            <span class="size-4 shrink-0 rounded-full border" :style="{ background: String(primaryColor) }" />
            <span class="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{{ primaryColor }}</span>
            <Button variant="secondary" size="sm" class="h-7 shrink-0 px-2.5 text-[11px]" @click="applyPalette">
              生成配色
            </Button>
          </div>
        </div>

        <Tabs v-model="activeCategory" class="w-full">
          <TabsList class="grid w-full grid-cols-4">
            <TabsTrigger v-for="category in themeDesignerCategories" :key="category.id" :value="category.id" class="text-xs">
              {{ category.label }}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            v-for="category in themeDesignerCategories"
            :key="category.id"
            :value="category.id"
            class="mt-3 space-y-2"
          >
            <template v-for="groupId in category.groupIds" :key="groupId">
              <ThemeDesignerGroupCard v-if="groupId === 'heading'" :group="headingGroup" panel-key="heading">
                <template #before-fields>
                  <div class="space-y-2">
                    <div class="flex flex-wrap gap-1">
                      <Button
                        v-for="level in HEADING_LEVELS"
                        :key="level"
                        size="sm"
                        :variant="activeHeadingLevel === level ? 'default' : 'outline'"
                        class="h-7 flex-1 px-0 text-[11px]"
                        @click="selectHeadingLevel(level)"
                      >
                        {{ level.toUpperCase() }}
                        <span
                          v-if="designerStore.groupCount(level)"
                          class="ml-1 size-1.5 rounded-full"
                          :class="activeHeadingLevel === level ? 'bg-primary-foreground' : 'bg-primary'"
                        />
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" class="h-7 w-full text-[11px]" @click="syncHeadingToAll">
                      把当前级别同步到 H1 - H6
                    </Button>
                  </div>
                </template>
              </ThemeDesignerGroupCard>
              <ThemeDesignerGroupCard v-else-if="getGroup(groupId)" :group="getGroup(groupId)" />
            </template>
          </TabsContent>
        </Tabs>

        <div
          v-if="designerStore.wechatRisks.length"
          class="space-y-1 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <div class="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <TriangleAlert class="size-3.5" />
            {{ designerStore.wechatRisks.length }} 项设置在公众号里可能失效
          </div>
          <p v-for="risk in designerStore.wechatRisks" :key="risk" class="text-[11px] leading-4 text-amber-700/90 dark:text-amber-400/90">
            {{ risk }}
          </p>
        </div>
      </div>
    </div>

    <div class="shrink-0 space-y-2 border-t bg-background/95 p-3">
      <div class="grid grid-cols-4 gap-1.5">
        <Button variant="outline" size="sm" class="h-8 px-0 text-[11px]" @click="isDiffOpen = true">
          <GitCompareArrows class="mr-1 size-3.5" />
          {{ designerStore.modifiedCount }}
        </Button>
        <Button variant="outline" size="sm" class="h-8 px-0 text-[11px]" @click="triggerImport">
          <Upload class="mr-1 size-3.5" />
          导入
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="h-8 w-full px-0 text-[11px]">
              <Download class="mr-1 size-3.5" />
              导出
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="exportCSS">
              导出为 CSS
            </DropdownMenuItem>
            <DropdownMenuItem @click="exportJSON">
              导出为 JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" class="h-8 px-0 text-[11px]" :disabled="!designerStore.hasOverrides" @click="resetAll">
          <RotateCcw class="mr-1 size-3.5" />
          清空
        </Button>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" class="h-8 flex-1 text-xs" @click="openSaveAs">
          另存为新主题
        </Button>
        <Button size="sm" class="h-8 flex-1 text-xs" @click="save">
          <Save class="mr-1 size-3.5" />
          {{ designerStore.sourceTheme ? '保存修改' : '保存主题' }}
        </Button>
      </div>
    </div>

    <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="handleImport">

    <ThemeDesignerDiffDialog v-model:open="isDiffOpen" />

    <Dialog v-model:open="isSaveAsOpen">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>保存为自定义主题</DialogTitle>
          <DialogDescription>
            保存后会出现在样式面板的「我的主题」里，可以随时切换回来。
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <label class="text-sm font-medium">主题名称</label>
          <Input v-model="saveAsName" placeholder="输入主题名称" @keydown.enter="confirmSaveAs" />
          <p class="text-xs text-muted-foreground">
            基于「{{ baseThemeLabel }}」，包含 {{ designerStore.modifiedCount }} 项可视化调整。
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
