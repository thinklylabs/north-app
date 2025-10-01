"use client";
import Image from "next/image";
import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const getOrigin = () => (typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || ''));

  const handleGoogle = async () => {
    const origin = getOrigin();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=/onboarding` },
    });
  };

  const handleSignin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      if (data?.user) {
        router.replace("/onboarding");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] flex">
      <div className="hidden md:block w-[624px] min-h-screen bg-[url('/signup-art.png')] bg-cover bg-center" />
      <div className="relative flex-1 min-h-screen flex justify-center">
        <div className="relative w-full max-w-[656px] px-6 md:px-0 flex flex-col">
          <div className="md:absolute md:left-[320px] md:top-[113px] w-[29px] h-[29px] rounded-[3.9189px] bg-[#0D1717] flex items-center justify-center mt-6 mx-auto">
            <Image src="/star.svg" alt="Decorative star" width={22} height={22} />
          </div>

          <section className="flex flex-col items-center pt-[12px] md:pt-[190px]">
            <h1
              className={`${oldStandard.className} w-[254px] text-center text-[#0D1717] text-[30px] leading-[1.236em]`}
            >
              Welcome back chief
            </h1>
            <h2 className="font-sans w-[287px] text-center text-[#0D1717] text-[20px] leading-[1.3em] font-medium mt-[24px] md:mt-[60px]">
              Keep the growth compounding
            </h2>
            <p className="font-sans w-[204px] text-center text-[#0D1717] text-[12px] leading-[1.3em] mt-[12px] md:mt-[36px]">
              Enter your email below to log back in
            </p>
          </section>

          <section className="mt-[32px] md:mt-[26px] flex flex-col items-center">
            <Button type="button" onClick={handleGoogle} className="w-[326px] rounded-[5px] bg-[#1DC6A1] hover:bg-[#1DC6A1] flex items-center justify-center gap-[10px] py-[6px] h-auto cursor-pointer">
              <Image src="/google.svg" alt="Google" width={13} height={13} />
              <span className="font-sans text-white text-[12px] leading-[1.3em]">Continue with Google</span>
            </Button>

            <div className="flex items-center gap-3 mt-[16px] md:mt-[28px]">
              <div className="h-px w-[99px] bg-[#0D1717]" />
              <span className="font-sans text-[#0D1717] text-[12px] leading-[1.3em]">OR CONTINUE WITH</span>
              <div className="h-px w-[98px] bg-[#0D1717]" />
            </div>

            {error ? (
              <p className="font-sans text-[12px] leading-[1.3em] text-red-600 mb-[12px] text-center w-[326px]">{error}</p>
            ) : null}
            <div className="mt-[16px] md:mt-[33px] w-[326px] flex flex-col">
              <p className="font-sans text-[12px] leading-[1.3em] text-[#0D1717] mb-[4px]">Email</p>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full h-[30px] rounded-[5px] bg-[#F4F4F4] border border-[#0D1717] [border-width:0.5px] px-3 text-[12px] leading-[1.3em] text-[#0D1717] placeholder:text-[#959595]" />

              <p className="font-sans text-[12px] leading-[1.3em] text-[#0D1717] mt-[12px] mb-[4px]">Password</p>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" className="w-full h-[30px] rounded-[5px] bg-[#F4F4F4] border border-[#0D1717] [border-width:0.5px] px-3 text-[12px] leading-[1.3em] text-[#0D1717] placeholder:text-[#959595]" />
            </div>

            <Button type="button" disabled={loading} onClick={handleSignin} className="mt-[10px] w-[326px] rounded-[5px] bg-[#1DC6A1] hover:bg-[#1DC6A1] flex items-center justify-center py-[6px] h-auto cursor-pointer disabled:opacity-60">
              <span className="font-sans text-white text-[12px] leading-[1.3em]">{loading ? "Signing in..." : "Sign in"}</span>
            </Button>
          </section>

          <footer className="mt-auto flex items-center justify-center px-6 md:px-0">
            <p className="font-sans text-[12px] leading-[1.3em] font-medium text-black text-center py-10 md:py-8 md:pb-[37px]">
              By clicking continue, you agree to our{' '}
              <a href="#" className="underline">Terms of Service</a>{' '}and{' '}
              <a href="#" className="underline">Privacy Policy</a>.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}


