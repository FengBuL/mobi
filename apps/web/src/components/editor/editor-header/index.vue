<script setup lang="ts">
import type { WorkspaceMode } from '@/stores/ui'
import { ChevronDown, Copy, Menu, MonitorDown, Palette } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEditorCopyActions } from '@/composables/useEditorCopyActions'
import { isDesktopRuntime } from '@/services/desktop/bridge'
import { usePostStore } from '@/stores/post'
import { useRenderStore } from '@/stores/render'
import { useUIStore } from '@/stores/ui'
import { countUnsafeClipboardImagesFromHtml, resolveLostImageHint } from '@/utils/clipboard-image-status'
import { openDesktopDownload } from '@/utils/desktop-download'
import { store } from '@/utils/storage'
import EditDropdown from './EditDropdown.vue'
import FileDropdown from './FileDropdown.vue'
import HelpDropdown from './HelpDropdown.vue'
import MarkdownGuideDialog from './MarkdownGuideDialog.vue'
import SettingsDropdown from './SettingsDropdown.vue'

const emit = defineEmits([`startCopy`, `endCopy`])

const uiStore = useUIStore()
const { isOpenRightSlider, workspaceMode, isMobile } = storeToRefs(uiStore)

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
const markdownGuideDialogVisible = ref(false)

// 处理帮助菜单事件
function handleOpenAbout() {
  aboutDialogVisible.value = true
}

function handleOpenMarkdownGuide() {
  markdownGuideDialogVisible.value = true
}

function handleOpenStyleWorkspace() {
  isOpenRightSlider.value = !isOpenRightSlider.value
}

const { handleCopy, copyToWeChat } = useEditorCopyActions({
  onStart: () => emit(`startCopy`),
  onEnd: () => emit(`endCopy`),
})

const renderStore = useRenderStore()
const postStore = usePostStore()
const isDesktopApp = isDesktopRuntime()
const { output } = storeToRefs(renderStore)
const { currentPostId } = storeToRefs(postStore)
const imgHost = store.reactive(`imgHost`, `default`)
const hintEpoch = ref(0)
const outputEpoch = ref(0)
watch(currentPostId, () => {
  hintEpoch.value += 1
})
watch(output, () => {
  outputEpoch.value = hintEpoch.value
}, { immediate: true })
const lostImageCount = computed(() => countUnsafeClipboardImagesFromHtml(output.value))
const lostImageHint = computed(() => resolveLostImageHint({
  outputMatchesCurrentPost: outputEpoch.value === hintEpoch.value,
  count: lostImageCount.value,
  imgHost: imgHost.value,
}))
</script>

<template>
  <header
    class="header-container h-15 flex flex-wrap items-center justify-between px-5 relative"
  >
    <!-- 桌面端左侧菜单 -->
    <div class="hidden items-center md:flex">
      <Menubar class="menubar border-0">
        <FileDropdown />
        <EditDropdown />
        <SettingsDropdown />
        <HelpDropdown @open-about="handleOpenAbout" @open-markdown-guide="handleOpenMarkdownGuide" />
      </Menubar>
      <button
        v-if="!isDesktopApp"
        type="button"
        class="download-entry"
        @click="openDesktopDownload()"
      >
        下载桌面版
      </button>
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
            <FileDropdown :as-sub="true" />
            <EditDropdown :as-sub="true" />
            <SettingsDropdown :as-sub="true" />
            <HelpDropdown :as-sub="true" @open-about="handleOpenAbout" @open-markdown-guide="handleOpenMarkdownGuide" />
            <MenubarItem v-if="!isDesktopApp" @click="openDesktopDownload()">
              <MonitorDown class="mr-2 h-4 w-4" />
              下载桌面版
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>

    <!-- 右侧操作区 -->
    <div class="flex flex-wrap items-center gap-2">
      <span
        v-if="lostImageHint"
        class="max-w-40 text-xs leading-4 text-muted-foreground"
      >
        {{ lostImageHint }}
      </span>

      <!-- 工作区模式：选中的一项直接上墨，不做胶囊 -->
      <div class="mode-switch hidden items-center md:flex">
        <button
          v-for="item in workspaceModes"
          :key="item.value"
          type="button"
          class="border border-border px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md not-first:-ml-px"
          :class="workspaceMode === item.value
            ? 'relative z-10 border-foreground bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'"
          :title="item.hint"
          @click="uiStore.setWorkspaceMode(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- 复制：主按钮走公众号，其余格式收在下拉里 -->
      <div class="flex items-center gap-2">
        <div class="flex overflow-hidden rounded-md">
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
      </div>

      <!-- 简洁模式只留预览主题条上的「全局样式」，避免顶栏再开一扇门 -->
      <Button
        v-if="workspaceMode === 'professional' && !isMobile"
        variant="outline"
        class="h-9"
        :class="{ 'border-foreground/45 bg-foreground/[0.06] text-foreground': isOpenRightSlider }"
        type="button"
        @click.prevent.stop="handleOpenStyleWorkspace"
      >
        <Palette class="mr-2 h-4 w-4" />
        <span>样式</span>
      </Button>
    </div>
  </header>

  <!-- 对话框组件，嵌套菜单无法正常挂载，需要提取层级 -->
  <AboutDialog :visible="aboutDialogVisible" @close="aboutDialogVisible = false" />
  <MarkdownGuideDialog :visible="markdownGuideDialogVisible" @close="markdownGuideDialogVisible = false" />
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

/*
 * 菜单栏保持排版意义上的「一行字」：不铺灰块、不上浮、不投影。
 * 打开的那一项用底部一道墨线标出来——这也是全局页签用的同一种手势。
 */
.menubar {
  user-select: none;

  :deep([data-radix-menubar-trigger]) {
    position: relative;
    padding: 0.5rem 0.625rem;
    border-radius: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground) / 0.68);
    transition: color 0.15s ease;

    &::after {
      content: '';
      position: absolute;
      right: 0.625rem;
      bottom: 0.3rem;
      left: 0.625rem;
      height: 1.5px;
      background: transparent;
      transition: background-color 0.15s ease;
    }

    &:hover {
      color: hsl(var(--foreground));
    }

    &[data-state='open'] {
      color: hsl(var(--foreground));

      &::after {
        background: hsl(var(--foreground));
      }
    }
  }

  :deep([data-radix-menubar-content]) {
    animation: slideDownAndFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  :deep([data-radix-menubar-item]),
  :deep([data-radix-menubar-sub-trigger]) {
    border-radius: 6px;
    transition: background-color 0.12s ease;

    &:hover {
      background: hsl(var(--foreground) / 0.06);
    }
  }
}

.download-entry {
  position: relative;
  padding: 0.5rem 0.625rem;
  border: 0;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--primary));
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: hsl(var(--primary) / 0.82);
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
