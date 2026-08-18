<script setup lang="ts">
import { CloudCog, Plus } from 'lucide-vue-next'
import { useAccountProfileStore } from '@/stores/accountProfile'
import { useUIStore } from '@/stores/ui'

const props = withDefaults(defineProps<{
  asSub?: boolean
}>(), {
  asSub: false,
})

const { asSub } = toRefs(props)
const uiStore = useUIStore()
const profileStore = useAccountProfileStore()

function openImageHostSettings() {
  uiStore.openUploadImgDialog()
}

function createProfile() {
  profileStore.createProfile()
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
      <MenubarItem @click="createProfile">
        <Plus class="mr-2 size-4" />
        新建号
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
      <MenubarItem @click="createProfile">
        <Plus class="mr-2 size-4" />
        新建号
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</template>
