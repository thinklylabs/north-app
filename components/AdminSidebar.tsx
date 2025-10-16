"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Shield,
  Users,
  Settings,
  BarChart3,
  Database,
  Activity,
  FileText,
  MessageSquare,
} from "lucide-react";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

// Admin navigation items
const adminNavigationItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Shield,
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Content Management",
    url: "/admin/content",
    icon: FileText,
  },
  {
    title: "Database",
    url: "/admin/database",
    icon: Database,
  },
  {
    title: "Activity Logs",
    url: "/admin/activity",
    icon: Activity,
  },
  {
    title: "Messages",
    url: "/admin/messages",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-[#0D1717]/30">
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-[27px] h-[27px] rounded-[2.432px] bg-[#0D1717] flex items-center justify-center">
            <Image src="/star.svg" alt="Logo" width={20} height={20} />
          </div>
          <div className="pt-[2px] group-data-[collapsible=icon]:hidden">
            <p className="font-sans text-[10px] leading-[1.3em]">ThinklyLabs</p>
            <p className="font-sans text-[10px] leading-[1.3em]">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-medium text-[#6F7777] px-2">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="h-8 text-[12px]"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Stats Card */}
        <div className="px-3 py-4">
          <div className="w-full h-[200px] rounded-[5px] border border-[#0D1717]/100 [border-width:0.2px] shadow-[0_4px_10px_rgba(13,23,23,0.2)] p-[18px_12px] flex flex-col gap-[6px] bg-[#FCF9F5] relative group-data-[collapsible=icon]:hidden">
            <h2 className="text-center text-[14px] py-2 leading-[1.236em]">System Overview</h2>
            <p className="text-[10px] leading-[1.3em] w-[188px]">
              Monitor system health and user activity
            </p>
            <div className="w-[88px] h-[12px] bg-[#FCF9F5]" />

            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-[7px] w-[163px] h-[13px]">
                <div className="w-[11px] h-[11px] rounded-full border border-[#6F7777]/100 [border-width:0.4px]" />
                <span className="text-[10px] leading-[1.3em] text-[#6F7777] w-[145px]">
                  {[
                    "Active users: 0",
                    "Total posts: 0", 
                    "System status: Healthy",
                    "Last backup: Never",
                  ][idx]}
                </span>
              </div>
            ))}

            <div className="flex items-center gap-[3px] mt-2">
              <div className="w-[175px] h-[4px] rounded-[10px] bg-[#B1DAD0] overflow-hidden">
                <div className="h-full w-[25px] bg-[#1DC6A1]" />
              </div>
              <span className="text-[8px] leading-[1.3em] text-[#6F7777] w-[19px]">15%</span>
            </div>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-5">
        <UserProfileDropdown />
      </SidebarFooter>
    </Sidebar>
  );
}
