"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertCurrentUserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { Toaster, toast } from "sonner";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function Onboarding() {
  const [showToast, setShowToast] = useState(false);
  const [profileUpserted, setProfileUpserted] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (profileUpserted) return;
    upsertCurrentUserProfile().finally(() => setProfileUpserted(true));
  }, [profileUpserted]);

  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717] flex">
      <div className="w-full md:w-[656px] px-6 md:px-0 md:pl-[140px] flex flex-col">
        <div className="mt-[130px] w-[29px] h-[29px] rounded-[3.9189px] bg-[#0D1717] flex items-center justify-center">
          <Image src="/star.svg" alt="Decorative star" width={21} height={21} />
        </div>
        <h1 className={`${oldStandard.className} mt-[22px] w-[268px] text-[30px] leading-[1.236em]`}>
          Let’s get you started
        </h1>

        <p className="font-sans mt-[50px] w-[171px] text-[12px] leading-[1.3em]">
          Connect your LinkedIn account
        </p>
        <div className="mt-[10px] w-[326px]">
          <Button type="button" className="w-full rounded-[5px] bg-[#1DC6A1] hover:bg-[#1DC6A1] flex items-center justify-center gap-[12px] py-[10px] px-[106px] h-auto">
            <div className="w-[10px] h-[10px]">
              <Image src="/linkedin.svg" alt="LinkedIn" width={10} height={12} />
            </div>
            <span className="font-sans text-[11px] leading-[1.3em] text-white">Link your account</span>
          </Button>
        </div>

        <p className="font-sans mt-[24px] w-[71px] text-[12px] leading-[1.3em]">Website URL</p>
        <Input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://www.thinklylabs.com/" className="mt-[7px] w-[326px] h-[30px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] px-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]" />

        <p className="font-sans mt-[24px] w-[88px] text-[12px] leading-[1.3em]">Company Name</p>
        <Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ThinklyLabs" className="mt-[7px] w-[326px] h-[30px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] px-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]" />

        <div className="mt-[60px] w-[326px]">
          <Button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setShowToast(false);
              if (!websiteUrl || !companyName) {
                setShowToast(true);
                return;
              }
              setSubmitting(true);
              try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch("/api/profile/ingest", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                  },
                  body: JSON.stringify({ websiteUrl, companyName }),
                });
                if (!res.ok) {
                  toast.error("Website analysis failed", { description: "Please try again in a moment." });
                } else {
                  // Keep the LinkedIn success toast
                  toast.success("Success", {
                    description: "Your LinkedIn account is connected, setting up your account.",
                    icon: (
                      <Image src="/linkedin_toast.svg" alt="LinkedIn" width={18} height={18} />
                    ),
                  });
                  // Website analysis toast
                  toast.success("Website analysis completed");
                }
              } finally {
                setSubmitting(false);
              }
            }}
            className="w-full rounded-[5px] bg-[#1DC6A1] hover:bg-[#1DC6A1] px-[106px] py-[6px] h-auto disabled:opacity-60"
          >
            <span className="font-sans text-[12px] leading-[1.3em] text-white">{submitting ? "Saving..." : "Start growing"}</span>
          </Button>
        </div>
      </div>
      <div className="hidden md:block w-[624px] min-h-screen bg-[url('/signup-art.png')] bg-cover bg-center ml-auto rotate-180" />

      <Toaster richColors position="bottom-right" />
    </main>
  );
}


