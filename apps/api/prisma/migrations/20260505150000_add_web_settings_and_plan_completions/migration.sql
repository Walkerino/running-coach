ALTER TABLE "User"
  ADD COLUMN "hrZone1Min" INTEGER,
  ADD COLUMN "hrZone1Max" INTEGER,
  ADD COLUMN "hrZone2Min" INTEGER,
  ADD COLUMN "hrZone2Max" INTEGER,
  ADD COLUMN "hrZone3Min" INTEGER,
  ADD COLUMN "hrZone3Max" INTEGER,
  ADD COLUMN "hrZone4Min" INTEGER,
  ADD COLUMN "hrZone4Max" INTEGER,
  ADD COLUMN "hrZone5Min" INTEGER,
  ADD COLUMN "hrZone5Max" INTEGER;

CREATE TABLE "TrainingPlanCompletion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "workoutType" TEXT NOT NULL,
  "title" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'web',

  CONSTRAINT "TrainingPlanCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingPlanCompletion_userId_date_workoutType_key"
  ON "TrainingPlanCompletion"("userId", "date", "workoutType");

CREATE INDEX "TrainingPlanCompletion_userId_date_idx"
  ON "TrainingPlanCompletion"("userId", "date");

ALTER TABLE "TrainingPlanCompletion"
  ADD CONSTRAINT "TrainingPlanCompletion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
