import type { Plugin } from 'vite'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

/**
 * 把 highlight.js 的代码主题样式和语言包放进自己的产物，不走任何外部 CDN。
 *
 * 只拷两块：styles 下的 .min.css（80 个主题，约 320KB），
 * 以及 es/languages（按需动态 import，不用的语言不会被下载）。
 *
 * 和 mathjax 那个插件同样的做法：dev 时用中间件从 node_modules 直接读，
 * 构建时拷进 outDir。
 */
export function hljsLocalPlugin(): Plugin {
  const require = createRequire(import.meta.url)

  function resolveHljsDir() {
    return path.dirname(require.resolve(`highlight.js/package.json`))
  }

  let hljsDir: string
  let outDir: string
  let base: string

  return {
    name: `vite-plugin-hljs-local`,
    configResolved(config) {
      outDir = config.build.outDir
      base = config.base
      hljsDir = resolveHljsDir()
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const decodedUrl = decodeURIComponent(req.url || ``)
        const prefix = `${base}static/hljs/`.replace(/\/\//g, `/`)
        if (!decodedUrl.startsWith(prefix)) {
          return next()
        }

        const filePath = path.join(hljsDir, decodedUrl.slice(prefix.length).split(`?`)[0])
        if (!filePath.startsWith(hljsDir)) {
          res.statusCode = 403
          return res.end(`Forbidden`)
        }

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next()
        }

        res.setHeader(
          `Content-Type`,
          path.extname(filePath) === `.css` ? `text/css` : `application/javascript`,
        )
        fs.createReadStream(filePath).pipe(res)
      })
    },

    closeBundle() {
      const dest = path.resolve(outDir, `static/hljs`)

      fs.cpSync(path.join(hljsDir, `styles`), path.join(dest, `styles`), {
        recursive: true,
        filter: src => fs.statSync(src).isDirectory() || src.endsWith(`.min.css`),
      })

      fs.cpSync(path.join(hljsDir, `es/languages`), path.join(dest, `es/languages`), {
        recursive: true,
        filter: src => fs.statSync(src).isDirectory() || src.endsWith(`.js`),
      })
    },
  }
}
