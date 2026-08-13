<script setup lang="ts">
import type { WorkspaceMode } from '@/stores/ui'
import { ChevronDown, Copy, Images, Menu, Palette } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEditorCopyActions } from '@/composables/useEditorCopyActions'
import { useUIStore } from '@/stores/ui'
import EditDropdown from './EditDropdown.vue'
import FileDropdown from './FileDropdown.vue'
import FormatDropdown from './FormatDropdown.vue'
import HelpDropdown from './HelpDropdown.vue'
import InsertDropdown from './InsertDropdown.vue'
import StyleDropdown from './StyleDropdown.vue'

const emit = defineEmits([`startCopy`, `endCopy`])

const uiStore = useUIStore()
const { isMobile, isOpenRightSlider, isOpenBlockWorkspace, workspaceMode } = storeToRefs(uiStore)
const { toggleShowImageLayoutDialog } = uiStore

const workspaceModes: Array<{ value: WorkspaceMode, label: string, hint: string }> = [
  { value: `simple`, label: `简洁`, hint: `只留编辑器和预览` },
  { value: `professional`, label: `专业`, hint: `解锁全部面板` },
]

const copyFormats = [
  { mode: `html`, label: `HTML 源码` },
  { mode: `html-without-style`, label: `纯 HTML` },
  { mode: `html-and-style`, label: `带样式 HTML` },
  { mode: `md`, label: `Markdown 源码` },
] as const

// 对话框状态
const aboutDialogVisible = ref(false)
const fundDialogVisible = ref(false)
const editorStateDialogVisible = ref(false)

// 处理帮助菜单事件
function handleOpenAbout() {
  aboutDialogVisible.value = true
}

function handleOpenFund() {
  fundDialogVisible.value = true
}

function handleOpenEditorState() {
  editorStateDialogVisible.value = true
}

function handleOpenMediaLayout() {
  if (isMobile.value) {
    toggleShowImageLayoutDialog(true)
    return
  }

  isOpenBlockWorkspace.value = !isOpenBlockWorkspace.value
}

function handleOpenStyleWorkspace() {
  isOpenRightSlider.value = !isOpenRightSlider.value
}

const { handleCopy, copyToWeChat } = useEditorCopyActions({
  onStart: () => emit(`startCopy`),
  onEnd: () => emit(`endCopy`),
})
</script>

<template>
  <header
    class="header-container h-15 flex flex-wrap items-center justify-between px-5 relative"
  >
    <!-- 桌面端左侧菜单 -->
    <div class="space-x-1 hidden md:flex">
      <Menubar class="menubar border-0">
        <FileDropdown @open-editor-state="handleOpenEditorState" />
        <EditDropdown @copy="handleCopy" />
        <FormatDropdown />
        <InsertDropdown />
        <StyleDropdown />
        <HelpDropdown @open-about="handleOpenAbout" @open-fund="handleOpenFund" />
      </Menubar>
    </div>

    <!-- 移动端汉堡菜单按钮 -->
    <div class="md:hidden">
      <Menubar class="menubar border-0 p-0">
        <MenubarMenu>
          <MenubarTrigger class="p-0">
            <Button variant="outline" size="icon">
              <Menu class="size-4" />
            </Button>
          </MenubarTrigger>
          <MenubarContent align="start">
            <FileDropdown :as-sub="true" @open-editor-state="handleOpenEditorState" />
            <EditDropdown :as-sub="true" @copy="handleCopy" />
            <FormatDropdown :as-sub="true" />
            <InsertDropdown :as-sub="true" />
            <StyleDropdown :as-sub="true" />
            <HelpDropdown :as-sub="true" @open-about="handleOpenAbout" @open-fund="handleOpenFund" />
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>

    <!-- 右侧操作区 -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- 工作区模式 -->
      <div class="mode-switch hidden items-center rounded-lg border bg-muted/50 p-0.5 md:flex">
        <button
          v-for="item in workspaceModes"
          :key="item.value"
          type="button"
          class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          :class="workspaceMode === item.value
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'"
          :title="item.hint"
          @click="uiStore.setWorkspaceMode(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- 复制：主按钮走公众号，其余格式收在下拉里 -->
      <div class="flex overflow-hidden rounded-md shadow-sm">
        <Button class="h-9 rounded-r-none pl-3 pr-3.5" @click="copyToWeChat">
          <Copy class="mr-2 h-4 w-4" />
          <span>复制到公众号</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button class="h-9 rounded-l-none border-l border-primary-foreground/25 px-2" aria-label="其他复制格式">
              <ChevronDown class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuLabel>其他格式</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem v-for="item in copyFormats" :key="item.mode" @click="handleCopy(item.mode)">
              {{ item.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <!-- 板块库，只在专业模式常驻 -->
      <Button
        v-if="workspaceMode === 'professional' && !isMobile"
        variant="outline"
        class="h-9"
        :class="{ 'bg-accent text-accent-foreground': isOpenBlockWorkspace }"
        @click="handleOpenMediaLayout"
      >
        <Images class="mr-2 h-4 w-4" />
        <span>板块库</span>
      </Button>

      <!-- 文章信息（移动端隐藏） -->
      <PostInfo class="hidden md:inline-flex" />

      <!-- 样式面板 -->
      <Button
        variant="outline"
        class="h-9"
        :class="{ 'bg-accent text-accent-foreground': isOpenRightSlider }"
        @click="handleOpenStyleWorkspace"
      >
        <Palette class="mr-2 h-4 w-4" />
        <span>样式</span>
      </Button>
    </div>
  </header>

  <!-- 对话框组件，嵌套菜单无法正常挂载，需要提取层级 -->
  <AboutDialog :visible="aboutDialogVisible" @close="aboutDialogVisible = false" />
  <FundDialog :visible="fundDialogVisible" @close="fundDialogVisible = false" />
  <EditorStateDialog :visible="editorStateDialogVisible" @close="editorStateDialogVisible = false" />
</template>

<style lang="less" scoped>
.header-container {
  background: hsl(var(--background) / 0.95);
  border-bottom: 1px solid hsl(var(--border));
  backdrop-filter: blur(12px);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 50;

  @media (max-width: 768px) {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

.menubar {
  user-select: none;

  :deep([data-radix-menubar-trigger]) {
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.5rem 0.875rem;
    border-radius: 6px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &:hover {
      background: hsl(var(--accent) / 0.8);
      color: hsl(var(--accent-foreground));
      transform: translateY(-1px);
    }

    &[data-state='open'] {
      background: hsl(var(--accent));
      color: hsl(var(--accent-foreground));
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    &:active {
      transform: translateY(0);
    }
  }

  :deep([data-radix-menubar-content]) {
    animation: slideDownAndFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  :deep([data-radix-menubar-item]) {
    border-radius: 4px;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: hsl(var(--accent) / 0.8);
    }
  }

  :deep([data-radix-menubar-sub-trigger]) {
    border-radius: 4px;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: hsl(var(--accent) / 0.8);
    }
  }
}

kbd {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 1.5rem;
  height: 1.375rem;
  border: 1px solid hsl(var(--border));
  background: linear-gradient(to bottom, hsl(var(--muted)), hsl(var(--muted) / 0.9));
  padding: 0 0.375rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  box-shadow: 0 1px 0 hsl(var(--border)), inset 0 0.5px 0 hsl(var(--background));
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

@keyframes slideDownAndFade {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .menubar {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;

    > * {
      width: 100%;
      justify-content: flex-start;
    }
  }
}
</style>
