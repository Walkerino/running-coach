import { getHealthSnapshot } from "@/lib/health/api-data";
import { HrZonesForm } from "@/components/settings/HrZonesForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getHealthSnapshot();
  const settings = data.settings;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Settings / Data</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Small set of coaching inputs.</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">Data source: {data.source}. A browser web app cannot directly read Apple Health; data should arrive through Apple Health export, Strava, manual import, or a backend API.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="ask-card p-6">
          <h2 className="text-2xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Coach Settings</h2>
          <div className="mt-5 grid gap-3">
            <Row label="Goal" value={settings.goal} />
            <Row label="Max HR" value={`${settings.hrMax} bpm`} />
            <Row label="Easy HR" value={settings.preferredEasyHrRange} />
            <Row label="Resting HR baseline" value={settings.restingHeartRateBaseline ? `${settings.restingHeartRateBaseline} bpm` : "Not set"} />
            <Row label="HRV baseline" value={settings.hrvBaseline ? `${settings.hrvBaseline} ms` : "Not set"} />
            <Row label="Preferred days" value={settings.preferredWorkoutDays.join(", ")} />
            <Row label="Unavailable days" value={settings.unavailableDays.join(", ") || "None"} />
            <Row label="Long run limit" value={`${settings.longRunLimitMinutes} min`} />
            <Row label="Injury / pain notes" value={settings.injuryNotes || "None"} />
          </div>
        </section>

        <section className="ask-card p-6">
          <h2 className="text-2xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Data Source</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-[#3d4966]">Current source: {data.source}. No secrets, tokens, or full health payloads are logged by this frontend.</p>
          <button type="button" className="mt-5 rounded-xl bg-[#0f67fe] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_16px_rgba(15,103,254,0.24)]">
            Import mock Apple Health data
          </button>
          <div className="mt-6 rounded-xl bg-[#f2f5f9] p-4 text-sm font-medium leading-6 text-[#3d4966]">
            Backend API returns aggregated workout/recovery data only. Apple Health raw payloads stay server-side; Strava tokens must remain encrypted in the backend.
          </div>
        </section>

        <HrZonesForm initialZones={settings.hrZones} age={settings.age} persistMode={data.source === "backend_api" ? "api" : "local"} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f2f5f9] p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#818ba0]">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#3d4966]">{value}</p>
    </div>
  );
}
