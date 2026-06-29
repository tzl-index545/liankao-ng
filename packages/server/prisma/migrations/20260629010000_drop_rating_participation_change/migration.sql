DROP INDEX "RatingCalculationBatch_revertedAt_idx";
ALTER TABLE "RatingCalculationBatch" DROP COLUMN "revertedAt";
DROP TABLE "RatingParticipationChange";
