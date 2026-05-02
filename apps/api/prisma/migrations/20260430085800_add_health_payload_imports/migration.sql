-- CreateTable
CREATE TABLE "HealthPayloadImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyCount" INTEGER NOT NULL,
    "workoutCount" INTEGER NOT NULL,
    "metricSampleCount" INTEGER NOT NULL,
    "topLevelKeys" TEXT[],
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthPayloadImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthPayloadImport_userId_createdAt_idx" ON "HealthPayloadImport"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "HealthPayloadImport" ADD CONSTRAINT "HealthPayloadImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
