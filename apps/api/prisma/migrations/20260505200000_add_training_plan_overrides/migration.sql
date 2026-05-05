CREATE TABLE "TrainingPlanOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "planJson" JSONB NOT NULL,
  "rationaleJson" JSONB,
  "source" TEXT NOT NULL DEFAULT 'chat',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TrainingPlanOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingPlanOverride_userId_weekStart_key"
  ON "TrainingPlanOverride"("userId", "weekStart");

CREATE INDEX "TrainingPlanOverride_userId_weekStart_idx"
  ON "TrainingPlanOverride"("userId", "weekStart");

ALTER TABLE "TrainingPlanOverride"
  ADD CONSTRAINT "TrainingPlanOverride_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
