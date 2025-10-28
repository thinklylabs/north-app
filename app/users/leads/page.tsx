"use client";

import { Geist, Old_Standard_TT } from "next/font/google";
import { SidebarTrigger } from "@/components/ui/sidebar";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });
const myGeistFont = Geist({ subsets: ['latin'] });

export default function LeadsPage() {
  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Users  {'>'}  Leads</span>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-24">

        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Leads</h1>
        <h3 className={`${myGeistFont.className} text-[12px] leading-[1.236em] mt-[0px] text-gray-500`}>
          We are still working on this page. Stay tuned!
        </h3>
        {/* Stat cards row */}
        {/* <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1155px]">
            <div className="h-[120px] rounded-[10px] bg-[#113434]" />
            <div className="h-[120px] rounded-[10px] bg-[#113434]" />
            <div className="h-[120px] rounded-[10px] bg-[#113434]" />
            <div className="h-[120px] rounded-[10px] bg-[#113434]" />
          </div> */}

        {/* Big table placeholder */}
        {/* <div className="mt-8">
            <div className="h-[520px] w-full max-w-[1155px] rounded-[10px] bg-[#113434]" />
          </div> */}
      </div>
    </div>
  );
}


