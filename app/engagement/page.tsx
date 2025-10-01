import { Old_Standard_TT } from "next/font/google";
import DashboardSidebar from "@/components/DashboardSidebar";
import LogoutButton from "@/components/LogoutButton";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function EngagementsPage() {
  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="w-full min-h-screen flex">
        <DashboardSidebar />
        <section className="flex-1 relative px-6 md:px-10 pb-24">
          <div className="absolute right-6 top-6 md:right-10 md:top-[23px]">
            <LogoutButton />
          </div>
          <div className="pt-6 md:pt-[23px] flex items-center gap-3">
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Engagement</span>
          </div>

          <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Engagement</h1>

          <div className="mt-6 md:mt-8 space-y-6 max-w-[1155px]">
            <div className="h-[260px] rounded-[10px] bg-[#113434]" />
            <div className="h-[320px] rounded-[10px] bg-[#113434]" />
          </div>
        </section>
      </div>
    </main>
  );
}


