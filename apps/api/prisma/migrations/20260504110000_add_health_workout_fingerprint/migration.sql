ALTER TABLE "HealthWorkout" ADD COLUMN "fingerprint" TEXT;

WITH ranked_workouts AS (
  SELECT
    id,
    md5(
      concat_ws(
        '|',
        "userId",
        coalesce("date"::text, ''),
        coalesce("workoutType", ''),
        coalesce("durationSeconds"::text, ''),
        coalesce("distanceMeters"::text, ''),
        coalesce("averageHeartRate"::text, ''),
        coalesce("maxHeartRate"::text, ''),
        coalesce("calories"::text, '')
      )
    ) AS fingerprint,
    row_number() OVER (
      PARTITION BY
        "userId",
        "date",
        coalesce("workoutType", ''),
        coalesce("durationSeconds", -1),
        coalesce("distanceMeters", -1),
        coalesce("averageHeartRate", -1),
        coalesce("maxHeartRate", -1),
        coalesce("calories", -1)
      ORDER BY "createdAt" ASC, id ASC
    ) AS row_num
  FROM "HealthWorkout"
)
UPDATE "HealthWorkout" hw
SET "fingerprint" = ranked_workouts.fingerprint
FROM ranked_workouts
WHERE hw.id = ranked_workouts.id;

DELETE FROM "HealthWorkout" hw
USING ranked_workouts
WHERE hw.id = ranked_workouts.id
  AND ranked_workouts.row_num > 1;

ALTER TABLE "HealthWorkout" ALTER COLUMN "fingerprint" SET NOT NULL;

CREATE UNIQUE INDEX "HealthWorkout_fingerprint_key" ON "HealthWorkout"("fingerprint");
