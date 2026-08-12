<script setup lang="ts">
import type { ThemeName } from '@md/shared'
import { exportMergedTheme } from '@md/core'
import { themeMap, themeOptions, themeOptionsMap } from '@md/shared'
import { Download, Edit3, Ellipsis, Eye, Plus, SlidersHorizontal, X } from 'lucide-vue-next'
import { useCssEditorStore } from '@/stores/cssEditor'
import { useEditorStore } from '@/stores/editor'
import { useRenderStore } from '@/stores/render'
import { useThemeDesignerStore } from '@/stores/themeDesigner'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'
import { copyPlain } from '@/utils/clipboard'

const cssEditorStore = useCssEditorStore()
const themeDesignerStore = useThemeDesignerStore()
const uiStore = useUIStore()
const renderStore = useRenderStore()
const editorStore = useEditorStore()
const themeStore = useThemeStore()
const firstTheme = themeOptions[0]?.value ?? `default`

const { isMobile } = storeToRefs(uiStore)
const { cssContentConfig } = storeToRefs(cssEditorStore)

// 控制是否启用动画
const enableAnimation = ref(false)

// 监听 CssEditor 开关状态变化
watch(() => uiStore.isShowCssEditor, () => {
  if (isMobile.value) {
    // 在移动端,用户操作时启用动画
    enableAnimation.value = true
  }
})

// 监听设备类型变化，重置动画状态
watch(() => isMobile.value, () => {
  enableAnimation.value = false
})

const isOpenEditDialog = ref(false)
const editInputVal = ref(``)

// 滚动到活跃的 tab
async function scrollToActiveTab() {
  await nextTick()
  const activeTab = document.querySelector('.cssEditor-wrapper .css-tab-active')
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }
}

function rename(name: string) {
  editInputVal.value = name
  isOpenEditDialog.value = true
}

function editTabName() {
  if (!(editInputVal.value).trim()) {
    toast.error(`新建失败，方案名不可为空`)
    return
  }

  if (!cssEditorStore.validatorTabName(editInputVal.value)) {
    toast.error(`不能与现有方案重名`)
    return
  }
  cssEditorStore.renameTab(editInputVal.value)
  isOpenEditDialog.value = false
  toast.success(`修改成功`)
}

const isOpenAddDialog = ref(false)

const addInputVal = ref(``)
// 新建方案时选择的基础主题
const baseThemeForNew = ref<'blank' | ThemeName>(`blank`)

async function addTab() {
  if (!(addInputVal.value).trim()) {
    toast.error(`新建失败，方案名不可为空`)
    return
  }

  if (!cssEditorStore.validatorTabName(addInputVal.value)) {
    toast.error(`不能与现有方案重名`)
    return
  }

  // 根据选择的基础主题来初始化内容
  let initialContent = ''
  if (baseThemeForNew.value === 'blank') {
    initialContent = '' // 空白方案
  }
  else {
    // 基于内置主题
    initialContent = themeMap[baseThemeForNew.value]
  }

  const newTabName = addInputVal.value

  // addCssContentTab 会自动设置 active 并触发回调
  cssEditorStore.addCssContentTab(newTabName, initialContent)

  isOpenAddDialog.value = false
  toast.success(`新建成功`)

  // 重置为空白
  baseThemeForNew.value = 'blank'

  // 滚动到新创建的 tab
  scrollToActiveTab()
}

const isOpenDelTabConfirmDialog = ref(false)
const delTargetName = ref(``)

function removeHandler(targetName: string) {
  delTargetName.value = targetName
  isOpenDelTabConfirmDialog.value = true
}

function delTab() {
  const tabs = cssContentConfig.value.tabs
  if (tabs.length === 1) {
    toast.warning(`至少保留一个方案`)
    return
  }

  let activeName = cssContentConfig.value.active
  if (activeName === delTargetName.value) {
    tabs.forEach((tab, index) => {
      if (tab.name === delTargetName.value) {
        const nextTab = tabs[index + 1] || tabs[index - 1]
        if (nextTab) {
          activeName = nextTab.name
        }
      }
    })
  }

  cssEditorStore.tabChanged(activeName)
  cssContentConfig.value.tabs = tabs.filter(tab => tab.name !== delTargetName.value)

  toast.success(`删除成功`)
}

function addHandler() {
  addInputVal.value = `方案${cssContentConfig.value.tabs.length + 1}`
  baseThemeForNew.value = 'blank' // 重置选择
  isOpenAddDialog.value = true
}

// 查看内置主题功能
const isOpenViewThemeDialog = ref(false)
const selectedViewTheme = ref<ThemeName>(firstTheme)

// 打开查看内置主题对话框
function openViewThemeDialog() {
  selectedViewTheme.value = firstTheme
  isOpenViewThemeDialog.value = true
}

// 复制主题 CSS
async function copyThemeCSS() {
  const css = themeMap[selectedViewTheme.value]
  await copyPlain(css)
  toast.success('已复制到剪贴板')
}

// 基于当前查看的主题新建方案
function createFromViewTheme() {
  isOpenViewThemeDialog.value = false
  // 设置基础主题并打开新建对话框
  baseThemeForNew.value = selectedViewTheme.value
  addInputVal.value = `基于${themeOptionsMap[selectedViewTheme.value].label}主题`
  isOpenAddDialog.value = true
}

function openThemeDesigner() {
  themeDesignerStore.open()
  uiStore.isOpenRightSlider = true
}

function tabChanged(tabName: string | number) {
  console.log(`tabChanged`, tabName)
  cssEditorStore.tabChanged(tabName as string)
  // 切换后滚动到活跃的 tab
  scrollToActiveTab()
}

// 初始化 CSS 编辑器
onMounted(() => {
  // CSS 内容更新回调
  const handleCssUpdate = () => {
    // 1. 使用新主题系统应用 CSS
    themeStore.applyCurrentTheme()

    // 2. 触发编辑器刷新，重新渲染内容
    themeStore.updateCodeTheme()
    const raw = editorStore.getContent()
    renderStore.render(renderStore.resolvePreviewContent(raw))
  }

  // 设置切换方案时的回调（与编辑时使用相同的逻辑）
  cssEditorStore.setOnTabChangedCallback(handleCssUpdate)

  // 初始化 CSS 编辑器
  cssEditorStore.initCssEditor(handleCssUpdate)

  // 初始化时滚动到活跃的 tab
  scrollToActiveTab()
})

// 导出合并后的主题
function exportCurrentTheme() {
  const currentTab = cssContentConfig.value.tabs.find(tab => tab.name === cssContentConfig.value.active)
  if (!currentTab) {
    toast.error(`未找到当前方案`)
    return
  }

  const currentThemeName = currentTab.title || currentTab.name

  const baseTheme = themeMap[themeStore.theme] || themeMap.default

  exportMergedTheme(
    currentTab.content,
    baseTheme,
    {
      primaryColor: themeStore.primaryColor,
      fontFamily: themeStore.fontFamily,
      fontSize: themeStore.fontSize,
    },
    currentThemeName,
  )
}
</script>

<template>
  <!-- 移动端遮罩层 -->
  <div
    v-if="isMobile && uiStore.isShowCssEditor"
    class="fixed inset-0 bg-black/50 z-40"
    @click="uiStore.isShowCssEditor = false"
  />

  <div
    v-show="isMobile ? uiStore.isShowCssEditor : true"
    class="cssEditor-wrapper h-full flex flex-col overflow-y-auto"
    :class="{
      'fixed top-0 right-0 w-full h-full z-100 bg-background border-l shadow-lg mobile-css-editor': isMobile,
      'animate': isMobile && enableAnimation,
    }"
    :style="isMobile ? { transform: uiStore.isShowCssEditor ? 'translateX(0)' : 'translateX(100%)' } : undefined"
  >
    <!-- Tab 栏 + 工具栏合并 -->
    <div class="flex items-center h-9 px-2 shrink-0 border-b border-border">
      <div class="flex-1 flex items-center gap-0 overflow-x-auto custom-scrollbar min-w-0 h-full">
        <button
          v-for="item in cssContentConfig.tabs"
          :key="item.name"
          class="group/tab relative flex items-center gap-1.5 shrink-0 h-full px-3 text-xs transition-colors duration-150"
          :class="{
            'css-tab-active text-foreground font-medium': cssContentConfig.active === item.name,
            'text-muted-foreground hover:text-foreground': cssContentConfig.active !== item.name,
          }"
          @click="tabChanged(item.name)"
        >
          <span class="truncate max-w-[100px]">{{ item.title }}</span>

          <!-- 活跃 tab 下划线指示器 -->
          <span
            v-if="cssContentConfig.active === item.name"
            class="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary"
          />

          <!-- 活跃 tab 操作: 更多菜单 -->
          <DropdownMenu v-if="cssContentConfig.active === item.name">
            <DropdownMenuTrigger as-child>
              <span
                class="inline-flex items-center justify-center size-4 rounded text-muted-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-100 cursor-pointer"
                @click.stop
              >
                <Ellipsis class="size-3" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" class="w-32">
              <DropdownMenuItem @click.stop="rename(item.name)">
                <Edit3 class="mr-2 size-4" /> 重命名
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                v-if="cssContentConfig.tabs.length > 1"
                class="text-destructive focus:text-destructive"
                @click.stop="removeHandler(item.name)"
              >
                <X class="mr-2 size-4" /> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </button>
      </div>

      <!-- 工具按钮组 -->
      <div class="flex items-center shrink-0">
        <!-- 新增 Tab -->
        <button
          class="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          @click="addHandler"
        >
          <Plus class="size-3.5" />
        </button>

        <!-- 内置主题 -->
        <button
          class="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          @click="openViewThemeDialog"
        >
          <Eye class="size-3.5" />
        </button>

        <!-- 导出主题 -->
        <button
          class="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          @click="exportCurrentTheme"
        >
          <Download class="size-3.5" />
        </button>

        <!-- 移动端关闭 -->
        <button
          v-if="isMobile"
          class="inline-flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          @click="uiStore.isShowCssEditor = false"
        >
          <X class="size-3.5" />
        </button>
      </div>
    </div>

    <!-- 可视化编辑器的覆盖层在这份 CSS 之前应用，说明一下优先级关系 -->
    <div
      v-if="themeDesignerStore.hasOverrides"
      class="flex shrink-0 items-center gap-2 border-b bg-muted/30 px-3 py-1.5"
    >
      <SlidersHorizontal class="size-3 shrink-0 text-muted-foreground" />
      <span class="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
        可视化编辑器有 {{ themeDesignerStore.modifiedCount }} 项调整先于这里生效，这里写的 CSS 优先级更高
      </span>
      <button
        class="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="openThemeDesigner"
      >
        去调整
      </button>
    </div>

    <!-- CSS编辑器内容区域 -->
    <div class="flex-1 min-h-0">
      <textarea
        id="cssEditor"
        type="textarea"
        placeholder="Your custom css here."
      />
    </div>

    <!-- 新增弹窗 -->
    <Dialog v-model:open="isOpenAddDialog">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新建自定义 CSS</DialogTitle>
          <DialogDescription>
            请输入方案名称，并选择初始模板
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">方案名称</label>
            <Input v-model="addInputVal" placeholder="输入方案名称" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">初始模板</label>
            <Select v-model="baseThemeForNew">
              <SelectTrigger>
                <SelectValue placeholder="选择初始模板" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">
                  空白方案
                </SelectItem>
                <SelectItem
                  v-for="{ label, value } in themeOptions"
                  :key="value"
                  :value="value"
                >
                  基于{{ label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              选择一个内置主题作为起点，可以在其基础上进行修改
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isOpenAddDialog = false">
            取消
          </Button>
          <Button @click="addTab()">
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 重命名弹窗 -->
    <Dialog v-model:open="isOpenEditDialog">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑方案名称</DialogTitle>
          <DialogDescription>
            请输入新的方案名称
          </DialogDescription>
        </DialogHeader>
        <Input v-model="editInputVal" />
        <DialogFooter>
          <Button variant="outline" @click="isOpenEditDialog = false">
            取消
          </Button>
          <Button @click="editTabName">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="isOpenDelTabConfirmDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>提示</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将删除该自定义方案，是否继续？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="delTab">
            确定
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>

  <!-- 查看内置主题对话框 -->
  <Dialog v-model:open="isOpenViewThemeDialog">
    <DialogContent class="sm:max-w-4xl max-h-[90vh] flex flex-col" @open-auto-focus.prevent>
      <DialogHeader>
        <DialogTitle>查看内置主题样式</DialogTitle>
        <DialogDescription>
          查看并复制内置主题的 CSS 代码，或基于它们创建新方案
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 flex-1 min-h-0 flex flex-col">
        <!-- 主题选择器 -->
        <div class="space-y-2">
          <label class="text-sm font-medium">选择主题</label>
          <Select v-model="selectedViewTheme">
            <SelectTrigger class="w-full mt-2 sm:w-[200px] focus-visible:ring-0 focus-visible:ring-offset-0">
              <SelectValue placeholder="选择主题" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="{ label, value } in themeOptions"
                :key="value"
                :value="value"
              >
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- CSS 代码查看器 -->
        <div class="flex-1 min-h-0 border rounded-lg overflow-auto">
          <pre class="h-full overflow-auto p-4 bg-muted text-sm"><code>{{ themeMap[selectedViewTheme] }}</code></pre>
        </div>
      </div>

      <DialogFooter class="flex-col sm:flex-row gap-2">
        <Button variant="outline" @click="isOpenViewThemeDialog = false">
          关闭
        </Button>
        <Button variant="outline" @click="copyThemeCSS">
          复制全部
        </Button>
        <Button variant="outline" @click="createFromViewTheme">
          基于此主题新建
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style lang="less" scoped>
/* 隐藏滚动条但保持滚动功能 */
.custom-scrollbar {
  /* Firefox */
  scrollbar-width: none;

  /* Chrome, Edge, Safari */
  &::-webkit-scrollbar {
    display: none;
  }
}

/* 移动端CSS编辑器动画 - 只有添加了 animate 类才启用 */
.mobile-css-editor.animate {
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
