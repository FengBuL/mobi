import { initializeMermaid } from '@md/core/utils'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'

import { setupComponents } from './utils/setup-components'

import 'vue-sonner/style.css'

/* 每个页面公共css */
import '@/assets/index.css'
import '@/assets/less/theme.less'

// 异步初始化 mermaid，避免初始化顺序问题
initializeMermaid().catch(console.error)

setupComponents()

const app = createApp(App)

app.use(createPinia())

app.mount(`#app`)

// 等首帧画完再淡出，否则会露出一瞬间的空白骨架
function dismissSplash() {
  const splash = document.getElementById(`app-splash`)
  if (!splash) {
    return
  }

  splash.classList.add(`is-leaving`)
  splash.addEventListener(`transitionend`, () => splash.remove(), { once: true })
}

requestAnimationFrame(() => requestAnimationFrame(dismissSplash))
