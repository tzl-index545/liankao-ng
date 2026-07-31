-- Store full statements separately from short list descriptions.
ALTER TABLE "Problem" ADD COLUMN "statementHtml" TEXT;
ALTER TABLE "Problem" ADD COLUMN "statementFetchedAt" DATETIME;

-- Preserve the upstream contest-local identity needed for refreshes.
ALTER TABLE "ContestProblem" ADD COLUMN "sourcePid" INTEGER;
ALTER TABLE "ContestProblem" ADD COLUMN "sourceUrl" TEXT;

CREATE UNIQUE INDEX "ContestProblem_contestId_sourcePid_key"
ON "ContestProblem"("contestId", "sourcePid");
