import { Prisma } from '../generated/prisma/client';
import { prisma } from '../prisma';

const INITIAL_RATING = 1500;
const WRITE_CHUNK_SIZE = 100;

type Contestant = {
  participationId: number;
  userId: number;
  previousRank: number;
  previousPostContestRating: number | null;
  rank: number;
  points: number;
  rating: number;
  needRating: number;
  seed: number;
  delta: number;
};

type RatedContestant = Contestant & {
  newRating: number;
};

type ParticipationRatingUpdate = {
  participationId: number;
  userId: number;
  previousRank: number;
  previousPostContestRating: number | null;
  rank: number;
  newRating: number;
};

type ContestRatingInput = {
  contestants: Contestant[];
  ignoredContestants: ParticipationRatingUpdate[];
};

type ContestRatingResult = {
  contestId: number;
  contestants: RatedContestant[];
  ignoredContestants: ParticipationRatingUpdate[];
};

function eloWinProbability(ra: number, rb: number): number {
  return 1.0 / (1 + Math.pow(10, (rb - ra) / 400.0));
}

function sortByPointsDesc(contestants: Contestant[]): void {
  contestants.sort((a, b) => b.points - a.points || a.userId - b.userId);
}

function sortByRatingDesc(contestants: Contestant[]): void {
  contestants.sort((a, b) => b.rating - a.rating || a.userId - b.userId);
}

function reassignRanks(contestants: Contestant[]): void {
  sortByPointsDesc(contestants);
  if (contestants.length === 0) return;

  for (const contestant of contestants) {
    contestant.rank = 0;
    contestant.delta = 0;
    contestant.seed = 0;
    contestant.needRating = 0;
  }

  let rank = 1;
  let points = contestants[0].points;
  contestants[0].rank = rank;
  for (let i = 1; i < contestants.length; i++) {
    if (contestants[i].points < points) {
      rank = i + 1;
      points = contestants[i].points;
    }
    contestants[i].rank = rank;
  }
}

function getSeed(contestants: Contestant[], rating: number): number {
  let result = 1;
  for (const other of contestants) {
    result += eloWinProbability(other.rating, rating);
  }
  return result;
}

function getRatingToRank(contestants: Contestant[], targetRank: number): number {
  let left = 1;
  let right = 8000;

  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (getSeed(contestants, mid) < targetRank) {
      right = mid;
    } else {
      left = mid;
    }
  }

  return left;
}

function validateDeltas(contestants: Contestant[]): void {
  sortByPointsDesc(contestants);

  for (let i = 0; i < contestants.length; i++) {
    for (let j = i + 1; j < contestants.length; j++) {
      const a = contestants[i];
      const b = contestants[j];

      if (a.rating > b.rating && a.rating + a.delta < b.rating + b.delta) {
        throw new Error(`First rating invariant failed: user ${a.userId} vs ${b.userId}`);
      }

      if (a.rating < b.rating && a.delta < b.delta) {
        throw new Error(`Second rating invariant failed: user ${a.userId} vs ${b.userId}`);
      }
    }
  }
}

function processContestants(contestants: Contestant[]): void {
  if (contestants.length === 0) return;

  reassignRanks(contestants);

  for (const a of contestants) {
    a.seed = 1;
    for (const b of contestants) {
      if (a !== b) {
        a.seed += eloWinProbability(b.rating, a.rating);
      }
    }
  }

  for (const contestant of contestants) {
    const midRank = Math.sqrt(contestant.rank * contestant.seed);
    contestant.needRating = getRatingToRank(contestants, midRank);
    contestant.delta = Math.trunc((contestant.needRating - contestant.rating) / 2);
  }

  sortByRatingDesc(contestants);

  {
    let sum = 0;
    for (const c of contestants) sum += c.delta;
    const inc = Math.trunc(-sum / contestants.length) - 1;
    for (const c of contestants) c.delta += inc;
  }

  {
    const zeroSumCount = Math.min(
      Math.trunc(4 * Math.round(Math.sqrt(contestants.length))),
      contestants.length,
    );
    let sum = 0;
    for (let i = 0; i < zeroSumCount; i++) sum += contestants[i].delta;
    const inc = Math.min(Math.max(Math.trunc(-sum / zeroSumCount), -10), 0);
    for (const c of contestants) c.delta += inc;
  }

  validateDeltas(contestants);
}

function rankFromScores(rows: Array<{ userId: number; totalScore: number }>): Map<number, number> {
  const sorted = [...rows].sort((a, b) => b.totalScore - a.totalScore || a.userId - b.userId);
  const rankByUserId = new Map<number, number>();
  if (sorted.length === 0) return rankByUserId;

  let rank = 1;
  let points = sorted[0].totalScore;
  rankByUserId.set(sorted[0].userId, rank);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].totalScore < points) {
      rank = i + 1;
      points = sorted[i].totalScore;
    }
    rankByUserId.set(sorted[i].userId, rank);
  }

  return rankByUserId;
}

async function loadContests(): Promise<Array<{ id: number; endTime: Date }>> {
  return prisma.contest.findMany({
    select: { id: true, endTime: true },
    orderBy: [{ endTime: 'asc' }, { id: 'asc' }],
  });
}

async function loadContestantsFromDb(
  contestId: number,
  ratings: Map<number, number>,
): Promise<ContestRatingInput> {
  const rows = await prisma.participation.findMany({
    where: { contestId },
    select: {
      id: true,
      userId: true,
      totalScore: true,
      rank: true,
      postContestRating: true,
    },
  });

  const ratedRows = rows.filter((row) => row.totalScore !== 0);
  const ignoredRows = rows.filter((row) => row.totalScore === 0);
  const ranks = rankFromScores(ratedRows.map((row) => ({ userId: row.userId, totalScore: row.totalScore })));

  const contestants = ratedRows.map((row) => ({
    participationId: row.id,
    userId: row.userId,
    previousRank: row.rank,
    previousPostContestRating: row.postContestRating,
    rank: ranks.get(row.userId) ?? row.rank,
    points: row.totalScore,
    rating: ratings.get(row.userId) ?? INITIAL_RATING,
    needRating: 0,
    seed: 0,
    delta: 0,
  }));

  const ignoredContestants = ignoredRows.map((row) => ({
    participationId: row.id,
    userId: row.userId,
    previousRank: row.rank,
    previousPostContestRating: row.postContestRating,
    rank: row.rank,
    newRating: ratings.get(row.userId) ?? INITIAL_RATING,
  }));

  return {
    contestants,
    ignoredContestants,
  };
}

async function createBatch(
  tx: Prisma.TransactionClient,
  startContestId: number,
  mode: string,
): Promise<number> {
  const batch = await tx.ratingCalculationBatch.create({
    data: {
      startContestId,
      mode,
    },
    select: { id: true },
  });
  return batch.id;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function calculateContestResult(
  contestId: number,
  input: ContestRatingInput,
  ratings: Map<number, number>,
): ContestRatingResult {
  const contestants = input.contestants;
  processContestants(contestants);

  const ratedContestants = contestants.map((contestant) => {
    const newRating = contestant.rating + contestant.delta;
    ratings.set(contestant.userId, newRating);
    return {
      ...contestant,
      newRating,
    };
  });

  return {
    contestId,
    contestants: ratedContestants,
    ignoredContestants: input.ignoredContestants,
  };
}

async function updateParticipations(
  tx: Prisma.TransactionClient,
  contestants: ParticipationRatingUpdate[],
): Promise<void> {
  for (const chunk of chunkArray(contestants, WRITE_CHUNK_SIZE)) {
    if (chunk.length === 0) continue;

    await tx.$executeRaw`
      UPDATE "Participation"
      SET
        "rank" = CASE "id"
          ${Prisma.join(chunk.map((c) => Prisma.sql`WHEN ${c.participationId} THEN ${c.rank}`), ' ')}
          ELSE "rank"
        END,
        "postContestRating" = CASE "id"
          ${Prisma.join(chunk.map((c) => Prisma.sql`WHEN ${c.participationId} THEN ${c.newRating}`), ' ')}
          ELSE "postContestRating"
        END
      WHERE "id" IN (${Prisma.join(chunk.map((c) => c.participationId))})
    `;
  }
}

async function updateUsers(
  tx: Prisma.TransactionClient,
  userRatings: Map<number, number>,
): Promise<void> {
  const entries = [...userRatings.entries()].map(([userId, rating]) => ({ userId, rating }));

  for (const chunk of chunkArray(entries, WRITE_CHUNK_SIZE)) {
    if (chunk.length === 0) continue;

    await tx.$executeRaw`
      UPDATE "User"
      SET "rating" = CASE "id"
        ${Prisma.join(chunk.map((entry) => Prisma.sql`WHEN ${entry.userId} THEN ${entry.rating}`), ' ')}
        ELSE "rating"
      END
      WHERE "id" IN (${Prisma.join(chunk.map((entry) => entry.userId))})
    `;
  }
}

async function persistRatingResults(
  tx: Prisma.TransactionClient,
  batchId: number,
  results: ContestRatingResult[],
): Promise<void> {
  const participationChanges: Prisma.RatingParticipationChangeCreateManyInput[] = [];
  const userChanges: Prisma.RatingUserChangeCreateManyInput[] = [];
  const participationUpdates: ParticipationRatingUpdate[] = [];
  const finalUserRatings = new Map<number, number>();

  for (const result of results) {
    for (const c of result.contestants) {
      participationChanges.push({
        batchId,
        contestId: result.contestId,
        participationId: c.participationId,
        userId: c.userId,
        beforeRank: c.previousRank,
        afterRank: c.rank,
        beforePostContestRating: c.previousPostContestRating,
        afterPostContestRating: c.newRating,
      });

      userChanges.push({
        batchId,
        contestId: result.contestId,
        userId: c.userId,
        beforeRating: c.rating,
        afterRating: c.newRating,
      });

      participationUpdates.push(c);
      finalUserRatings.set(c.userId, c.newRating);
    }

    for (const c of result.ignoredContestants) {
      participationChanges.push({
        batchId,
        contestId: result.contestId,
        participationId: c.participationId,
        userId: c.userId,
        beforeRank: c.previousRank,
        afterRank: c.rank,
        beforePostContestRating: c.previousPostContestRating,
        afterPostContestRating: c.newRating,
      });

      participationUpdates.push(c);
      finalUserRatings.set(c.userId, c.newRating);
    }
  }

  for (const chunk of chunkArray(participationChanges, WRITE_CHUNK_SIZE)) {
    if (chunk.length > 0) {
      await tx.ratingParticipationChange.createMany({ data: chunk });
    }
  }

  for (const chunk of chunkArray(userChanges, WRITE_CHUNK_SIZE)) {
    if (chunk.length > 0) {
      await tx.ratingUserChange.createMany({ data: chunk });
    }
  }

  await updateParticipations(tx, participationUpdates);
  await updateUsers(tx, finalUserRatings);
}

async function recalculateRatingsFromContest(contestId: number): Promise<void> {
  const contests = await loadContests();
  const startIndex = contests.findIndex((contest) => contest.id === contestId);
  if (startIndex === -1) {
    throw new Error(`Contest ${contestId} not found.`);
  }

  const users = await prisma.user.findMany({ select: { id: true } });
  const ratings = new Map<number, number>();
  for (const user of users) ratings.set(user.id, INITIAL_RATING);

  for (let i = 0; i < startIndex; i++) {
    const contest = contests[i];
    const input = await loadContestantsFromDb(contest.id, ratings);
    if (input.contestants.length === 0) continue;
    calculateContestResult(contest.id, input, ratings);
  }

  const results: ContestRatingResult[] = [];
  for (let i = startIndex; i < contests.length; i++) {
    const contest = contests[i];
    const input = await loadContestantsFromDb(contest.id, ratings);
    if (input.contestants.length === 0 && input.ignoredContestants.length === 0) continue;

    results.push(calculateContestResult(contest.id, input, ratings));
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const batchId = await createBatch(tx, contestId, 'RECALCULATE_FROM_CONTEST');
    await persistRatingResults(tx, batchId, results);

    await tx.ratingCalculationBatch.update({
      where: { id: batchId },
      data: { completedAt: new Date() },
    });
  });
}

async function undoLatestRatingCalculation(): Promise<void> {
  const batch = await prisma.ratingCalculationBatch.findFirst({
    where: { completedAt: { not: null }, revertedAt: null },
    orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
  });

  if (!batch) {
    throw new Error('No completed rating batch found to undo.');
  }

  const userChanges = await prisma.ratingUserChange.findMany({
    where: { batchId: batch.id },
    orderBy: { id: 'desc' },
  });

  const participationChanges = await prisma.ratingParticipationChange.findMany({
    where: { batchId: batch.id },
    orderBy: { id: 'desc' },
  });

  await prisma.$transaction(async (tx) => {
    for (const change of participationChanges) {
      await tx.participation.update({
        where: { id: change.participationId },
        data: {
          rank: change.beforeRank,
          postContestRating: change.beforePostContestRating,
        },
      });
    }

    for (const change of userChanges) {
      await tx.user.update({
        where: { id: change.userId },
        data: { rating: change.beforeRating },
      });
    }

    await tx.ratingCalculationBatch.update({
      where: { id: batch.id },
      data: { revertedAt: new Date() },
    });
  });
}

export {
  recalculateRatingsFromContest,
  undoLatestRatingCalculation,
};
