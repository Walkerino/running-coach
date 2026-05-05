import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
};

export function MetricCard({ title, eyebrow, children, className }: MetricCardProps) {
  return (
    <section className={cn("ask-card p-4 lg:p-5", className)}>
      {eyebrow ? <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#818ba0]">{eyebrow}</p> : null}
      <h2 className="mt-1 text-lg font-extrabold tracking-[-0.02em] text-[#090e1d]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "green" | "amber" | "red" | "neutral" }) {
  const tones = {
    green: "bg-[#e7fff8] text-[#0b8b64] ring-[#bdf5e3]",
    amber: "bg-[#fff5d6] text-[#9a6a00] ring-[#ffe7a3]",
    red: "bg-[#ffe7ea] text-[#fa4d5e] ring-[#ffc4cb]",
    neutral: "bg-[#edf5ff] text-[#3d4966] ring-[#d0e4ff]",
  };

  return <span className={cn("inline-flex rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ring-1", tones[tone])}>{label}</span>;
}
