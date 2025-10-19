"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Old_Standard_TT } from "next/font/google";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  async function handleAddLinkedIn() {
    try {
      setLoading(true);
      const resp = await fetch("/api/unipile/linkedin/hosted-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await resp.json().catch(() => ({}));
      const url = json?.url as string | undefined;
      if (url) {
        window.location.href = url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Users  {'>'}  Settings</span>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-24">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Settings</h1>

        <div className="mt-8">
          <Button
            onClick={handleAddLinkedIn}
            disabled={loading}
            className="px-4 py-2 text-white cursor-pointer"
            style={{ backgroundColor: "#1DC6A1" }}
          >
            {loading ? "Redirecting..." : "+ Add LinkedIn Accounts"}
          </Button>
        </div>
      </div>
    </div>
  );
}


