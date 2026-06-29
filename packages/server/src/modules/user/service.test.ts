import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const participationFindMany = mock()

mock.module('../../prisma', () => ({
  prisma: {
    participation: {
      findMany: participationFindMany
    }
  }
}))

let UserService: typeof import('./service')['UserService']

describe('UserService', () => {
  beforeAll(async () => {
    ({ UserService } = await import('./service'))
  })

  beforeEach(() => {
    participationFindMany.mockReset()
  })

  it('omits unrated contests from rating history', async () => {
    participationFindMany.mockResolvedValue([
      {
        id: 1,
        userId: 7,
        contestId: 1001,
        rank: 1,
        preContestRating: 1500,
        postContestRating: 1512,
        contest: { type: 1 }
      },
      {
        id: 2,
        userId: 7,
        contestId: 1002,
        rank: 2,
        preContestRating: 1512,
        postContestRating: 1512,
        contest: { type: 0 }
      },
      {
        id: 3,
        userId: 7,
        contestId: 1003,
        rank: 3,
        preContestRating: 1512,
        postContestRating: 1504,
        contest: { type: 3 }
      }
    ])

    const result = await UserService.getRatingHistory(7)

    expect(participationFindMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      orderBy: [
        { contestId: 'asc' },
        { id: 'asc' }
      ],
      select: {
        id: true,
        userId: true,
        contestId: true,
        rank: true,
        preContestRating: true,
        postContestRating: true,
        contest: {
          select: {
            type: true
          }
        }
      }
    })
    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 1,
          userId: 7,
          contestId: 1001,
          rank: 1,
          preContestRating: 1500,
          postContestRating: 1512
        },
        {
          id: 3,
          userId: 7,
          contestId: 1003,
          rank: 3,
          preContestRating: 1512,
          postContestRating: 1504
        }
      ]
    })
  })
})
