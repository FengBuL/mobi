<script setup lang="ts">
import { downloadFile } from '@mobi/shared/utils'
import { Check, Download, Pencil, Plus, Trash2, Upload, Users } from 'lucide-vue-next'
import { useAccountProfileStore } from '@/stores/accountProfile'
import AccountProfileImportDialog from './AccountProfileImportDialog.vue'

withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const profileStore = useAccountProfileStore()
const { profiles, currentProfile, showSwitcher } = storeToRefs(profileStore)

const dialogMode = ref<`create` | `rename` | `delete` | null>(null)
const nameDraft = ref(``)

const currentName = computed(() => currentProfile.value?.name || `我的号`)
const canDelete = computed(() => profiles.value.length > 1)

function openCreate() {
  nameDraft.value = `号 ${profiles.value.length + 1}`
  dialogMode.value = `create`
}

function openRename() {
  nameDraft.value = currentName.value
  dialogMode.value = `rename`
}

function openDelete() {
  dialogMode.value = `delete`
}

function closeDialog() {
  dialogMode.value = null
}

function confirmDialog() {
  if (dialogMode.value === `create`) {
    profileStore.createProfile(nameDraft.value)
  }
  else if (dialogMode.value === `rename` && currentProfile.value) {
    profileStore.renameProfile(currentProfile.value.id, nameDraft.value)
  }
  else if (dialogMode.value === `delete` && currentProfile.value) {
    profileStore.removeProfile(currentProfile.value.id)
  }
  closeDialog()
}

function switchTo(id: string) {
  profileStore.switchProfile(id)
}

const importer = ref<{ openImport: () => void } | null>(null)

function exportProfiles() {
  const payload = profileStore.exportProfiles()
  downloadFile(JSON.stringify(payload, null, 2), `墨笔-号配置.json`, `application/json`)
  toast.success(`已导出 ${payload.profiles.length} 个号。文件里有图床密钥，只给自己换电脑用。`)
}

function openImport() {
  importer.value?.openImport()
}
</script>

<template>
  <div>
    <AccountProfileImportDialog ref="importer" />
    <DropdownMenu v-if="!compact || showSwitcher">
      <DropdownMenuTrigger as-child>
        <Button
          v-if="compact"
          variant="outline"
          size="sm"
          class="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
          data-account-profile-switcher
        >
          <Users class="size-3.5" />
          {{ currentName }}
        </Button>
        <button
          v-else
          type="button"
          class="flex w-full items-center gap-2 text-left text-sm"
        >
          <Users class="size-4 shrink-0" />
          <span>{{ showSwitcher ? currentName : '新建号' }}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-52">
        <template v-if="showSwitcher">
          <DropdownMenuLabel class="text-xs font-normal text-muted-foreground">
            我的号
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-for="profile in profiles"
            :key="profile.id"
            @click="switchTo(profile.id)"
          >
            <span class="flex-1 truncate">{{ profile.name }}</span>
            <Check v-if="profile.id === currentProfile?.id" class="size-3.5" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </template>
        <DropdownMenuItem @click="exportProfiles">
          <Download class="mr-2 size-3.5" />
          导出号配置
        </DropdownMenuItem>
        <DropdownMenuItem @click="openImport">
          <Upload class="mr-2 size-3.5" />
          导入号配置
        </DropdownMenuItem>
        <DropdownMenuItem @click="openCreate">
          <Plus class="mr-2 size-3.5" />
          新建号
        </DropdownMenuItem>
        <DropdownMenuItem v-if="showSwitcher" @click="openRename">
          <Pencil class="mr-2 size-3.5" />
          重命名
        </DropdownMenuItem>
        <DropdownMenuItem
          v-if="showSwitcher"
          :disabled="!canDelete"
          class="text-destructive"
          @click="openDelete"
        >
          <Trash2 class="mr-2 size-3.5" />
          删除这个号
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog :open="dialogMode !== null" @update:open="value => !value && closeDialog()">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {{ dialogMode === `create` ? `新建号` : dialogMode === `rename` ? `重命名` : `删除这个号` }}
          </DialogTitle>
          <DialogDescription>
            {{ dialogMode === `delete`
              ? `稿子会留下，只是改挂到默认号。主题、字号和图床配置会丢掉。`
              : `一个号记住一套主题、字号、主题色、图床和外链引用。稿子还是稿子。` }}
          </DialogDescription>
        </DialogHeader>
        <Input
          v-if="dialogMode !== `delete`"
          v-model="nameDraft"
          maxlength="20"
          placeholder="号的名字"
          @keyup.enter="confirmDialog"
        />
        <DialogFooter>
          <Button variant="outline" @click="closeDialog">
            取消
          </Button>
          <Button :variant="dialogMode === `delete` ? `destructive` : `default`" @click="confirmDialog">
            {{ dialogMode === `delete` ? `删除` : `确定` }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
