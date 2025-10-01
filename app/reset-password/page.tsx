"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { upsertCurrentUserProfile } from "@/lib/profile";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    // When user arrives from email link, Supabase sets a session via hash params
    supabase.auth.getSession();
  }, []);

  const handleUpdate = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      return;
    }
    setUpdated(true);
    await upsertCurrentUserProfile();
    setTimeout(() => router.push("/signin"), 1200);
  };

  return (
    <main className="min-h-screen w-full bg-[#FCF9F5] flex items-center justify-center p-6">
      <div className="w-full max-w-sm grid gap-4">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" />
        <Button type="button" onClick={handleUpdate} className="bg-[#1DC6A1] hover:bg-[#1DC6A1]">Update password</Button>
        {updated && <p className="text-sm">Password updated. Redirecting…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}


