// 复现「点复制没成功」到底发生了什么。
//
// 前三轮排查一直盯着产物结构，漏掉了复制链路本身还有一道会直接中止的闸门：
// useEditorCopyActions 在默认的 txt 模式下会扫描 #output 里所有 img，
// 只要有一张不是 mmbiz.qpic.cn / mmbiz.qlogo.cn / res.wx.qq.com，
// 就整篇中止复制并弹错，一张图都不会进剪贴板。
// 这个脚本把那道闸门原样搬过来跑一遍，顺便报出每个预设的图片来源。
//
// 另外修掉了老脚本的一个竞态：应用自己的渲染管线是异步的，
// 脚本刚把 markup 塞进 #output，应用可能又把默认示例文档覆盖回来，
// 于是第一个被测预设量到的其实是示例文档。这里先等 #output 稳定再注入。
import { launchPage } from './lib/wechat-cdp.mjs'

const DEBUG_PORT = Number(process.env.MD_DEBUG_PORT || 9225)
const DEV_URL = process.env.MD_DEV_URL || `http://localhost:5173/md/`
const THEME = process.env.MD_THEME || `default`
const PRESETS = (process.env.MD_PRESETS || `scroll-window`).split(`,`).map(item => item.trim()).filter(Boolean)

// useEditorCopyActions.ts 里的同一条判据
const WECHAT_HOSTED = /mmbiz\.q(pic|logo)\.cn|res\.wx\.qq\.com/i

export const SETTLE_HELPER = `
// 应用启动后 #output 还会被异步渲染覆盖若干次，注入前必须等它安静下来
window.__wxSettle = function (quietMs) {
  return new Promise(function (done) {
    const output = document.querySelector('#output')
    let last = output.innerHTML.length
    let stableSince = Date.now()
    const timer = setInterval(function () {
      const now = output.innerHTML.length
      if (now !== last) { last = now; stableSince = Date.now(); return }
      if (Date.now() - stableSince >= quietMs) { clearInterval(timer); done(true) }
    }, 60)
  })
}
`

async function main() {
  const { page, dispose } = await launchPage({
    port: DEBUG_PORT,
    profile: `/tmp/md-copy-failure-profile`,
    devUrl: DEV_URL,
    readyExpression: `!!(document.querySelector('#md-theme') && document.querySelector('#output'))`,
  })

  try {
    await page.evaluate(`(async () => {
      const core = await import('/md/@fs${process.cwd()}/packages/core/src/index.ts')
      await core.applyTheme({
        themeName: ${JSON.stringify(THEME)},
        variables: { primaryColor: '#16a34a', fontFamily: 'Optima-Regular, sans-serif', fontSize: '15px' },
      })
      window.__wxLayouts = await import('/md/src/utils/image-layouts.ts')
      window.__wxUtils = await import('/md/src/utils/index.ts')
      ${SETTLE_HELPER}
      return true
    })()`)

    await page.evaluate(`window.__wxSettle(700)`)

    for (const presetId of PRESETS) {
      const result = await page.evaluate(`(async () => {
        const layouts = window.__wxLayouts
        const utils = window.__wxUtils
        const preset = layouts.mediaLayoutPresets.find(p => p.id === ${JSON.stringify(presetId)})
        if (!preset) return { error: 'preset not found' }

        // 长图：750x3000，正是这个版式的典型输入
        const long = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="750" height="3000"><rect width="750" height="3000" fill="#4f46e5"/></svg>')
        const form = layouts.createDefaultMediaLayoutState()
        const defaults = layouts.getMediaLayoutPresetSlotDefaults(preset.id)
        form.sectionLabel = ''; form.sectionTitle = ''; form.sectionLead = ''
        form.images = form.images.map((slot, index) => Object.assign({}, slot, {
          url: long,
          alt: '长图' + (index + 1),
          caption: '',
          aspectRatio: (defaults[index] || defaults[0]).aspectRatio,
          minHeight: (defaults[index] || defaults[0]).minHeight,
        }))

        const output = document.querySelector('#output')
        output.innerHTML = '<section class="container"><p class="paragraph">模块前的一段正文。</p>'
          + layouts.buildMediaLayoutMarkup(preset, form)
          + '<p class="paragraph">模块后的一段正文。</p></section>'

        await Promise.all(Array.from(output.querySelectorAll('img')).map(image => (
          image.complete && image.naturalWidth
            ? null
            : new Promise((done) => {
                image.addEventListener('load', done, { once: true })
                image.addEventListener('error', done, { once: true })
              })
        )))
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

        const previewHadBlock = /md-media-block/.test(output.innerHTML)
        await utils.processClipboardContent('#16a34a')
        const clipboard = output.innerHTML

        const holder = document.createElement('div')
        holder.innerHTML = clipboard
        const images = Array.from(holder.querySelectorAll('img')).map(image => ({
          src: (image.getAttribute('src') || '').slice(0, 60),
          scheme: (image.getAttribute('src') || '').split(':')[0],
          uploadError: image.getAttribute('data-mp-upload-error') || '',
        }))

        return { previewHadBlock, clipboard, images, presetName: preset.name }
      })()`)

      if (result.error) {
        console.log(`${presetId}: ${result.error}`)
        continue
      }

      const unsafe = result.images.filter(item => item.src && !WECHAT_HOSTED.test(item.src))

      console.log(`\n######## ${presetId}（${result.presetName}）`)
      console.log(`预览里确实有 md-media-block：${result.previewHadBlock}`)
      console.log(`产物 img 数量：${result.images.length}`)
      result.images.forEach((item, index) => {
        console.log(`  [${index}] scheme=${item.scheme} ${item.uploadError ? `上传失败=${item.uploadError}` : ``}`)
      })

      if (unsafe.length) {
        console.log(`\n>>> 复制会被中止：${unsafe.length} 张图不是公众号托管地址`)
        console.log(`    useEditorCopyActions 在 txt 模式下走到这里会 toast.error 并 return，剪贴板一个字都不会写`)
      }
      else {
        console.log(`\n>>> 复制闸门放行`)
      }

      const hasScroller = /overflow-y\s*:\s*auto/i.test(result.clipboard)
      console.log(`产物含滚动视窗：${hasScroller}`)
    }
  }
  finally {
    dispose()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
