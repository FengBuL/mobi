import type { DesktopBridge } from '@mobi/shared/types/desktop'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowserWechatTransport } from '@/services/wechat/browserTransport'
import { createDesktopWechatTransport } from '@/services/wechat/desktopTransport'

const sentRequests: { url: string, options: any }[] = []
let requestFailure: unknown = null

vi.mock(`@mobi/shared/utils/fetch`, () => ({
  default: (url: string, options: any) => {
    sentRequests.push({ url, options })
    if (requestFailure) {
      return Promise.reject(requestFailure)
    }
    return Promise.resolve({})
  },
}))

const PROXY = `http://127.0.0.1:8788`

function lastRequest() {
  return sentRequests[sentRequests.length - 1]
}

function fakeFile(name = `shot.png`, type = `image/png`) {
  return new File([new Uint8Array([1, 2, 3, 4])], name, { type })
}

beforeEach(() => {
  sentRequests.length = 0
  requestFailure = null
})

/**
 * 桌面版接进来之后，浏览器这条链路必须一个字节都不变——线上用的就是它。
 * 这里把 URL 拼法钉死，改坏了会在这里先响。
 */
describe(`浏览器传输：保持 mp-proxy 的老行为`, () => {
  const transport = createBrowserWechatTransport()

  it(`填了代理时，token 请求打到代理`, async () => {
    await transport.requestStableToken({ appID: `wxid`, appsecret: `secret`, proxyOrigin: PROXY })

    expect(lastRequest().url).toBe(`${PROXY}/cgi-bin/stable_token`)
    expect(lastRequest().options.data).toEqual({
      grant_type: `client_credential`,
      appid: `wxid`,
      secret: `secret`,
    })
  })

  it(`没填代理时，仍然按直连拼 URL`, async () => {
    await transport.requestStableToken({ appID: `wxid`, appsecret: `secret`, proxyOrigin: `` })

    expect(lastRequest().url).toBe(`https://api.weixin.qq.com/cgi-bin/stable_token`)
  })

  it(`代理无法连接时给出启动提示`, async () => {
    requestFailure = new TypeError(`Network Error`)

    await expect(transport.requestStableToken({
      appID: `wxid`,
      appsecret: `secret`,
      proxyOrigin: PROXY,
    })).rejects.toThrow(`无法连接公众号代理 ${PROXY}，请确认 mp-proxy 正在运行`)
  })

  it(`代理路径返回 404 时给出配置提示`, async () => {
    requestFailure = { response: { status: 404 } }

    await expect(transport.requestStableToken({
      appID: `wxid`,
      appsecret: `secret`,
      proxyOrigin: PROXY,
    })).rejects.toThrow(`公众号代理返回 HTTP 404，请检查代理域名`)
  })

  it(`代理地址结尾的斜杠会被吃掉`, async () => {
    await transport.requestStableToken({ appID: `wxid`, appsecret: `secret`, proxyOrigin: `${PROXY}///` })

    expect(lastRequest().url).toBe(`${PROXY}/cgi-bin/stable_token`)
  })

  it(`小图走 uploadimg`, async () => {
    await transport.uploadImage({
      accessToken: `tok`,
      proxyOrigin: PROXY,
      endpoint: `uploadimg`,
      file: fakeFile(),
    })

    expect(lastRequest().url).toBe(`${PROXY}/cgi-bin/media/uploadimg?access_token=tok`)
    expect(lastRequest().options.data).toBeInstanceOf(FormData)
    expect((lastRequest().options.data as FormData).get(`media`)).toBeInstanceOf(File)
  })

  it(`大图走 add_material 并带上 type=image`, async () => {
    await transport.uploadImage({
      accessToken: `tok`,
      proxyOrigin: PROXY,
      endpoint: `add_material`,
      file: fakeFile(`big.gif`, `image/gif`),
    })

    expect(lastRequest().url).toBe(`${PROXY}/cgi-bin/material/add_material?access_token=tok&type=image`)
  })

  it(`上传阶段代理断开时同样给出启动提示`, async () => {
    requestFailure = new TypeError(`Network Error`)

    await expect(transport.uploadImage({
      accessToken: `tok`,
      proxyOrigin: PROXY,
      endpoint: `uploadimg`,
      file: fakeFile(),
    })).rejects.toThrow(`无法连接公众号代理 ${PROXY}，请确认 mp-proxy 正在运行`)
  })

  it(`回源抓图用的就是用户填的代理`, () => {
    expect(transport.resolveImageFetchOrigin(`${PROXY}/`)).toBe(PROXY)
    expect(transport.resolveImageFetchOrigin(``)).toBe(``)
  })

  it(`只有配了代理的网页才给上传结果套图片代理`, () => {
    expect(transport.needsImageDisplayProxy(PROXY)).toBe(true)
    expect(transport.needsImageDisplayProxy(``)).toBe(false)
  })

  it(`外网页面填 localhost 代理会被当场拦下`, () => {
    const location = window.location
    Object.defineProperty(window, `location`, {
      configurable: true,
      value: new URL(`https://md.example.com/md/`),
    })

    expect(() => transport.assertConfigUsable(`http://127.0.0.1:8788`)).toThrow(/局域网 IP/)

    Object.defineProperty(window, `location`, { configurable: true, value: location })
  })
})

describe(`桌面传输：改走 IPC`, () => {
  const calls: { channel: string, payload: any }[] = []

  const bridge: DesktopBridge = {
    version: 1,
    platform: `darwin`,
    imageFetchOrigin: `mobi://app/__mp`,
    folders: {
      choose: async () => null,
      remember: async () => null,
      readDirectory: async () => [],
      readFile: async () => ``,
      writeFile: async () => undefined,
      ensureDirectory: async () => undefined,
      deleteFile: async () => undefined,
      deleteDirectory: async () => undefined,
    },
    wechat: {
      requestStableToken: (payload) => {
        calls.push({ channel: `stable-token`, payload })
        return Promise.resolve({ access_token: `tok`, expires_in: 7200 })
      },
      uploadImage: (payload) => {
        calls.push({ channel: `upload-image`, payload })
        return Promise.resolve({ url: `https://mmbiz.qpic.cn/x.png` })
      },
    },
  }

  const transport = createDesktopWechatTransport(bridge)

  beforeEach(() => {
    calls.length = 0
  })

  it(`token 请求不再经过 HTTP，也不看代理地址`, async () => {
    const result = await transport.requestStableToken({
      appID: `wxid`,
      appsecret: `secret`,
      proxyOrigin: PROXY,
    })

    expect(sentRequests).toHaveLength(0)
    expect(calls[0]).toEqual({ channel: `stable-token`, payload: { appID: `wxid`, appsecret: `secret` } })
    expect(result.access_token).toBe(`tok`)
  })

  it(`会把 File 读成字节再过 IPC`, async () => {
    await transport.uploadImage({
      accessToken: `tok`,
      proxyOrigin: ``,
      endpoint: `uploadimg`,
      file: fakeFile(`shot.png`, `image/png`),
    })

    expect(sentRequests).toHaveLength(0)
    expect(calls[0].payload).toMatchObject({
      accessToken: `tok`,
      endpoint: `uploadimg`,
      filename: `shot.png`,
      contentType: `image/png`,
    })
    expect(Array.from(calls[0].payload.bytes)).toEqual([1, 2, 3, 4])
  })

  it(`回源抓图指向主进程的自定义协议`, () => {
    expect(transport.resolveImageFetchOrigin(PROXY)).toBe(`mobi://app/__mp`)
    expect(transport.resolveImageFetchOrigin(``)).toBe(`mobi://app/__mp`)
  })

  it(`上传结果一律套图片代理，预览才看得到`, () => {
    expect(transport.needsImageDisplayProxy(``)).toBe(true)
  })

  it(`没有代理可填，自检不该抛`, () => {
    expect(() => transport.assertConfigUsable(`http://127.0.0.1:8788`)).not.toThrow()
  })
})
