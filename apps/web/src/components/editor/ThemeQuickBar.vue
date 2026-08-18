<script setup lang="ts">
import type { ThemeName } from '@mobi/shared/configs'
import {
  featuredThemeIds,
  featuredThemeOptions,
  getThemeDefaultPrimaryColor,
} from '@mobi/shared/configs'
import { SlidersHorizontal } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAccountProfileStore } from '@/stores/accountProfile'
import { useEditorStore } from '@/stores/editor'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { useThemeDesignerStore } from '@/stores/themeDesigner'
import { useUIStore } from '@/stores/ui'
import { trackEvent } from '@/utils/telemetry'
import { buildMoreThemeSamples } from '@/utils/theme-sample'
import { getThemeSwatch } from '@/utils/theme-swatch'
import AccountProfileMenu from './AccountProfileMenu.vue'

const themeStore = useThemeStore()
const themeDesignerStore = useThemeDesignerStore()
const uiStore = useUIStore()
const editorStore = useEditorStore()
const renderStore = useRenderStore()
const profileStore = useAccountProfileStore()
const { showSwitcher } = storeToRefs(profileStore)

const { theme, hiddenThemes } = storeToRefs(themeStore)

const featuredIdSet = new Set<ThemeName>(featuredThemeIds)

/** 第一层对外名：专栏、科技、教程、克制、中式 */
const featuredCards = featuredThemeOptions.map(option => ({
  ...option,
  swatch: getThemeSwatch(option.value),
}))

const isFeaturedTheme = computed(() => featuredIdSet.has(theme.value as ThemeName))

const moreThemeSamples = computed(() => buildMoreThemeSamples(hiddenThemes.value))

function editorRefresh() {
  themeStore.updateCodeTheme()
  renderStore.render(renderStore.resolvePreviewContent(editorStore.getContent()))
}

function themeChanged(value: ThemeName) {
  if (theme.value === value && !themeDesignerStore.draft.sourceId) {
    return
  }

  themeDesignerStore.checkpoint()
  themeDesignerStore.replaceDraft({
    sourceId: null,
    name: ``,
    baseTheme: value,
    tokens: {},
  }, false)
  themeStore.theme = value
  themeStore.restorePrimaryColorState(getThemeDefaultPrimaryColor(value), `theme`)
  themeStore.headingStyles = {}
  themeStore.applyCurrentTheme()
  editorRefresh()
  trackEvent(`theme_change`, { theme: value })
}

function openStylePanel() {
  uiStore.isOpenRightSlider = true
  nextTick(() => {
    uiStore.focusStyleGroup(`text`, `base`)
  })
}
</script>

<template>
  <div class="theme-quick-bar">
    <div class="theme-quick-bar__track">
      <div class="theme-quick-bar__scroller">
        <button
          v-for="item in featuredCards"
          :key="item.value"
          type="button"
          class="theme-card"
          :data-active="theme === item.value"
          :data-theme-id="item.value"
          :title="item.label"
          @click="themeChanged(item.value)"
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

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="theme-card theme-card--more"
              :data-active="!isFeaturedTheme"
            >
              <span class="theme-card__more-mark">⋯</span>
              <span class="theme-card__label">更多</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="theme-more-panel max-h-[28rem] w-[34rem] overflow-y-auto p-2">
            <template v-for="(category, index) in moreThemeSamples" :key="category.category">
              <DropdownMenuSeparator v-if="index > 0" />
              <DropdownMenuGroup>
                <DropdownMenuLabel class="px-1 pb-1 text-xs text-muted-foreground font-normal">
                  {{ category.category }}
                </DropdownMenuLabel>
                <div class="theme-more-grid">
                  <DropdownMenuItem
                    v-for="item in category.themes"
                    :key="item.id"
                    :data-theme-id="item.id"
                    class="theme-sample h-auto flex-col items-stretch"
                    @click="themeChanged(item.id)"
                  >
                    <span :id="item.scopeId" class="theme-sample__frame" v-html="item.markup" />
                    <span class="theme-sample__label">{{ item.label }}</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuGroup>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <AccountProfileMenu v-if="showSwitcher" compact />

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

.theme-card--more {
  justify-content: center;
}

.theme-card__more-mark {
  display: flex;
  height: 2.35rem;
  width: 100%;
  align-items: center;
  justify-content: center;
  border: 1px dashed hsl(var(--border));
  border-radius: 0.35rem;
  font-size: 1rem;
  letter-spacing: 0.08em;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--secondary) / 0.45);

  .theme-card[data-active='true'] & {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 1px;
  }
}

.theme-more-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  padding: 0 0.15rem 0.35rem;
}

.theme-sample {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: stretch;
  gap: 0.28rem;
  height: auto;
  padding: 0.3rem;
  cursor: pointer;
}

.theme-sample__frame {
  display: block;
  height: 7.2rem;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 0.35rem;
  background: hsl(var(--background));
  pointer-events: none;
}

.theme-sample__page {
  display: block;
  width: 238%;
  transform: scale(0.42);
  transform-origin: top left;
}

.theme-sample__label {
  overflow: hidden;
  font-size: 0.68rem;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: hsl(var(--muted-foreground));
}
</style>
