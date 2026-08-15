import { describe, expect, it } from 'vitest'
import { readFolderLevel } from '@/utils/folder-tree'

function mockDirectory(name: string, entries: Array<any> = []) {
  let reads = 0
  return {
    kind: `directory` as const,
    name,
    async* values() {
      reads += 1
      yield* entries
    },
    get reads() {
      return reads
    },
  }
}

describe(`本地文件夹按需读取`, () => {
  it(`打开根目录时只读取第一层，不递归扫描子目录`, async () => {
    const nested = mockDirectory(`node_modules`, [
      { kind: `file`, name: `README.md` },
    ])
    const root = mockDirectory(`文章`, [
      nested,
      { kind: `file`, name: `正文.md` },
      { kind: `file`, name: `说明.txt` },
    ])

    const children = await readFolderLevel(root as unknown as FileSystemDirectoryHandle, `文章`)

    expect(root.reads).toBe(1)
    expect(nested.reads).toBe(0)
    expect(children.map(node => [node.name, node.type])).toEqual([
      [`node_modules`, `directory`],
      [`正文.md`, `file`],
    ])
    expect(children[0].children).toBeUndefined()
  })
})
