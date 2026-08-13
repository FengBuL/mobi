import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const nodeExternals = [
  `electron`,
  ...builtinModules,
  ...builtinModules.map(name => `node:${name}`),
]

const BUNDLES = {
  main: `src/main/index.ts`,
  preload: `src/preload/index.ts`,
} as const

type BundleName = keyof typeof BUNDLES

/**
 * 主进程和 preload 分开构建，各自出一个自包含的 CJS 文件。
 *
 * 不能合成一次多入口的构建：Rollup 会把两边共用的模块提成 chunk，
 * 而 sandbox 下的 preload 只能 require electron 和少数内置模块，
 * require 相对路径会直接失败，bridge 就挂不上去了。
 */
export default defineConfig(({ mode }) => {
  const bundle = mode as BundleName
  const entry = BUNDLES[bundle]

  if (!entry) {
    throw new Error(`vite build 需要 --mode main 或 --mode preload，收到的是 ${mode}`)
  }

  return {
    build: {
      outDir: `dist`,
      // main 先构建负责清空，preload 和渲染产物跟在后面往里加
      emptyOutDir: bundle === `main`,
      target: `node22`,
      minify: false,
      sourcemap: true,
      lib: {
        entry: { [`${bundle}/index`]: path.resolve(rootDir, entry) },
        formats: [`cjs`],
      },
      rollupOptions: {
        external: nodeExternals,
        output: {
          entryFileNames: `[name].cjs`,
        },
      },
    },
  }
})
