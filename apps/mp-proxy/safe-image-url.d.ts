export function isBlockedIPv4(ip: string): boolean
export function isBlockedIPv6(ip: string): boolean
export function isBlockedHostname(hostname: string): boolean
export function parseHttpImageUrl(rawUrl: string): URL
export function assertSafeImageFetchUrl(rawUrl: string): Promise<string>
export function fetchSafeImage(rawUrl: string, options?: { maxRedirects?: number }): Promise<Response>
