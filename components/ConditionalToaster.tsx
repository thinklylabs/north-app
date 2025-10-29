"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";

export function ConditionalToaster() {
  const pathname = usePathname();
  
  // Check if we're on the dashboard page
  const isDashboard = pathname === "/users/dashboard";
  
  return (
    <Toaster 
      position={isDashboard ? "top-center" : "bottom-right"}
      richColors 
      closeButton 
      expand 
    />
  );
}