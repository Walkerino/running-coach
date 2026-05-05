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

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-4 bottom-4 z-50 grid grid-cols-4 rounded-2xl bg-white p-2 shadow-[0_16px_32px_rgba(9,14,29,0.12)] lg:hidden">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "surface-interactive flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-center text-[11px] font-bold",
              active ? "bg-[#edf5ff] text-[#0f67fe]" : "text-[#bec5d2]",
            )}
          >
            <Icon name={item.icon} className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
