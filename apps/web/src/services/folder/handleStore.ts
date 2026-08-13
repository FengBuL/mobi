/**
 * 把用户选过的文件夹 handle 存进 IndexedDB。
 *
 * localStorage 存不了——它只收字符串，而 FileSystemDirectoryHandle 是个活的引用。
 * IndexedDB 走的是结构化克隆，能原样收下，重启之后取回来还指向同一个目录。
 * 取回的 handle 权限会退回 prompt，能不能直接用得再查一次，交给调用方判断。
 */

const DB_NAME = `mobi-folder-source`
const DB_VERSION = 1
const STORE_NAME = `handles`

export interface SavedFolderHandle {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
  /** 用来决定重启后自动恢复哪一个 */
  lastOpenedAt: number
}

export function isFolderHandlePersistenceSupported() {
  return typeof indexedDB !== `undefined`
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: `id` })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(db => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const request = run(transaction.objectStore(STORE_NAME))

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  }))
}

/** 存取失败不该拦住用户干活，顶多是这次没记住 */
async function quietly<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!isFolderHandlePersistenceSupported()) {
    return fallback
  }

  try {
    return await run()
  }
  catch (error) {
    console.error(`[folder] 文件夹记录读写失败`, error)
    return fallback
  }
}

export async function listSavedFolderHandles(): Promise<SavedFolderHandle[]> {
  const saved = await quietly(
    () => runTransaction<SavedFolderHandle[]>(`readonly`, store => store.getAll()),
    [],
  )

  return saved
    .filter(item => item?.handle && typeof item.id === `string`)
    .sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0))
}

export async function saveFolderHandle(entry: SavedFolderHandle): Promise<void> {
  await quietly(
    () => runTransaction(`readwrite`, store => store.put(entry)),
    undefined,
  )
}

export async function deleteFolderHandle(id: string): Promise<void> {
  await quietly(
    () => runTransaction(`readwrite`, store => store.delete(id)),
    undefined,
  )
}
