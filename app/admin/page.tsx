"use client";

import { Old_Standard_TT } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/auth";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function AdminPage() {
  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Admin</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-[140px]">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>
          Admin Dashboard
        </h1>

        <div className="mt-6 md:mt-10">
          <p className="text-[14px] leading-[1.3em] text-[#6F7777]">
            Welcome to the admin panel. Use the sidebar to navigate between different admin sections.
          </p>
        </div>

        <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mt-[55px]`}>Quick Actions</h2>

        <div className="mt-[20px] grid grid-cols-1 md:grid-cols-2 gap-[22px]">
          <div className="h-[235px] rounded-[10px] bg-[#171717] text-[#FCF9F5] p-4">
            <span className="text-[12px] font-medium">User Management</span>
            <p className="text-[10px] mt-2 text-[#B1DAD0]">
              Manage user accounts and permissions
            </p>
          </div>
          <div className="h-[235px] rounded-[10px] bg-[#171717] text-[#FCF9F5] p-4">
            <span className="text-[12px] font-medium">System Analytics</span>
            <p className="text-[10px] mt-2 text-[#B1DAD0]">
              View system performance and usage metrics
            </p>
          </div>
          <div className="h-[235px] rounded-[10px] bg-[#171717] text-[#FCF9F5] p-4">
            <span className="text-[12px] font-medium">Content Management</span>
            <p className="text-[10px] mt-2 text-[#B1DAD0]">
              Moderate and manage user-generated content
            </p>
          </div>
          <div className="h-[235px] rounded-[10px] bg-[#171717] text-[#FCF9F5] p-4">
            <span className="text-[12px] font-medium">Database Tools</span>
            <p className="text-[10px] mt-2 text-[#B1DAD0]">
              Access database management tools
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


