import { Prisma } from '../generated/prisma/client';
import { prisma } from '../prisma';

import { INITIAL_RATING, isRatedContest, loadPreviousRatings } from './ratingState';
const WRITE_CHUNK_SIZE = 100;

type Contestant = {
  participationId: number;
  userId: number;
  rank: number;
  points: number;
  rating: number;
  needRating: number;
  seed: number;
  delta: number;
};

type ParticipationRatingUpdate = {
  participationId: number;
  preContestRating: number;
  newRating: number;
};

type ParticipationInput = {
  id: number;
  userId: number;
  totalScore: number;
  rank: number;
};

type ContestRatingInput = {
  contestants: Contestant[];
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

function getSeed(contestants: Contestant[], rating: number,contestant: Contestant): number {
  let result = 1;
  for (const other of contestants) {
    if (other === contestant)  continue ;
    result += eloWinProbability(other.rating, rating);
  }
  return result;
}

function getRatingToRank(contestants: Contestant[], targetRank: number, contestant: Contestant): number {
  let left = 1;
  let right = 8000;

  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (getSeed(contestants, mid, contestant) < targetRank) {
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

  for (const contestant of contestants) {
    contestant.delta = 0;
    contestant.seed = 0;
    contestant.needRating = 0;
  }

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
    contestant.needRating = getRatingToRank(contestants, midRank, contestant);
    contestant.delta = Math.trunc((contestant.needRating - contestant.rating) / 2);
  }

  sortByRatingDesc(contestants);

  {
    let sum = 0;
    for (const c of contestants) sum += c.delta;
    const inc = Math.round(-sum / contestants.length);
    for (const c of contestants) c.delta += inc;
  }

  // Make it zero-sum
  // {
  //   const zeroSumCount = Math.min(
  //     Math.trunc(4 * Math.round(Math.sqrt(contestants.length))),
  //     contestants.length,
  //   );
  //   let sum = 0;
  //   for (let i = 0; i < zeroSumCount; i++) sum += contestants[i].delta;
  //   const inc = Math.min(Math.max(Math.trunc(-sum / zeroSumCount), -10), 0);
  //   for (const c of contestants) c.delta += inc;
  // }

  validateDeltas(contestants);
}

async function loadContests(): Promise<Array<{ id: number; endTime: Date; type: number }>> {
  return prisma.contest.findMany({
    select: { id: true, endTime: true, type: true },
    orderBy: [{ endTime: 'asc' }, { id: 'asc' }],
  });
}

function buildContestants(
  rows: ParticipationInput[],
  ratings: Map<number, number>,
): ContestRatingInput {
  const ratedRows = rows.filter((row) => row.totalScore !== 0);
  const ignoredRows = rows.filter((row) => row.totalScore === 0);

  const contestants = ratedRows.map((row) => ({
    participationId: row.id,
    userId: row.userId,
    rank: row.rank,
    points: row.totalScore,
    rating: ratings.get(row.userId) ?? INITIAL_RATING,
    needRating: 0,
    seed: 0,
    delta: 0,
  }));

  const ignoredContestants = ignoredRows.map((row) => ({
    participationId: row.id,
    preContestRating: ratings.get(row.userId) ?? INITIAL_RATING,
    newRating: ratings.get(row.userId) ?? INITIAL_RATING,
  }));

  return {
    contestants,
    ignoredContestants,
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function calculateContestResult(
  input: ContestRatingInput,
  ratings: Map<number, number>,
): ParticipationRatingUpdate[] {
  processContestants(input.contestants);
  return [
    ...input.contestants.map((contestant) => {
      const newRating = contestant.rating + contestant.delta;
      ratings.set(contestant.userId, newRating);
      return {
        participationId: contestant.participationId,
        preContestRating: contestant.rating,
        newRating,
      };
    }),
    ...input.ignoredContestants,
  ];
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
        "preContestRating" = CASE "id"
          ${Prisma.join(chunk.map((c) => Prisma.sql`WHEN ${c.participationId} THEN ${c.preContestRating}`), ' ')}
          ELSE "preContestRating"
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

async function recalculateRatingsFromContest(contestId: number): Promise<void> {
  const contests = await loadContests();
  let startIndex = contests.findIndex((contest) => contest.id === contestId);
  if (startIndex === -1) {
    throw new Error(`Contest ${contestId} not found.`);
  }

  // A first calculation may be requested from the middle of history. Include
  // earlier unsettled contests instead of treating missing results as 1500.
  const previousRatedIds = contests.slice(0, startIndex)
    .filter((contest) => isRatedContest(contest.type)).map((contest) => contest.id);
  if (previousRatedIds.length > 0) {
    const unsettled = await prisma.participation.findFirst({
      where: {
        contestId: { in: previousRatedIds },
        totalScore: { not: 0 },
        OR: [{ preContestRating: null }, { postContestRating: null }],
      },
      orderBy: [{ contest: { endTime: 'asc' } }, { contestId: 'asc' }],
      select: { contestId: true },
    });
    if (unsettled) startIndex = contests.findIndex((contest) => contest.id === unsettled.contestId);
  }

  const affectedContests = contests.slice(startIndex);
  const affectedContestIds = affectedContests.map((contest) => contest.id);
  const ratedContestIds = affectedContests.filter((contest) => isRatedContest(contest.type))
    .map((contest) => contest.id);
  const [users, previousRatings, rows] = await Promise.all([
    prisma.user.findMany({ select: { id: true, rating: true } }),
    startIndex === 0 ? Promise.resolve(new Map<number, number>())
      : loadPreviousRatings(contests[startIndex].id),
    prisma.participation.findMany({
      where: { contestId: { in: ratedContestIds } },
      select: { id: true, contestId: true, userId: true, totalScore: true, rank: true },
    }),
  ]);
  const ratings = new Map(users.map((user) => [user.id, previousRatings.get(user.id) ?? INITIAL_RATING]));
  const rowsByContest = new Map<number, ParticipationInput[]>();
  for (const row of rows) {
    const group = rowsByContest.get(row.contestId) ?? [];
    group.push(row);
    rowsByContest.set(row.contestId, group);
  }

  const results: ParticipationRatingUpdate[] = [];
  for (const contestId of ratedContestIds) {
    const input = buildContestants(rowsByContest.get(contestId) ?? [], ratings);
    results.push(...calculateContestResult(input, ratings));
  }
  // Also restores users whose only rated participation has become unrated.
  const changedRatings = new Map(users.filter((user) => ratings.get(user.id) !== user.rating)
    .map((user) => [user.id, ratings.get(user.id)!]));

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.participation.updateMany({
      where: { contestId: { in: affectedContestIds } },
      data: { preContestRating: null, postContestRating: null },
    });
    await updateParticipations(tx, results);
    await updateUsers(tx, changedRatings);
  });
}

export {
  recalculateRatingsFromContest,
};
