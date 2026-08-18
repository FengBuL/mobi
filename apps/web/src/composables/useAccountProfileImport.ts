import type { AccountProfileExportItem } from '@/utils/account-profile'
import { useAccountProfileStore } from '@/stores/accountProfile'
import {
  collectImportedNameConflicts,
  describeAccountProfileImport,
  parseAccountProfileImport,
} from '@/utils/account-profile'

export function useAccountProfileImport() {
  const profileStore = useAccountProfileStore()
  const importInput = ref<HTMLInputElement | null>(null)
  const pendingProfiles = ref<AccountProfileExportItem[] | null>(null)

  const conflictNames = computed(() => {
    if (!pendingProfiles.value) {
      return []
    }
    return collectImportedNameConflicts(profileStore.profiles, pendingProfiles.value)
  })

  function openImport() {
    importInput.value?.click()
  }

  async function onImportFile(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ``
    if (!file) {
      return
    }
    const parsed = parseAccountProfileImport(await file.text())
    if (!parsed) {
      toast.error(`这不是墨笔的号配置文件`)
      return
    }
    if (collectImportedNameConflicts(profileStore.profiles, parsed.profiles).length > 0) {
      pendingProfiles.value = parsed.profiles
      return
    }
    commitImport(parsed.profiles, `add`)
  }

  function commitImport(
    incoming: AccountProfileExportItem[],
    conflict: `overwrite` | `add`,
  ) {
    const result = profileStore.importProfiles(incoming, conflict)
    toast.success(describeAccountProfileImport(result))
    pendingProfiles.value = null
  }

  function confirmOverwrite() {
    if (pendingProfiles.value) {
      commitImport(pendingProfiles.value, `overwrite`)
    }
  }

  function confirmAsNew() {
    if (pendingProfiles.value) {
      commitImport(pendingProfiles.value, `add`)
    }
  }

  function cancelPending() {
    pendingProfiles.value = null
  }

  return {
    importInput,
    pendingProfiles,
    conflictNames,
    openImport,
    onImportFile,
    confirmOverwrite,
    confirmAsNew,
    cancelPending,
  }
}
