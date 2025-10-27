"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`hidden md:flex flex-col relative min-h-screen transition-all duration-200 ${collapsed ? "w-[60px]" : "w-[267px]"}`}>
      <div className="absolute top-0 right-0 h-full w-px bg-[#0D1717]/30" />
      {collapsed ? (
        <div className="p-3 flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCollapsed(false)}
            className="inline-flex items-center justify-center w-[27px] h-[27px] rounded-[5px] bg-[#FCF9F5] border-[#171717] border-[0.5px] p-0"
            aria-label="Expand sidebar"
          >
            <span className="text-[12px] leading-none text-[#171717]">&gt;</span>
          </Button>
        </div>
      ) : (
        <div className="p-5 flex items-center gap-3">
          <div className="w-[27px] h-[27px] rounded-[2.432px] bg-[#0D1717] flex items-center justify-center">
            <Image src="/star.svg" alt="Logo" width={20} height={20} />
          </div>
          <div className="pt-[2px]">
            <p className="font-sans text-[10px] leading-[1.3em]">ThinklyLabs</p>
            <p className="font-sans text-[10px] leading-[1.3em]">Trial account</p>
          </div>
          <div className="ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCollapsed(true)}
              className="inline-flex items-center justify-center w-[27px] h-[27px] rounded-[5px] bg-[#FCF9F5] border-[#171717] border-[0.5px] p-0"
              aria-label="Collapse sidebar"
            >
              <span className="text-[12px] leading-none text-[#171717]">&lt;</span>
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="mt-auto p-5 flex items-center gap-2">
        <div className="w-[27px] h-[27px] rounded-[5px] bg-[#B1DAD0]" />
        {!collapsed && (
          <div>
            <p className="font-sans text-[10px] leading-[1.3em]">Vedant</p>
            <p className="font-sans text-[10px] leading-[1.3em]">vedant@thinklylabs.com</p>
          </div>
        )}
      </div>
    </aside>
  );
}



