import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), `..`)
export const repoRoot = path.resolve(desktopDir, `..`, `..`)

const children = new Set()
let cleaningUp = false

export function track(child) {
  children.add(child)
  child.once(`exit`, () => children.delete(child))
  return child
}

export function stopAll() {
  if (cleaningUp) {
    return
  }
  cleaningUp = true
  for (const child of children) {
    child.kill(`SIGTERM`)
  }
}

for (const signal of [`SIGINT`, `SIGTERM`]) {
  process.on(signal, () => {
    stopAll()
    process.exit(0)
  })
}
process.on(`exit`, stopAll)

/** 跑一条命令并等它结束，非零退出码直接把整个脚本带停 */
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = track(spawn(command, args, {
      cwd: options.cwd || desktopDir,
      stdio: `inherit`,
      shell: process.platform === `win32`,
      env: { ...process.env, ...options.env },
    }))

    child.once(`error`, reject)
    child.once(`exit`, (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(` `)} 退出码 ${code}`))
    })
  })
}

export function spawnBackground(command, args, options = {}) {
  return track(spawn(command, args, {
    cwd: options.cwd || desktopDir,
    stdio: `inherit`,
    shell: process.platform === `win32`,
    env: { ...process.env, ...options.env },
  }))
}

/** main 必须排在 preload 前面：它那一步会清空 dist */
export async function buildShell() {
  await run(`pnpm`, [`exec`, `vite`, `build`, `--mode`, `main`])
  await run(`pnpm`, [`exec`, `vite`, `build`, `--mode`, `preload`])
}
