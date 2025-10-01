"use client";

import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";
import LogoutButton from "@/components/LogoutButton";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function PostsPage() {
  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="w-full min-h-screen flex">
        <DashboardSidebar />
        <section className="flex-1 relative px-6 md:px-10 pb-24">
        <div className="absolute right-6 top-6 md:right-10 md:top-[23px]">
          <LogoutButton />
        </div>
        <div className="pt-6 md:pt-[23px] flex items-center gap-3">
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Posts</span>
        </div>

        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Posts</h1>

        <div className="relative mt-6 md:mt-8">
          <Button
            type="button"
            className="absolute right-200 top-[-69px] inline-flex items-center justify-center h-[27px] rounded-[5px] bg-[#1DC6A1] hover:bg-[#19b391] text-white px-3 py-0 text-[10px]"
          >
            Approve
          </Button>
        </div>

          {/* Big preview panel placeholder */}
          <div className="mt-6 md:mt-8">
            <div className="h-[520px] w-full max-w-[1155px] rounded-[10px] bg-[#1B1B1B]" />
          </div>
        </section>
      </div>
    </main>
  );
}


