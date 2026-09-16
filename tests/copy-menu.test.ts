import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { EditorState } from '@codemirror/state'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(`@/config/telemetry`, () => ({ TELEMETRY_ENDPOINT: `https://telemetry.test` }))
vi.mock(`@/services/desktop/bridge`, () => ({ isDesktopRuntime: () => false }))

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`复制格式入口收进菜单`, () => {
  it(`顶栏只剩「复制到公众号」，没有其他格式下拉；主按钮仍是 copy('txt')`, () => {
    const header = readSource(`apps/web/src/components/editor/editor-header/index.vue`)
    expect(header).not.toContain(`其他复制格式`)
    expect(header).not.toContain(`其他格式`)
    expect(header).not.toContain(`DropdownMenu`)
    expect(header).not.toContain(`ChevronDown`)
    expect(header).toContain(`@click="copyToWeChat"`)
    expect(header).toContain(`复制到公众号`)
    // 菜单里的四种格式回到顶栏统一执行，走同一个 handleCopy（带复制遮罩）
    expect(header).toContain(`<FileDropdown @copy-format="handleCopy" />`)
    expect(header).toContain(`<FileDropdown :as-sub="true" @copy-format="handleCopy" />`)

    const copyActions = readSource(`apps/web/src/composables/useEditorCopyActions.ts`)
    expect(copyActions).toContain(`copyToWeChat: () => copy(\`txt\`)`)
    // 复制函数体没动：五种 mode 分支还在原处
    for (const mode of [`md`, `html`, `html-without-style`, `html-and-style`, `txt`]) {
      expect(copyActions).toContain(`copyMode.value === \`${mode}\``)
    }
  })

  it(`「文件」菜单有「复制为…」子菜单，四种格式各触发对应 mode`, async () => {
    const file = readSource(`apps/web/src/components/editor/editor-header/FileDropdown.vue`)
    expect(file).toContain(`复制为…`)
    expect(file).toContain(`emit('copyFormat', item.mode)`)
    expect(file).toContain(`copyFormat: [mode: CopyMode]`)
    // 桌面菜单和移动端子菜单两处都有
    expect(file.split(`复制为…`).length).toBe(3)

    const { SECONDARY_COPY_FORMATS } = await import(`@/utils/copy-formats`)
    expect(SECONDARY_COPY_FORMATS.map(item => item.mode)).toEqual([`html`, `html-without-style`, `html-and-style`, `md`])
    expect(SECONDARY_COPY_FORMATS.some(item => (item.mode as string) === `txt`)).toBe(false)
    for (const item of SECONDARY_COPY_FORMATS) {
      expect(item.label.length).toBeGreaterThan(0)
    }
  })
})

describe(`content_edit：只在用户亲手改正文时算`, () => {
  async function load() {
    vi.resetModules()
    sessionStorage.clear()
    localStorage.clear()
    return {
      telemetry: await import(`@/utils/telemetry`),
      edit: await import(`@/utils/editor-content-edit`),
    }
  }

  it(`程序化 dispatch（默认稿、切主题、插板块）不算；打字算 type；粘贴 ≥ 200 字算 paste；撤销不算`, async () => {
    const { edit } = await load()
    const state = EditorState.create({ doc: `# 默认稿\n\n正文` })

    const programmatic = state.update({ changes: { from: 0, to: state.doc.length, insert: `# 新主题重写后的稿` } })
    expect(edit.resolveUserContentEdit([programmatic])).toBeNull()

    const typed = state.update({ changes: { from: state.doc.length, insert: `字` }, userEvent: `input.type` })
    expect(edit.resolveUserContentEdit([typed])).toEqual({ kind: `type`, chars: state.doc.length + 1 })

    const deleted = state.update({ changes: { from: 0, to: 1 }, userEvent: `delete.backward` })
    expect(edit.resolveUserContentEdit([deleted])?.kind).toBe(`type`)

    const shortPaste = state.update({ changes: { from: 0, insert: `短`.repeat(199) }, userEvent: `input.paste` })
    expect(edit.resolveUserContentEdit([shortPaste])?.kind).toBe(`type`)

    const longPaste = state.update({ changes: { from: 0, insert: `稿`.repeat(200) }, userEvent: `input.paste` })
    expect(edit.resolveUserContentEdit([longPaste])).toEqual({ kind: `paste`, chars: state.doc.length + 200 })

    const undo = state.update({ changes: { from: 0, to: 1 }, userEvent: `undo` })
    expect(edit.resolveUserContentEdit([undo])).toBeNull()

    const selectionOnly = state.update({ selection: { anchor: 1 }, userEvent: `select.pointer` })
    expect(edit.resolveUserContentEdit([selectionOnly])).toBeNull()
  })

  it(`同一会话只报一次，props 只有 kind 与字数分桶`, async () => {
    const { telemetry } = await load()
    const sent: Array<{ event: string, props: Record<string, unknown> }> = []
    vi.stubGlobal(`fetch`, vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(...JSON.parse(String(init.body)).events)
      return new Response(null, { status: 204 })
    }))

    telemetry.trackContentEdit(`type`, 12)
    telemetry.trackContentEdit(`paste`, 5000)
    telemetry.trackContentEdit(`file`, 800)
    telemetry.trackSessionEnd()

    // trackSessionEnd 会立刻冲队列；jsdom 没有 sendBeacon，退回 fetch
    await Promise.resolve()
    const edits = sent.filter(item => item.event === `content_edit`)
    expect(edits).toHaveLength(1)
    expect(edits[0].props).toEqual({ kind: `type`, chars: `0-299` })

    const end = sent.find(item => item.event === `session_end`)
    expect(end?.props).toEqual({ seconds: `<30`, edited: true, copied: false })
    vi.unstubAllGlobals()
  })

  it(`会话时长分桶`, async () => {
    const { telemetry } = await load()
    expect(telemetry.bucketSeconds(0)).toBe(`<30`)
    expect(telemetry.bucketSeconds(29)).toBe(`<30`)
    expect(telemetry.bucketSeconds(30)).toBe(`30-120`)
    expect(telemetry.bucketSeconds(119)).toBe(`30-120`)
    expect(telemetry.bucketSeconds(120)).toBe(`120-600`)
    expect(telemetry.bucketSeconds(600)).toBe(`600-1800`)
    expect(telemetry.bucketSeconds(1800)).toBe(`1800+`)
    expect(telemetry.bucketSeconds(99_999)).toBe(`1800+`)
  })

  it(`埋点接在编辑器 updateListener 与两个打开文件入口，不接在 importContent 上`, () => {
    const editorView = readSource(`apps/web/src/views/CodemirrorEditor.vue`)
    expect(editorView).toContain(`resolveUserContentEdit(update.transactions)`)
    expect(editorView).toContain(`trackContentEdit(userEdit.kind, userEdit.chars)`)

    expect(readSource(`apps/web/src/composables/useDraftFileSync.ts`)).toContain(`trackContentEdit(\`file\``)
    expect(readSource(`apps/web/src/composables/useMarkdownImportActions.ts`)).toContain(`trackContentEdit(\`file\``)
    expect(readSource(`apps/web/src/stores/editor.ts`)).not.toContain(`trackContentEdit`)

    const telemetry = readSource(`apps/web/src/utils/telemetry.ts`)
    expect(telemetry).toContain(`visibilitychange`)
    expect(telemetry).toContain(`trackSessionEnd()`)
    expect(telemetry).toContain(`sendBeacon`)
  })
})

beforeEach(() => {
  sessionStorage.clear()
})
