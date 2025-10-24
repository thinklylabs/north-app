"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [redirecting, setRedirecting] = useState(false);
  const [step, setStep] = useState(1);
  const [icp, setIcp] = useState("");
  const [icpPainPoints, setIcpPainPoints] = useState("");
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (profileUpserted) return;
    upsertCurrentUserProfile().finally(() => setProfileUpserted(true));
  }, [profileUpserted]);

  // Show LinkedIn success toast when redirected back from Unipile to onboarding
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const status = url.searchParams.get("unipile_status");
    const accountId = url.searchParams.get("unipile_account_id");
    const error = url.searchParams.get("unipile_error");
    if (status || accountId || error) {
      if (!error && (status?.toLowerCase() === "connected" || status?.toLowerCase() === "creation_success" || !status)) {
        toast.success("LinkedIn connected", {
          description: (
            <span className="text-black">Your LinkedIn account is connected.</span>
          ),
          icon: (
            <Image src="/linkedin_toast.svg" alt="LinkedIn" width={18} height={18} />
          ),
        });
      }
      // Persist account id for later use in Start growing
      if (accountId) {
        try { localStorage.setItem("unipile_account_id", accountId); } catch {}
      }
      // Clean query params from URL without reloading
      url.searchParams.delete("unipile_status");
      url.searchParams.delete("unipile_account_id");
      url.searchParams.delete("unipile_error");
      window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams.toString()}` : ""));
    }
  }, []);

  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717] flex">
      <div className="w-full md:w-[656px] px-6 md:px-0 md:pl-[140px] flex flex-col">
        <div className="mt-[130px] w-[29px] h-[29px] rounded-[3.9189px] bg-[#0D1717] flex items-center justify-center">
          <Image src="/star.svg" alt="Decorative star" width={21} height={21} />
        </div>
        <h1 className={`${oldStandard.className} mt-[22px] w-[268px] text-[30px] leading-[1.236em]`}>
          Let’s get you started
        </h1>

        {/* Progress slider */}
        <div className="mt-[14px] w-[326px] h-[6px] bg-[#E8E6E2] rounded-full overflow-hidden">
          <div
            className={`h-full bg-[#1DC6A1] transition-all duration-300`}
            style={{ width: `${step === 1 ? 50 : 100}%` }}
          />
        </div>

        {step === 1 && (
          <>
            <p className="font-sans mt-[50px] w-[171px] text-[12px] leading-[1.3em]">
              Connect your LinkedIn account
            </p>
            <div className="mt-[10px] w-[326px]">
              <Button
                type="button"
                disabled={redirecting}
                className="w-full rounded-[5px] bg-[#1DC6A1] hover:bg-[#1DC6A1] flex items-center justify-center gap-[12px] py-[10px] px-[106px] h-auto cursor-pointer disabled:opacity-60"
                onClick={async () => {
                  setRedirecting(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch("/api/unipile/linkedin/hosted-link", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                      },
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      toast.error("Failed to start LinkedIn connect", { description: json?.error || "Please try again." });
                      setRedirecting(false);
                      return;
                    }
                    if (json?.url) {
                      window.location.href = json.url as string;
                    } else {
                      toast.error("Hosted link missing", { description: "Please try again." });
                      setRedirecting(false);
                    }
                  } catch (e: any) {
                    toast.error("Something went wrong", { description: e?.message || "Please try again." });
                    setRedirecting(false);
                  }
                }}
              >
                <div className="w-[10px] h-[10px]">
                  <Image src="/linkedin.svg" alt="LinkedIn" width={10} height={12} />
                </div>
                <span className="font-sans text-[11px] leading-[1.3em] text-white">{redirecting ? "Redirecting..." : "Link your account"}</span>
              </Button>
            </div>

            <p className="font-sans mt-[24px] w-[71px] text-[12px] leading-[1.3em]">Website URL</p>
            <Input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://www.thinklylabs.com/" className="mt-[7px] w-[326px] h-[30px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] px-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]" />

            <p className="font-sans mt-[24px] w-[88px] text-[12px] leading-[1.3em]">Company Name</p>
            <Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ThinklyLabs" className="mt-[7px] w-[326px] h-[30px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] px-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]" />

            <div className="mt-[60px] w-[326px] flex gap-2">
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
                    const currentUrl = new URL(window.location.href);
                    const unipileAccountId = currentUrl.searchParams.get("unipile_account_id")
                      || (typeof window !== "undefined" ? localStorage.getItem("unipile_account_id") : null)
                      || undefined;
                    try {
                      await fetch("/api/unipile/linkedin/sync", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                        },
                        body: JSON.stringify({
                          account_id: unipileAccountId,
                          user_id: session?.user?.id,
                        }),
                      });
                    } catch { /* non-blocking */ }
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
                      return;
                    }
                    toast.success("Website analysis completed");
                    setStep(2);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="w-full rounded-[5px] bg-[#1DC6A1] hover:bg-[#1DC6A1] px-[106px] py-[6px] h-auto disabled:opacity-60 cursor-pointer"
              >
                <span className="font-sans text-[12px] leading-[1.3em] text-white">{submitting ? "Saving..." : "Continue"}</span>
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="font-sans mt-[50px] w-[171px] text-[12px] leading-[1.3em]">
              Who is your ICP?
            </p>
            <textarea
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder="e.g. B2B SaaS founders in fintech, 5–50 employees"
              className="mt-[7px] w-[326px] min-h-[70px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] p-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]"
            />

            <p className="font-sans mt-[24px] w-[220px] text-[12px] leading-[1.3em]">Top pain points for your ICP</p>
            <textarea
              value={icpPainPoints}
              onChange={(e) => setIcpPainPoints(e.target.value)}
              placeholder="List 2-5 pain points..."
              className="mt-[7px] w-[326px] min-h-[70px] bg-[#F4F4F4] rounded-[5px] border border-[#0D1717] [border-width:0.5px] p-[9px] text-[12px] text-[#0D1717] placeholder:text-[#959595]"
            />

            <div className="mt-[60px] w-[326px]">
              <Button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  if (!icp || !icpPainPoints) {
                    toast.error("Please fill in your ICP and pain points");
                    return;
                  }
                  setSubmitting(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch("/api/profile/icp", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                      },
                      body: JSON.stringify({ icp, icp_pain_points: icpPainPoints }),
                    });
                    if (!res.ok) {
                      const json = await res.json().catch(() => ({}));
                      toast.error("Failed to save ICP", { description: json?.error || "Please try again." });
                      return;
                    }
                    toast.success("Saved your ICP details");
                    router.replace("/dashboard");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="w-full rounded-[5px] bg-[#1DC6A1] hover:bg-[#1DC6A1] px-[106px] py-[6px] h-auto disabled:opacity-60 cursor-pointer"
              >
                <span className="font-sans text-[12px] leading-[1.3em] text-white">{submitting ? "Saving..." : "Finish"}</span>
              </Button>
            </div>
          </>
        )}
      </div>
      <div className="hidden md:block w-[624px] min-h-screen bg-[url('/signup-art.png')] bg-cover bg-center ml-auto rotate-180" />

      <Toaster position="bottom-right" />
    </main>
  );
}


