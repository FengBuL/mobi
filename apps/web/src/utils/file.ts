import type { WechatUploadEndpoint } from '@md/shared/types/desktop'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fetch from '@md/shared/utils/fetch'
import * as tokenTools from '@md/shared/utils/tokenTools'
import { base64encode, safe64, utf16to8 } from '@md/shared/utils/tokenTools'
import Buffer from 'buffer-from'
import CryptoJS from 'crypto-js'
import * as qiniu from 'qiniu-js'
import { v4 as uuidv4 } from 'uuid'
import { getWechatTransport, normalizeMpProxyOrigin } from '@/services/wechat'
import { store } from './storage'

async function getConfig(platform: string) {
  // load configuration from storage
  const customConfig = await store.getJSON<any>(`${platform}Config`, {}) || {}

  // split username/repo
  const repoUrl = customConfig.repo
    .replace(`https://${platform}.com/`, ``)
    .replace(`http://${platform}.com/`, ``)
    .replace(`${platform}.com/`, ``)
    .split(`/`)
  return {
    username: repoUrl[0],
    repo: repoUrl[1],
    branch: customConfig.branch || `master`,
    accessToken: customConfig.accessToken,
    useCDN: customConfig.useCDN ?? false,
  }
}

/**
 * 获取 `年/月/日` 形式的目录
 * @returns string
 */
function getDir() {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, `0`)
  const day = date.getDate().toString().padStart(2, `0`)
  return `${year}/${month}/${day}`
}

/**
 * 根据文件名获取它以 `时间戳+uuid` 的形式
 * @param {string} filename 文件名
 * @returns {string} `时间戳+uuid`
 */
function getDateFilename(filename: string) {
  const currentTimestamp = Date.now()
  // 获取最后一个点号后的内容作为文件扩展名
  const fileSuffix = filename.split(`.`).pop()
  return `${currentTimestamp}-${uuidv4()}.${fileSuffix}`
}

// -----------------------------------------------------------------------
// GitHub File Upload
// -----------------------------------------------------------------------

async function ghFileUpload(content: string, filename: string) {
  const { username, repo, branch, accessToken, useCDN } = await getConfig(`github`)
  const dir = getDir()
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${dir}/`
  const dateFilename = getDateFilename(filename)
  const request = () => fetch<{ content: {
    download_url: string
  } }, {
    content: {
      download_url: string
    }
    data?: {
      content: {
        download_url: string
      }
    }
  }>({
    url: url + dateFilename,
    method: `put`,
    headers: {
      Authorization: `token ${accessToken}`,
    },
    data: {
      content,
      branch,
      message: `Upload by ${window.location.href}`,
    },
  })

  let res: Awaited<ReturnType<typeof request>>
  try {
    res = await request()
  }
  catch (error) {
    // axios 那句「Request failed with status code 401」对用户没有任何指导意义
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 401 || status === 403) {
      throw new Error(`GitHub 拒绝了这次上传（${status}）。请检查「插入 → 插入图片 → GitHub」里的 Token 是否有效、是否有该仓库的写权限。`)
    }
    throw error
  }
  const githubResourceUrl = `raw.githubusercontent.com/${username}/${repo}/${branch}/`
  const cdnResourceUrl = `fastly.jsdelivr.net/gh/${username}/${repo}@${branch}/`
  res.content = res.data?.content || res.content
  return useCDN
    ? res.content.download_url.replace(githubResourceUrl, cdnResourceUrl)
    : res.content.download_url
}

// -----------------------------------------------------------------------
// Gitee File Upload
// -----------------------------------------------------------------------

async function giteeUpload(content: any, filename: string) {
  const { username, repo, branch, accessToken } = await getConfig(`gitee`)
  const dir = getDir()
  const dateFilename = getDateFilename(filename)
  const url = `https://gitee.com/api/v5/repos/${username}/${repo}/contents/${dir}/${dateFilename}`
  const res = await fetch<{ content: {
    download_url: string
  } }, {
    content: {
      download_url: string
    }
    data: {
      content: {
        download_url: string
      }
    }
  }>({
    url,
    method: `POST`,
    data: {
      content,
      branch,
      access_token: accessToken,
      message: `Upload by ${window.location.href}`,
    },
  })
  res.content = res.data?.content || res.content
  return encodeURI(res.content.download_url)
}

// -----------------------------------------------------------------------
// Qiniu File Upload
// -----------------------------------------------------------------------

function getQiniuToken(accessKey: string, secretKey: string, putPolicy: {
  scope: string
  deadline: number
}) {
  const policy = JSON.stringify(putPolicy)
  const encoded = base64encode(utf16to8(policy))
  const hash = CryptoJS.HmacSHA1(encoded, secretKey)
  const encodedSigned = hash.toString(CryptoJS.enc.Base64)
  return `${accessKey}:${safe64(encodedSigned)}:${encoded}`
}

async function qiniuUpload(file: File) {
  const configStr = await store.get(`qiniuConfig`)
  const { accessKey, secretKey, bucket, region, path, domain } = JSON.parse(configStr!)
  const token = getQiniuToken(accessKey, secretKey, {
    scope: bucket,
    deadline: Math.trunc(Date.now() / 1000) + 3600,
  })
  const dir = path ? `${path}/` : ``
  const dateFilename = dir + getDateFilename(file.name)
  const observable = qiniu.upload(file, dateFilename, token, {}, { region })
  return new Promise<string>((resolve, reject) => {
    observable.subscribe({
      next: (result) => {
        console.log(result)
      },
      error: (err) => {
        reject(err.message)
      },
      complete: (result) => {
        resolve(`${domain}/${result.key}`)
      },
    })
  })
}

// -----------------------------------------------------------------------
// AliOSS File Upload
// -----------------------------------------------------------------------

async function aliOSSFileUpload(file: File) {
  const dateFilename = getDateFilename(file.name)
  const config = await store.getJSON(`aliOSSConfig`, { region: ``, bucket: ``, accessKeyId: ``, accessKeySecret: ``, useSSL: true, cdnHost: ``, path: `` })
  const { region, bucket, accessKeyId, accessKeySecret, useSSL, cdnHost, path }
    = config || { region: ``, bucket: ``, accessKeyId: ``, accessKeySecret: ``, useSSL: true, cdnHost: ``, path: `` }

  // Transform aliOSSConfig to s3Config format
  // Aliyun OSS endpoints follow pattern: https://<bucket>.<region>.aliyuncs.com or https://<region>.aliyuncs.com
  const secure = useSSL === undefined || useSSL
  const protocol = secure ? `https` : `http`
  const endpoint = `${protocol}://${region}.aliyuncs.com`

  const clientConfig: any = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey: accessKeySecret,
    },
    endpoint,
    forcePathStyle: false, // OSS recommends virtual-hosted style
  }

  const s3Client = new S3Client(clientConfig)

  const dir = path ? `${path}/` : ``
  const key = dir + dateFilename

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: file.type,
  })

  try {
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
    const response = await window.fetch(presignedUrl, {
      method: `PUT`,
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    if (cdnHost) {
      const host = cdnHost.endsWith(`/`) ? cdnHost.slice(0, -1) : cdnHost
      return `${host}/${key}`
    }

    // Default OSS URL format
    return `${protocol}://${bucket}.${region}.aliyuncs.com/${key}`
  }
  catch (e) {
    return Promise.reject(e)
  }
}

// -----------------------------------------------------------------------
// TxCOS File Upload
// -----------------------------------------------------------------------

async function txCOSFileUpload(file: File) {
  const dateFilename = getDateFilename(file.name)
  const configStr = await store.get(`txCOSConfig`)
  const { secretId, secretKey, bucket, region, path, cdnHost } = JSON.parse(configStr!)

  // Transform txCOSConfig to S3 format
  // Tencent Cloud COS S3 endpoint: https://cos.<Region>.myqcloud.com
  const endpoint = `https://cos.${region}.myqcloud.com`

  const clientConfig: any = {
    region,
    credentials: {
      accessKeyId: secretId,
      secretAccessKey: secretKey,
    },
    endpoint,
    forcePathStyle: false, // COS supports virtual-hosted style
  }

  const s3Client = new S3Client(clientConfig)

  const dir = path ? `${path}/` : ``
  const key = dir + dateFilename

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: file.type,
  })

  try {
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
    const response = await window.fetch(presignedUrl, {
      method: `PUT`,
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    if (cdnHost) {
      return path === ``
        ? `${cdnHost}/${dateFilename}`
        : `${cdnHost}/${path}/${dateFilename}`
    }

    // Default COS URL: https://<BucketName-APPID>.cos.<Region>.myqcloud.com/<Key>
    // The 'bucket' param in COS usually is 'name-appid', if not, user might need to check.
    // However, for S3 client, we just use the bucket name provided.

    return `https://${bucket}.cos.${region}.myqcloud.com/${key}`
  }
  catch (e) {
    return Promise.reject(e)
  }
}

// -----------------------------------------------------------------------
// Minio File Upload
// -----------------------------------------------------------------------

async function minioFileUpload(file: File) {
  const dateFilename = getDateFilename(file.name)
  const configStr = await store.get(`minioConfig`)
  const { endpoint, port, useSSL, bucket, accessKey, secretKey } = JSON.parse(configStr!)
  const s3Client = new S3Client({
    endpoint: `${useSSL ? `https` : `http`}://${endpoint}${port ? `:${port}` : ``}`,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    region: `auto`,
    forcePathStyle: true,
  })

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: dateFilename,
    ContentType: file.type,
  })
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
  await fetch(presignedUrl, {
    method: `PUT`,
    headers: {
      'Content-Type': file.type,
    },
    data: file,
  }).catch((err) => { console.log(err) })
  return `${useSSL ? `https` : `http`}://${endpoint}${port ? `:${port}` : ``}/${bucket}/${dateFilename}`
}

// -----------------------------------------------------------------------
// S3 File Upload
// -----------------------------------------------------------------------

const PROTOCOL_REGEX = /^https?:\/\//

async function s3Upload(file: File) {
  const dateFilename = getDateFilename(file.name)
  const config = await store.getJSON(`s3Config`, {
    endpoint: ``,
    region: ``,
    bucket: ``,
    accessKeyId: ``,
    accessKeySecret: ``,
    path: ``,
    cdnHost: ``,
    pathStyle: false,
  })
  const { endpoint, region, bucket, accessKeyId, accessKeySecret, path, cdnHost, pathStyle } = config

  const clientConfig: any = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey: accessKeySecret,
    },
    forcePathStyle: pathStyle,
  }

  if (endpoint) {
    clientConfig.endpoint = endpoint.startsWith(`http`) ? endpoint : `https://${endpoint}`
  }

  const s3Client = new S3Client(clientConfig)

  const dir = path ? `${path}/` : ``
  const key = dir + dateFilename

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: file.type,
  })

  try {
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
    const response = await window.fetch(presignedUrl, {
      method: `PUT`,
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    if (cdnHost) {
      const host = cdnHost.endsWith(`/`) ? cdnHost.slice(0, -1) : cdnHost
      return `${host}/${key}`
    }

    if (endpoint) {
      const proto = clientConfig.endpoint.startsWith(`https`) ? `https` : `http`
      const host = clientConfig.endpoint.replace(PROTOCOL_REGEX, ``)
      if (pathStyle) {
        return `${proto}://${host}/${bucket}/${key}`
      }
      else {
        return `${proto}://${bucket}.${host}/${key}`
      }
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
  }
  catch (err) {
    console.error(err)
    throw err
  }
}

// -----------------------------------------------------------------------
// mp File Upload
// -----------------------------------------------------------------------

async function getMpToken(appID: string, appsecret: string, proxyOrigin: string) {
  const transport = getWechatTransport()
  // 配置自检要赶在缓存命中之前：代理填错时，拿旧 token 去传只会换来一条看不懂的网络错误
  transport.assertConfigUsable(proxyOrigin)

  const data = await store.get(`mpToken:${appID}`)
  if (data) {
    const token = JSON.parse(data)
    if (token.expire && token.expire > Date.now()) {
      return token.access_token
    }
  }

  const res = await transport.requestStableToken({ appID, appsecret, proxyOrigin })
  if (res.access_token) {
    const tokenInfo = {
      ...res,
      expire: Date.now() + (res.expires_in ?? 0) * 1000,
    }
    await store.setJSON(`mpToken:${appID}`, tokenInfo)
    return res.access_token
  }

  throw new Error(res.errmsg || `获取 access_token 失败`)
}
// Cloudflare Workers 环境
const isCfWorkers = import.meta.env.CF_WORKERS === `1`

async function mpFileUpload(file: File) {
  const configStr = await store.get(`mpConfig`)
  let { appID, appsecret, proxyOrigin } = JSON.parse(configStr!)
  proxyOrigin = normalizeMpProxyOrigin(proxyOrigin)
  // 未填写代理域名且是 Cloudflare Workers 环境时，使用当前域名作为代理域名
  if (!proxyOrigin && isCfWorkers) {
    proxyOrigin = window.location.origin
  }
  const access_token = await getMpToken(appID, appsecret, proxyOrigin)
  if (!access_token) {
    throw new Error(`获取 access_token 失败`)
  }

  const fileSizeInMB = file.size / (1024 * 1024)
  const fileType = file.type.toLowerCase()
  const endpoint: WechatUploadEndpoint
    = fileSizeInMB < 1 && (fileType === `image/jpeg` || fileType === `image/png`)
      ? `uploadimg`
      : `add_material`

  const transport = getWechatTransport()
  const res = await transport.uploadImage({
    accessToken: access_token,
    proxyOrigin,
    endpoint,
    file,
  })

  if (!res.url) {
    throw new Error(res.errmsg || `上传失败，未获取到URL`)
  }

  return transport.needsImageDisplayProxy(proxyOrigin)
    ? `https://wsrv.nl?url=${encodeURIComponent(res.url)}`
    : res.url
}

export async function hasMpUploadConfig() {
  const configStr = await store.get(`mpConfig`)
  if (!configStr) {
    return false
  }

  try {
    const { appID, appsecret } = JSON.parse(configStr)
    return Boolean(appID && appsecret)
  }
  catch {
    return false
  }
}

export async function uploadFileToMp(file: File) {
  return mpFileUpload(file)
}

export async function getMpUploadConfig() {
  const configStr = await store.get(`mpConfig`)
  if (!configStr) {
    return null
  }

  try {
    const { appID, appsecret, proxyOrigin } = JSON.parse(configStr)
    return {
      appID: appID || ``,
      appsecret: appsecret || ``,
      // 复制链路拿这个值去回源抓图，桌面版换成主进程的自定义协议
      proxyOrigin: getWechatTransport().resolveImageFetchOrigin(proxyOrigin || ``),
    }
  }
  catch {
    return null
  }
}

// -----------------------------------------------------------------------
// Cloudflare R2 File Upload
// -----------------------------------------------------------------------

async function r2Upload(file: File) {
  const configStr = await store.get(`r2Config`)
  const { accountId, accessKey, secretKey, bucket, path, domain } = JSON.parse(configStr!)
  const dir = path ? `${path}/` : ``
  const filename = dir + getDateFilename(file.name)
  const client = new S3Client({ region: `auto`, endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } })
  const signedUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: filename, ContentType: file.type }),
    { expiresIn: 300 },
  )
  await fetch(signedUrl, {
    method: `PUT`,
    headers: {
      'Content-Type': file.type,
    },
    data: file,
  }).catch((err) => { console.log(err) })
  return `${domain}/${filename}`
}

// -----------------------------------------------------------------------
// Upyun File Upload
// -----------------------------------------------------------------------

async function upyunUpload(file: File) {
  const configStr = await store.get(`upyunConfig`)
  const { bucket, operator, password, path, domain } = JSON.parse(configStr!)
  const filename = `${path}/${getDateFilename(file.name)}`
  const uri = `/${bucket}/${filename}`
  const arrayBuffer = await file.arrayBuffer()
  const date = new Date().toUTCString()
  const method = `PUT`
  const signStr = [method, uri, date].join(`&`)
  const passwordMd5 = CryptoJS.MD5(password).toString()
  const signature = CryptoJS.HmacSHA1(signStr, passwordMd5).toString(CryptoJS.enc.Base64)
  const authorization = `UPYUN ${operator}:${signature}`
  const url = `https://v0.api.upyun.com${uri}`
  const res = await window.fetch(url, {
    method: `PUT`,
    headers: {
      'Authorization': authorization,
      'X-Date': date,
      'Content-Type': file.type,
    },
    body: arrayBuffer,
  })

  if (!res.ok) {
    throw new Error(`上传失败: ${await res.text()}`)
  }

  return `${domain}/${filename}`
}

// -----------------------------------------------------------------------
// Telegram File Upload
// -----------------------------------------------------------------------
async function telegramUpload(file: File): Promise<string> {
  const config = await store.getJSON(`telegramConfig`, { token: ``, chatId: `` })
  const { token, chatId } = config || { token: ``, chatId: `` }

  // 1. sendPhoto
  const form = new FormData()
  form.append(`chat_id`, chatId)
  form.append(`photo`, file, file.name)

  const sendRes = await fetch<any, {
    ok: boolean
    result: {
      photo: { file_id: string }[]
    }
  }>({
    url: `https://api.telegram.org/bot${token}/sendPhoto`,
    method: `POST`,
    data: form,
  })

  if (!sendRes.ok || !sendRes.result.photo.length) {
    throw new Error(`Telegram sendPhoto 失败`)
  }
  // 取最大的分辨率那张图
  const fileId = sendRes.result.photo[sendRes.result.photo.length - 1].file_id

  // 2. getFile
  const fileRes = await fetch<any, {
    ok: boolean
    result: { file_path: string }
  }>({
    url: `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
    method: `GET`,
  })
  if (!fileRes.ok) {
    throw new Error(`Telegram getFile 失败`)
  }

  const filePath = fileRes.result.file_path
  // 3. 拼出下载地址
  return `https://api.telegram.org/file/bot${token}/${filePath}`
}

// -----------------------------------------------------------------------
// Cloudinary File Upload
// -----------------------------------------------------------------------

/**
 * cloudinaryConfig 配置示例：
 * {
 *   "cloudName": "demo",
 *   "apiKey": "1234567890",
 *   "apiSecret": "abcdefg1234567890",     // 可选：若未填写则走 unsigned preset
 *   "uploadPreset": "unsigned_preset",     // 可选：有 apiSecret 时可省略
 *   "folder": "blog/image",                // 可选：Cloudinary 目录，留空则根路径
 *   "domain": "https://cdn.example.com"    // 可选：自定义访问域名 / CDN 域名
 * }
 */
async function cloudinaryUpload(file: File): Promise<string> {
  const config = await store.getJSON(`cloudinaryConfig`, { cloudName: ``, apiKey: ``, apiSecret: ``, uploadPreset: ``, folder: ``, domain: `` })
  const {
    cloudName,
    apiKey,
    apiSecret,
    uploadPreset,
    folder = ``,
    domain,
  } = config || { cloudName: ``, apiKey: ``, apiSecret: ``, uploadPreset: ``, folder: ``, domain: `` }

  if (!cloudName || !apiKey)
    throw new Error(`Cloudinary 配置缺少 cloudName / apiKey`)

  const timestamp = Math.floor(Date.now() / 1000) // Cloudinary 要求秒级时间戳
  const formData = new FormData()
  formData.append(`file`, file)
  formData.append(`api_key`, apiKey)
  formData.append(`timestamp`, `${timestamp}`)

  // ---------- 1) 需要签名的场景 ----------
  if (apiSecret) {
    // 参与签名的字段需按字典序排列并拼接成 a=b&c=d… 的格式
    const params: string[] = []
    if (folder)
      params.push(`folder=${folder}`)
    if (uploadPreset)
      params.push(`upload_preset=${uploadPreset}`)
    params.push(`timestamp=${timestamp}`)

    const signatureBase = params.sort().join(`&`)
    const signature = CryptoJS.SHA1(signatureBase + apiSecret).toString()
    formData.append(`signature`, signature)
  }
  // ---------- 2) unsigned preset ----------
  else if (uploadPreset) {
    formData.append(`upload_preset`, uploadPreset)
  }
  else {
    throw new Error(`未配置 apiSecret 时必须提供 uploadPreset`)
  }

  if (folder)
    formData.append(`folder`, folder)

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  const res = await fetch<any, { secure_url?: string, url?: string }>(uploadUrl, {
    method: `POST`,
    data: formData,
  })

  const originUrl = res.secure_url || res.url
  if (!originUrl)
    throw new Error(`Cloudinary 返回缺少 url 字段`)

  // 如果配置了自定义域名，则把 host 换掉
  if (domain) {
    const { pathname, search } = new URL(originUrl)
    return `${domain}${pathname}${search}`
  }

  return originUrl
}

// -----------------------------------------------------------------------
// formCustom File Upload
// -----------------------------------------------------------------------

async function formCustomUpload(content: string, file: File) {
  const customConfig = await store.get(`formCustomConfig`)
  const str = `
    async (CUSTOM_ARG) => {
      ${customConfig}
    }
  `
  return new Promise<string>((resolve, reject) => {
    const exportObj = {
      content, // 待上传图片的 base64
      file, // 待上传图片的 file 对象
      util: {
        axios: fetch, // axios 实例
        CryptoJS, // 加密库
        // OSS, // OSS references removed
        // COS, // COS references removed
        Buffer, // buffer-from
        uuidv4, // uuid
        qiniu, // qiniu-js
        tokenTools, // 一些编码转换函数
        getDir, // 获取 年/月/日 形式的目录
        getDateFilename, // 根据文件名获取它以 时间戳+uuid 的形式
        S3: {
          S3Client,
          PutObjectCommand,
          getSignedUrl,
        },
      },
      okCb: resolve, // 重要: 上传成功后给此回调传 url 即可
      errCb: reject, // 上传失败调用的函数
    }
    // Use Function constructor instead of eval
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return ${str}`)()
    fn(exportObj).catch((err: any) => {
      console.error(err)
      reject(err)
    })
  })
}

export async function fileUpload(content: string, file: File) {
  const imgHost = await store.get(`imgHost`)
  switch (imgHost) {
    case `aliOSS`:
      return aliOSSFileUpload(file)
    case `minio`:
      return minioFileUpload(file)
    case `s3`:
      return s3Upload(file)
    case `txCOS`:
      return txCOSFileUpload(file)
    case `qiniu`:
      return qiniuUpload(file)
    case `gitee`:
      return giteeUpload(content, file.name)
    case `github`:
      return ghFileUpload(content, file.name)
    case `mp`:
      return mpFileUpload(file)
    case `r2`:
      return r2Upload(file)
    case `upyun`:
      return upyunUpload(file)
    case `telegram`:
      return telegramUpload(file)
    case `cloudinary`:
      return cloudinaryUpload(file)
    case `formCustom`:
      return formCustomUpload(content, file)
    default:
      // 曾经这里有一个「默认图床」，走的是内置在仓库里的公共 GitHub 令牌。
      // 公开仓库里的令牌会被 GitHub 的密钥扫描吊销，那批令牌已经全部 401，
      // 与其让用户撞一个看不懂的错误码，不如直接要求先选一个图床。
      throw new Error(`还没有选择图床。请在「插入 → 插入图片」里选一个（推荐阿里云 OSS 或 Cloudflare R2），填好配置后再上传。`)
  }
}
