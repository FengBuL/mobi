import { describe, expect, it } from 'vitest'

import { formatVersionHistoryLabel } from '../apps/web/src/utils/version-label'

describe('version history label', () => {
  it('shows the current version after the menu title', () => {
    expect(formatVersionHistoryLabel('2.2.0')).toBe('版本历史 v2.2.0')
  })
})
