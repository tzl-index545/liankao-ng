-- CreateTable
CREATE TABLE "YuantijiEmbedding" (
    "problemId" INTEGER NOT NULL PRIMARY KEY,
    "sourceHash" TEXT NOT NULL,
    "simplifierHash" TEXT NOT NULL,
    "embedderHash" TEXT NOT NULL,
    "simplifiedStatement" TEXT NOT NULL,
    "embedding" BLOB NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "chatModel" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "YuantijiEmbedding_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "YuantijiEmbedding_embedderHash_idx" ON "YuantijiEmbedding"("embedderHash");
