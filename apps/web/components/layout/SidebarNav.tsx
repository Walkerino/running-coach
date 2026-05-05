"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "activity" as const },
  { href: "/plan", label: "Plan", icon: "calendar" as const },
  { href: "/coach", label: "Coach", icon: "chat" as const },
  { href: "/body", label: "Body", icon: "body" as const },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-28 shrink-0 bg-white lg:flex lg:flex-col lg:items-center lg:justify-between lg:py-6">
      <Link href="/dashboard" className="surface-interactive flex size-16 items-center justify-center rounded-xl bg-[#0f67fe] text-white shadow-[0_12px_24px_rgba(15,103,254,0.28)]" aria-label="Running Coach">
        <Icon name="plus" className="size-8" />
      </Link>

      <nav className="flex flex-col gap-6">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "surface-interactive relative flex size-16 shrink-0 items-center justify-center rounded-xl",
                active ? "bg-[#edf5ff] text-[#0f67fe]" : "text-[#bec5d2] hover:bg-[#f2f5f9] hover:text-[#0f67fe]",
              )}
            >
              <Icon name={item.icon} className="size-7" />
              {active ? <span className="absolute -right-1 -top-1 size-5 rounded-md border-4 border-white bg-[#fa4d5e]" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-4">
        <Link href="/insights" title="Weekly Insights" className="surface-interactive flex size-16 shrink-0 items-center justify-center rounded-xl text-[#bec5d2] hover:bg-[#f2f5f9] hover:text-[#0f67fe]">
          <Icon name="trend" className="size-7" />
        </Link>
        <Link href="/settings" title="Settings / Data" className="surface-interactive flex size-16 shrink-0 items-center justify-center rounded-xl text-[#bec5d2] hover:bg-[#f2f5f9] hover:text-[#0f67fe]">
          <Icon name="settings" className="size-7" />
        </Link>
        <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-xl border border-[#bec5d2] bg-[#9ea7b8] text-sm font-extrabold text-white">
          R
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-md border-4 border-white bg-[#fa4d5e] text-[10px] leading-none" />
        </div>
      </div>
    </aside>
  );
}
