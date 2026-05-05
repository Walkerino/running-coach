import { CoachChat } from "@/components/coach/CoachChat";
import { CoachContextPanel } from "@/components/coach/CoachContextPanel";
import { DecisionLog } from "@/components/coach/DecisionLog";
import { getHealthSnapshot } from "@/lib/health/api-data";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const data = await getHealthSnapshot();

  return (
    <div className="flex min-h-[calc(100svh-8rem)] flex-col gap-6 lg:h-full lg:min-h-0">
      <div className="shrink-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Coach</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Ask for actions, not generic wellness advice.</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">Chat uses OpenRouter for explanation and conversation, while concrete training decisions stay grounded in deterministic training engine outputs.</p>
      </div>
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <CoachChat />
        <div className="min-h-0 space-y-5 lg:overflow-y-auto">
          <CoachContextPanel settings={data.settings} />
          <DecisionLog />
        </div>
      </div>
    </div>
  );
}
