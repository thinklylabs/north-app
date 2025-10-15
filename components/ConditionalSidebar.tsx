"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const SIDEBAR_HIDDEN_PATHS = [
  "/signin",
  "/signup", 
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/sso-callback"
];

export function ConditionalSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const shouldShowSidebar = pathname !== "/" && !SIDEBAR_HIDDEN_PATHS.some(path => 
    pathname.startsWith(path)
  );

  if (shouldShowSidebar) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1">
          {children}
        </main>
      </SidebarProvider>
    );
  }

  return <>{children}</>;
}
