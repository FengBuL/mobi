/**
 * 匿名使用统计的上报端点。
 *
 * 留空 = 完全不采集、不发送任何数据。
 *
 * 生产构建通过 VITE_TELEMETRY_ENDPOINT 注入 Worker 地址。
 * 地址注入后，统计默认开启，界面不显示开关。
 */
export const TELEMETRY_ENDPOINT = import.meta.env.VITE_TELEMETRY_ENDPOINT || ``
