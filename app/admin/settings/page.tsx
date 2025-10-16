"use client";

import { Old_Standard_TT } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import { SidebarTrigger } from "@/components/ui/sidebar";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Admin  {'>'}  Settings</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-[140px]">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>
          Admin Settings
        </h1>

        <div className="mt-6 md:mt-10">
          <p className="text-[14px] leading-[1.3em] text-[#6F7777]">
            Configure system settings and admin preferences.
          </p>
        </div>

        <div className="mt-[40px]">
          <div className="h-[400px] rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)] p-6">
            <h3 className="text-[16px] font-medium mb-4">System Configuration</h3>
            <p className="text-[12px] text-[#6F7777]">
              System configuration options will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
