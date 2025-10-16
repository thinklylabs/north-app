"use client";

<<<<<<< Updated upstream
import { Old_Standard_TT } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/auth";
=======
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/LogoutButton";
import { Old_Standard_TT } from "next/font/google";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/auth";
import { useState } from "react";
>>>>>>> Stashed changes

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function AdminPage() {
<<<<<<< Updated upstream
=======
  const [isLoading, setIsLoading] = useState(false);

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

        <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mt-[55px]`}>System Overview</h2>

        <div className="mt-[20px] grid grid-cols-1 md:grid-cols-3 gap-[22px]">
          <div className="h-[120px] rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] p-4">
            <span className="text-[12px] font-medium text-[#6F7777]">Total Users</span>
            <p className="text-[24px] font-bold mt-2">1,234</p>
            <p className="text-[10px] text-[#1DC6A1] mt-1">+12% this month</p>
          </div>
          <div className="h-[120px] rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] p-4">
            <span className="text-[12px] font-medium text-[#6F7777]">Active Sessions</span>
            <p className="text-[24px] font-bold mt-2">89</p>
            <p className="text-[10px] text-[#1DC6A1] mt-1">+5% from yesterday</p>
          </div>
          <div className="h-[120px] rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] p-4">
            <span className="text-[12px] font-medium text-[#6F7777]">System Health</span>
            <p className="text-[24px] font-bold mt-2 text-[#1DC6A1]">99.9%</p>
            <p className="text-[10px] text-[#6F7777] mt-1">All systems operational</p>
          </div>
        </div>

        <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mt-[55px]`}>Recent Activity</h2>

        <div className="mt-[20px] rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#171717]/10">
              <div>
                <p className="text-[12px] font-medium">New user registration</p>
                <p className="text-[10px] text-[#6F7777]">john.doe@example.com</p>
              </div>
              <span className="text-[10px] text-[#6F7777]">2 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#171717]/10">
              <div>
                <p className="text-[12px] font-medium">Content published</p>
                <p className="text-[10px] text-[#6F7777]">5 new posts created</p>
              </div>
              <span className="text-[10px] text-[#6F7777]">15 minutes ago</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[12px] font-medium">System backup completed</p>
                <p className="text-[10px] text-[#6F7777]">Database backup successful</p>
              </div>
              <span className="text-[10px] text-[#6F7777]">1 hour ago</span>
            </div>
          </div>
        </div>
>>>>>>> Stashed changes
      </div>
    </div>
  );
}


