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
        contest: { type: 1, name: '九月联考第一场', endTime: new Date('2026-09-01T04:00:00Z') }
      },
      {
        id: 2,
        userId: 7,
        contestId: 1002,
        rank: 2,
        preContestRating: 1512,
        postContestRating: 1512,
        contest: { type: 0, name: '练习赛', endTime: new Date('2026-09-02T04:00:00Z') }
      },
      {
        id: 3,
        userId: 7,
        contestId: 1003,
        rank: 3,
        preContestRating: 1512,
        postContestRating: 1504,
        contest: { type: 3, name: '九月联考第二场', endTime: new Date('2026-09-11T04:00:00Z') }
      }
    ])

    const result = await UserService.getRatingHistory(7)

    expect(participationFindMany).toHaveBeenCalledWith({
      where: {
        userId: 7,
        preContestRating: { not: null },
        postContestRating: { not: null }
      },
      orderBy: [
        { contest: { endTime: 'asc' } },
        { contestId: 'asc' },
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
            type: true,
            name: true,
            endTime: true
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
          contestName: '九月联考第一场',
          endTime: '2026-09-01T04:00:00.000Z',
          rank: 1,
          preContestRating: 1500,
          postContestRating: 1512
        },
        {
          id: 3,
          userId: 7,
          contestId: 1003,
          contestName: '九月联考第二场',
          endTime: '2026-09-11T04:00:00.000Z',
          rank: 3,
          preContestRating: 1512,
          postContestRating: 1504
        }
      ]
    })
  })

  it('keeps nullable participation ratings and orders participations by contest end time', async () => {
    participationFindMany.mockResolvedValue([
      {
        id: 2,
        userId: 7,
        contestId: 1002,
        totalScore: 0,
        rank: 2,
        postContestRating: null
      }
    ])

    const result = await UserService.getParticipations(7)

    expect(participationFindMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      orderBy: [
        { contest: { endTime: 'desc' } },
        { contestId: 'desc' }
      ],
      select: {
        id: true,
        userId: true,
        contestId: true,
        totalScore: true,
        rank: true,
        postContestRating: true
      }
    })
    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 2,
          userId: 7,
          contestId: 1002,
          totalScore: 0,
          rank: 2,
          postContestRating: null
        }
      ]
    })
  })

  it('returns the contest title and end time through the validated rating-history route', async () => {
    participationFindMany.mockResolvedValue([{
      id: 1,
      userId: 7,
      contestId: 20,
      rank: 1,
      preContestRating: 1500,
      postContestRating: 1510,
      contest: { type: 1, name: '十月联考', endTime: new Date('2026-10-04T12:00:00+08:00') }
    }])
    const { user } = await import('./index')
    const response = await user.handle(new Request('http://localhost/user/7/ratingHistory'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data[0].contestName).toBe('十月联考')
    expect(body.data[0].endTime).toBe('2026-10-04T04:00:00.000Z')
    expect(body.data[0]).not.toHaveProperty('contest')
  })
})
