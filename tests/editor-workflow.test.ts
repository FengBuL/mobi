import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`编辑工作流`, () => {
  it(`编辑现有板块时字段和字号直接同步到正文`, () => {
    const source = readSource(`apps/web/src/components/editor/HeadingBlockWorkspace.vue`)

    expect(source).toContain(`function updateField(`)
    expect(source).toContain(`function persistEditingBlock(`)
    expect(source).not.toContain(`更新到正文`)
  })

  it(`本地文件夹只作为只读导入源`, () => {
    const panel = readSource(`apps/web/src/components/editor/FolderSourcePanel.vue`)
    const store = readSource(`apps/web/src/stores/folderSource.ts`)

    expect(panel).not.toContain(`useFolderFileSync`)
    expect(store).toContain("mode: `read`")
    expect(store).not.toContain(`createWritable`)
    expect(store).not.toContain(`writeFile,`)
  })

  it(`插入动作位于内容工具栏，最近图片位于文件菜单`, () => {
    const toolbar = readSource(`apps/web/src/components/editor/MarkdownToolbar.vue`)
    const fileMenu = readSource(`apps/web/src/components/editor/editor-header/FileDropdown.vue`)
    const settingsMenu = readSource(`apps/web/src/components/editor/editor-header/SettingsDropdown.vue`)
    const header = readSource(`apps/web/src/components/editor/editor-header/index.vue`)

    for (const label of [`插入图片`, `批量插入图片`, `按链接插入图片`, `插入表格`, `公众号名片`]) {
      expect(toolbar).toContain(label)
    }
    expect(fileMenu).toContain(`最近使用的图片`)
    expect(settingsMenu).toContain(`图片与图床`)
    expect(header).toContain(`<SettingsDropdown`)
    expect(header).not.toContain(`<InsertDropdown`)
  })
})
