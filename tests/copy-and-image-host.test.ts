import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MP_PROXY_ORIGIN, OFFICIAL_MP_PROXY_ORIGIN } from '@/services/wechat/proxyOrigin'
import {
  countUnsafeClipboardImagesFromHtml,
  formatLostWechatImageHint,
  isUnsafeClipboardImage,
} from '@/utils/clipboard-image-status'
import { isBlockedHostname, isBlockedIPv4, parseHttpImageUrl } from '../apps/mp-proxy/safe-image-url.mjs'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`复制未转存图`, () => {
  it(`本地 data/blob 图算未转存，但不因本地图拦截复制`, () => {
    expect(isUnsafeClipboardImage(`data:image/png;base64,aaa`, ``)).toBe(true)
    expect(isUnsafeClipboardImage(`blob:https://example.com/1`, ``)).toBe(true)
    expect(isUnsafeClipboardImage(`https://cdn.example.com/a.png`, ``)).toBe(true)
    expect(isUnsafeClipboardImage(`https://mmbiz.qpic.cn/mmbiz_png/example/0`, ``)).toBe(false)

    const copy = readSource(`apps/web/src/composables/useEditorCopyActions.ts`)
    expect(copy).toContain(`getUnsafeClipboardImages`)
    expect(copy).toContain(`toast.warning`)
    expect(copy).toContain(`不配图床也可以直接贴`)
    expect(copy).toContain(`还没选图床`)
    expect(copy).not.toContain(`会在公众号里丢`)
    expect(copy).not.toMatch(/if \(localImages\.length > 0\) \{[\s\S]*toast\.error[\s\S]*return/)
    expect(copy).not.toContain(`已停止复制`)
  })

  it(`按钮旁常驻还有 N 张不是公众号地址`, () => {
    const html = `
      <p><img src="data:image/png;base64,aaa"></p>
      <p><img src="https://cdn.example.com/a.png"></p>
      <p><img src="https://mmbiz.qpic.cn/mmbiz_png/example/0"></p>
    `
    expect(countUnsafeClipboardImagesFromHtml(html)).toBe(2)
    expect(formatLostWechatImageHint(2)).toBe(`还有 2 张不是公众号地址，微信可能留下或丢掉`)

    const header = readSource(`apps/web/src/components/editor/editor-header/index.vue`)
    expect(header).toContain(`resolveLostImageHint`)
    expect(header).toContain(`lostImageHint`)
    expect(header.indexOf(`v-if="lostImageHint"`)).toBeLessThan(header.indexOf(`mode-switch`))
    expect(header).toContain(`MarkdownGuideDialog`)
    expect(header).toContain(`HelpDropdown`)
  })
})

describe(`插图入口收敛`, () => {
  it(`工具栏、文件菜单和右键第一层都只有一个插图入口`, () => {
    const toolbar = readSource(`apps/web/src/components/editor/MarkdownToolbar.vue`)
    const fileMenu = readSource(`apps/web/src/components/editor/editor-header/FileDropdown.vue`)
    const context = readSource(`apps/web/src/components/editor/EditorContextMenu.vue`)

    expect(toolbar).toContain(`插入图片`)
    expect(toolbar).not.toContain(`批量图片`)
    expect(toolbar).not.toContain(`图片链接`)
    expect(fileMenu).not.toContain(`最近使用的图片`)
    expect(context).toContain(`插入图片`)
    expect(context).not.toContain(`批量插入图片`)
    expect(context).not.toContain(`按链接插入图片`)
    expect(context).not.toContain(`最近使用的图片`)
    expect(context).toContain(`markdown.md`)
  })
})

describe(`图床入口和上传回执`, () => {
  it(`没选图床时指路设置，而不是已经撤掉的插入菜单`, () => {
    const file = readSource(`apps/web/src/utils/file.ts`)
    const editor = readSource(`apps/web/src/views/CodemirrorEditor.vue`)
    expect(file).toContain(`IMAGE_HOST_SETUP_HINT`)
    expect(file).toContain(`设置 → 图床配置`)
    expect(file).not.toContain(`插入 → 插入图片`)
    expect(editor).toContain(`IMAGE_HOST_SETUP_HINT`)
    expect(editor).not.toContain(`插入 → 插入图片`)
  })

  it(`R2 / MinIO 预签名上传用 body，失败不假装成功`, () => {
    const file = readSource(`apps/web/src/utils/file.ts`)
    expect(file).toContain(`await putPresignedFile(presignedUrl, file)`)
    expect(file).toContain(`await putPresignedFile(signedUrl, file)`)
    expect(file).not.toMatch(/data:\s*file/)
    const helper = readSource(`apps/web/src/utils/put-presigned-file.ts`)
    expect(helper).toContain(`body: file`)
    expect(helper).not.toMatch(/data:\s*file/)
  })

  it(`保存 GitHub / OSS / R2 / 自定义图床会切到当前图床`, () => {
    const dialog = readSource(`apps/web/src/components/editor/UploadImgDialog.vue`)
    expect(dialog).toContain(`saveOtherImageHost`)
    expect(dialog).toContain(`saveOtherImageHost(\`github\``)
    expect(dialog).toContain(`saveOtherImageHost(\`aliOSS\``)
    expect(dialog).toContain(`saveOtherImageHost(\`r2\``)
    expect(dialog).toContain(`saveOtherImageHost(\`minio\``)
    expect(dialog).toContain(`已用作当前图床`)

    const custom = readSource(`apps/web/src/components/editor/CustomUploadForm.vue`)
    expect(custom).toContain(`imgHost.value = \`formCustom\``)
    expect(custom).toContain(`已用作当前图床`)
    expect(custom).not.toMatch(/toast\.success\(`保存成功`\)/)
  })

  it(`编辑器拖放不再留未处理的事件覆盖 todo`, () => {
    const editor = readSource(`apps/web/src/views/CodemirrorEditor.vue`)
    expect(editor).toContain(`listDroppedFiles`)
    expect(editor).not.toContain(`todo 处理事件覆盖`)
  })

  it(`插图对话框没选图床时不说会上传，也不能转存`, () => {
    const dialog = readSource(`apps/web/src/components/editor/ImageQuickInsertDialog.vue`)
    expect(dialog).toContain(`还没选图床`)
    expect(dialog).toContain(`设置 → 图床配置`)
    expect(dialog).toContain(`:disabled="!hasImageHost"`)
    expect(dialog).toContain(`不能转存`)
    expect(dialog).toContain(`if (migrateLinks.value && !hasImageHost.value)`)
  })

  it(`导入文案不再假装能收任意网页`, () => {
    const dialog = readSource(`apps/web/src/components/editor/ImportMarkdownDialog.vue`)
    expect(dialog).toContain(`只收 .md / .markdown / .txt`)
    expect(dialog).not.toContain(`任意网页链接`)
  })

  it(`本地 /mobi 缺斜杠会跳到 /mobi/`, () => {
    const vite = readSource(`apps/web/vite.config.ts`)
    const redirects = readSource(`apps/web/public/_redirects`)
    expect(vite).toContain(`redirectBareBase`)
    expect(vite).toContain(`pathname === withoutSlash`)
    expect(vite).toContain(`Location`)
    expect(redirects).toContain(`/mobi         /mobi/        302`)
  })
})

describe(`图床信息架构与密钥风险`, () => {
  it(`第一层是公众号素材库，其余进其他图床，并写明本机密钥风险`, () => {
    const dialog = readSource(`apps/web/src/components/editor/UploadImgDialog.vue`)
    expect(dialog).toContain(`公众号素材库`)
    expect(dialog).toContain(`其他图床`)
    expect(dialog).toContain(`activeName = ref(\`mp\`)`)
    expect(dialog).toContain(`AppSecret / Token 存在本机 localStorage`)
    expect(dialog).toContain(`共用设备或扩展可能被读走`)
    expect(dialog).toContain(`官方代理尚未就绪`)
    expect(dialog).toContain(`API IP 白名单`)
    expect(dialog).toContain(`40164`)
    expect(dialog).toContain(`配不了就不要填`)
    expect(dialog).toContain(`直接复制，图仍是外链`)
    expect(dialog).not.toContain(`填好 AppID 和 AppSecret 就能用`)
    expect(dialog).not.toContain(`留空使用默认服务`)
  })
})

describe(`官方代理门控`, () => {
  it(`生产默认不再直接等于官方域名`, () => {
    const source = readSource(`apps/web/src/services/wechat/proxyOrigin.ts`)
    expect(source).toContain(`OFFICIAL_MP_PROXY_ORIGIN`)
    expect(source).toMatch(/DEV \? DEV_MP_PROXY_ORIGIN : ``/)
    expect(source).not.toMatch(/DEV \? `http:\/\/127\.0\.0\.1:8788` : OFFICIAL_MP_PROXY_ORIGIN/)
    expect(DEFAULT_MP_PROXY_ORIGIN).not.toBe(OFFICIAL_MP_PROXY_ORIGIN)
  })
})

describe(`\/fetch-image 与自定义脚本安全 P0`, () => {
  it(`拒绝内网、环回和云元数据地址`, () => {
    expect(isBlockedIPv4(`127.0.0.1`)).toBe(true)
    expect(isBlockedIPv4(`10.0.0.8`)).toBe(true)
    expect(isBlockedIPv4(`172.16.1.1`)).toBe(true)
    expect(isBlockedIPv4(`172.31.255.1`)).toBe(true)
    expect(isBlockedIPv4(`192.168.1.1`)).toBe(true)
    expect(isBlockedIPv4(`169.254.169.254`)).toBe(true)
    expect(isBlockedIPv4(`100.100.100.200`)).toBe(true)
    expect(isBlockedIPv4(`8.8.8.8`)).toBe(false)
    expect(isBlockedHostname(`localhost`)).toBe(true)
    expect(isBlockedHostname(`::1`)).toBe(true)
    expect(isBlockedHostname(`metadata.google.internal`)).toBe(true)

    expect(() => parseHttpImageUrl(`http://127.0.0.1/secret`)).toThrow(`拒绝抓取内网或云元数据地址`)
    expect(() => parseHttpImageUrl(`http://169.254.169.254/latest/meta-data`)).toThrow(`拒绝抓取内网或云元数据地址`)
    expect(parseHttpImageUrl(`https://mmbiz.qpic.cn/mmbiz_png/example/0`).hostname).toBe(`mmbiz.qpic.cn`)
  })

  it(`代理会在重定向后二次校验，且 ALLOWED_ORIGINS 不再默认 *`, () => {
    const server = readSource(`apps/mp-proxy/server.mjs`)
    const desktop = readSource(`apps/desktop/src/main/wechat.ts`)
    const guard = readSource(`apps/mp-proxy/safe-image-url.mjs`)
    expect(server).toContain(`fetchSafeImage`)
    expect(guard).toContain(`redirect: \`manual\``)
    expect(guard).toContain(`assertSafeImageFetchUrl`)
    expect(server).not.toMatch(/ALLOWED_ORIGINS \|\| `\*`/)
    expect(server).toContain(`不再默认 *`)
    const startLaunchd = readSource(`apps/mp-proxy/start-launchd.sh`)
    const installLaunchd = readSource(`apps/mp-proxy/install-launchd.sh`)
    expect(startLaunchd).not.toContain(`ALLOWED_ORIGINS:-*`)
    expect(installLaunchd).not.toContain(`ALLOWED_ORIGINS:-*`)
    expect(desktop).toContain(`fetchSafeImage`)
    expect(desktop).toContain(`parseHttpImageUrl`)
  })

  it(`自定义图床 new Function 默认关闭`, () => {
    const file = readSource(`apps/web/src/utils/file.ts`)
    expect(file).toContain(`export function isCustomUploadScriptEnabled`)
    expect(file).toContain(`flag === true || flag === \`true\``)
    expect(file).toContain(`formCustomScriptConfirmed`)
    expect(file).toContain(`自定义图床脚本默认关闭`)
    expect(file).toContain(`new Function`)
    const dialog = readSource(`apps/web/src/components/editor/UploadImgDialog.vue`)
    expect(dialog).toContain(`自定义脚本会在本机执行任意 JavaScript`)
    expect(dialog).toContain(`确认后走 new Function`)
    expect(file).not.toMatch(/\beval\(/)
  })
})
