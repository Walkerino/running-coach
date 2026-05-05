"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HrZoneKey, HrZones } from "@/lib/health/types";
import { getDefaultHrZones } from "@/lib/health/zones";

const zoneKeys: HrZoneKey[] = ["z1", "z2", "z3", "z4", "z5"];
const storageKey = "running-coach:hr-zones";

type HrZonesFormProps = {
  initialZones: HrZones;
  age: number;
  persistMode: "api" | "local";
};

function cloneZones(zones: HrZones): HrZones {
  return {
    z1: { ...zones.z1 },
    z2: { ...zones.z2 },
    z3: { ...zones.z3 },
    z4: { ...zones.z4 },
    z5: { ...zones.z5 },
  };
}

function parseStoredZones(value: string | null): HrZones | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as HrZones;
    const valid = zoneKeys.every((zone) => Number.isFinite(parsed[zone]?.min) && Number.isFinite(parsed[zone]?.max));
    return valid ? parsed : null;
  } catch {
    return null;
  }
}

function validateZones(zones: HrZones): string | null {
  for (const zone of zoneKeys) {
    if (zones[zone].min < 30 || zones[zone].max > 240) return "Zone values should stay between 30 and 240 bpm.";
    if (zones[zone].min >= zones[zone].max) return `${zone.toUpperCase()} min must be lower than max.`;
  }

  for (let index = 1; index < zoneKeys.length; index += 1) {
    const previous = zones[zoneKeys[index - 1]];
    const current = zones[zoneKeys[index]];
    if (current.min < previous.max) return "Zones should be ordered from low to high without overlap.";
  }

  return null;
}

export function HrZonesForm({ initialZones, age, persistMode }: HrZonesFormProps) {
  const router = useRouter();
  const [zones, setZones] = useState<HrZones>(() => cloneZones(initialZones));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validationError = useMemo(() => validateZones(zones), [zones]);

  useEffect(() => {
    if (persistMode !== "local") {
      window.localStorage.removeItem(storageKey);
      setZones(cloneZones(initialZones));
      return;
    }

    const stored = parseStoredZones(window.localStorage.getItem(storageKey));
    if (stored) setZones(cloneZones(stored));
  }, [initialZones, persistMode]);

  function updateZone(zone: HrZoneKey, field: "min" | "max", value: string) {
    const parsed = Number(value);
    setSaved(false);
    setZones((current) => ({
      ...current,
      [zone]: {
        ...current[zone],
        [field]: Number.isFinite(parsed) ? parsed : current[zone][field],
      },
    }));
  }

  async function saveZones() {
    if (validationError) return;
    setError(null);

    try {
      if (persistMode === "api") {
        const response = await fetch("/api/settings/hr-zones", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hrZones: zones }),
        });
        if (!response.ok) throw new Error("Failed to save zones to backend");
        window.localStorage.removeItem(storageKey);
        router.refresh();
      } else {
        window.localStorage.setItem(storageKey, JSON.stringify(zones));
      }
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save zones");
    }
  }

  function resetZones() {
    const defaults = getDefaultHrZones(age);
    setZones(defaults);
    window.localStorage.removeItem(storageKey);
    setSaved(false);
  }

  return (
    <section className="ask-card p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Heart Rate Zones</h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">
            Set zones manually in bpm. 220 - age is only a rough default; your actual zones can be customized.
          </p>
        </div>
        {saved ? (
          <span className="rounded-md bg-[#e7fff8] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0b8b64]">
            {persistMode === "api" ? "Saved to server" : "Saved locally"}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {zoneKeys.map((zone) => (
          <div key={zone} className="rounded-xl bg-[#f2f5f9] p-4">
            <p className="text-sm font-extrabold uppercase text-[#818ba0]">{zone}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#818ba0]">Min</span>
                <input
                  type="number"
                  min={30}
                  max={240}
                  value={zones[zone].min}
                  onChange={(event) => updateZone(zone, "min", event.target.value)}
                  className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-[#090e1d] outline-none ring-1 ring-[#dce1e8] focus:ring-[#0f67fe]"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#818ba0]">Max</span>
                <input
                  type="number"
                  min={30}
                  max={240}
                  value={zones[zone].max}
                  onChange={(event) => updateZone(zone, "max", event.target.value)}
                  className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-[#090e1d] outline-none ring-1 ring-[#dce1e8] focus:ring-[#0f67fe]"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {validationError ? <p className="mt-4 rounded-xl bg-[#ffe7ea] p-4 text-sm font-bold leading-6 text-[#fa4d5e]">{validationError}</p> : null}
      {error ? <p className="mt-4 rounded-xl bg-[#ffe7ea] p-4 text-sm font-bold leading-6 text-[#fa4d5e]">{error}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={saveZones}
          disabled={Boolean(validationError)}
          className="rounded-xl bg-[#0f67fe] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_16px_rgba(15,103,254,0.24)] disabled:cursor-not-allowed disabled:bg-[#bec5d2] disabled:shadow-none"
        >
          Save zones
        </button>
        <button type="button" onClick={resetZones} className="rounded-xl bg-[#edf5ff] px-5 py-3 text-sm font-extrabold text-[#0f67fe]">
          Reset to default
        </button>
      </div>

      <p className="mt-4 text-sm font-medium leading-6 text-[#818ba0]">
        {persistMode === "api"
          ? "Saved zones are persisted in the backend database and used by the web health snapshot."
          : "MVP note: these manual zones are stored in this browser because mock data mode is enabled."}
      </p>
    </section>
  );
}
