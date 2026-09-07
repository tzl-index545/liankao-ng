import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

const contestFindUnique = mock();
const queryRaw = mock();

mock.module('../../prisma', () => ({
  prisma: {
    $queryRaw: queryRaw,
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
    queryRaw.mockReset();
  });

  it('returns pre contest ratings stored on participations', async () => {
    contestFindUnique.mockResolvedValue({
      id: 2429,
      type: 1,
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
        type: true,
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
    if ('code' in result) throw new Error('expected a successful ranklist response');
    expect(queryRaw).not.toHaveBeenCalled();
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

  it('keeps unsettled rated results null instead of inventing a zero change', async () => {
    contestFindUnique.mockResolvedValue({
      id: 2429, type: 1,
      participants: [{ userId: 1, preContestRating: null, postContestRating: null, scores: {} }],
    });
    const result = await ContestService.getRanklist(2429);
    if ('code' in result) throw new Error('expected a successful response');
    expect(result.data[0].preContestRating).toBeNull();
    expect(result.data[0].postContestRating).toBeNull();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('returns historical ratings for unrated participants in one query', async () => {
    contestFindUnique.mockResolvedValue({
      id: 2429, type: 2,
      participants: [
        { userId: 1, preContestRating: 999, postContestRating: 888, scores: {} },
        { userId: 2, preContestRating: null, postContestRating: null, scores: {} },
      ],
    });
    queryRaw.mockResolvedValue([{ userId: 1, rating: 1620 }]);
    const result = await ContestService.getRanklist(2429);
    if ('code' in result) throw new Error('expected a successful response');
    expect(result.data.map((row) => [row.preContestRating, row.postContestRating])).toEqual([
      [1620, 1620], [1500, 1500],
    ]);
    expect(queryRaw).toHaveBeenCalledTimes(1);
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
    if ('code' in result) throw new Error('expected a successful problem list response');
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
