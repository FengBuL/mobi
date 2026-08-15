<script setup lang="ts">
import { CloudCog } from 'lucide-vue-next'
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
</script>

<template>
  <MenubarSub v-if="asSub">
    <MenubarSubTrigger>
      设置
    </MenubarSubTrigger>
    <MenubarSubContent class="w-52">
      <MenubarItem @click="openImageHostSettings">
        <CloudCog class="mr-2 size-4" />
        图床配置
      </MenubarItem>
    </MenubarSubContent>
  </MenubarSub>

  <MenubarMenu v-else>
    <MenubarTrigger>
      设置
    </MenubarTrigger>
    <MenubarContent class="w-52" align="start">
      <MenubarItem @click="openImageHostSettings">
        <CloudCog class="mr-2 size-4" />
        图床配置
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</template>
