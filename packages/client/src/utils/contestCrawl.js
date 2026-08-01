export const MAX_CONTEST_CRAWL_COUNT = 50
export const CRAWL_FAILURE_RATE_LIMIT = 0.1

const invalidContestInput = (message) => ({
  valid: false,
  kind: null,
  contestIds: [],
  message
})

export const parseContestCrawlInput = (input) => {
  const value = String(input ?? '').trim()
  if (!value) return invalidContestInput('请输入比赛 ID 或区间')

  const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(value)
  if (!match) {
    return invalidContestInput('比赛 ID 格式无效，请输入单个 ID 或区间（如 10-20）')
  }

  const start = Number(match[1])
  const end = Number(match[2] ?? match[1])
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < 1) {
    return invalidContestInput('比赛 ID 必须是正整数')
  }
  if (start > end) {
    return invalidContestInput('区间起点不能大于终点')
  }

  const count = end - start + 1
  if (count > MAX_CONTEST_CRAWL_COUNT) {
    return invalidContestInput(`一次最多爬取 ${MAX_CONTEST_CRAWL_COUNT} 场比赛`)
  }

  return {
    valid: true,
    kind: match[2] === undefined ? 'single' : 'range',
    contestIds: Array.from({ length: count }, (_, index) => start + index),
    message: ''
  }
}

const getErrorMessage = (error) => {
  return error instanceof Error ? error.message : String(error || '未知错误')
}

export const crawlContestsSequentially = async (
  contestIds,
  crawlContest,
  { onProgress, failureRateLimit = CRAWL_FAILURE_RATE_LIMIT } = {}
) => {
  const requestedIds = [...contestIds]
  const successes = []
  const failures = []
  let stoppedEarly = false

  for (const contestId of requestedIds) {
    try {
      const response = await crawlContest(contestId)
      successes.push({ contestId, response })
    } catch (error) {
      failures.push({ contestId, message: getErrorMessage(error) })
    }

    const attemptedCount = successes.length + failures.length
    const failureRate = failures.length / attemptedCount
    const failureRateExceeded = failureRate > failureRateLimit
    stoppedEarly = failureRateExceeded && attemptedCount < requestedIds.length
    onProgress?.({
      attemptedCount,
      totalCount: requestedIds.length,
      successCount: successes.length,
      failureCount: failures.length,
      failureRate,
      stoppedEarly
    })

    if (failureRateExceeded) break
  }

  const attemptedCount = successes.length + failures.length
  return {
    successes,
    failures,
    attemptedCount,
    totalCount: requestedIds.length,
    unattemptedIds: requestedIds.slice(attemptedCount),
    failureRate: attemptedCount === 0 ? 0 : failures.length / attemptedCount,
    failureRateLimit,
    stoppedEarly
  }
}

const formatContestIds = (contestIds) => {
  if (contestIds.length === 0) return ''

  const ranges = []
  let start = contestIds[0]
  let end = contestIds[0]

  for (const contestId of contestIds.slice(1)) {
    if (contestId === end + 1) {
      end = contestId
      continue
    }

    ranges.push(start === end ? String(start) : `${start}-${end}`)
    start = contestId
    end = contestId
  }

  ranges.push(start === end ? String(start) : `${start}-${end}`)
  return ranges.join(', ')
}

export const formatContestCrawlSummary = (result) => {
  const successIds = result.successes.map(({ contestId }) => contestId)
  const parts = [
    `爬取结束：已尝试 ${result.attemptedCount}/${result.totalCount} 场`,
    `成功 ${result.successes.length} 场`,
    `失败 ${result.failures.length} 场`
  ]

  if (successIds.length > 0) {
    parts.push(`成功 ID：${formatContestIds(successIds)}`)
  }
  if (result.failures.length > 0) {
    parts.push(`失败：${result.failures.map(({ contestId, message }) => `${contestId}（${message}）`).join(', ')}`)
  }
  if (result.stoppedEarly) {
    const failureRate = (result.failureRate * 100).toFixed(1)
    const failureRateLimit = result.failureRateLimit * 100
    parts.push(`前缀失败率 ${failureRate}% 超过 ${failureRateLimit}%，已停止`)
    parts.push(`未尝试 ID：${formatContestIds(result.unattemptedIds)}`)
  }

  return parts.join('；')
}
