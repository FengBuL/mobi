import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const BLOCKED_HOSTNAMES = new Set([
  `localhost`,
  `metadata`,
  `metadata.google.internal`,
  `metadata.google.com`,
  `metadata.gce.internal`,
])

function ipv4ToInt(ip) {
  const parts = ip.split(`.`).map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function ipv4InCidr(ip, cidr, prefix) {
  const ipInt = ipv4ToInt(ip)
  const cidrInt = ipv4ToInt(cidr)
  if (ipInt == null || cidrInt == null) {
    return false
  }
  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0
  return (ipInt & mask) === (cidrInt & mask)
}

export function isBlockedIPv4(ip) {
  return ipv4InCidr(ip, `0.0.0.0`, 8)
    || ipv4InCidr(ip, `10.0.0.0`, 8)
    || ipv4InCidr(ip, `127.0.0.0`, 8)
    || ipv4InCidr(ip, `169.254.0.0`, 16)
    || ipv4InCidr(ip, `172.16.0.0`, 12)
    || ipv4InCidr(ip, `192.168.0.0`, 16)
    || ip === `100.100.100.200`
}

function expandIPv6(ip) {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, ``)
  if (normalized.includes(`.`)) {
    return null
  }

  const [left, right = ``] = normalized.split(`::`)
  const leftParts = left ? left.split(`:`).filter(Boolean) : []
  const rightParts = right ? right.split(`:`).filter(Boolean) : []
  if (leftParts.length + rightParts.length > 8) {
    return null
  }
  const missing = 8 - leftParts.length - rightParts.length
  if (!normalized.includes(`::`) && missing !== 0) {
    return null
  }
  const parts = [
    ...leftParts,
    ...Array.from({ length: Math.max(missing, 0) }, () => `0`),
    ...rightParts,
  ]
  if (parts.length !== 8 || parts.some(part => !/^[0-9a-f]{1,4}$/.test(part))) {
    return null
  }
  return parts.map(part => Number.parseInt(part, 16))
}

export function isBlockedIPv6(ip) {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, ``)
  if (normalized === `::1` || normalized === `::`) {
    return true
  }
  if (normalized.startsWith(`::ffff:`)) {
    const mapped = normalized.slice(`::ffff:`.length)
    return mapped.includes(`.`) ? isBlockedIPv4(mapped) : false
  }

  const parts = expandIPv6(normalized)
  if (!parts) {
    return true
  }
  const first = parts[0]
  if (first === 0 && parts.slice(1, 7).every(part => part === 0) && parts[7] <= 1) {
    return true
  }
  if ((first & 0xFE00) === 0xFC00) {
    return true
  }
  if ((first & 0xFFC0) === 0xFE80) {
    return true
  }
  if ((first & 0xFF00) === 0xFF00) {
    return true
  }
  return false
}

export function isBlockedHostname(hostname) {
  const host = String(hostname || ``).toLowerCase().replace(/^\[|\]$/g, ``)
  if (!host) {
    return true
  }
  if (BLOCKED_HOSTNAMES.has(host)) {
    return true
  }
  if (host.endsWith(`.localhost`) || host.endsWith(`.local`) || host.endsWith(`.internal`)) {
    return true
  }
  const ipVersion = isIP(host)
  if (ipVersion === 4) {
    return isBlockedIPv4(host)
  }
  if (ipVersion === 6) {
    return isBlockedIPv6(host)
  }
  return false
}

export function createBlockedImageUrlError(message, statusCode = 403) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function parseHttpImageUrl(rawUrl) {
  if (!rawUrl) {
    throw createBlockedImageUrlError(`缺少图片地址`, 400)
  }

  let parsed
  try {
    parsed = new URL(rawUrl)
  }
  catch {
    throw createBlockedImageUrlError(`图片地址无效`, 400)
  }

  if (![`http:`, `https:`].includes(parsed.protocol)) {
    throw createBlockedImageUrlError(`只支持抓取 http/https 图片`, 400)
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw createBlockedImageUrlError(`拒绝抓取内网或云元数据地址`, 403)
  }

  return parsed
}

export async function assertSafeImageFetchUrl(rawUrl) {
  const parsed = parseHttpImageUrl(rawUrl)
  const ipVersion = isIP(parsed.hostname)

  if (ipVersion === 4 || ipVersion === 6) {
    return parsed.toString()
  }

  let records
  try {
    records = await lookup(parsed.hostname, { all: true })
  }
  catch {
    throw createBlockedImageUrlError(`图片地址无法解析`, 400)
  }

  for (const record of records) {
    if (record.family === 4 && isBlockedIPv4(record.address)) {
      throw createBlockedImageUrlError(`拒绝抓取内网或云元数据地址`, 403)
    }
    if (record.family === 6 && isBlockedIPv6(record.address)) {
      throw createBlockedImageUrlError(`拒绝抓取内网或云元数据地址`, 403)
    }
  }

  return parsed.toString()
}

export async function fetchSafeImage(rawUrl, { maxRedirects = 5 } = {}) {
  let current = rawUrl

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const safeUrl = await assertSafeImageFetchUrl(current)
    const response = await fetch(safeUrl, { method: `GET`, redirect: `manual` })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get(`location`)
      if (!location) {
        throw createBlockedImageUrlError(`重定向缺少 Location`, 502)
      }
      current = new URL(location, safeUrl).toString()
      continue
    }

    return response
  }

  throw createBlockedImageUrlError(`重定向次数过多`, 502)
}
