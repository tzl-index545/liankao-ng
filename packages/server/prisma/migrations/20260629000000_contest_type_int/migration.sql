-- Drop the old string contest type and recreate it as an integer.
ALTER TABLE "Contest" DROP COLUMN "type";

ALTER TABLE "Contest" ADD COLUMN "type" INTEGER NOT NULL DEFAULT 0;

UPDATE "Contest" SET "type" = 1;
