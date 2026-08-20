import { describe, expect, it } from 'bun:test'
import { formatYuantijiProgress, formatYuantijiTimestamp } from './progress'

describe('yuantiji progress output', () => {
  const now = new Date(2026, 7, 20, 13, 2, 3)

  it('formats a local timestamp', () => {
    expect(formatYuantijiTimestamp(now)).toBe('2026-08-20 13:02:03')
  })

  it('puts the timestamp before progress and stage', () => {
    expect(formatYuantijiProgress(12, 274, 123, '开始简化题意', now))
      .toBe('[2026-08-20 13:02:03] [12/274] [题目 123] 开始简化题意')
  })
})
