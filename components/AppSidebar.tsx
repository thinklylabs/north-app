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
  Home,
  FileText,
  Lightbulb,
  BookOpen,
  Users,
  TrendingUp,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import OnboardingCard from "@/components/OnboardingCard";

// Navigation items
const navigationItems = [
  {
    title: "Dashboard",
    url: "/users/dashboard",
    icon: Home,
  },
  {
    title: "Posts",
    url: "/users/posts",
    icon: FileText,
  },
  {
    title: "Ideas",
    url: "/users/ideas",
    icon: Lightbulb,
  },
  {
    title: "Library",
    url: "/users/library",
    icon: BookOpen,
  },
  {
    title: "Leads",
    url: "/users/leads",
    icon: Users,
  },
  {
    title: "Engagement",
    url: "/users/engagement",
    icon: TrendingUp,
  },
  {
    title: "Chat",
    url: "/users/chat",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    url: "/users/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
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
            <p className="font-sans text-[10px] leading-[1.3em]">Paid account</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-medium text-[#6F7777] px-2">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
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
        <div className="px-2 mt-4 group-data-[collapsible=icon]:hidden">
          <OnboardingCard />
        </div>
      </SidebarContent>

      <SidebarFooter className="p-5">
        <UserProfileDropdown />
      </SidebarFooter>
    </Sidebar>
  );
}
