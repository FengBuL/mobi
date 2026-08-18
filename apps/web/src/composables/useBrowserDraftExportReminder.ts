import { useEditorStore } from '@/stores/editor'
import { useExportStore } from '@/stores/export'
import { useFolderSourceStore } from '@/stores/folderSource'
import { usePostStore } from '@/stores/post'
import { addPrefix } from '@/utils'
import { shouldRemindBrowserDraftExport } from '@/utils/draft-folder'
import { store } from '@/utils/storage'

let remindedThisSession = false

export function useBrowserDraftExportReminder() {
  const folderStore = useFolderSourceStore()
  const postStore = usePostStore()
  const exportStore = useExportStore()
  const editorStore = useEditorStore()
  const lastRemindedAt = store.reactive(addPrefix(`draft_export_reminded_at`), 0)
  const lastExportedAt = store.reactive(addPrefix(`draft_export_exported_at`), 0)

  function markExported() {
    lastExportedAt.value = Date.now()
  }

  function maybeRemind() {
    if (remindedThisSession) {
      return
    }
    if (!shouldRemindBrowserDraftExport({
      canUseFolderApi: folderStore.isFileSystemAPISupported,
      draftCount: postStore.posts.length,
      now: Date.now(),
      lastRemindedAt: lastRemindedAt.value || null,
      lastExportedAt: lastExportedAt.value || null,
    })) {
      return
    }
    remindedThisSession = true
    lastRemindedAt.value = Date.now()
    toast.warning(`稿子还在浏览器里，清缓存会丢。建议现在导出一份 Markdown。`, {
      action: {
        label: `导出当前稿`,
        onClick: () => {
          exportStore.exportEditorContent2MD(editorStore.getContent())
          markExported()
        },
      },
    })
  }

  return { maybeRemind, markExported }
}
