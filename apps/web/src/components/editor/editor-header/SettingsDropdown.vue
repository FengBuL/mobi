<script setup lang="ts">
import { downloadFile } from '@mobi/shared/utils'
import { Check, CloudCog, Download, Plus, Upload } from 'lucide-vue-next'
import AccountProfileImportDialog from '@/components/editor/AccountProfileImportDialog.vue'
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
const { profiles, currentProfile, showSwitcher } = storeToRefs(profileStore)
const importer = ref<{ openImport: () => void } | null>(null)

function openImageHostSettings() {
  uiStore.openUploadImgDialog()
}

function createProfile() {
  profileStore.createProfile()
}

function exportProfiles() {
  const payload = profileStore.exportProfiles()
  downloadFile(JSON.stringify(payload, null, 2), `墨笔-号配置.json`, `application/json`)
  toast.success(`已导出 ${payload.profiles.length} 个号。文件里有图床密钥，只给自己换电脑用。`)
}

function openImport() {
  importer.value?.openImport()
}

function switchProfile(id: string) {
  profileStore.switchProfile(id)
}
</script>

<template>
  <AccountProfileImportDialog ref="importer" />
  <MenubarSub v-if="asSub">
    <MenubarSubTrigger>
      设置
    </MenubarSubTrigger>
    <MenubarSubContent class="w-56">
      <template v-if="showSwitcher">
        <MenubarLabel class="text-xs font-normal text-muted-foreground">
          切号
        </MenubarLabel>
        <MenubarItem
          v-for="profile in profiles"
          :key="profile.id"
          @click="switchProfile(profile.id)"
        >
          <span class="flex-1 truncate">{{ profile.name }}</span>
          <Check v-if="profile.id === currentProfile?.id" class="size-3.5" />
        </MenubarItem>
        <MenubarSeparator />
      </template>
      <MenubarItem @click="openImageHostSettings">
        <CloudCog class="mr-2 size-4" />
        图床配置
      </MenubarItem>
      <MenubarItem @click="createProfile">
        <Plus class="mr-2 size-4" />
        新建号
      </MenubarItem>
      <MenubarItem @click="exportProfiles">
        <Download class="mr-2 size-4" />
        导出号配置
      </MenubarItem>
      <MenubarItem @click="openImport">
        <Upload class="mr-2 size-4" />
        导入号配置
      </MenubarItem>
    </MenubarSubContent>
  </MenubarSub>

  <MenubarMenu v-else>
    <MenubarTrigger>
      设置
    </MenubarTrigger>
    <MenubarContent class="w-56" align="start">
      <template v-if="showSwitcher">
        <MenubarLabel class="text-xs font-normal text-muted-foreground">
          切号
        </MenubarLabel>
        <MenubarItem
          v-for="profile in profiles"
          :key="profile.id"
          @click="switchProfile(profile.id)"
        >
          <span class="flex-1 truncate">{{ profile.name }}</span>
          <Check v-if="profile.id === currentProfile?.id" class="size-3.5" />
        </MenubarItem>
        <MenubarSeparator />
      </template>
      <MenubarItem @click="openImageHostSettings">
        <CloudCog class="mr-2 size-4" />
        图床配置
      </MenubarItem>
      <MenubarItem @click="createProfile">
        <Plus class="mr-2 size-4" />
        新建号
      </MenubarItem>
      <MenubarItem @click="exportProfiles">
        <Download class="mr-2 size-4" />
        导出号配置
      </MenubarItem>
      <MenubarItem @click="openImport">
        <Upload class="mr-2 size-4" />
        导入号配置
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</template>
