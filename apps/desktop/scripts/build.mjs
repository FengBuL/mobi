import process from 'node:process'
import { buildShell, repoRoot, run } from './shell.mjs'

/**
 * 顺序不能反：外壳这一步会清空 dist，渲染产物得在它之后落进 dist/renderer。
 * base 覆盖成 `/`，页面跑在 mobi://app 这个源上，资源按绝对路径找主进程要。
 */
async function main() {
  console.log(`[mobi] 构建主进程与 preload`)
  await buildShell()

  console.log(`[mobi] 构建渲染进程`)
  await run(`pnpm`, [
    `--filter`,
    `@mobi/web`,
    `exec`,
    `vite`,
    `build`,
    `--base=/`,
    `--outDir`,
    `../desktop/dist/renderer`,
    `--emptyOutDir`,
  ], { cwd: repoRoot })

  console.log(`[mobi] 完成，用 pnpm --filter @mobi/desktop start 启动`)
}

main().catch((error) => {
  console.error(`[mobi] ${error.message}`)
  process.exit(1)
})
