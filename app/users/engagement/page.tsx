import { Old_Standard_TT } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import { SidebarTrigger } from "@/components/ui/sidebar";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function EngagementsPage() {
  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Users  {'>'}  Engagement</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-24">

          <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Engagement</h1>

          <div className="mt-6 md:mt-8 space-y-6 max-w-[1155px]">
            <div className="h-[260px] rounded-[10px] bg-[#113434]" />
            <div className="h-[320px] rounded-[10px] bg-[#113434]" />
          </div>
      </div>
    </div>
  );
}


