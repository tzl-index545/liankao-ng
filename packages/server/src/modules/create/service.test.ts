import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

const userFindUnique = mock();
const contestFindUnique = mock();
const contestUpdate = mock();
const recalculateRatingsFromContest = mock();
const syncContestInfo = mock();

mock.module('../../config/env', () => ({
  env: {
    adminNicknames: ['admin'],
  },
}));

mock.module('../../contest/updateRating', () => ({
  recalculateRatingsFromContest,
}));

mock.module('../../scraper/initContest', () => ({
  syncContestInfo,
}));

mock.module('../../prisma', () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
    },
    contest: {
      findUnique: contestFindUnique,
      update: contestUpdate,
    },
  },
}));

let CreateService: typeof import('./service')['CreateService'];

describe('CreateService', () => {
  beforeAll(async () => {
    ({ CreateService } = await import('./service'));
  });

  beforeEach(() => {
    userFindUnique.mockReset();
    contestFindUnique.mockReset();
    contestUpdate.mockReset();
    recalculateRatingsFromContest.mockReset();
    syncContestInfo.mockReset();
  });

  it('reports old statement backfill results after crawling', async () => {
    syncContestInfo.mockResolvedValue({ updated: 87, failed: 3 });

    const result = await CreateService.crawlContest(2446, 'session');

    expect(result).toEqual({
      success: true,
      message: 'Contest 2446 crawled. Backfilled 87 old problem statements; 3 failed.',
    });
    expect(syncContestInfo).toHaveBeenCalledWith('session', 2446);
  });

  it('toggles contest type with xor for admins', async () => {
    userFindUnique.mockResolvedValue({ nickname: 'admin' });
    contestFindUnique.mockResolvedValue({ type: 3 });
    contestUpdate.mockResolvedValue({ id: 2429 });

    const result = await CreateService.toggleContestRated(1, 2429);

    expect(result).toEqual({ success: true });
    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { nickname: true },
    });
    expect(contestFindUnique).toHaveBeenCalledWith({
      where: { id: 2429 },
      select: { type: true },
    });
    expect(contestUpdate).toHaveBeenCalledWith({
      where: { id: 2429 },
      data: { type: 2 },
      select: { id: true },
    });
    expect(recalculateRatingsFromContest).toHaveBeenCalledWith(2429);
  });

  it('rejects non-admin users without updating contest type', async () => {
    userFindUnique.mockResolvedValue({ nickname: 'normal' });

    const result = await CreateService.toggleContestRated(2, 2429);

    expect(result).toMatchObject({
      code: 403,
      response: { success: false },
    });
    expect(contestFindUnique).not.toHaveBeenCalled();
    expect(contestUpdate).not.toHaveBeenCalled();
    expect(recalculateRatingsFromContest).not.toHaveBeenCalled();
  });

  it('reverts contest type when rating recalculation fails after toggle', async () => {
    userFindUnique.mockResolvedValue({ nickname: 'admin' });
    contestFindUnique.mockResolvedValue({ type: 2 });
    contestUpdate.mockResolvedValue({ id: 2429 });
    recalculateRatingsFromContest.mockRejectedValue(new Error('rating failed'));

    const result = await CreateService.toggleContestRated(1, 2429);

    expect(result).toMatchObject({
      code: 500,
      response: { success: false },
    });
    expect(contestUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 2429 },
      data: { type: 3 },
      select: { id: true },
    });
    expect(contestUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 2429 },
      data: { type: 2 },
      select: { id: true },
    });
  });
});
