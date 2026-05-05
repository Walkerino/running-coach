import { BmiCard } from "@/components/body/BmiCard";
import { HealthDataUnavailable } from "@/components/health/HealthDataUnavailable";
import { MeasurementsCard } from "@/components/body/MeasurementsCard";
import { WeightTrendCard } from "@/components/body/WeightTrendCard";
import { getHealthSnapshot, isMissingAdminApiKeyError } from "@/lib/health/api-data";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  let data;
  try {
    data = await getHealthSnapshot();
  } catch (cause) {
    if (isMissingAdminApiKeyError(cause)) {
      return (
        <HealthDataUnavailable
          title="Body data is unavailable."
          message="Set ADMIN_API_KEY in the web runtime environment to load backend profile and body metrics."
        />
      );
    }
    throw cause;
  }

  const latest = data.body.at(-1);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Body Metrics</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Body data, kept secondary.</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">Weight and measurements can explain trends, but they should not dominate running decisions.</p>
      </div>
      {latest ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <WeightTrendCard metrics={data.body} />
          <BmiCard metric={latest} />
          <MeasurementsCard metric={latest} />
        </div>
      ) : (
        <section className="ask-card p-6">
          <h2 className="text-2xl font-extrabold tracking-[-0.05em] text-[#090e1d]">No body metrics yet</h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">
            Add weight and height to the backend profile or import body metrics. The app will not invent BMI or weight trends.
          </p>
        </section>
      )}
    </div>
  );
}
