<script setup lang="ts">
import { Image, Palette } from 'lucide-vue-next'
import { useUIStore } from '@/stores/ui'

const props = withDefaults(defineProps<{
  asSub?: boolean
}>(), {
  asSub: false,
})

const { asSub } = toRefs(props)
const uiStore = useUIStore()

function openImageHostSettings() {
  uiStore.openUploadImgDialog()
}

function openStyleSettings() {
  uiStore.isOpenRightSlider = true
}
</script>

<template>
  <MenubarSub v-if="asSub">
    <MenubarSubTrigger>
      设置
    </MenubarSubTrigger>
    <MenubarSubContent class="w-52">
      <MenubarItem @click="openImageHostSettings">
        <Image class="mr-2 size-4" />
        图片与图床
      </MenubarItem>
      <MenubarItem @click="openStyleSettings">
        <Palette class="mr-2 size-4" />
        排版样式
      </MenubarItem>
    </MenubarSubContent>
  </MenubarSub>

  <MenubarMenu v-else>
    <MenubarTrigger>
      设置
    </MenubarTrigger>
    <MenubarContent class="w-52" align="start">
      <MenubarItem @click="openImageHostSettings">
        <Image class="mr-2 size-4" />
        图片与图床
      </MenubarItem>
      <MenubarItem @click="openStyleSettings">
        <Palette class="mr-2 size-4" />
        排版样式
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</template>
