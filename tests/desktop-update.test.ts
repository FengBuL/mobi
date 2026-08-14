import { describe, expect, it } from 'vitest'
import {
  formatUpdateProgress,
  shouldPresentUpdate,
} from '@/utils/desktop-update'

describe(`桌面端选择性更新`, () => {
  it(`发现新版时向用户展示更新选择`, () => {
    expect(shouldPresentUpdate({
      status: `available`,
      version: `2.2.0`,
      releaseNotes: `新增应用内更新`,
    }, ``)).toBe(true)
  })

  it(`用户忽略指定版本后不再自动弹出该版本`, () => {
    expect(shouldPresentUpdate({
      status: `available`,
      version: `2.2.0`,
      releaseNotes: `新增应用内更新`,
    }, `2.2.0`)).toBe(false)
  })

  it(`下载中的版本持续显示进度`, () => {
    expect(shouldPresentUpdate({
      status: `downloading`,
      version: `2.2.0`,
      percent: 42.36,
      transferred: 42,
      total: 100,
      bytesPerSecond: 10,
    }, `2.2.0`)).toBe(true)
    expect(formatUpdateProgress(42.36)).toBe(`42.4%`)
  })

  it(`下载完成后允许用户选择重启安装或下次启动安装`, () => {
    expect(shouldPresentUpdate({
      status: `downloaded`,
      version: `2.2.0`,
      releaseNotes: `新增应用内更新`,
    }, `2.2.0`)).toBe(true)
  })
})
