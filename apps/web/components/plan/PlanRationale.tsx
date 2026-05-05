export function PlanRationale({ items }: { items: string[] }) {
  return (
    <section className="ask-card p-6">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Why this plan?</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.05em] text-[#090e1d]">Plan rationale</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <p key={item} className="rounded-xl bg-[#f2f5f9] px-4 py-3 text-sm font-medium leading-6 text-[#3d4966]">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}
