import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), `utf8`)
}

describe(`匿名统计默认关闭`, () => {
  it(`没设过开关时不报送，只有显式 true 才打开`, () => {
    const telemetry = readSource(`apps/web/src/utils/telemetry.ts`)
    expect(telemetry).toContain(`默认关闭`)
    expect(telemetry).toContain(`localStorage.getItem(CONSENT_KEY) === \`true\``)
    expect(telemetry).not.toContain(`!== \`false\``)
  })

  it(`界面不再提供匿名统计开关`, () => {
    const settings = readSource(`apps/web/src/components/editor/editor-header/SettingsDropdown.vue`)
    const about = readSource(`apps/web/src/components/editor/editor-header/AboutDialog.vue`)

    expect(settings).not.toContain(`匿名使用统计`)
    expect(settings).not.toContain(`setTelemetryConsent`)
    expect(about).not.toContain(`setTelemetryConsent`)
    expect(about).not.toContain(`匿名使用统计`)
    expect(about).not.toContain(`开关在「设置」`)
  })

  it(`三类 Issue 模板都要求主题、两张截图、是否配图床`, () => {
    const files = [
      `paste-mismatch.yml`,
      `image-lost.yml`,
      `theme-block.yml`,
    ]

    for (const name of files) {
      const text = readSource(`.github/ISSUE_TEMPLATE/${name}`)
      expect(text).toContain(`id: theme`)
      expect(text).toContain(`id: image-host`)
      expect(text).toContain(`id: preview-shot`)
      expect(text).toContain(`id: editor-shot`)
      expect(text.split(`required: true`).length).toBeGreaterThan(4)
    }
  })
})
