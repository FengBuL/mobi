<script setup lang="ts">
import { CloudCog, Plus } from 'lucide-vue-next'
import { useAccountProfileStore } from '@/stores/accountProfile'
import { useUIStore } from '@/stores/ui'
import { getTelemetryConsent, isTelemetryConfigured, setTelemetryConsent } from '@/utils/telemetry'

const props = withDefaults(defineProps<{
  asSub?: boolean
}>(), {
  asSub: false,
})

const { asSub } = toRefs(props)
const uiStore = useUIStore()
const profileStore = useAccountProfileStore()
const telemetryConfigured = isTelemetryConfigured()
const telemetryConsent = ref(getTelemetryConsent())

function openImageHostSettings() {
  uiStore.openUploadImgDialog()
}

function createProfile() {
  profileStore.createProfile()
}

function onTelemetryChange(val: boolean) {
  telemetryConsent.value = val
  setTelemetryConsent(val)
}
</script>

<template>
  <MenubarSub v-if="asSub">
    <MenubarSubTrigger>
      设置
    </MenubarSubTrigger>
    <MenubarSubContent class="w-56">
      <MenubarItem @click="openImageHostSettings">
        <CloudCog class="mr-2 size-4" />
        图床配置
      </MenubarItem>
      <MenubarItem @click="createProfile">
        <Plus class="mr-2 size-4" />
        新建号
      </MenubarItem>
      <MenubarSeparator />
      <MenubarCheckboxItem
        :checked="telemetryConsent"
        :disabled="!telemetryConfigured"
        @update:checked="onTelemetryChange"
      >
        匿名使用统计
      </MenubarCheckboxItem>
    </MenubarSubContent>
  </MenubarSub>

  <MenubarMenu v-else>
    <MenubarTrigger>
      设置
    </MenubarTrigger>
    <MenubarContent class="w-56" align="start">
      <MenubarItem @click="openImageHostSettings">
        <CloudCog class="mr-2 size-4" />
        图床配置
      </MenubarItem>
      <MenubarItem @click="createProfile">
        <Plus class="mr-2 size-4" />
        新建号
      </MenubarItem>
      <MenubarSeparator />
      <MenubarCheckboxItem
        :checked="telemetryConsent"
        :disabled="!telemetryConfigured"
        @update:checked="onTelemetryChange"
      >
        匿名使用统计
      </MenubarCheckboxItem>
    </MenubarContent>
  </MenubarMenu>
</template>
