import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

import { hljsLocalPlugin } from './plugins/vite-plugin-hljs-local'
import { mathjaxLocalPlugin } from './plugins/vite-plugin-mathjax-local'

const PKG_NAME_SPECIAL_CHARS = /[^\w-]/g
const LOCAL_BASE = `/mobi/`
const DEFAULT_REPO_NAME = `mobi`

function redirectBareBase(basePath: string): Plugin {
  const withSlash = normalizeBase(basePath)
  const withoutSlash = withSlash.replace(/\/+$/, ``)
  const redirect = (req: { url?: string }, res: { statusCode: number, setHeader: (name: string, value: string) => void, end: () => void }, next: () => void) => {
    const pathname = req.url?.split(`?`)[0] ?? ``
    if (withoutSlash && pathname === withoutSlash) {
      const query = req.url?.includes(`?`) ? req.url.slice(req.url.indexOf(`?`)) : ``
      res.statusCode = 302
      res.setHeader(`Location`, `${withSlash}${query}`)
      res.end()
      return
    }
    next()
  }
  return {
    name: `redirect-bare-base`,
    configureServer(server) {
      server.middlewares.use(redirect)
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect)
    },
  }
}

const rootPackage = JSON.parse(
  readFileSync(path.resolve(__dirname, `../../package.json`), `utf-8`),
) as { version?: string }

function normalizeBase(value: string) {
  let next = value.trim()

  if (!next)
    return `/`

  if (!next.startsWith(`/`))
    next = `/${next}`

  if (!next.endsWith(`/`))
    next = `${next}/`

  return next
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), ``)
  const repoName = process.env.GITHUB_REPOSITORY?.split(`/`)[1] || DEFAULT_REPO_NAME
  const base = command === `serve`
    ? LOCAL_BASE
    : normalizeBase(process.env.VITE_APP_BASE_PATH || env.VITE_APP_BASE_PATH || `/${repoName}`)

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(rootPackage.version ?? `0.0.0`),
    },
    plugins: [
      redirectBareBase(base),
      vue(),
      tailwindcss(),
      AutoImport({
        imports: [`vue`, `pinia`, `@vueuse/core`],
        dirs: [`./src/stores`, `./src/utils/toast`, `./src/composables`],
      }),
      Components({
        resolvers: [],
      }),
      mathjaxLocalPlugin(),
      hljsLocalPlugin(),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, `./src`) },
      dedupe: [`@codemirror/state`, `@codemirror/view`],
    },
    css: { devSourcemap: true },
    build: {
      rollupOptions: {
        output: {
          chunkFileNames: `static/js/[name]-[hash].js`,
          entryFileNames: `static/js/[name]-[hash].js`,
          assetFileNames: `static/[ext]/[name]-[hash].[ext]`,
          manualChunks(id) {
            if (id.includes(`node_modules`)) {
              if (id.includes(`codemirror`) || id.includes(`@lezer`))
                return `codemirror`
              if (id.includes(`katex`))
                return `katex`
              if (id.includes(`prettier`))
                return `prettier`
              if (id.includes(`highlight.js`))
                return `highlight`

              if (id.includes(`/.pnpm/`)) {
                if (
                  id.includes(`/@vue/`)
                  || id.includes(`/@vue+`)
                  || id.includes(`/node_modules/vue/`)
                  || id.includes(`/node_modules/pinia/`)
                ) {
                  return `vendor_vue`
                }
                if (id.includes(`/@vueuse+`) || id.includes(`/@vueuse/`))
                  return `vendor_vueuse`

                const nmIndex = id.lastIndexOf(`/node_modules/`)
                if (nmIndex !== -1) {
                  const afterNm = id.slice(nmIndex + `/node_modules/`.length)
                  const parts = afterNm.split(`/`)
                  const pkgName = afterNm.startsWith(`@`)
                    ? `${parts[0].slice(1)}_${parts[1]}`
                    : parts[0]
                  return `vendor_${pkgName.replace(PKG_NAME_SPECIAL_CHARS, `_`)}`
                }
                return
              }

              const pkg = id
                .split(`node_modules/`)[1]
                .split(`/`)[0]
                .replace(`@`, `npm_`)
              return `vendor_${pkg}`
            }
          },
        },
      },
      chunkSizeWarningLimit: 1700,
    },
  }
})
