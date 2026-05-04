ALTER TABLE "User"
ADD COLUMN "morningReadinessEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "morningReadinessTime" TEXT NOT NULL DEFAULT '07:45',
ADD COLUMN "lastMorningReadinessSentAt" TIMESTAMP(3);
