import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let prisma: Awaited<typeof import('../prisma')>['prisma'];
let recalculateRatingsFromContest: typeof import('./updateRating')['recalculateRatingsFromContest'];
let syncLeaderboardFromHtml: typeof import('../scraper/updateLeaderboard')['syncLeaderboardFromHtml'];
let tempDir: string;

const anonymizedLeaderboardHtml = `
<html>
  <body>
    <table>
      <tbody>
        <tr>
          <td>Rank</td><td>User</td><td>Real Name</td><td>Total Score</td><td>A</td><td>B</td><td>C</td>
        </tr>
        <tr>
          <td>1</td><td>anon001</td><td>Anonymous 1</td><td>300</td><td>100</td><td>100</td><td>100</td>
        </tr>
        <tr>
          <td>2</td><td>anon002</td><td>Anonymous 2</td><td>300</td><td>100</td><td>100</td><td>100</td>
        </tr>
        <tr>
          <td>3</td><td>anon003</td><td>Anonymous 3</td><td>260</td><td>100</td><td>100</td><td>60</td>
        </tr>
        <tr>
          <td>4</td><td>anon004</td><td>Anonymous 4</td><td>0</td><td>0</td><td>0</td><td>0</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;

function createSchema(dbPath: string): void {
  const db = new Database(dbPath);

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE "User" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "xsytoken" TEXT,
      "xsyusername" TEXT NOT NULL,
      "nickname" TEXT NOT NULL,
      "realname" TEXT NOT NULL,
      "password" TEXT,
      "rating" INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX "User_xsyusername_key" ON "User"("xsyusername");
    CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

    CREATE TABLE "Contest" (
      "id" INTEGER NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "startTime" DATETIME NOT NULL,
      "endTime" DATETIME NOT NULL,
      "qualities" REAL,
      "type" INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE "Problem" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "difficulties" INTEGER,
      "qualities" REAL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL
    );

    CREATE TABLE "ContestProblem" (
      "contestId" INTEGER NOT NULL,
      "problemId" INTEGER NOT NULL,
      "point" INTEGER NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY ("contestId", "problemId"),
      CONSTRAINT "ContestProblem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ContestProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX "ContestProblem_contestId_idx" ON "ContestProblem"("contestId");
    CREATE INDEX "ContestProblem_problemId_idx" ON "ContestProblem"("problemId");

    CREATE TABLE "Participation" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "userId" INTEGER NOT NULL,
      "contestId" INTEGER NOT NULL,
      "totalScore" INTEGER NOT NULL DEFAULT 0,
      "rank" INTEGER NOT NULL,
      "preContestRating" INTEGER,
      "postContestRating" INTEGER,
      "scores" JSONB NOT NULL,
      CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Participation_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE UNIQUE INDEX "Participation_userId_contestId_key" ON "Participation"("userId", "contestId");
    CREATE INDEX "Participation_contestId_idx" ON "Participation"("contestId");
    CREATE INDEX "Participation_userId_idx" ON "Participation"("userId");

    CREATE TABLE "RatingCalculationBatch" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "startContestId" INTEGER NOT NULL,
      "mode" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" DATETIME
    );

    CREATE TABLE "RatingUserChange" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "batchId" INTEGER NOT NULL,
      "contestId" INTEGER NOT NULL,
      "userId" INTEGER NOT NULL,
      "beforeRating" INTEGER NOT NULL,
      "afterRating" INTEGER NOT NULL,
      CONSTRAINT "RatingUserChange_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RatingCalculationBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "RatingUserChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX "RatingUserChange_batchId_idx" ON "RatingUserChange"("batchId");
    CREATE INDEX "RatingUserChange_contestId_idx" ON "RatingUserChange"("contestId");
    CREATE INDEX "RatingUserChange_userId_idx" ON "RatingUserChange"("userId");

  `);

  db.close();
}

async function resetData(): Promise<void> {
  await prisma.ratingUserChange.deleteMany();
  await prisma.ratingCalculationBatch.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.contestProblem.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.contest.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { id: 1, xsyusername: 'u1', nickname: 'u1', realname: 'User 1', rating: 1500 },
      { id: 2, xsyusername: 'u2', nickname: 'u2', realname: 'User 2', rating: 1500 },
      { id: 3, xsyusername: 'u3', nickname: 'u3', realname: 'User 3', rating: 1500 },
    ],
  });

  await prisma.contest.createMany({
    data: [
      {
        id: 101,
        name: 'Contest 101',
        description: '',
        startTime: new Date('2026-01-01T00:00:00Z'),
        endTime: new Date('2026-01-01T02:00:00Z'),
        type: 1,
      },
      {
        id: 102,
        name: 'Contest 102',
        description: '',
        startTime: new Date('2026-01-02T00:00:00Z'),
        endTime: new Date('2026-01-02T02:00:00Z'),
        type: 1,
      },
    ],
  });

  await prisma.participation.createMany({
    data: [
      { id: 1, userId: 1, contestId: 101, totalScore: 100, rank: 1, postContestRating: 1234, scores: {} },
      { id: 2, userId: 2, contestId: 101, totalScore: 100, rank: 1, postContestRating: 1501, scores: {} },
      { id: 3, userId: 3, contestId: 101, totalScore: 50, rank: 3, postContestRating: null, scores: {} },
      { id: 4, userId: 3, contestId: 102, totalScore: 120, rank: 1, postContestRating: null, scores: {} },
      { id: 5, userId: 1, contestId: 102, totalScore: 80, rank: 2, postContestRating: null, scores: {} },
      { id: 6, userId: 2, contestId: 102, totalScore: 80, rank: 2, postContestRating: null, scores: {} },
    ],
  });
}

async function resetLeaderboardData(): Promise<void> {
  await prisma.ratingUserChange.deleteMany();
  await prisma.ratingCalculationBatch.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.contestProblem.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.contest.deleteMany();
  await prisma.user.deleteMany();

  await prisma.contest.create({
    data: {
      id: 2263,
      name: 'Contest 2263',
      description: '',
      startTime: new Date('2026-01-01T00:00:00Z'),
      endTime: new Date('2026-01-01T02:00:00Z'),
      type: 1,
      problems: {
        create: [
          { order: 1, point: 100, problem: { create: { id: 1, name: 'A', description: '' } } },
          { order: 2, point: 100, problem: { create: { id: 2, name: 'B', description: '' } } },
          { order: 3, point: 100, problem: { create: { id: 3, name: 'C', description: '' } } },
        ],
      },
    },
  });
}

async function loadUserRatingSnapshot(userIds: number[]): Promise<Array<{ id: number; rating: number }>> {
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, rating: true },
    orderBy: { id: 'asc' },
  });
}

async function loadUserChangeSnapshot(userIds: number[]): Promise<Array<{
  contestId: number;
  userId: number;
  beforeRating: number;
  afterRating: number;
}>> {
  return prisma.ratingUserChange.findMany({
    where: { userId: { in: userIds } },
    select: {
      contestId: true,
      userId: true,
      beforeRating: true,
      afterRating: true,
    },
    orderBy: [{ contestId: 'asc' }, { userId: 'asc' }],
  });
}

describe('recalculateRatingsFromContest', () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'lkrate-rating-'));
    const dbPath = join(tempDir, 'test.db');
    createSchema(dbPath);

    process.env.DATABASE_URL = `file:${dbPath}`;
    ({ prisma } = await import('../prisma'));
    ({ recalculateRatingsFromContest } = await import('./updateRating'));
    ({ syncLeaderboardFromHtml } = await import('../scraper/updateLeaderboard'));
  });

  beforeEach(async () => {
    await resetData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('prepares rating data before opening the transaction', async () => {
    const originalTransaction = prisma.$transaction.bind(prisma);
    const originalFindMany = prisma.participation.findMany.bind(prisma.participation);
    let insideTransaction = false;
    let transactionOptions: unknown;

    (prisma as any).$transaction = async (arg: unknown, options?: unknown) => {
      transactionOptions = options;
      if (typeof arg !== 'function') {
        return originalTransaction(arg as never, options as never);
      }

      return originalTransaction(async (tx: unknown) => {
        insideTransaction = true;
        try {
          return await (arg as (tx: unknown) => Promise<unknown>)(tx);
        } finally {
          insideTransaction = false;
        }
      });
    };

    (prisma.participation as any).findMany = (args: unknown) => {
      if (insideTransaction) {
        throw new Error('participation reads must not happen inside the rating transaction');
      }
      return originalFindMany(args as never);
    };

    try {
      await expect(recalculateRatingsFromContest(101)).resolves.toBeUndefined();
      expect(transactionOptions).toBeUndefined();
    } finally {
      (prisma as any).$transaction = originalTransaction;
      (prisma.participation as any).findMany = originalFindMany;
    }
  });

  it('persists rating changes and keeps tied ranks as competition ranks', async () => {
    await recalculateRatingsFromContest(101);

    const batch = await prisma.ratingCalculationBatch.findFirstOrThrow();
    expect(batch.startContestId).toBe(101);
    expect(batch.mode).toBe('RECALCULATE_FROM_CONTEST');
    expect(batch.completedAt).toBeInstanceOf(Date);

    expect(await prisma.ratingUserChange.count()).toBe(6);

    const firstContestRanks = await prisma.participation.findMany({
      where: { contestId: 101 },
      select: { userId: true, rank: true, preContestRating: true, postContestRating: true },
      orderBy: { userId: 'asc' },
    });

    expect(firstContestRanks.map((row) => ({ userId: row.userId, rank: row.rank }))).toEqual([
      { userId: 1, rank: 1 },
      { userId: 2, rank: 1 },
      { userId: 3, rank: 3 },
    ]);
    expect(firstContestRanks.every((row) => row.preContestRating === 1500)).toBe(true);
    expect(firstContestRanks.every((row) => row.postContestRating !== null)).toBe(true);

    const users = await prisma.user.findMany({
      select: { id: true, rating: true },
      orderBy: { id: 'asc' },
    });

    for (const user of users) {
      const latestChange = await prisma.ratingUserChange.findFirstOrThrow({
        where: { userId: user.id },
        orderBy: [{ contestId: 'desc' }, { id: 'desc' }],
      });
      expect(user.rating).toBe(latestChange.afterRating);
    }
  });

  it('skips unrated contests for rating and leaves their ranks untouched', async () => {
    await prisma.contest.update({
      where: { id: 101 },
      data: { type: 0 },
    });
    await prisma.participation.updateMany({
      where: { contestId: 101 },
      data: {
        rank: 99,
        preContestRating: 1111,
        postContestRating: 2222,
      },
    });

    await recalculateRatingsFromContest(101);

    const unratedContestRows = await prisma.participation.findMany({
      where: { contestId: 101 },
      select: { userId: true, rank: true, preContestRating: true, postContestRating: true },
      orderBy: { userId: 'asc' },
    });
    expect(unratedContestRows).toEqual([
      { userId: 1, rank: 99, preContestRating: 1111, postContestRating: 2222 },
      { userId: 2, rank: 99, preContestRating: 1111, postContestRating: 2222 },
      { userId: 3, rank: 99, preContestRating: 1111, postContestRating: 2222 },
    ]);

    expect(await prisma.ratingUserChange.count({ where: { contestId: 101 } })).toBe(0);

    const ratedContestRows = await prisma.participation.findMany({
      where: { contestId: 102 },
      select: { userId: true, preContestRating: true, postContestRating: true },
      orderBy: { userId: 'asc' },
    });
    expect(ratedContestRows.every((row) => row.preContestRating === 1500)).toBe(true);
    expect(ratedContestRows.every((row) => row.postContestRating !== null)).toBe(true);

    expect(await prisma.ratingUserChange.count()).toBe(3);
  });

  it('ignores zero-score users while writing their carried rating back to the user table', async () => {
    await recalculateRatingsFromContest(101);
    const baselineRatings = await loadUserRatingSnapshot([1, 2, 3]);
    const baselineChanges = await loadUserChangeSnapshot([1, 2, 3]);

    await resetData();
    // Stale user rating verifies zero-score rows are corrected without rating changes.
    await prisma.user.create({
      data: { id: 4, xsyusername: 'u4', nickname: 'u4', realname: 'User 4', rating: 1700 },
    });
    await prisma.participation.create({
      data: {
        id: 7,
        userId: 4,
        contestId: 101,
        totalScore: 0,
        rank: 4,
        preContestRating: 1666,
        postContestRating: 1777,
        scores: {},
      },
    });

    await recalculateRatingsFromContest(101);

    expect(await loadUserRatingSnapshot([1, 2, 3])).toEqual(baselineRatings);
    expect(await loadUserChangeSnapshot([1, 2, 3])).toEqual(baselineChanges);
    expect(await prisma.ratingUserChange.count()).toBe(6);
    expect(await prisma.ratingUserChange.count({ where: { userId: 4 } })).toBe(0);

    const zeroScoreUser = await prisma.user.findUniqueOrThrow({
      where: { id: 4 },
      select: { rating: true },
    });
    expect(zeroScoreUser.rating).toBe(1500);

    const zeroScoreParticipation = await prisma.participation.findUniqueOrThrow({
      where: { id: 7 },
      select: { rank: true, preContestRating: true, postContestRating: true },
    });
    expect(zeroScoreParticipation).toEqual({ rank: 4, preContestRating: 1500, postContestRating: 1500 });

  });

  it('writes ranks while parsing an anonymized cid 2263 leaderboard shape', async () => {
    await resetLeaderboardData();

    const standings = await syncLeaderboardFromHtml(anonymizedLeaderboardHtml, 2263);

    expect(standings.map((row) => ({
      username: row.username,
      totalScore: row.totalScore,
      rank: row.rank,
    }))).toEqual([
      { username: 'anon001', totalScore: 300, rank: 1 },
      { username: 'anon002', totalScore: 300, rank: 1 },
      { username: 'anon003', totalScore: 260, rank: 3 },
      { username: 'anon004', totalScore: 0, rank: 4 },
    ]);

    expect(await prisma.user.count()).toBe(4);
    expect(await prisma.user.count({ where: { xsyusername: 'User' } })).toBe(0);

    const participations = await prisma.participation.findMany({
      select: {
        rank: true,
        totalScore: true,
        scores: true,
        user: {
          select: { xsyusername: true, realname: true },
        },
      },
      orderBy: [{ rank: 'asc' }, { userId: 'asc' }],
    });

    expect(participations).toEqual([
      {
        rank: 1,
        totalScore: 300,
        scores: { '1': 100, '2': 100, '3': 100 },
        user: { xsyusername: 'anon001', realname: 'Anonymous 1' },
      },
      {
        rank: 1,
        totalScore: 300,
        scores: { '1': 100, '2': 100, '3': 100 },
        user: { xsyusername: 'anon002', realname: 'Anonymous 2' },
      },
      {
        rank: 3,
        totalScore: 260,
        scores: { '1': 100, '2': 100, '3': 60 },
        user: { xsyusername: 'anon003', realname: 'Anonymous 3' },
      },
      {
        rank: 4,
        totalScore: 0,
        scores: { '1': 0, '2': 0, '3': 0 },
        user: { xsyusername: 'anon004', realname: 'Anonymous 4' },
      },
    ]);
  });
});
