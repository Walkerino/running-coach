import Link from "next/link";

export function HealthDataUnavailable({
  title = "Health data is not available.",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <section className="ask-card p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#818ba0]">Data connection</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-[-0.05em] text-[#090e1d]">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-[#3d4966]">{message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/settings" className="surface-interactive inline-flex rounded-xl bg-[#0f67fe] px-5 py-3 text-sm font-extrabold text-white">
          Open data settings
        </Link>
      </div>
    </section>
  );
}
