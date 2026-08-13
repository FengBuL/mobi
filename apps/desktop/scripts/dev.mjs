import process from 'node:process'
import electronPath from 'electron'
import { buildShell, repoRoot, spawnBackground, stopAll } from './shell.mjs'

const DEV_SERVER_URL = process.env.MOBI_DEV_SERVER_URL || `http://localhost:5173/md/`
const READY_TIMEOUT_MS = 60_000

async function isDevServerUp() {
  try {
    const response = await fetch(DEV_SERVER_URL, { signal: AbortSignal.timeout(1500) })
    return response.ok
  }
  catch {
    return false
  }
}

async function waitForDevServer() {
  const deadline = Date.now() + READY_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (await isDevServerUp()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, 400))
  }

  throw new Error(`等不到 ${DEV_SERVER_URL}，先看看 pnpm start 那边报了什么错`)
}

async function main() {
  // web 那边是 strictPort，已经有 dev server 就直接接上，不然第二个进程会起不来
  if (await isDevServerUp()) {
    console.log(`[mobi] 复用已在运行的 ${DEV_SERVER_URL}`)
  }
  else {
    console.log(`[mobi] 启动 web dev server`)
    spawnBackground(`pnpm`, [`--filter`, `@md/web`, `dev`], { cwd: repoRoot })
    await waitForDevServer()
  }

  console.log(`[mobi] 构建主进程与 preload`)
  await buildShell()

  console.log(`[mobi] 拉起 Electron（改主进程代码需要重跑本命令，改页面代码走 HMR）`)
  // 多余的参数原样递给 Electron，方便临时加 --remote-debugging-port 之类的开关
  const electron = spawnBackground(electronPath, [`.`, ...process.argv.slice(2)], {
    env: { MOBI_DEV_SERVER_URL: DEV_SERVER_URL },
  })

  electron.once(`exit`, (code) => {
    stopAll()
    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  console.error(`[mobi] ${error.message}`)
  stopAll()
  process.exit(1)
})
