import type { ReactNode } from "react";
import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { SidebarNav } from "./SidebarNav";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#dce1e8] p-0 lg:h-screen lg:overflow-hidden lg:p-10">
      <div className="ask-shell-shadow mx-auto flex min-h-screen w-full max-w-[1440px] overflow-hidden bg-white lg:h-[calc(100vh-5rem)] lg:min-h-0 lg:rounded-[32px]">
        <SidebarNav />
        <div className="min-w-0 flex-1 bg-[#f2f5f9] lg:m-4 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden lg:rounded-3xl">
          <header className="flex min-w-0 items-center justify-between gap-4 px-5 py-5 lg:hidden">
            <Link href="/dashboard" className="shrink-0 text-lg font-extrabold tracking-[-0.02em] text-[#090e1d] transition-colors hover:text-[#0f67fe]">
              Running Coach
            </Link>
            <div className="flex shrink-0 gap-3 text-sm font-bold text-[#818ba0]">
              <Link href="/insights" className="transition-colors hover:text-[#0f67fe]">Insights</Link>
              <Link href="/settings" className="transition-colors hover:text-[#0f67fe]">Data</Link>
            </div>
          </header>
          <main className="page-enter mx-auto min-w-0 w-full max-w-[1264px] px-4 pb-28 pt-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:py-6">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
