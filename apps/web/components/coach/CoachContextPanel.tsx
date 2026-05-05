import type { UserSettings } from "@/lib/health/types";

export function CoachContextPanel({ settings }: { settings: UserSettings }) {
  const rows = [
    ["Current goal", "VO2 max 50"],
    ["Current level", `${settings.weeklyRunFrequency} runs/week, 3-5 km typical`],
    ["Preferred HR", `Zone 2, ${settings.preferredEasyHrRange}`],
    ["Injury notes", settings.injuryNotes || "None logged"],
    ["Long run limit", `${settings.longRunLimitMinutes} min`],
    ["Preferred days", settings.preferredWorkoutDays.join(", ")],
  ];

  return (
    <aside className="ask-card p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Current context</p>
      <div className="mt-5 space-y-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#818ba0]">{label}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#3d4966]">{value}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
