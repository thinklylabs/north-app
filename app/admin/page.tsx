"use client";

import Image from "next/image";
import { Old_Standard_TT } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function AdminPage() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="w-full min-h-screen flex">
        <aside className={`hidden md:flex flex-col relative min-h-screen transition-all duration-200 ${collapsed ? "w-[60px]" : "w-[267px]"}`}>
          <div className="absolute top-0 right-0 h-full w-px bg-[#0D1717]/30" />
          {collapsed ? (
            <div className="p-3 flex items-center justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCollapsed(false)}
                className="inline-flex items-center justify-center w-[27px] h-[27px] rounded-[5px] bg-[#FCF9F5] border border-[#171717] [border-width:0.5px] p-0"
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
                  className="inline-flex items-center justify-center w-[27px] h-[27px] rounded-[5px] bg-[#FCF9F5] border border-[#171717] [border-width:0.5px] p-0"
                  aria-label="Collapse sidebar"
                >
                  <span className="text-[12px] leading-none text-[#171717]">&lt;</span>
                </Button>
              </div>
            </div>
          )}

          {/* push footer to bottom */}
          <div className="flex-1" />

          {!collapsed && (
            <div className="px-5 mb-3">
              <div className="w-[220px] h-[251px] rounded-[5px] border border-[#0D1717]/100 [border-width:0.2px] shadow-[0_4px_10px_rgba(13,23,23,0.2)] p-[18px_12px] flex flex-col gap-[6px] bg-[#FCF9F5] relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCollapsed(true)}
                  className="absolute left-[6px] top-[7px] inline-flex items-center justify-center w-[22px] h-[22px] rounded-[4px] bg-[#FCF9F5] border border-[#171717] [border-width:0.5px] p-0"
                  aria-label="Collapse sidebar"
                >
                  <span className="text-[12px] leading-none text-[#171717]">×</span>
                </Button>
                <h2 className="text-center text-[14px] py-4 leading-[1.236em]">Complete your onboarding</h2>
                <p className="text-[10px] leading-[1.3em] w-[188px]">
                  Connect your applications to help us keep the knowledge base updated
                </p>
                <div className="w-[88px] h-[12px] bg-[#FCF9F5]" />

                <div className="flex items-center gap-[7px] w-[163px] h-[13px]">
                  <div className="w-[11px] h-[11px] rounded-full border border-[#6F7777]/100 [border-width:0.4px]" />
                  <span className="text-[10px] leading-[1.3em] text-[#6F7777] w-[145px]">Explore the knowledge base</span>
                </div>
                <div className="flex items-center gap-[7px] w-[163px] h-[13px]">
                  <div className="w-[11px] h-[11px] rounded-full border border-[#6F7777]/100 [border-width:0.4px]" />
                  <span className="text-[10px] leading-[1.3em] text-[#6F7777] w-[145px]">Connect your accounts</span>
                </div>
                <div className="flex items-center gap-[7px] w-[163px] h-[13px]">
                  <div className="w-[11px] h-[11px] rounded-full border border-[#6F7777]/100 [border-width:0.4px]" />
                  <span className="text-[10px] leading-[1.3em] text-[#6F7777] w-[145px]">Generate first posts</span>
                </div>
                <div className="flex items-center gap-[7px] w-[163px] h-[13px]">
                  <div className="w-[11px] h-[11px] rounded-full border border-[#6F7777]/100 [border-width:0.4px]" />
                  <span className="text-[10px] leading-[1.3em] text-[#6F7777] w-[145px]">Load your engagement feed</span>
                </div>
                <div className="flex items-center gap-[7px] w-[163px] h-[13px]">
                  <div className="w-[11px] h-[11px] rounded-full border border-[#6F7777]/100 [border-width:0.4px]" />
                  <span className="text-[10px] leading-[1.3em] text-[#6F7777] w-[145px]">Load your leads</span>
                </div>

                <div className="flex items-center gap-[3px] mt-2">
                  <div className="w-[175px] h-[4px] rounded-[10px] bg-[#B1DAD0] overflow-hidden">
                    <div className="h-full w-[7px] bg-[#1DC6A1]" />
                  </div>
                  <span className="text-[8px] leading-[1.3em] text-[#6F7777] w-[19px]">0%</span>
                </div>
              </div>
            </div>
          )}

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

        <section className="flex-1 relative px-6 md:px-10">
          <div className="absolute right-6 top-6 md:right-10 md:top-[23px]">
            <LogoutButton />
          </div>
          <div className="mt-6 md:mt-[23px] flex items-center gap-3">
            <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Library</span>
          </div>

          <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-10 md:mt-[30px]`}>
            Admin Panel
          </h1>

          <div className="mt-6 md:mt-10" />
        </section>
      </div>
    </main>
  );
}


