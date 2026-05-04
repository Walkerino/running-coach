import { describe, expect, it } from "vitest";

import { formatAppDate, formatAppDateTime, toAppDate, toAppDateTime } from "../src/utils/time.js";

describe("time utils", () => {
  it("keeps date-only values on the same calendar day in app timezone", () => {
    expect(toAppDate("2026-05-04").toISOString()).toBe("2026-05-03T21:00:00.000Z");
    expect(formatAppDate(toAppDate("2026-05-04"))).toBe("2026-05-04");
  });

  it("preserves workout timestamps with explicit timezone offsets", () => {
    const workoutStart = toAppDateTime("2026-05-04 01:30:00 +0300");

    expect(workoutStart.toISOString()).toBe("2026-05-03T22:30:00.000Z");
    expect(formatAppDate(workoutStart)).toBe("2026-05-04");
    expect(formatAppDateTime(workoutStart)).toBe("2026-05-04T01:30:00+03:00");
  });
});
