<script setup lang="ts">
import type { Format } from 'vue-pick-colors'
import {
  colorCategoryOptions,
  colorOptions,
  fontCategoryOptions,
  fontFamilyOptions,
  fontSizeOptions,
} from '@md/shared/configs'
import PickColors from 'vue-pick-colors'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
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
  favoriteColors,
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

const selectedFontCategory = ref(fontCategoryOptions[0].category)
const fontCategoryNames = computed(() => fontCategoryOptions.map(c => c.category))
const filteredFontOptions = computed(() => {
  const category = fontCategoryOptions.find(item => item.category === selectedFontCategory.value)
  return category ? category.fonts : fontFamilyOptions
})

const selectedColorCategory = ref(colorCategoryOptions[0].category)
const colorCategoryNames = computed(() => [`常用`, ...colorCategoryOptions.map(c => c.category), `已保存`])
const filteredColorOptions = computed(() => {
  const visibleColors = colorOptions.filter(item => !hiddenColors.value.includes(item.value as string))
  if (selectedColorCategory.value === `常用`) {
    return visibleColors.filter(item => favoriteColors.value.includes(item.value as string))
  }
  if (selectedColorCategory.value === `已保存`) {
    return savedCustomColors.value.map(value => ({ label: value, value, desc: `` }))
  }

  const category = colorCategoryOptions.find(item => item.category === selectedColorCategory.value)
  return category
    ? category.colors.filter(item => !hiddenColors.value.includes(item.value as string))
    : visibleColors
})

const compactColorOptions = computed(() => colorOptions.filter(item => !hiddenColors.value.includes(item.value as string)))

function selectFontCategoryByFont(value: string) {
  selectedFontCategory.value = fontCategoryOptions.find(category =>
    category.fonts.some(option => option.value === value),
  )?.category || fontCategoryOptions[0].category
}

function selectColorCategoryByColor(value: string) {
  if (savedCustomColors.value.includes(value)) {
    selectedColorCategory.value = `已保存`
    return
  }

  selectedColorCategory.value = colorCategoryOptions.find(category =>
    category.colors.some(option => option.value === value),
  )?.category || colorCategoryOptions[0].category
}

// 换主题、套预设、重置样式都会从外面改这两个值，分类要跟着落到它所在的那一组
watch(fontFamily, value => selectFontCategoryByFont(value as string), { immediate: true })
watch(primaryColor, value => selectColorCategoryByColor(value as string), { immediate: true })

function saveCustomColor() {
  const current = primaryColor.value as string
  if (current && !savedCustomColors.value.includes(current)) {
    savedCustomColors.value.push(current)
  }
}

function toggleFavoriteColor(value: string) {
  if (favoriteColors.value.includes(value)) {
    favoriteColors.value = favoriteColors.value.filter(item => item !== value)
    return
  }

  favoriteColors.value.push(value)
}

function deleteColorOption(value: string) {
  if (!hiddenColors.value.includes(value)) {
    hiddenColors.value.push(value)
  }
}

function deleteCustomColorOption(value: string) {
  savedCustomColors.value = savedCustomColors.value.filter(item => item !== value)
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
    <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
      <div class="space-y-1">
        <h2 class="text-sm font-semibold">
          1. 选择字体与字号
        </h2>
        <p class="text-xs leading-5 text-muted-foreground">
          先确定整体阅读气质，再用字号控制版面密度。
        </p>
      </div>
      <div class="flex flex-wrap gap-1">
        <Button
          v-for="cat in fontCategoryNames"
          :key="cat"
          size="sm"
          :variant="selectedFontCategory === cat ? 'default' : 'ghost'"
          class="h-7 px-2 text-xs"
          @click="selectedFontCategory = cat"
        >
          {{ cat }}
        </Button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <Button
          v-for="{ label, value } in filteredFontOptions"
          :key="value"
          variant="outline"
          class="w-full justify-start"
          :class="{ 'border-black dark:border-white border-2': fontFamily === value }"
          @click="fontChanged(value)"
        >
          {{ label }}
        </Button>
      </div>
      <div class="space-y-2">
        <div class="text-xs text-muted-foreground">
          正文字号
        </div>
        <Select v-model="fontSize" @update:model-value="sizeChanged">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="选择字号" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="{ label, value, desc } in fontSizeOptions" :key="value" :value="value">
              {{ label }} <span class="ml-2 text-muted-foreground">{{ desc }}</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="space-y-3 rounded-2xl border bg-background/80 p-4">
      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold">
            2. 选择主题色
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
        <p class="text-xs leading-5 text-muted-foreground">
          {{ isPrimaryColorFollowingTheme ? `当前跟随主题的出厂配色，换主题会一起换。` : `已自定义，换主题不会覆盖。` }}主题色会影响标题强调、引用块和部分模块高光。
        </p>
      </div>
      <div class="flex flex-wrap gap-1">
        <Button
          v-for="cat in colorCategoryNames"
          :key="cat"
          size="sm"
          :variant="selectedColorCategory === cat ? 'default' : 'ghost'"
          class="h-7 px-2 text-xs"
          @click="selectedColorCategory = cat"
        >
          {{ cat }}
        </Button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <ContextMenu v-for="{ label, value } in filteredColorOptions" :key="value">
          <ContextMenuTrigger as-child>
            <Button
              class="w-full justify-start"
              variant="outline"
              :class="{ 'border-black dark:border-white border-2': primaryColor === value }"
              @click="colorChanged(value as string)"
            >
              <span class="mr-2 inline-block h-4 w-4 rounded-full" :style="{ background: value as string }" />
              {{ label }}
            </Button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem v-if="selectedColorCategory !== '已保存'" @click="toggleFavoriteColor(value as string)">
              {{ favoriteColors.includes(value as string) ? '取消常用' : '设为常用' }}
            </ContextMenuItem>
            <ContextMenuItem v-if="selectedColorCategory === '已保存'" @click="deleteCustomColorOption(value as string)">
              删除
            </ContextMenuItem>
            <ContextMenuItem v-else @click="deleteColorOption(value as string)">
              删除
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
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
