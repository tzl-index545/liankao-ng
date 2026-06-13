import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let prisma: Awaited<typeof import('../../prisma')>['prisma'];
let ContestService: typeof import('./service')['ContestService'];
let tempDir: string;

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
      "type" TEXT
    );

    CREATE TABLE "Participation" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "userId" INTEGER NOT NULL,
      "contestId" INTEGER NOT NULL,
      "totalScore" INTEGER NOT NULL DEFAULT 0,
      "rank" INTEGER NOT NULL,
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
      "completedAt" DATETIME,
      "revertedAt" DATETIME
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
  await prisma.contest.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { id: 1, xsyusername: 'u1', nickname: 'u1', realname: 'User 1', rating: 1525 },
      { id: 2, xsyusername: 'u2', nickname: 'u2', realname: 'User 2', rating: 1490 },
      { id: 3, xsyusername: 'u3', nickname: 'u3', realname: 'User 3', rating: 1500 },
    ],
  });

  await prisma.contest.create({
    data: {
      id: 2429,
      name: 'Contest 2429',
      description: '',
      startTime: new Date('2026-01-01T00:00:00Z'),
      endTime: new Date('2026-01-01T02:00:00Z'),
    },
  });

  await prisma.participation.createMany({
    data: [
      { id: 1, userId: 1, contestId: 2429, totalScore: 300, rank: 1, postContestRating: 1525, scores: { 1: 100 } },
      { id: 2, userId: 2, contestId: 2429, totalScore: 200, rank: 2, postContestRating: 1490, scores: { 1: 80 } },
      { id: 3, userId: 3, contestId: 2429, totalScore: 100, rank: 3, postContestRating: null, scores: { 1: 60 } },
    ],
  });

  await prisma.ratingCalculationBatch.createMany({
    data: [
      {
        id: 1,
        startContestId: 2429,
        mode: 'RECALCULATE_FROM_CONTEST',
        completedAt: new Date('2026-01-01T03:00:00Z'),
      },
      {
        id: 2,
        startContestId: 2429,
        mode: 'RECALCULATE_FROM_CONTEST',
        completedAt: new Date('2026-01-02T03:00:00Z'),
      },
      {
        id: 3,
        startContestId: 2429,
        mode: 'RECALCULATE_FROM_CONTEST',
        completedAt: new Date('2026-01-03T03:00:00Z'),
        revertedAt: new Date('2026-01-03T04:00:00Z'),
      },
    ],
  });

  await prisma.ratingUserChange.createMany({
    data: [
      { id: 1, batchId: 1, contestId: 2429, userId: 1, beforeRating: 1500, afterRating: 1510 },
      { id: 2, batchId: 2, contestId: 2429, userId: 1, beforeRating: 1500, afterRating: 1525 },
      { id: 3, batchId: 2, contestId: 2429, userId: 2, beforeRating: 1500, afterRating: 1490 },
      { id: 4, batchId: 3, contestId: 2429, userId: 1, beforeRating: 1600, afterRating: 1700 },
    ],
  });
}

describe('ContestService.getRanklist', () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'lkrate-contest-service-'));
    const dbPath = join(tempDir, 'test.db');
    createSchema(dbPath);

    process.env.DATABASE_URL = `file:${dbPath}`;
    ({ prisma } = await import('../../prisma'));
    ({ ContestService } = await import('./service'));
  });

  beforeEach(async () => {
    await resetData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns pre contest ratings from the latest active rating batch', async () => {
    const result = await ContestService.getRanklist(2429);

    expect(result.success).toBe(true);
    expect(result.data.map((row) => ({
      userId: row.userId,
      preContestRating: row.preContestRating,
      postContestRating: row.postContestRating,
    }))).toEqual([
      { userId: 1, preContestRating: 1500, postContestRating: 1525 },
      { userId: 2, preContestRating: 1500, postContestRating: 1490 },
      { userId: 3, preContestRating: null, postContestRating: null },
    ]);
  });
});
