"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        setLoading(true);
        try {
          await supabase.auth.signOut();
          router.replace("/signin");
        } finally {
          setLoading(false);
        }
      }}
      className="h-[30px] rounded-[5px] bg-[#171717] text-[#FCF9F5] border-[#171717] border-[0.5px] px-3 py-0 text-[10px] hover:bg-[#2B2B2B] hover:text-[#FCF9F5]"
    >
      {loading ? "Signing out..." : "Logout"}
    </Button>
  );
}


