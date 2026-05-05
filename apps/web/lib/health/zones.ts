import type { HeartRateSample, HrZoneKey, HrZones, ZoneMinutes } from "./types";

const zoneKeys: HrZoneKey[] = ["z1", "z2", "z3", "z4", "z5"];

export function getDefaultHrZones(age: number): HrZones {
  const hrMax = 220 - age;

  return {
    z1: { min: Math.round(hrMax * 0.5), max: Math.round(hrMax * 0.6) },
    z2: { min: Math.round(hrMax * 0.6), max: Math.round(hrMax * 0.7) },
    z3: { min: Math.round(hrMax * 0.7), max: Math.round(hrMax * 0.8) },
    z4: { min: Math.round(hrMax * 0.8), max: Math.round(hrMax * 0.9) },
    z5: { min: Math.round(hrMax * 0.9), max: hrMax },
  };
}

export function getZoneForBpm(bpm: number, zones: HrZones): HrZoneKey | null {
  for (const zone of zoneKeys) {
    if (bpm >= zones[zone].min && bpm <= zones[zone].max) return zone;
  }

  if (bpm > zones.z5.max) return "z5";
  return null;
}

function getSampleStart(sample: HeartRateSample): string | undefined {
  return sample.start ?? sample.timestamp;
}

export function calculateZoneMinutes(
  samples: HeartRateSample[],
  zones: HrZones,
  workoutStart: string,
  workoutEnd: string,
): ZoneMinutes {
  const sorted = [...samples]
    .filter((sample) => getSampleStart(sample))
    .sort((a, b) => new Date(getSampleStart(a)!).getTime() - new Date(getSampleStart(b)!).getTime());

  const totals: ZoneMinutes = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  const startMs = new Date(workoutStart).getTime();
  const endMs = new Date(workoutEnd).getTime();
  const maxGapSeconds = 120;

  sorted.forEach((sample, index) => {
    const sampleStartMs = Math.max(new Date(getSampleStart(sample)!).getTime(), startMs);
    const nextStart = sorted[index + 1] ? new Date(getSampleStart(sorted[index + 1])!).getTime() : endMs;
    const sampleEndMs = sample.end ? new Date(sample.end).getTime() : Math.min(nextStart, endMs);
    const seconds = Math.max(0, Math.min((sampleEndMs - sampleStartMs) / 1000, maxGapSeconds));
    const zone = getZoneForBpm(sample.bpm, zones);

    if (zone) totals[zone] += seconds / 60;
  });

  return {
    z1: Math.round(totals.z1 * 10) / 10,
    z2: Math.round(totals.z2 * 10) / 10,
    z3: Math.round(totals.z3 * 10) / 10,
    z4: Math.round(totals.z4 * 10) / 10,
    z5: Math.round(totals.z5 * 10) / 10,
  };
}
