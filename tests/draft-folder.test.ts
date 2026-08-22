import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ARCHIVE_FOLDER_NAME,
  archiveDraftPath,
  BROWSER_DRAFT_EXPORT_REMIND_MS,
  canDeleteDraftDirectory,
  canMoveDraftEntry,
  collectVisibleFilePaths,
  describeFolderActionDisabledReason,
  describeFolderPickerBlocker,
  displayDraftPath,
  isArchivedDraftPath,
  isArchiveDirectory,
  isPathInsideDirectory,
  joinDraftPath,
  listMoveTargets,
  listMoveTargetsForMany,
  nextCheckedPaths,
  relocateDraftPath,
  resolveWriteDirectory,
  rewritePathPrefix,
  shouldRemindBrowserDraftExport,
  unarchiveDraftPath,
} from '../apps/web/src/utils/draft-folder'
import { releaseFolderNodeHandles } from '../apps/web/src/utils/folder-handle'

const day = 24 * 60 * 60 * 1000

describe(`选本机文件夹`, () => {
  it(`局域网 http 地址会挡住选择器，并写明原因`, () => {
    const blocker = describeFolderPickerBlocker({
      hasDesktopFolders: false,
      isSecureContext: false,
      hasDirectoryPicker: false,
      origin: `http://192.168.1.8:5173`,
    })
    expect(blocker).toContain(`不是安全上下文`)
    expect(blocker).toContain(`桌面版`)
    expect(blocker).not.toContain(`localhost:5173/mobi/`)
    expect(describeFolderPickerBlocker({
      hasDesktopFolders: false,
      isSecureContext: true,
      hasDirectoryPicker: true,
      origin: `http://localhost:5173`,
    })).toBe(``)
    expect(describeFolderActionDisabledReason(false)).toBe(`先打开一个本地文件夹`)
    expect(describeFolderActionDisabledReason(true)).toBe(``)
  })
})

describe(`浏览器稿定期导出提醒`, () => {
  it(`能写文件夹的浏览器不提醒；没有稿也不提醒`, () => {
    expect(shouldRemindBrowserDraftExport({
      canUseFolderApi: true,
      draftCount: 3,
      now: 1_000,
      lastRemindedAt: null,
      lastExportedAt: null,
    })).toBe(false)
    expect(shouldRemindBrowserDraftExport({
      canUseFolderApi: false,
      draftCount: 0,
      now: 1_000,
      lastRemindedAt: null,
      lastExportedAt: null,
    })).toBe(false)
  })

  it(`safari 类浏览器有稿且从未导出时提醒，导出后 14 天内不再提醒`, () => {
    expect(shouldRemindBrowserDraftExport({
      canUseFolderApi: false,
      draftCount: 1,
      now: 1_000,
      lastRemindedAt: null,
      lastExportedAt: null,
    })).toBe(true)
    expect(shouldRemindBrowserDraftExport({
      canUseFolderApi: false,
      draftCount: 1,
      now: 10 * day,
      lastRemindedAt: 1,
      lastExportedAt: 2,
    })).toBe(false)
    expect(shouldRemindBrowserDraftExport({
      canUseFolderApi: false,
      draftCount: 1,
      now: BROWSER_DRAFT_EXPORT_REMIND_MS + 10,
      lastRemindedAt: 1,
      lastExportedAt: 1,
    })).toBe(true)
  })
})

describe(`稿件子目录与归档`, () => {
  it(`归档落到根下的归档目录，已经在归档里则不动`, () => {
    expect(archiveDraftPath(`文章/未命名.md`)).toBe(`文章/${ARCHIVE_FOLDER_NAME}/未命名.md`)
    expect(archiveDraftPath(`文章/专栏/旧稿.md`)).toBe(`文章/${ARCHIVE_FOLDER_NAME}/旧稿.md`)
    expect(archiveDraftPath(`文章/${ARCHIVE_FOLDER_NAME}/旧稿.md`)).toBe(`文章/${ARCHIVE_FOLDER_NAME}/旧稿.md`)
    expect(archiveDraftPath(
      `/Users/me/公众号文章/s/a.md`,
      ARCHIVE_FOLDER_NAME,
      `/Users/me/公众号文章`,
    )).toBe(`/Users/me/公众号文章/${ARCHIVE_FOLDER_NAME}/a.md`)
    expect(isArchivedDraftPath(`文章/归档/旧稿.md`, `文章`)).toBe(true)
    expect(isArchivedDraftPath(`文章/归档`, `文章`)).toBe(false)
    expect(isArchiveDirectory(`文章/归档`, `文章`)).toBe(true)
    expect(isArchiveDirectory(`文章/专栏`, `文章`)).toBe(false)
    expect(isArchivedDraftPath(`文章/专栏/旧稿.md`, `文章`)).toBe(false)
    expect(unarchiveDraftPath(`文章/归档/旧稿.md`, `文章`)).toBe(`文章/旧稿.md`)
  })

  it(`选中子目录时新稿写进该目录，选中文件则写到它所在目录`, () => {
    expect(joinDraftPath(`文章/专栏`, `未命名.md`)).toBe(`文章/专栏/未命名.md`)
    expect(resolveWriteDirectory({
      rootPath: `文章`,
      selectedPath: `文章/专栏`,
      selectedType: `directory`,
    })).toBe(`文章/专栏`)
    expect(resolveWriteDirectory({
      rootPath: `文章`,
      selectedPath: `文章/专栏/旧稿.md`,
      selectedType: `file`,
    })).toBe(`文章/专栏`)
    expect(resolveWriteDirectory({
      rootPath: `文章`,
      selectedPath: null,
    })).toBe(`文章`)
    expect(canDeleteDraftDirectory(`文章`, `文章`)).toBe(false)
    expect(canDeleteDraftDirectory(`文章`, `文章/专栏`)).toBe(true)
    expect(relocateDraftPath(`文章/专栏`, `文章/归档`)).toBe(`文章/归档/专栏`)
    expect(relocateDraftPath(`文章/专栏/旧稿.md`, `文章`)).toBe(`文章/旧稿.md`)
    expect(rewritePathPrefix(`文章/专栏/旧稿.md`, `文章/专栏`, `文章/归档/专栏`)).toBe(`文章/归档/专栏/旧稿.md`)
    expect(canMoveDraftEntry(`文章`, `文章/专栏`, `文章/归档`)).toBe(true)
    expect(canMoveDraftEntry(`文章`, `文章/专栏`, `文章`)).toBe(false)
    expect(canMoveDraftEntry(`文章`, `文章/专栏`, `文章/专栏/子`)).toBe(false)
    expect(canMoveDraftEntry(`文章`, `文章`, `文章/归档`)).toBe(false)
    expect(canMoveDraftEntry(`文章`, `文章/归档`, `文章/专栏`)).toBe(false)
    expect(displayDraftPath(`文章`, `文章`)).toBe(`根目录`)
    expect(displayDraftPath(`文章`, `文章/归档`)).toBe(`归档`)
    expect(listMoveTargets({
      rootPath: `文章`,
      fromPath: `文章/专栏`,
      directories: [
        { path: `文章`, name: `文章` },
        { path: `文章/专栏`, name: `专栏` },
        { path: `文章/归档`, name: `归档` },
      ],
    }).map(item => item.path)).toEqual([`文章/归档`])
    expect(isPathInsideDirectory(`文章/专栏/旧稿.md`, `文章/专栏`)).toBe(true)
    expect(isPathInsideDirectory(`文章/其他.md`, `文章/专栏`)).toBe(false)
    expect(listMoveTargetsForMany({
      rootPath: `文章`,
      fromPaths: [`文章/专栏/旧稿.md`, `文章/专栏/新稿.md`],
      directories: [
        { path: `文章`, name: `文章` },
        { path: `文章/专栏`, name: `专栏` },
        { path: `文章/归档`, name: `归档` },
      ],
    }).map(item => item.path)).toEqual([`文章`, `文章/归档`])
    expect(collectVisibleFilePaths([
      {
        path: `文章`,
        type: `directory`,
        children: [
          { path: `文章/a.md`, type: `file` },
          {
            path: `文章/专栏`,
            type: `directory`,
            children: [{ path: `文章/专栏/b.md`, type: `file` }],
          },
        ],
      },
    ], [`文章`])).toEqual([`文章/a.md`])
    expect(nextCheckedPaths({
      current: [`文章/a.md`],
      path: `文章/c.md`,
      visiblePaths: [`文章/a.md`, `文章/b.md`, `文章/c.md`],
      additive: false,
      range: true,
      anchor: `文章/a.md`,
    }).paths).toEqual([`文章/a.md`, `文章/b.md`, `文章/c.md`])
    expect(nextCheckedPaths({
      current: [`文章/a.md`],
      path: `文章/a.md`,
      visiblePaths: [`文章/a.md`, `文章/b.md`],
      additive: true,
      range: false,
    }).paths).toEqual([])
  })

  it(`文件夹面板和写出接上了归档与子目录`, () => {
    const panel = readFileSync(resolve(process.cwd(), `apps/web/src/components/editor/FolderSourcePanel.vue`), `utf8`)
    const files = readFileSync(resolve(process.cwd(), `apps/web/src/components/editor/editor-header/FileDropdown.vue`), `utf8`)
    const sync = readFileSync(resolve(process.cwd(), `apps/web/src/composables/useDraftFileSync.ts`), `utf8`)
    const store = readFileSync(resolve(process.cwd(), `apps/web/src/stores/folderSource.ts`), `utf8`)
    const tree = readFileSync(resolve(process.cwd(), `apps/web/src/components/editor/FolderTree.vue`), `utf8`)

    expect(panel).toContain(`归档这篇`)
    expect(panel).toContain(`新建子文件夹`)
    expect(panel).toContain(`删除子文件夹`)
    expect(panel).toContain(`移动到…`)
    expect(panel).toContain(`@click="handleSelectFolder"`)
    expect(sync).toContain(`deleteSubfolder`)
    expect(sync).toContain(`directoryHasMarkdown`)
    expect(sync).toContain(`moveEntry`)
    expect(store).toContain(`removeDirectory`)
    expect(store).toContain(`moveEntry`)
    expect(files).toContain(`打开文件夹`)
    expect(files).toContain(`folderActionReason`)
    expect(files).toContain(`归档这篇`)
    expect(files).toContain(`新建子文件夹`)
    expect(files).toContain(`移动到…`)
    expect(sync).toContain(`resolveWriteDirectory`)
    expect(sync).toContain(`archiveCurrentPost`)
    expect(sync).toContain(`archiveFile`)
    expect(panel).toContain(`handleArchiveFile`)
    expect(panel).toContain(`checkedPaths`)
    expect(panel).toContain(`归档选中`)
    expect(sync).toContain(`archiveFiles`)
    expect(sync).toContain(`moveEntries`)
    expect(sync).toContain(`unarchiveFile`)
    expect(sync).toContain(`importedFrom`)
    expect(panel).toContain(`取消归档`)
    expect(tree).toContain(`tree-node__check`)
    expect(tree).toContain(`取消归档`)
    expect(tree).toContain(`tree-node__check-spacer`)
    expect(store).toContain(`moveMarkdownFile`)
    expect(store).toContain(`restoreExpandedDirectories`)
    expect(tree).toContain(`isArchiveDirectory`)
    expect(store).toContain(`createDirectory`)
    expect(store).toContain(`releaseFolderNodeHandles`)
    expect(store).toContain(`removeChildDirectory`)
    expect(files).toContain(`删除子文件夹`)
    expect(sync).toContain(`post.filePath = null`)
    expect(panel).toContain(`deleteDialogOpen`)
    expect(panel).toContain(`helpDialogOpen`)
    expect(panel).toContain(`HelpCircle`)
    expect(panel).not.toContain(`currentFolderHandle.name`)
    expect(panel).toContain(`confirmedDeletePath`)
    expect(panel).not.toContain(`:open="Boolean(pendingDeletePath)"`)
  })

  it(`删子文件夹前先放开树上握着的句柄`, () => {
    const child = { handle: { kind: `directory` }, children: [] as never[] }
    const parent = { handle: { kind: `directory` }, children: [child] }
    releaseFolderNodeHandles(parent)
    expect(parent.handle).toBeUndefined()
    expect(child.handle).toBeUndefined()
  })
})
