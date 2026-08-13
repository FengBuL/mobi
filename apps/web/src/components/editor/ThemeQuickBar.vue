<script setup lang="ts">
import type { ThemeName } from '@md/shared/configs'
import { themeOptions } from '@md/shared/configs'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-vue-next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEditorStore } from '@/stores/editor'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { getThemeSwatch } from '@/utils/theme-swatch'

const themeStore = useThemeStore()
const editorStore = useEditorStore()
const renderStore = useRenderStore()

const { theme, fontSize } = storeToRefs(themeStore)

const themeCards = themeOptions.map(option => ({
  ...option,
  swatch: getThemeSwatch(option.value as ThemeName),
}))

const scroller = useTemplateRef<HTMLElement>(`scroller`)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function syncScrollState() {
  const el = scroller.value
  if (!el) {
    return
  }

  canScrollLeft.value = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function scrollByPage(direction: -1 | 1) {
  const el = scroller.value
  if (!el) {
    return
  }

  el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.8), behavior: `smooth` })
}

function revealActiveTheme() {
  nextTick(() => {
    const active = scroller.value?.querySelector<HTMLElement>(`[data-active="true"]`)
    active?.scrollIntoView({ block: `nearest`, inline: `center` })
    syncScrollState()
  })
}

function editorRefresh() {
  themeStore.updateCodeTheme()
  renderStore.render(renderStore.resolvePreviewContent(editorStore.getContent()))
}

function themeChanged(value: ThemeName) {
  if (theme.value === value) {
    return
  }

  themeStore.theme = value
  themeStore.applyCurrentTheme()
  editorRefresh()
}

onMounted(() => {
  revealActiveTheme()
  window.addEventListener(`resize`, syncScrollState)
})

onBeforeUnmount(() => {
  window.removeEventListener(`resize`, syncScrollState)
})

// 从样式面板或预设换主题时，横条也要把选中项带到视野里
watch(theme, revealActiveTheme)
</script>

<template>
  <div class="theme-quick-bar">
    <div class="theme-quick-bar__track">
      <button
        v-show="canScrollLeft"
        type="button"
        class="theme-quick-bar__arrow theme-quick-bar__arrow--start"
        aria-label="向左查看更多主题"
        @click="scrollByPage(-1)"
      >
        <ChevronLeft class="size-3.5" />
      </button>

      <div ref="scroller" class="theme-quick-bar__scroller" @scroll.passive="syncScrollState">
        <button
          v-for="item in themeCards"
          :key="item.value"
          type="button"
          class="theme-card"
          :data-active="theme === item.value"
          :title="`${item.label} · ${item.desc}`"
          @click="themeChanged(item.value as ThemeName)"
        >
          <span
            class="theme-card__paper"
            :style="{
              background: item.swatch.paper,
              borderColor: item.swatch.line,
              borderRadius: item.swatch.radius,
            }"
          >
            <span class="theme-card__accent" :style="{ background: item.swatch.accent }" />
            <span class="theme-card__heading" :style="{ background: item.swatch.ink }" />
            <span class="theme-card__body" :style="{ background: item.swatch.body }" />
            <span class="theme-card__body theme-card__body--short" :style="{ background: item.swatch.body }" />
            <span class="theme-card__rule" :style="{ background: item.swatch.line }" />
          </span>
          <span class="theme-card__label">{{ item.label }}</span>
        </button>
      </div>

      <button
        v-show="canScrollRight"
        type="button"
        class="theme-quick-bar__arrow theme-quick-bar__arrow--end"
        aria-label="向右查看更多主题"
        @click="scrollByPage(1)"
      >
        <ChevronRight class="size-3.5" />
      </button>
    </div>

    <Popover>
      <PopoverTrigger as-child>
        <Button variant="outline" size="sm" class="h-8 shrink-0 gap-1.5 px-2.5 text-xs">
          <SlidersHorizontal class="size-3.5" />
          <span class="hidden lg:inline">微调</span>
          <span class="hidden text-muted-foreground xl:inline">{{ fontSize }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" :side-offset="8" class="w-72">
        <div class="mb-3 space-y-1">
          <div class="text-sm font-semibold">
            轻量微调
          </div>
          <p class="text-xs leading-5 text-muted-foreground">
            只动最影响观感的三项，其余交给主题。
          </p>
        </div>
        <StyleQuickControls variant="compact" />
      </PopoverContent>
    </Popover>
  </div>
</template>

<style lang="less" scoped>
.theme-quick-bar {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid hsl(var(--border) / 0.7);
  background: hsl(var(--background) / 0.7);
}

.theme-quick-bar__track {
  position: relative;
  min-width: 0;
  flex: 1;
}

.theme-quick-bar__scroller {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  padding: 0.15rem 0;

  &::-webkit-scrollbar {
    display: none;
  }
}

.theme-quick-bar__arrow {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: flex;
  height: 1.5rem;
  width: 1.5rem;
  transform: translateY(-50%);
  align-items: center;
  justify-content: center;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  background: hsl(var(--background));
  color: hsl(var(--muted-foreground));
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.12);

  &:hover {
    color: hsl(var(--foreground));
  }
}

.theme-quick-bar__arrow--start {
  left: -0.35rem;
}

.theme-quick-bar__arrow--end {
  right: -0.35rem;
}

.theme-card {
  display: flex;
  width: 3.9rem;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  border-radius: 0.5rem;
  padding: 0.25rem 0.15rem;
  transition: background 0.15s ease;

  &:hover {
    background: hsl(var(--accent) / 0.6);
  }

  &[data-active='true'] {
    background: hsl(var(--accent));
  }
}

.theme-card__paper {
  position: relative;
  display: block;
  height: 2.35rem;
  width: 100%;
  overflow: hidden;
  border: 1px solid;
  box-shadow: 0 1px 3px hsl(var(--foreground) / 0.12);

  .theme-card[data-active='true'] & {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 1px;
  }
}

.theme-card__accent {
  position: absolute;
  top: 0.3rem;
  left: 0.3rem;
  height: 0.2rem;
  width: 0.85rem;
  border-radius: 1px;
}

.theme-card__heading {
  position: absolute;
  top: 0.72rem;
  left: 0.3rem;
  right: 0.9rem;
  height: 0.28rem;
  border-radius: 1px;
}

.theme-card__body {
  position: absolute;
  left: 0.3rem;
  right: 0.3rem;
  top: 1.32rem;
  height: 0.16rem;
  border-radius: 1px;
  opacity: 0.75;
}

.theme-card__body--short {
  top: 1.68rem;
  right: 1.1rem;
}

.theme-card__rule {
  position: absolute;
  left: 0.3rem;
  right: 0.3rem;
  bottom: 0.32rem;
  height: 1px;
  opacity: 0.9;
}

.theme-card__label {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.65rem;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: hsl(var(--muted-foreground));

  .theme-card[data-active='true'] & {
    font-weight: 600;
    color: hsl(var(--foreground));
  }
}
</style>
