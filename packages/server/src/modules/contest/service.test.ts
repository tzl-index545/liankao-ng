import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

const contestFindUnique = mock();

mock.module('../../prisma', () => ({
  prisma: {
    contest: {
      findUnique: contestFindUnique,
    },
  },
}));

let ContestService: typeof import('./service')['ContestService'];

describe('ContestService', () => {
  beforeAll(async () => {
    ({ ContestService } = await import('./service'));
  });

  beforeEach(() => {
    contestFindUnique.mockReset();
  });

  it('returns pre contest ratings stored on participations', async () => {
    contestFindUnique.mockResolvedValue({
      id: 2429,
      participants: [
        {
          id: 1,
          userId: 1,
          contestId: 2429,
          rank: 1,
          totalScore: 300,
          preContestRating: 1514,
          postContestRating: 1525,
          scores: { 1: 100 },
          user: {
            id: 1,
            nickname: 'u1',
            realname: 'User 1',
            xsyusername: 'u1',
          },
        },
        {
          id: 2,
          userId: 2,
          contestId: 2429,
          rank: 2,
          totalScore: 200,
          preContestRating: 1501,
          postContestRating: 1490,
          scores: { 1: 80 },
          user: {
            id: 2,
            nickname: 'u2',
            realname: 'User 2',
            xsyusername: 'u2',
          },
        },
      ],
    });

    const result = await ContestService.getRanklist(2429);

    expect(contestFindUnique).toHaveBeenCalledWith({
      where: { id: 2429 },
      select: {
        id: true,
        participants: {
          select: {
            id: true,
            userId: true,
            contestId: true,
            rank: true,
            totalScore: true,
            preContestRating: true,
            postContestRating: true,
            scores: true,
            user: {
              select: {
                id: true,
                nickname: true,
                realname: true,
                xsyusername: true,
              },
            },
          },
          orderBy: [
            { totalScore: 'desc' },
            { rank: 'asc' },
            { userId: 'asc' },
          ],
        },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data.map((row) => ({
      userId: row.userId,
      preContestRating: row.preContestRating,
      postContestRating: row.postContestRating,
    }))).toEqual([
      { userId: 1, preContestRating: 1514, postContestRating: 1525 },
      { userId: 2, preContestRating: 1501, postContestRating: 1490 },
    ]);
  });

  it('returns problem qualities for contest problem lists', async () => {
    contestFindUnique.mockResolvedValue({
      id: 2437,
      problems: [
        {
          point: 100,
          order: 1,
          problem: {
            id: 10,
            name: 'A',
            description: 'Problem A',
            qualities: 4.25,
          },
        },
        {
          point: 100,
          order: 2,
          problem: {
            id: 11,
            name: 'B',
            description: 'Problem B',
            qualities: null,
          },
        },
      ],
    });

    const result = await ContestService.getProblems(2437);

    expect(contestFindUnique).toHaveBeenCalledWith({
      where: { id: 2437 },
      select: {
        id: true,
        problems: {
          select: {
            point: true,
            order: true,
            problem: {
              select: {
                id: true,
                name: true,
                description: true,
                qualities: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual([
      {
        id: 10,
        name: 'A',
        description: 'Problem A',
        qualities: 4.25,
        point: 100,
        order: 1,
      },
      {
        id: 11,
        name: 'B',
        description: 'Problem B',
        qualities: null,
        point: 100,
        order: 2,
      },
    ]);
  });
});
