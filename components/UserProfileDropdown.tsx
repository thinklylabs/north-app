"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronUp, LogOut, Mail, MessageSquare } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export function UserProfileDropdown() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Get user profile from profiles table
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, email, first_name, last_name")
            .eq("id", authUser.id)
            .single();

          if (profile) {
            setUser(profile);
          } else {
            // Fallback to auth user data
            setUser({
              id: authUser.id,
              email: authUser.email || "",
              first_name: authUser.user_metadata?.first_name || null,
              last_name: authUser.user_metadata?.last_name || null,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/signin";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    if (lastName) {
      return lastName.charAt(0).toUpperCase();
    }
    // Fallback to email initials
    if (email && email.length > 0) {
      return email.charAt(0).toUpperCase();
    }
    // Final fallback
    return "U";
  };

  const getDisplayName = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) {
      return firstName;
    }
    if (lastName) {
      return lastName;
    }
    if (email && email.includes("@")) {
      return email.split("@")[0];
    }
    return "User";
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-[27px] h-[27px] rounded-[5px] bg-[#B1DAD0] animate-pulse" />
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="h-3 w-16 bg-gray-200 animate-pulse rounded" />
          <div className="h-3 w-20 bg-gray-200 animate-pulse rounded mt-1" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initials = getInitials(user.first_name, user.last_name, user.email || "");
  const displayName = getDisplayName(user.first_name, user.last_name, user.email || "");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 p-2 hover:bg-[#F6F2EC] w-full justify-start group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:h-[48px] group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-start group-data-[collapsible=icon]:items-center"
        >
          <div className="w-[27px] h-[27px] rounded-[5px] bg-[#B1DAD0] flex items-center justify-center text-[10px] font-medium text-[#0D1717] group-data-[collapsible=icon]:w-[32px] group-data-[collapsible=icon]:h-[32px] group-data-[collapsible=icon]:text-[12px] group-data-[collapsible=icon]:font-semibold group-data-[collapsible=icon]:rounded-[6px]">
            {initials}
          </div>
          <div className="group-data-[collapsible=icon]:hidden text-left">
            <p className="font-sans text-[10px] leading-[1.3em] font-medium text-left">{displayName}</p>
            <p className="font-sans text-[10px] leading-[1.3em] text-[#6F7777] text-left">{user.email}</p>
          </div>
          <ChevronUp className="w-3 h-3 ml-auto group-data-[collapsible=icon]:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        side="right" 
        align="start" 
        className="w-[280px] p-0 bg-[#FCF9F5] border border-[#171717]/10 rounded-[8px] shadow-[0_10px_30px_rgba(13,23,23,0.2)] mb-2"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#171717]/10">
          <div className="flex items-center gap-3">
            <div className="w-[32px] h-[32px] rounded-[6px] bg-[#B1DAD0] flex items-center justify-center text-[12px] font-medium text-[#0D1717]">
              {initials}
            </div>
            <div>
              <p className="font-sans text-[12px] font-medium text-[#0D1717]">{displayName}</p>
              <p className="font-sans text-[10px] text-[#6F7777]">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2 pb-4">
          <DropdownMenuItem 
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#F6F2EC] cursor-pointer"
            onClick={() => window.open('mailto:vedant@thinklylabs.com', '_blank')}
          >
            <Mail className="w-4 h-4 text-[#6F7777]" />
            <span className="text-[12px] text-[#0D1717]">Reach out to us</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#F6F2EC] cursor-pointer"
            onClick={() => window.location.href = '/feedback'}
          >
            <MessageSquare className="w-4 h-4 text-[#6F7777]" />
            <span className="text-[12px] text-[#0D1717]">Give us feedback</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-2" />
          
          <DropdownMenuItem 
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#F6F2EC] cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 text-[#6F7777]" />
            <span className="text-[12px] text-[#0D1717]">Log out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
