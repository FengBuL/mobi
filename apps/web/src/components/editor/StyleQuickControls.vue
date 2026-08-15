<script setup lang="ts">
import type { Format } from 'vue-pick-colors'
import {
  colorCategoryOptions,
  colorOptions,
  fontCategoryOptions,
  fontSizeOptions,
} from '@mobi/shared/configs'
import PickColors from 'vue-pick-colors'
import { useEditorStore } from '@/stores/editor'
import { useRenderStore } from '@/stores/render'
import { useThemeStore } from '@/stores/theme'
import { useUIStore } from '@/stores/ui'

const props = withDefaults(defineProps<{
  /** full 给样式面板用，compact 给预览区旁边的轻量微调用 */
  variant?: `full` | `compact`
}>(), {
  variant: `compact`,
})

const { variant } = toRefs(props)

const themeStore = useThemeStore()
const uiStore = useUIStore()
const editorStore = useEditorStore()
const renderStore = useRenderStore()

const { isDark } = storeToRefs(uiStore)
const {
  fontFamily,
  fontSize,
  primaryColor,
  hiddenColors,
  savedCustomColors,
  isPrimaryColorFollowingTheme,
} = storeToRefs(themeStore)

const allFontOptions = fontCategoryOptions.flatMap(category => category.fonts)

function editorRefresh() {
  themeStore.updateCodeTheme()
  renderStore.render(renderStore.resolvePreviewContent(editorStore.getContent()))
}

function applyAndRefresh() {
  themeStore.applyCurrentTheme()
  editorRefresh()
}

function fontChanged(value: string) {
  themeStore.fontFamily = value
  applyAndRefresh()
}

function sizeChanged(value: string) {
  themeStore.fontSize = value
  applyAndRefresh()
}

function colorChanged(value: string) {
  themeStore.primaryColor = value
  applyAndRefresh()
}

function restoreThemePrimaryColor() {
  themeStore.followThemePrimaryColor()
  applyAndRefresh()
}

const compactColorOptions = computed(() => colorOptions.filter(item => !hiddenColors.value.includes(item.value as string)))
const fullColorOptions = computed(() => {
  const builtIn = colorCategoryOptions.flatMap(category => category.colors
    .filter(option => !hiddenColors.value.includes(option.value as string))
    .map(option => ({ ...option, label: `${category.category} · ${option.label}` })))
  const saved = savedCustomColors.value
    .filter(value => !builtIn.some(option => option.value === value))
    .map(value => ({ label: `已保存 · ${value}`, value }))
  return [...builtIn, ...saved]
})

function saveCustomColor() {
  const current = primaryColor.value as string
  if (current && !savedCustomColors.value.includes(current)) {
    savedCustomColors.value.push(current)
  }
}

const pickColorsContainer = useTemplateRef<HTMLElement | undefined>(`pickColorsContainer`)
const format = ref<Format>(`rgb`)
const formatOptions = ref<Format[]>([`rgb`, `hex`, `hsl`, `hsv`])
</script>

<template>
  <div v-if="variant === 'compact'" class="space-y-4">
    <div class="space-y-2">
      <div class="text-xs font-medium text-muted-foreground">
        正文字体
      </div>
      <Select v-model="fontFamily" @update:model-value="fontChanged">
        <SelectTrigger class="h-9 w-full">
          <SelectValue placeholder="选择字体" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="{ label, value } in allFontOptions" :key="value" :value="value">
            {{ label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <div class="text-xs font-medium text-muted-foreground">
        正文字号
      </div>
      <Select v-model="fontSize" @update:model-value="sizeChanged">
        <SelectTrigger class="h-9 w-full">
          <SelectValue placeholder="选择字号" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="{ label, value, desc } in fontSizeOptions" :key="value" :value="value">
            {{ label }} <span class="ml-2 text-muted-foreground">{{ desc }}</span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs font-medium text-muted-foreground">
          主题色
        </div>
        <Button
          v-if="!isPrimaryColorFollowingTheme"
          variant="ghost"
          size="sm"
          class="h-6 shrink-0 px-2 text-xs"
          @click="restoreThemePrimaryColor"
        >
          跟随主题
        </Button>
      </div>
      <div class="grid grid-cols-8 gap-1.5">
        <button
          v-for="{ label, value } in compactColorOptions"
          :key="value"
          type="button"
          class="h-6 w-full rounded-md border transition-transform hover:scale-110"
          :class="primaryColor === value ? 'border-2 border-foreground' : 'border-border'"
          :style="{ background: value as string }"
          :title="label"
          @click="colorChanged(value as string)"
        />
      </div>
      <div ref="pickColorsContainer" class="pt-1">
        <PickColors
          v-if="pickColorsContainer"
          v-model:value="primaryColor"
          show-alpha
          :format="format"
          :format-options="formatOptions"
          :theme="isDark ? 'dark' : 'light'"
          :popup-container="pickColorsContainer"
          @change="colorChanged"
        />
      </div>
    </div>
  </div>

  <template v-else>
    <div class="style-card space-y-3">
      <div>
        <h2 class="text-sm font-semibold">
          全局字体与字号
        </h2>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="space-y-1.5">
          <div class="text-xs text-muted-foreground">
            字体
          </div>
          <Select v-model="fontFamily" @update:model-value="fontChanged">
            <SelectTrigger class="h-9 w-full">
              <SelectValue placeholder="选择字体" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="{ label, value } in allFontOptions" :key="value" :value="value">
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <div class="text-xs text-muted-foreground">
            字号
          </div>
          <Select v-model="fontSize" @update:model-value="sizeChanged">
            <SelectTrigger class="h-9 w-full">
              <SelectValue placeholder="选择字号" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="{ label, value } in fontSizeOptions" :key="value" :value="value">
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <div class="style-card space-y-3">
      <div>
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold">
            主题色
          </h2>
          <Button
            v-if="!isPrimaryColorFollowingTheme"
            variant="ghost"
            size="sm"
            class="h-6 shrink-0 px-2 text-xs"
            @click="restoreThemePrimaryColor"
          >
            跟随主题
          </Button>
        </div>
      </div>
      <Select v-model="primaryColor" @update:model-value="value => colorChanged(String(value))">
        <SelectTrigger class="h-9 w-full">
          <SelectValue placeholder="选择主题色" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in fullColorOptions" :key="option.value" :value="option.value">
            <span class="mr-2 inline-block size-3 rounded-full border" :style="{ background: option.value as string }" />
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">
            自定义取色
          </div>
          <Button variant="ghost" size="sm" class="h-6 px-2 text-xs" @click="saveCustomColor">
            保存颜色
          </Button>
        </div>
        <div ref="pickColorsContainer">
          <PickColors
            v-if="pickColorsContainer"
            v-model:value="primaryColor"
            show-alpha
            :format="format"
            :format-options="formatOptions"
            :theme="isDark ? 'dark' : 'light'"
            :popup-container="pickColorsContainer"
            @change="colorChanged"
          />
        </div>
      </div>
    </div>
  </template>
</template>
