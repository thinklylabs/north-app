"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";

const ADMIN_PATHS = [
  "/admin",
  "/admin/users",
  "/admin/settings", 
  "/admin/analytics",
  "/admin/database",
  "/admin/activity",
  "/admin/roles",
  "/admin/health"
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isAdminPath = ADMIN_PATHS.some(path => pathname.startsWith(path));

  if (isAdminPath) {
    return (
      <SidebarProvider>
        <AdminSidebar />
        <main className="flex-1">
          {children}
        </main>
      </SidebarProvider>
    );
  }

  return <>{children}</>;
}
