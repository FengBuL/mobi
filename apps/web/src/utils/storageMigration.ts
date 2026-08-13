/**
 * 旧版本存储键迁移。
 *
 * 2.1.6 起本地存储前缀从 `MD__` / `md_` 换成 `MOBI__` / `mobi_`。
 * 老用户升级后第一次启动时把旧键的数据搬到新键，然后删掉旧键。
 * 迁移是幂等的：新键已经有值时不覆盖，只清理旧键。
 *
 * 这个模块靠导入副作用执行，必须是 main.ts 的第一个导入，
 * 赶在任何 store 读 localStorage 之前跑完。
 */

const RENAMES: Array<[oldPrefix: string, newPrefix: string]> = [
  [`MD__`, `MOBI__`],
  [`md_`, `mobi_`],
]

function migrateLegacyStorageKeys(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        keys.push(key)
      }
    }

    for (const key of keys) {
      const rule = RENAMES.find(([oldPrefix]) => key.startsWith(oldPrefix))
      if (!rule) {
        continue
      }

      const nextKey = rule[1] + key.slice(rule[0].length)
      if (localStorage.getItem(nextKey) == null) {
        const value = localStorage.getItem(key)
        if (value != null) {
          localStorage.setItem(nextKey, value)
        }
      }
      localStorage.removeItem(key)
    }
  }
  catch {
    // 隐私模式等场景下 localStorage 不可用，跳过即可
  }
}

migrateLegacyStorageKeys()
