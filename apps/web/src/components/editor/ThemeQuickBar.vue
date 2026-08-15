<script setup lang="ts">
import type { ThemeName } from '@mobi/shared/configs'
import { fontFamilyOptions, themeOptionsMap } from '@mobi/shared/configs'
import { SlidersHorizontal } from 'lucide-vue-next'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'
import { getThemeSwatch } from '@/utils/theme-swatch'

const themeStore = useThemeStore()
const uiStore = useUIStore()

const { theme, fontFamily, fontSize, primaryColor } = storeToRefs(themeStore)

const activeTheme = computed(() => themeOptionsMap[theme.value as ThemeName])
const activeSwatch = computed(() => getThemeSwatch(theme.value as ThemeName))
const fontLabel = computed(() => fontFamilyOptions.find(option => option.value === fontFamily.value)?.label || `自定义字体`)
const currentStyleSummary = computed(() => `${fontLabel.value} · ${fontSize.value} · ${String(primaryColor.value)}`)

function openStylePanel() {
  uiStore.isOpenRightSlider = true
  nextTick(() => {
    uiStore.focusStyleGroup(`text`, `base`)
  })
}
</script>

<template>
  <div class="theme-quick-bar">
    <div class="theme-quick-bar__summary">
      <span
        class="theme-quick-bar__swatch"
        :style="{
          background: activeSwatch.paper,
          borderColor: activeSwatch.line,
          borderRadius: activeSwatch.radius,
        }"
      >
        <span class="theme-quick-bar__swatch-accent" :style="{ background: activeSwatch.accent }" />
        <span class="theme-quick-bar__swatch-line" :style="{ background: activeSwatch.ink }" />
      </span>
      <div class="min-w-0">
        <div class="truncate text-xs font-semibold">
          {{ activeTheme?.label || theme }}
        </div>
        <div class="truncate text-[11px] text-muted-foreground">
          {{ currentStyleSummary }}
        </div>
      </div>
    </div>

    <Button variant="outline" size="sm" class="h-8 shrink-0 gap-1.5 px-2.5 text-xs" @click="openStylePanel">
      <SlidersHorizontal class="size-3.5" />
      全局样式
    </Button>
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

.theme-quick-bar__summary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
  flex: 1;
}

.theme-quick-bar__swatch {
  position: relative;
  display: block;
  height: 2rem;
  width: 2.5rem;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 3px hsl(var(--foreground) / 0.12);
}

.theme-quick-bar__swatch-accent {
  position: absolute;
  top: 0.42rem;
  left: 0.4rem;
  height: 0.18rem;
  width: 0.72rem;
  border-radius: 1px;
}

.theme-quick-bar__swatch-line {
  position: absolute;
  top: 0.88rem;
  left: 0.4rem;
  right: 0.4rem;
  height: 0.22rem;
  border-radius: 1px;
}
</style>
