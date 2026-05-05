import type { BodyMetric } from "@/lib/health/types";
import { MetricCard } from "@/components/dashboard/MetricCard";

export function MeasurementsCard({ metric }: { metric: BodyMetric }) {
  const rows = [
    ["Waist", metric.waistCm],
    ["Chest", metric.chestCm],
    ["Hips", metric.hipsCm],
    ["Thigh", metric.thighCm],
    ["Arm", metric.armCm],
  ];

  return (
    <MetricCard title="Measurements">
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[#f2f5f9] p-3">
            <p className="text-sm font-bold text-[#818ba0]">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-[#090e1d]">{value ? `${value} cm` : "-"}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-[#bec5d2] p-4 text-sm font-medium leading-6 text-[#818ba0]">
        Progress photos can be added later. MVP keeps body data lightweight.
      </div>
    </MetricCard>
  );
}
