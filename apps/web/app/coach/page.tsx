import { CoachChat } from "@/components/coach/CoachChat";
import { HealthDataUnavailable } from "@/components/health/HealthDataUnavailable";
import { getHealthSnapshot, isMissingAdminApiKeyError } from "@/lib/health/api-data";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  let data;
  try {
    data = await getHealthSnapshot();
  } catch (cause) {
    if (isMissingAdminApiKeyError(cause)) {
      return (
        <div className="grid h-[calc(100svh-12rem)] min-h-0 gap-5 lg:h-full lg:grid-cols-[minmax(0,1fr)_20rem]">
          <CoachChat />
          <HealthDataUnavailable
            title="Coach context is unavailable."
            message="Set ADMIN_API_KEY in the web runtime environment to load backend health context. The chat surface stays visible, but backend chat requests also need the same API key."
          />
        </div>
      );
    }
    throw cause;
  }

  return (
    <div className="h-[calc(100svh-12rem)] min-h-0 lg:h-full">
      <CoachChat />
    </div>
  );
}
