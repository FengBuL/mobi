export function listDataTransferItems(dataTransfer: DataTransfer | null | undefined): DataTransferItem[] {
  if (!dataTransfer?.items?.length)
    return []
  return Array.from(dataTransfer.items)
}

export function listDroppedFiles(dataTransfer: DataTransfer | null | undefined): File[] {
  const fromItems = listDataTransferItems(dataTransfer)
    .filter(item => item.kind === `file`)
    .map(item => item.getAsFile())
    .filter((file): file is File => file != null)
  if (fromItems.length)
    return fromItems
  return Array.from(dataTransfer?.files ?? [])
}

export async function getDroppedFileSystemHandle(item: DataTransferItem): Promise<FileSystemHandle | null> {
  const getter = (item as DataTransferItem & {
    getAsFileSystemHandle?: () => Promise<FileSystemHandle>
  }).getAsFileSystemHandle
  if (typeof getter !== `function`)
    return null
  try {
    return await getter.call(item)
  }
  catch {
    return null
  }
}

export function isImageFile(file: File) {
  return file.type.startsWith(`image/`) || /\.(?:png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(file.name)
}
