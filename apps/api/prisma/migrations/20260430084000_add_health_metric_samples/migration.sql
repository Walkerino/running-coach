-- CreateTable
CREATE TABLE "HealthMetricSample" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "units" TEXT,
    "qty" DOUBLE PRECISION,
    "min" DOUBLE PRECISION,
    "avg" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "value" TEXT,
    "fingerprint" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthMetricSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthMetricSample_fingerprint_key" ON "HealthMetricSample"("fingerprint");

-- CreateIndex
CREATE INDEX "HealthMetricSample_userId_metricName_date_idx" ON "HealthMetricSample"("userId", "metricName", "date");

-- CreateIndex
CREATE INDEX "HealthMetricSample_userId_date_idx" ON "HealthMetricSample"("userId", "date");

-- AddForeignKey
ALTER TABLE "HealthMetricSample" ADD CONSTRAINT "HealthMetricSample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
