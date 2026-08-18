/**
 * 匿名使用统计的上报端点。
 *
 * 留空 = 完全不采集、不发送任何数据（当前默认状态）。
 *
 * 部署 infra/telemetry-worker 之后，把 Worker 地址填在这里，例如：
 *   export const TELEMETRY_ENDPOINT = `https://mobi-telemetry.xxx.workers.dev`
 * 填上并发版后，统计仍默认关闭；用户可在「设置」里打开。
 */
export const TELEMETRY_ENDPOINT = `https://mobi-telemetry.shovy-mobi.workers.dev`
