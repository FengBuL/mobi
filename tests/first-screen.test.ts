import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`第一屏与默认稿`, () => {
  it(`打开不再因未选工作区而弹出引导`, () => {
    const source = readSource(`apps/web/src/components/editor/WorkspaceModeGuide.vue`)

    expect(source).not.toContain(`!hasChosenWorkspaceMode`)
    expect(source).toMatch(/const isOpen = (?:computed\(\(\) => )?false/)
  })

  it(`新用户默认已选过工作区，模式为简洁`, () => {
    const source = readSource(`apps/web/src/stores/ui.ts`)

    expect(source).toContain(`store.reactive(addPrefix(\`workspace_mode_chosen\`), true)`)
    expect(source).toContain(`store.reactive<WorkspaceMode>(WORKSPACE_MODE_KEY, \`simple\`)`)
  })

  it(`默认首篇不再叫内容1，新稿标题可回落到未命名`, () => {
    const source = readSource(`apps/web/src/stores/post.ts`)

    expect(source).not.toContain(`内容1`)
    expect(source).toContain(`未命名`)
  })

  it(`默认稿是短公众号，不是语法课，并写明图未转存`, () => {
    const source = readSource(`apps/web/src/assets/example/markdown.md`)

    expect(source).not.toContain(`探索 Markdown 的奇妙世界`)
    expect(source).toContain(`logo.svg`)
    expect(source).toMatch(/未转存|还没转成公众号地址|还没进素材库/)
  })

  it(`原语法课全文仍保留在帮助资源里`, () => {
    const source = readSource(`apps/web/src/assets/example/markdown-guide.md`)

    expect(source).toContain(`探索 Markdown 的奇妙世界`)
  })

  it(`帮助菜单能打开 Markdown 语法课`, () => {
    const source = readSource(`apps/web/src/components/editor/editor-header/HelpDropdown.vue`)

    expect(source).toContain(`Markdown 语法课`)
  })

  it(`网页版只在帮助右侧露出桌面下载，帮助和关于里不再放`, () => {
    const download = readSource(`apps/web/src/utils/desktop-download.ts`)
    const header = readSource(`apps/web/src/components/editor/editor-header/index.vue`)
    const help = readSource(`apps/web/src/components/editor/editor-header/HelpDropdown.vue`)
    const about = readSource(`apps/web/src/components/editor/editor-header/AboutDialog.vue`)

    expect(download).toContain(`https://app.mobieditor.cn`)
    expect(header).toContain(`下载桌面版`)
    expect(header).toContain(`download-entry`)
    expect(header).toContain(`v-if="!isDesktopApp"`)
    expect(help).not.toContain(`下载桌面版`)
    expect(about).not.toContain(`下载桌面版`)
    expect(about).toContain(`项目主页`)
  })

  it(`存稿写入失败会用 toast 告诉用户`, () => {
    const source = readSource(`apps/web/src/utils/storage.ts`)

    expect(source).toContain(`toast.error`)
    expect(source).toContain(`notifyStorageWriteFailure`)
  })
})
