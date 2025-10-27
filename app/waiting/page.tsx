"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Old_Standard_TT } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function WaitingPage() {
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        setCheckingStatus(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace('/signin');
          return;
        }

        // Check if user is now ready
        const response = await fetch('/api/user-readiness', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const { isReady } = await response.json();
          if (isReady) {
            router.replace('/users/dashboard');
            return;
          }
        }
        
        setLastChecked(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Error checking user status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    // Check immediately on mount
    checkUserStatus();

    // Check every 30 seconds
    const interval = setInterval(checkUserStatus, 30000);
    return () => clearInterval(interval);
  }, [router, supabase]);

  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] flex items-center justify-center px-6">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-[#1DC6A1] rounded-full flex items-center justify-center">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
            >
              <path 
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" 
                fill="currentColor"
              />
            </svg>
          </div>
          
          <h1 className={`${oldStandard.className} text-3xl text-[#0D1717] mb-4`}>
            Account Activation Pending
          </h1>
          
          <p className="text-[#0D1717] text-sm leading-relaxed mb-8">
            Your account will be activated by the admin in 20 hours. 
          </p>

          <p className="text-[#0D1717] text-sm leading-relaxed mb-8">
            We're setting up your personalized experience based on your profile.
          </p>
          
          <div className="bg-white border border-[#0D1717]/10 rounded-lg p-6 mb-8">
            <p className="text-xs font-semibold text-[#0D1717] mb-3 text-left">What happens next:</p>
            <ul className="text-xs text-[#666] text-left space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#1DC6A1] mt-0.5">✓</span>
                <span>Admin reviews your onboarding information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1DC6A1] mt-0.5">✓</span>
                <span>Personalized themes are configured</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1DC6A1] mt-0.5">✓</span>
                <span>Long-term memory profile is generated</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1DC6A1] mt-0.5">✓</span>
                <span>You'll receive full access to the platform</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-center space-x-2 text-sm text-[#666]">
            <div className={`w-4 h-4 border-2 border-[#1DC6A1] border-t-transparent rounded-full ${checkingStatus ? 'animate-spin' : ''}`}></div>
            <span>
              {checkingStatus 
                ? 'Checking status...' 
                : lastChecked 
                  ? `Last checked: ${lastChecked}` 
                  : 'Waiting to check...'}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
