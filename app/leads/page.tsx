"use client";

import { Old_Standard_TT } from "next/font/google";
import DashboardSidebar from "@/components/DashboardSidebar";
import LogoutButton from "@/components/LogoutButton";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function LeadsPage() {
  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="w-full min-h-screen flex">
        <DashboardSidebar />
        <section className="flex-1 relative px-6 md:px-10 pb-24">
        <div className="absolute right-6 top-6 md:right-10 md:top-[23px]">
          <LogoutButton />
        </div>
        <div className="pt-6 md:pt-[23px] flex items-center gap-3">
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Leads</span>
        </div>

        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Leads</h1>

          {/* Stat cards row */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1155px]">
            <div className="h-[120px] rounded-[10px] bg-[#113434]" />
            <div className="h-[120px] rounded-[10px] bg-[#113434]" />
            <div className="h-[120px] rounded-[10px] bg-[#113434]" />
            <div className="h-[120px] rounded-[10px] bg-[#113434]" />
          </div>

          {/* Big table placeholder */}
          <div className="mt-8">
            <div className="h-[520px] w-full max-w-[1155px] rounded-[10px] bg-[#113434]" />
          </div>
        </section>
      </div>
    </main>
  );
}


