"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminLayout } from "@/components/AdminLayout";

const SIDEBAR_HIDDEN_PATHS = [
  "/signin",
  "/signup", 
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/sso-callback"
];

const ADMIN_PATHS = [
  "/admin",
  "/admin/users",
  "/admin/settings", 
  "/admin/analytics",
  "/admin/onboarding-db",
  "/admin/activity",
  "/admin/roles",
  "/admin/health"
];

export function ConditionalSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const shouldShowSidebar = pathname !== "/" && !SIDEBAR_HIDDEN_PATHS.some(path => 
    pathname.startsWith(path)
  );

  const isAdminPath = ADMIN_PATHS.some(path => pathname.startsWith(path));

  if (shouldShowSidebar) {
    if (isAdminPath) {
      return (
        <AdminLayout>
          {children}
        </AdminLayout>
      );
    }

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
