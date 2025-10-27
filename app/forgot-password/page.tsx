"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] flex items-center justify-center p-6">
      <div className="w-full max-w-sm grid gap-4">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-sm text-[#0D1717]">Enter your account email and we'll send a reset link.</p>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        <Button type="button" onClick={handleSend} className="bg-[#1DC6A1] hover:bg-[#1DC6A1]">Send reset link</Button>
        {sent && <p className="text-sm">Check your email for the reset link.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}


