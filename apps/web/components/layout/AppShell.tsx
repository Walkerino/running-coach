import type { ReactNode } from "react";
import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { SidebarNav } from "./SidebarNav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#dce1e8] p-0 lg:p-10">
      <div className="ask-shell-shadow mx-auto flex min-h-screen w-full max-w-[1440px] overflow-hidden bg-white lg:min-h-[calc(100vh-5rem)] lg:rounded-[32px]">
        <SidebarNav />
        <div className="min-w-0 flex-1 bg-[#f2f5f9] lg:m-4 lg:rounded-3xl">
          <header className="flex items-center justify-between px-5 py-5 lg:hidden">
            <Link href="/dashboard" className="text-lg font-extrabold tracking-[-0.02em] text-[#090e1d]">
            Running Coach
            </Link>
            <div className="flex gap-3 text-sm font-bold text-[#818ba0]">
              <Link href="/insights">Insights</Link>
              <Link href="/settings">Data</Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1264px] px-4 pb-28 pt-2 lg:px-6 lg:py-6">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
