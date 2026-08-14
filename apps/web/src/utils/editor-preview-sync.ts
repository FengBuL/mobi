export function shouldSyncPreviewFromEditorUpdate(update: {
  selectionSet: boolean
  docChanged: boolean
}) {
  return update.selectionSet && !update.docChanged
}
