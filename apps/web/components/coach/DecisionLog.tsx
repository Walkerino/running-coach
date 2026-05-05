export function DecisionLog() {
  const decisions = [
    {
      title: "Changed Friday intervals -> Easy Run",
      reason: "Recovery was below interval threshold and load was above baseline.",
    },
    {
      title: "Kept Sunday long run easy",
      reason: "VO2 goal needs consistency first; no aggressive volume jump.",
    },
  ];

  return (
    <section className="ask-card p-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Coach Decision Log</p>
      <div className="mt-5 space-y-3">
        {decisions.map((decision) => (
          <article key={decision.title} className="rounded-xl bg-[#f2f5f9] p-4">
            <p className="font-extrabold text-[#090e1d]">{decision.title}</p>
            <p className="mt-2 text-sm font-medium leading-6 text-[#3d4966]">Reason: {decision.reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
