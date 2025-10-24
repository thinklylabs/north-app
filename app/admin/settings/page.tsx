"use client";

import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { requireAdmin } from "@/lib/auth";
import { Settings, Save, RotateCcw, Shield, Database, Mail, Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    systemName: "ThinklyLabs",
    maintenanceMode: false,
    userRegistration: true,
    emailNotifications: true,
    maxUsers: 1000,
    sessionTimeout: 30,
    backupFrequency: "daily"
  });

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert("Settings saved successfully");
    setIsLoading(false);
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      alert("Settings reset to default");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Admin  {'>'}  Settings</span>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-[140px]">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>
          System Settings
        </h1>

        <div className="mt-6 md:mt-10">
          <p className="text-[14px] leading-[1.3em] text-[#6F7777]">
            Configure system parameters, security settings, and platform behavior.
          </p>
        </div>

        {/* General Settings */}
        <div className="mt-8">
          <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mb-4`}>
            General Settings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-[#1DC6A1]" />
                <span className="text-[12px] font-medium">System Information</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-[#6F7777] block mb-1">System Name</label>
                  <input
                    type="text"
                    value={settings.systemName}
                    onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                    className="w-full px-3 py-2 border border-[#171717]/20 rounded-[5px] text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1DC6A1]/20"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] text-[#6F7777] block mb-1">Max Users</label>
                  <input
                    type="number"
                    value={settings.maxUsers}
                    onChange={(e) => setSettings({...settings, maxUsers: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-[#171717]/20 rounded-[5px] text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1DC6A1]/20"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#1DC6A1]" />
                <span className="text-[12px] font-medium">Security Settings</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-medium">Maintenance Mode</p>
                    <p className="text-[10px] text-[#6F7777]">Temporarily disable user access</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                    className="w-4 h-4 text-[#1DC6A1] rounded focus:ring-[#1DC6A1]/20"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-medium">User Registration</p>
                    <p className="text-[10px] text-[#6F7777]">Allow new user signups</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.userRegistration}
                    onChange={(e) => setSettings({...settings, userRegistration: e.target.checked})}
                    className="w-4 h-4 text-[#1DC6A1] rounded focus:ring-[#1DC6A1]/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="mt-8">
          <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mb-4`}>
            Notification Settings
          </h2>
          
          <div className="p-6 rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-[#1DC6A1]" />
              <span className="text-[12px] font-medium">Email Notifications</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium">System Alerts</p>
                  <p className="text-[10px] text-[#6F7777]">Receive notifications for system events</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                  className="w-4 h-4 text-[#1DC6A1] rounded focus:ring-[#1DC6A1]/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Database Settings */}
        <div className="mt-8">
          <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mb-4`}>
            Database & Backup
          </h2>
          
          <div className="p-6 rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-[#1DC6A1]" />
              <span className="text-[12px] font-medium">Backup Configuration</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-[#6F7777] block mb-1">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-[#171717]/20 rounded-[5px] text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1DC6A1]/20"
                />
              </div>
              
              <div>
                <label className="text-[10px] text-[#6F7777] block mb-1">Backup Frequency</label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({...settings, backupFrequency: e.target.value})}
                  className="w-full px-3 py-2 border border-[#171717]/20 rounded-[5px] text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1DC6A1]/20"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="text-[12px] h-10 px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleReset}
            className="text-[12px] h-10 px-6"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </div>
    </div>
  );
}
