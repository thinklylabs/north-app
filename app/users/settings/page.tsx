"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Old_Standard_TT } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Lock, LogOut, MessageSquare, Save, Edit3, Linkedin, Settings, Shield, HelpCircle } from "lucide-react";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name?: string | null;
  website_url?: string | null;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLinkedConnected, setIsLinkedConnected] = useState(false);
  const [linkedInProfile, setLinkedInProfile] = useState<{ full_name?: string; profile_picture_url?: string } | null>(null);
  const [profileData, setProfileData] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    website_url: ""
  });

  // Password change states
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchUserProfile();
    checkLinkedInConnection();

  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name, company_name, website_url")
          .eq("id", authUser.id)
          .single();

        if (profile) {
          setUser(profile);
          setProfileData({
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            company_name: profile.company_name || "",
            website_url: profile.website_url || ""
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  async function checkLinkedInConnection() {
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from("linkedin_accounts")
      .select("full_name, profile_picture_url")
      .eq("user_id", authUser.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error checking LinkedIn connection:", error);
      return;
    }

    if (data) {
      setIsLinkedConnected(true);
      setLinkedInProfile(data);
    } else {
      setIsLinkedConnected(false);
      setLinkedInProfile(null);
    }
  } catch (err) {
    console.error("Error fetching LinkedIn connection:", err);
  }
}

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profileData.first_name || null,
          last_name: profileData.last_name || null,
          company_name: profileData.company_name || null,
          website_url: profileData.website_url || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        return;
      }

      setIsEditingProfile(false);
      await fetchUserProfile(); // Refresh the profile data
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        setPasswordError(error.message);
        return;
      }

      setPasswordSuccess(true);
      setPasswordData({
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      setPasswordError("An error occurred while updating password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/signin";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleGetInTouch = () => {
    window.open('mailto:vedant@thinklylabs.com?subject=Support Request', '_blank');
  };

  async function handleAddLinkedIn() {
    try {
      setLoading(true);
      const resp = await fetch("/api/unipile/linkedin/hosted-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await resp.json().catch(() => ({}));
      const url = json?.url as string | undefined;
      if (url) {
        window.location.href = url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Users  {'>'}  Settings</span>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-24">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Settings</h1>
        
        <div className="mt-8 md:mt-12">
          <p className="text-[14px] leading-[1.3em] text-[#6F7777]">
            Manage your account settings, profile information, and preferences.
          </p>
        </div>

        <div className="mt-12 space-y-12">
          {/* User Profile Section */}
          <div className="p-8 rounded-[12px] bg-white border-[#171717]/20 border-[0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-[#1DC6A1]" />
                <h2 className={`${oldStandard.className} text-[20px] leading-[1.236em]`}>User Profile</h2>
              </div>
              <Button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                variant="outline"
                size="sm"
                className="text-[11px] h-8 px-4 cursor-pointer"
              >
                {isEditingProfile ? "Cancel" : "Edit"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email" className="text-[13px] font-medium mb-2 block">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="text-[13px] h-10"
                />
                <p className="text-[11px] text-[#6F7777] mt-2">Email cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="first_name" className="text-[13px] font-medium mb-2 block">First Name</Label>
                <Input
                  id="first_name"
                  value={isEditingProfile ? profileData.first_name : (user?.first_name || "")}
                  onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                  disabled={!isEditingProfile}
                  className="text-[13px] h-10"
                />
              </div>

              <div>
                <Label htmlFor="last_name" className="text-[13px] font-medium mb-2 block">Last Name</Label>
                <Input
                  id="last_name"
                  value={isEditingProfile ? profileData.last_name : (user?.last_name || "")}
                  onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                  disabled={!isEditingProfile}
                  className="text-[13px] h-10"
                />
              </div>

              <div>
                <Label htmlFor="company_name" className="text-[13px] font-medium mb-2 block">Company Name</Label>
                <Input
                  id="company_name"
                  value={isEditingProfile ? profileData.company_name : (user?.company_name || "")}
                  onChange={(e) => setProfileData(prev => ({ ...prev, company_name: e.target.value }))}
                  disabled={!isEditingProfile}
                  className="text-[13px] h-10"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="website_url" className="text-[13px] font-medium mb-2 block">Website URL</Label>
                <Input
                  id="website_url"
                  value={isEditingProfile ? profileData.website_url : (user?.website_url || "")}
                  onChange={(e) => setProfileData(prev => ({ ...prev, website_url: e.target.value }))}
                  disabled={!isEditingProfile}
                  className="text-[13px] h-10"
                />
              </div>
            </div>

            {isEditingProfile && (
              <div className="flex gap-3 mt-8">
                <Button
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="px-6 py-3 text-white text-[12px] h-10 cursor-pointer"
                  style={{ backgroundColor: "#1DC6A1" }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>

          {/* Password Change Section */}
          <div className="p-8 rounded-[12px] bg-white border-[#171717]/20 border-[0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center gap-3 mb-8">
              <Lock className="w-6 h-6 text-[#1DC6A1]" />
              <h2 className={`${oldStandard.className} text-[20px] leading-[1.236em]`}>Change Password</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="new_password" className="text-[13px] font-medium mb-2 block">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="text-[13px] h-10"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <Label htmlFor="confirm_password" className="text-[13px] font-medium mb-2 block">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="text-[13px] h-10"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            {passwordError && (
              <p className="text-[12px] text-red-600 mt-4">{passwordError}</p>
            )}

            {passwordSuccess && (
              <p className="text-[12px] text-green-600 mt-4">Password updated successfully!</p>
            )}

            <Button
              onClick={handlePasswordChange}
              disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
              className="px-6 py-3 text-white text-[12px] h-10 mt-6 cursor-pointer"
              style={{ backgroundColor: "#1DC6A1" }}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>

          {/* LinkedIn Integration Section */}
          <div className="p-8 rounded-[12px] bg-white border-[#171717]/20 border-[0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center gap-3 mb-6">
              <Linkedin className="w-6 h-6 text-[#1DC6A1]" />
              <h2 className={`${oldStandard.className} text-[20px] leading-[1.236em]`}>LinkedIn Integration</h2>
            </div>
            
            <p className="text-[14px] text-[#6F7777] mb-6">
              Connect your LinkedIn account to import your professional content and network data.
            </p>

            <Button
              onClick={handleAddLinkedIn}
              disabled={loading}
              className="px-6 py-3 text-white text-[12px] h-10 cursor-pointer"
              style={{ backgroundColor: "#1DC6A1" }}
            >
              {loading ? "Redirecting..." : "+ Add LinkedIn Accounts"}
            </Button>
          </div>

          {/* Get in Touch Section */}
          <div className="p-8 rounded-[12px] bg-white border-[#171717]/20 border-[0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="w-6 h-6 text-[#1DC6A1]" />
              <h2 className={`${oldStandard.className} text-[20px] leading-[1.236em]`}>Get in Touch</h2>
            </div>
            
            <p className="text-[14px] text-[#6F7777] mb-6">
              Need help or have questions? We're here to assist you with any issues or feedback.
            </p>

            <Button
              onClick={handleGetInTouch}
              className="px-6 py-3 text-white text-[12px] h-10 cursor-pointer"
              style={{ backgroundColor: "#1DC6A1" }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </div>

          {/* Logout Section */}
          <div className="p-8 rounded-[12px] bg-white border-[#171717]/20 border-[0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center gap-3 mb-6">
              <LogOut className="w-6 h-6 text-[#1DC6A1]" />
              <h2 className={`${oldStandard.className} text-[20px] leading-[1.236em]`}>Account Actions</h2>
            </div>
            
            <p className="text-[14px] text-[#6F7777] mb-6">
              Sign out of your account on this device. You can sign back in anytime.
            </p>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="px-6 py-3 text-[12px] h-10 border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


