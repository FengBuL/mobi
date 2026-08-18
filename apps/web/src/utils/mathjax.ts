export function isMathJaxReady() {
  return typeof window !== `undefined` && typeof window.MathJax?.tex2svg === `function`
}

let loading: Promise<void> | null = null

export function ensureMathJax() {
  if (isMathJaxReady()) {
    return Promise.resolve()
  }
  if (loading) {
    return loading
  }
  if (typeof document === `undefined`) {
    return Promise.reject(new Error(`公式引擎只能在浏览器里加载`))
  }

  loading = new Promise((resolve, reject) => {
    const existing = document.getElementById(`MathJax-script`)
    if (existing && isMathJaxReady()) {
      resolve()
      return
    }

    window.MathJax = {
      tex: { tags: `ams` },
      svg: { fontCache: `none` },
      loader: {
        paths: {
          fonts: `[mathjax]/../`,
        },
      },
      ...(window.MathJax || {}),
    }

    const script = existing instanceof HTMLScriptElement
      ? existing
      : document.createElement(`script`)
    if (!existing) {
      script.id = `MathJax-script`
      script.async = true
      script.src = `${import.meta.env.BASE_URL}static/mathjax/tex-svg.js`
      document.head.appendChild(script)
    }

    const finish = () => {
      const startup = window.MathJax?.startup?.promise
      if (startup) {
        startup.then(() => resolve()).catch(reject)
        return
      }
      if (isMathJaxReady()) {
        resolve()
        return
      }
      reject(new Error(`公式引擎加载失败`))
    }

    script.addEventListener(`load`, finish, { once: true })
    script.addEventListener(`error`, () => {
      loading = null
      reject(new Error(`公式引擎加载失败`))
    }, { once: true })
  })

  return loading
}
