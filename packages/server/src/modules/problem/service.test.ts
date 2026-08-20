import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const search = mock()
const problemFindMany = mock()
const problemCount = mock()
const transaction = mock()

mock.module('./search', () => ({
  ProblemSearchService: { search },
}))

mock.module('../../prisma', () => ({
  prisma: {
    problem: {
      findMany: problemFindMany,
      count: problemCount,
    },
    $transaction: transaction,
  },
}))

let ProblemService: typeof import('./service')['ProblemService']

describe('ProblemService list search', () => {
  beforeAll(async () => {
    ({ ProblemService } = await import('./service'))
  })

  beforeEach(() => {
    search.mockReset()
    problemFindMany.mockReset()
    problemCount.mockReset()
    transaction.mockReset()
  })

  it('keeps Meilisearch relevance order while loading current SQLite rows', async () => {
    search.mockResolvedValue({ ids: [2, 1], total: 2 })
    problemFindMany.mockResolvedValue([
      { id: 1, name: '慢', description: '', difficulties: null, qualities: null },
      { id: 2, name: '快', description: '', difficulties: null, qualities: null },
    ])

    const result = await ProblemService.list({ q: '图论', page: 1, pageSize: 20 })

    expect(search).toHaveBeenCalledWith('图论', 1, 20, undefined)
    expect(result).toEqual({
      success: true,
      data: {
        items: [
          { id: 2, name: '快', description: '', difficulties: null, qualities: null },
          { id: 1, name: '慢', description: '', difficulties: null, qualities: null },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    })
  })

  it('preserves the existing list path for a whitespace-only query', async () => {
    transaction.mockResolvedValue([0, []])

    const result = await ProblemService.list({ q: '   ', page: 1, pageSize: 20 })

    expect(search).not.toHaveBeenCalled()
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ success: true, data: { items: [], total: 0 } })
  })

  it('returns an explicit unavailable response when Meilisearch fails', async () => {
    search.mockRejectedValue(new Error('connection refused'))

    const result = await ProblemService.list({ q: '二分', page: 1, pageSize: 20 })

    expect(result).toMatchObject({
      code: 503,
      response: {
        success: false,
        message: 'Problem search is temporarily unavailable',
      },
    })
  })
})
