"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";

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

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSidebar />
      <main className="flex-1">
        {children}
      </main>
    </>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isAdminPath = ADMIN_PATHS.some(path => pathname.startsWith(path));

  if (isAdminPath) {
    return (
      <SidebarProvider>
        <AdminLayoutContent>
          {children}
        </AdminLayoutContent>
      </SidebarProvider>
    );
  }

  return <>{children}</>;
}
