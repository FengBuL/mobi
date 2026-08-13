<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const { isMobile, isSimpleWorkspace, activeAuxPanel } = storeToRefs(uiStore)

const panel = computed(() => {
  if (!isSimpleWorkspace.value) {
    return null
  }

  const active = activeAuxPanel.value
  // 文章列表和样式面板在移动端自带全屏抽屉，再套一层会出现两层遮罩
  if (isMobile.value && active !== `folder` && active !== `blocks`) {
    return null
  }

  return active
})

const titles = {
  posts: `文章列表`,
  folder: `本地文件夹`,
  blocks: `板块库`,
  style: `样式面板`,
}

const title = computed(() => (panel.value ? titles[panel.value] : ``))

function close() {
  uiStore.closeAuxPanels()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === `Escape` && panel.value) {
    close()
  }
}

onMounted(() => document.addEventListener(`keydown`, handleKeydown))
onBeforeUnmount(() => document.removeEventListener(`keydown`, handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="workspace-drawer-fade">
      <div v-if="panel" class="fixed inset-0 z-55 bg-black/35 backdrop-blur-[2px]" @click="close" />
    </Transition>

    <Transition name="workspace-drawer-slide">
      <aside
        v-if="panel"
        class="fixed bottom-0 right-0 top-0 z-60 flex w-[min(94vw,460px)] flex-col border-l bg-background shadow-2xl"
      >
        <header class="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <h2 class="text-sm font-semibold">
            {{ title }}
          </h2>
          <Button variant="ghost" size="icon" class="size-8" title="关闭" @click="close">
            <X class="size-4" />
          </Button>
        </header>

        <div class="min-h-0 flex-1 overflow-hidden">
          <PostSlider v-if="panel === 'posts'" />
          <FolderSourcePanel v-else-if="panel === 'folder'" />
          <div v-else-if="panel === 'blocks'" class="h-full p-3">
            <ImageLayoutWorkspace />
          </div>
          <RightSlider v-else />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.workspace-drawer-fade-enter-active,
.workspace-drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.workspace-drawer-fade-enter-from,
.workspace-drawer-fade-leave-to {
  opacity: 0;
}

.workspace-drawer-slide-enter-active,
.workspace-drawer-slide-leave-active {
  transition: transform 0.24s cubic-bezier(0.32, 0.72, 0, 1);
}

.workspace-drawer-slide-enter-from,
.workspace-drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
