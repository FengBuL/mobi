import { describe, expect, it } from 'vitest'
import { isImageFile, listDataTransferItems, listDroppedFiles } from '../apps/web/src/utils/dropped-files'

function fakeItem(kind: string, file: File | null): DataTransferItem {
  return {
    kind,
    type: file?.type ?? ``,
    getAsFile: () => file,
  } as DataTransferItem
}

describe(`拖进编辑器的文件`, () => {
  it(`把 DataTransferItemList 当成可遍历列表，而不是 Array`, () => {
    const png = new File([`x`], `a.png`, { type: `image/png` })
    const items = {
      length: 1,
      0: fakeItem(`file`, png),
      item(index: number) {
        return index === 0 ? fakeItem(`file`, png) : null
      },
      *[Symbol.iterator]() {
        yield fakeItem(`file`, png)
      },
    } as unknown as DataTransferItemList

    const transfer = {
      items,
      files: {
        length: 1,
        0: png,
        item: () => png,
        *[Symbol.iterator]() {
          yield png
        },
      } as unknown as FileList,
    } as DataTransfer

    expect(Array.isArray(transfer.items)).toBe(false)
    expect(listDataTransferItems(transfer)).toHaveLength(1)
    expect(listDroppedFiles(transfer).map(file => file.name)).toEqual([`a.png`])
    expect(isImageFile(png)).toBe(true)
    expect(isImageFile(new File([`x`], `notes.md`, { type: `text/markdown` }))).toBe(false)
  })
})
