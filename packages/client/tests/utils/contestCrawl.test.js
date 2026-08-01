import { describe, expect, it, vi } from 'vitest'
import {
  CRAWL_FAILURE_RATE_LIMIT,
  MAX_CONTEST_CRAWL_COUNT,
  crawlContestsSequentially,
  formatContestCrawlSummary,
  parseContestCrawlInput
} from '../../src/utils/contestCrawl'

describe('contest crawl utilities', () => {
  describe('parseContestCrawlInput', () => {
    it('parses a single contest ID', () => {
      expect(parseContestCrawlInput('10')).toEqual({
        valid: true,
        kind: 'single',
        contestIds: [10],
        message: ''
      })
    })

    it('parses an inclusive range with surrounding spaces', () => {
      expect(parseContestCrawlInput(' 10 - 12 ')).toEqual({
        valid: true,
        kind: 'range',
        contestIds: [10, 11, 12],
        message: ''
      })
    })

    it('rejects unsupported and invalid ranges', () => {
      expect(parseContestCrawlInput('1,3,5').valid).toBe(false)
      expect(parseContestCrawlInput('0').valid).toBe(false)
      expect(parseContestCrawlInput('20-10').valid).toBe(false)
      expect(parseContestCrawlInput(`1-${MAX_CONTEST_CRAWL_COUNT + 1}`).valid).toBe(false)
    })
  })

  describe('crawlContestsSequentially', () => {
    it('crawls every contest in ascending order when all succeed', async () => {
      const crawlContest = vi.fn(async (contestId) => ({ contestId }))

      const result = await crawlContestsSequentially([10, 11, 12], crawlContest)

      expect(crawlContest.mock.calls.map(([contestId]) => contestId)).toEqual([10, 11, 12])
      expect(result.successes.map(({ contestId }) => contestId)).toEqual([10, 11, 12])
      expect(result.failures).toEqual([])
      expect(result.stoppedEarly).toBe(false)
    })

    it('stops immediately when the first contest fails', async () => {
      const crawlContest = vi.fn(async (contestId) => {
        if (contestId === 10) throw new Error('not found')
      })

      const result = await crawlContestsSequentially([10, 11, 12], crawlContest)

      expect(crawlContest).toHaveBeenCalledTimes(1)
      expect(result.failures).toEqual([{ contestId: 10, message: 'not found' }])
      expect(result.unattemptedIds).toEqual([11, 12])
      expect(result.stoppedEarly).toBe(true)
    })

    it('does not report an early stop when no contests remain', async () => {
      const result = await crawlContestsSequentially([10], async () => {
        throw new Error('not found')
      })

      expect(result.unattemptedIds).toEqual([])
      expect(result.stoppedEarly).toBe(false)
      expect(formatContestCrawlSummary(result)).not.toContain('已停止')
    })

    it('continues when the prefix failure rate is exactly 10%', async () => {
      const contestIds = Array.from({ length: 11 }, (_, index) => index + 1)
      const crawlContest = vi.fn(async (contestId) => {
        if (contestId === 10) throw new Error('failed')
      })

      const result = await crawlContestsSequentially(contestIds, crawlContest)

      expect(crawlContest).toHaveBeenCalledTimes(11)
      expect(result.failures).toHaveLength(1)
      expect(result.stoppedEarly).toBe(false)
    })

    it('stops as soon as the prefix failure rate exceeds 10%', async () => {
      const contestIds = Array.from({ length: 12 }, (_, index) => index + 1)
      const crawlContest = vi.fn(async (contestId) => {
        if (contestId === 10 || contestId === 11) throw new Error(`failed ${contestId}`)
      })

      const result = await crawlContestsSequentially(contestIds, crawlContest)

      expect(crawlContest).toHaveBeenCalledTimes(11)
      expect(result.attemptedCount).toBe(11)
      expect(result.failureRate).toBeGreaterThan(CRAWL_FAILURE_RATE_LIMIT)
      expect(result.unattemptedIds).toEqual([12])
      expect(result.stoppedEarly).toBe(true)
    })

    it('reports progress after every attempted contest', async () => {
      const onProgress = vi.fn()

      await crawlContestsSequentially([10, 11], async () => undefined, { onProgress })

      expect(onProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({
        attemptedCount: 1,
        totalCount: 2
      }))
      expect(onProgress).toHaveBeenNthCalledWith(2, expect.objectContaining({
        attemptedCount: 2,
        totalCount: 2
      }))
    })
  })

  it('formats a compact crawl summary', () => {
    const summary = formatContestCrawlSummary({
      successes: [{ contestId: 10 }, { contestId: 11 }],
      failures: [{ contestId: 12, message: 'not found' }],
      attemptedCount: 3,
      totalCount: 5,
      unattemptedIds: [13, 14],
      failureRate: 1 / 3,
      failureRateLimit: CRAWL_FAILURE_RATE_LIMIT,
      stoppedEarly: true
    })

    expect(summary).toContain('成功 ID：10-11')
    expect(summary).toContain('失败：12（not found）')
    expect(summary).toContain('前缀失败率 33.3% 超过 10%，已停止')
    expect(summary).toContain('未尝试 ID：13-14')
  })
})
