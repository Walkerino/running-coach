import { CoachChat } from "@/components/coach/CoachChat";
import { CoachContextPanel } from "@/components/coach/CoachContextPanel";
import { DecisionLog } from "@/components/coach/DecisionLog";
import { getHealthSnapshot } from "@/lib/health/api-data";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const data = await getHealthSnapshot();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Coach</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Ask for actions, not generic wellness advice.</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">MVP uses local deterministic responses. OpenRouter can later explain decisions, but training changes should still come from the training engine.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <CoachChat settings={data.settings} />
        <div className="space-y-5">
          <CoachContextPanel settings={data.settings} />
          <DecisionLog />
        </div>
      </div>
    </div>
  );
}
