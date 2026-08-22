import { describe, expect, it } from 'vitest'
import { DEFAULT_MP_PROXY_ORIGIN, OFFICIAL_MP_PROXY_ORIGIN, selectMpProxyOrigin } from '@/services/wechat/proxyOrigin'
import { putPresignedFile } from '@/utils/put-presigned-file'
import { prepareMpProxySubmission, sanitizeStoredMpProxyOrigin, saveAndSelectImageHost, validateMpProxyBeforeSave } from '@/utils/image-host-config'

describe(`图床配置保存`, () => {
  it(`保存公众号配置后将公众号图床设为当前图床`, () => {
    const config = { value: { appID: ``, appsecret: `` } }
    const activeHost = { value: `default` }

    saveAndSelectImageHost(`mp`, config, activeHost, {
      appID: `wx-test`,
      appsecret: `secret-test`,
    })

    expect(config.value).toEqual({
      appID: `wx-test`,
      appsecret: `secret-test`,
    })
    expect(activeHost.value).toBe(`mp`)
  })

  it(`保存 GitHub / R2 配置后也会切到该图床`, () => {
    const github = { value: { repo: ``, accessToken: `` } }
    const r2 = { value: { accountId: ``, bucket: `` } }
    const activeHost = { value: `default` }

    saveAndSelectImageHost(`github`, github, activeHost, {
      repo: `owner/repo`,
      accessToken: `ghp_test`,
    })
    expect(activeHost.value).toBe(`github`)

    saveAndSelectImageHost(`r2`, r2, activeHost, {
      accountId: `acct`,
      bucket: `assets`,
    })
    expect(activeHost.value).toBe(`r2`)
    expect(r2.value).toEqual({
      accountId: `acct`,
      bucket: `assets`,
    })
  })
})

describe(`预签名上传`, () => {
  it(`用 body 发送文件，失败会抛错`, async () => {
    const originalFetch = window.fetch
    const calls: Array<{ url: string, init?: RequestInit }> = []
    window.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return { ok: false, status: 403 } as Response
    }) as typeof fetch

    try {
      await expect(putPresignedFile(`https://example.com/put`, new File([`x`], `a.png`, { type: `image/png` })))
        .rejects
        .toThrow(`上传失败：403`)
      expect(calls[0]?.init?.body).toBeInstanceOf(File)
      expect(calls[0]?.init).not.toHaveProperty(`data`)
    }
    finally {
      window.fetch = originalFetch
    }
  })
})

describe(`公众号图床配置自检`, () => {
  it(`桌面端跳过网页代理检查`, async () => {
    let called = false

    await validateMpProxyBeforeSave({
      requiresProxy: false,
      proxyOrigin: ``,
      requestHealth: async () => {
        called = true
        throw new Error(`桌面端不应请求代理`)
      },
    })

    expect(called).toBe(false)
  })

  it(`网页端保存前确认代理健康`, async () => {
    let requestedUrl = ``

    await validateMpProxyBeforeSave({
      requiresProxy: true,
      proxyOrigin: `http://127.0.0.1:8788/`,
      requestHealth: async (url) => {
        requestedUrl = url
        return { ok: true, status: 200, data: { ok: true, service: `mp-proxy` } }
      },
    })

    expect(requestedUrl).toBe(`http://127.0.0.1:8788/health`)
  })

  it(`网页端代理无法连接时给出可执行提示`, async () => {
    await expect(validateMpProxyBeforeSave({
      requiresProxy: true,
      proxyOrigin: `http://127.0.0.1:8788`,
      requestHealth: async () => {
        throw new TypeError(`Failed to fetch`)
      },
    })).rejects.toThrow(`无法连接公众号代理 http://127.0.0.1:8788，请先启动 mp-proxy`)
  })

  it(`网页端未填代理时拒绝把官方域名当默认`, async () => {
    await expect(validateMpProxyBeforeSave({
      requiresProxy: true,
      proxyOrigin: ``,
    })).rejects.toThrow(`官方代理尚未就绪`)
  })

  it(`网页端代理路径错误时显示 HTTP 状态`, async () => {
    await expect(validateMpProxyBeforeSave({
      requiresProxy: true,
      proxyOrigin: `http://127.0.0.1:5173/mobi`,
      requestHealth: async () => ({ ok: false, status: 404, data: null }),
    })).rejects.toThrow(`代理地址返回 HTTP 404`)
  })
})

describe(`公众号官方代理`, () => {
  it(`运行时默认不再直接等于官方域名`, () => {
    expect(DEFAULT_MP_PROXY_ORIGIN).not.toBe(OFFICIAL_MP_PROXY_ORIGIN)
    expect(selectMpProxyOrigin(``, {
      requiresProxy: true,
      officialOrigin: ``,
    })).toBe(``)
  })

  it(`显式传入官方地址时仍可按该地址请求`, () => {
    expect(selectMpProxyOrigin(``, {
      requiresProxy: true,
      officialOrigin: `https://api.mobieditor.cn`,
    })).toBe(`https://api.mobieditor.cn`)
  })

  it(`高级用户填写的自定义代理优先`, () => {
    expect(selectMpProxyOrigin(`https://self.example.com/`, {
      requiresProxy: true,
      officialOrigin: `https://api.mobieditor.cn`,
    })).toBe(`https://self.example.com`)
  })

  it(`桌面端不注入网页代理`, () => {
    expect(selectMpProxyOrigin(``, {
      requiresProxy: false,
      officialOrigin: `https://api.mobieditor.cn`,
    })).toBe(``)
  })

  it(`官方代理只参与请求且不写入用户配置`, () => {
    expect(prepareMpProxySubmission({
      proxyOrigin: ``,
      appID: `wx-test`,
      appsecret: `secret-test`,
    }, {
      requiresProxy: true,
      officialOrigin: `https://api.mobieditor.cn`,
    })).toEqual({
      requestOrigin: `https://api.mobieditor.cn`,
      storedValues: {
        proxyOrigin: ``,
        appID: `wx-test`,
        appsecret: `secret-test`,
      },
    })
  })

  it(`清理测试版曾写入本地配置的官方代理地址`, () => {
    expect(sanitizeStoredMpProxyOrigin(`https://api.mobieditor.cn/`, [
      `https://api.mobieditor.cn`,
      `http://127.0.0.1:8788`,
    ])).toBe(``)
    expect(sanitizeStoredMpProxyOrigin(`https://self.example.com/`, [
      `https://api.mobieditor.cn`,
      `http://127.0.0.1:8788`,
    ])).toBe(`https://self.example.com`)
  })
})
