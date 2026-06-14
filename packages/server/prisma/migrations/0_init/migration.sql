-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "xsytoken" TEXT,
    "xsyusername" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "realname" TEXT NOT NULL,
    "password" TEXT,
    "rating" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "difficulties" INTEGER,
    "qualities" REAL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "qualities" REAL,
    "type" TEXT
);

-- CreateTable
CREATE TABLE "ContestProblem" (
    "contestId" INTEGER NOT NULL,
    "problemId" INTEGER NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("contestId", "problemId"),
    CONSTRAINT "ContestProblem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContestProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Vote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "contestId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProblemVote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "problemId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProblemVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProblemVote_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RatingCalculationBatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startContestId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "revertedAt" DATETIME
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "RatingParticipationChange" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batchId" INTEGER NOT NULL,
    "contestId" INTEGER NOT NULL,
    "participationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "beforeRank" INTEGER NOT NULL,
    "afterRank" INTEGER NOT NULL,
    "beforePostContestRating" INTEGER,
    "afterPostContestRating" INTEGER,
    CONSTRAINT "RatingParticipationChange_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RatingCalculationBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RatingParticipationChange_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RatingParticipationChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_xsyusername_key" ON "User"("xsyusername");

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE INDEX "ContestProblem_contestId_idx" ON "ContestProblem"("contestId");

-- CreateIndex
CREATE INDEX "ContestProblem_problemId_idx" ON "ContestProblem"("problemId");

-- CreateIndex
CREATE INDEX "Participation_contestId_idx" ON "Participation"("contestId");

-- CreateIndex
CREATE INDEX "Participation_userId_idx" ON "Participation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_userId_contestId_key" ON "Participation"("userId", "contestId");

-- CreateIndex
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");

-- CreateIndex
CREATE INDEX "Vote_contestId_idx" ON "Vote"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_contestId_key" ON "Vote"("userId", "contestId");

-- CreateIndex
CREATE INDEX "ProblemVote_userId_idx" ON "ProblemVote"("userId");

-- CreateIndex
CREATE INDEX "ProblemVote_problemId_idx" ON "ProblemVote"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemVote_userId_problemId_key" ON "ProblemVote"("userId", "problemId");

-- CreateIndex
CREATE INDEX "RatingCalculationBatch_createdAt_idx" ON "RatingCalculationBatch"("createdAt");

-- CreateIndex
CREATE INDEX "RatingCalculationBatch_completedAt_idx" ON "RatingCalculationBatch"("completedAt");

-- CreateIndex
CREATE INDEX "RatingCalculationBatch_revertedAt_idx" ON "RatingCalculationBatch"("revertedAt");

-- CreateIndex
CREATE INDEX "RatingUserChange_batchId_idx" ON "RatingUserChange"("batchId");

-- CreateIndex
CREATE INDEX "RatingUserChange_contestId_idx" ON "RatingUserChange"("contestId");

-- CreateIndex
CREATE INDEX "RatingUserChange_userId_idx" ON "RatingUserChange"("userId");

-- CreateIndex
CREATE INDEX "RatingParticipationChange_batchId_idx" ON "RatingParticipationChange"("batchId");

-- CreateIndex
CREATE INDEX "RatingParticipationChange_contestId_idx" ON "RatingParticipationChange"("contestId");

-- CreateIndex
CREATE INDEX "RatingParticipationChange_participationId_idx" ON "RatingParticipationChange"("participationId");

-- CreateIndex
CREATE INDEX "RatingParticipationChange_userId_idx" ON "RatingParticipationChange"("userId");

