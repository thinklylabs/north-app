"use client";

import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { requireAdmin } from "@/lib/auth";
import { 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  Database,
  Activity,
  TrendingUp,
  UserCheck,
  AlertTriangle
} from "lucide-react";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for admin dashboard
  const adminStats = [
    { title: "Total Users", value: "1,234", change: "+12%", icon: Users },
    { title: "Active Sessions", value: "89", change: "+5%", icon: Activity },
    { title: "System Health", value: "99.9%", change: "Stable", icon: Shield },
    { title: "Database Size", value: "2.4GB", change: "+0.3GB", icon: Database },
  ];

  const recentActivities = [
    { user: "john.doe@example.com", action: "Signed up", time: "2 minutes ago", type: "user" },
    { user: "admin@thinklylabs.com", action: "Updated system settings", time: "15 minutes ago", type: "admin" },
    { user: "jane.smith@example.com", action: "Connected LinkedIn", time: "1 hour ago", type: "user" },
    { user: "bob.wilson@example.com", action: "Generated post", time: "2 hours ago", type: "user" },
  ];

  const handleSystemAction = async (action: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(`${action} completed successfully`);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="px-6 md:px-10 pb-[140px]">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>
          Admin Dashboard
        </h1>

        <div className="mt-6 md:mt-10">
          <p className="text-[14px] leading-[1.3em] text-[#6F7777]">
            Welcome to the admin panel. Monitor system performance and manage users.
          </p>
        </div>

        {/* Admin Stats Grid */}
        <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mt-[55px]`}>
          System Overview
        </h2>

        <div className="mt-[20px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[22px]">
          {adminStats.map((stat, index) => (
            <div key={index} className="h-[120px] rounded-[10px] bg-[#171717] text-[#FCF9F5] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <stat.icon className="w-5 h-5 text-[#1DC6A1]" />
                <span className="text-[10px] text-[#B1DAD0]">{stat.change}</span>
              </div>
              <div>
                <p className="text-[12px] font-medium">{stat.title}</p>
                <p className="text-[18px] font-bold mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Admin Actions */}
        <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mt-[55px]`}>
          Admin Actions
        </h2>

        <div className="mt-[20px] grid grid-cols-1 md:grid-cols-2 gap-[22px]">
          <div className="h-[200px] rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[#1DC6A1]" />
              <span className="text-[12px] font-medium">User Management</span>
            </div>
            <p className="text-[10px] text-[#6F7777] mb-4">
              Manage user accounts, roles, and permissions
            </p>
            <div className="space-y-2">
              <Button 
                size="sm" 
                className="w-full text-[10px] h-7"
                onClick={() => handleSystemAction('User roles updated')}
                disabled={isLoading}
              >
                Update User Roles
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-[10px] h-7"
                onClick={() => handleSystemAction('User list exported')}
                disabled={isLoading}
              >
                Export User List
              </Button>
            </div>
          </div>

          <div className="h-[200px] rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-5 h-5 text-[#1DC6A1]" />
              <span className="text-[12px] font-medium">System Settings</span>
            </div>
            <p className="text-[10px] text-[#6F7777] mb-4">
              Configure system parameters and maintenance
            </p>
            <div className="space-y-2">
              <Button 
                size="sm" 
                className="w-full text-[10px] h-7"
                onClick={() => handleSystemAction('System backup completed')}
                disabled={isLoading}
              >
                Create Backup
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-[10px] h-7"
                onClick={() => handleSystemAction('Cache cleared')}
                disabled={isLoading}
              >
                Clear Cache
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mt-[55px]`}>
          Recent Activity
        </h2>

        <div className="mt-[20px] rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)] p-4">
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-[#171717]/10 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'admin' ? 'bg-[#1DC6A1]' : 'bg-[#6F7777]'
                  }`} />
                  <div>
                    <p className="text-[12px] font-medium">{activity.user}</p>
                    <p className="text-[10px] text-[#6F7777]">{activity.action}</p>
                  </div>
                </div>
                <span className="text-[10px] text-[#6F7777]">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <h2 className={`${oldStandard.className} text-[16px] leading-[1.236em] mt-[55px]`}>
          System Status
        </h2>

        <div className="mt-[20px] grid grid-cols-1 md:grid-cols-3 gap-[22px]">
          <div className="h-[120px] rounded-[10px] bg-[#1DC6A1]/10 border border-[#1DC6A1]/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#1DC6A1]" />
              <span className="text-[12px] font-medium text-[#1DC6A1]">Database</span>
            </div>
            <p className="text-[10px] text-[#6F7777]">All systems operational</p>
            <p className="text-[14px] font-bold text-[#1DC6A1] mt-2">99.9% Uptime</p>
          </div>

          <div className="h-[120px] rounded-[10px] bg-[#1DC6A1]/10 border border-[#1DC6A1]/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#1DC6A1]" />
              <span className="text-[12px] font-medium text-[#1DC6A1]">API Services</span>
            </div>
            <p className="text-[10px] text-[#6F7777]">All endpoints responding</p>
            <p className="text-[14px] font-bold text-[#1DC6A1] mt-2">Response: 45ms</p>
          </div>

          <div className="h-[120px] rounded-[10px] bg-[#FFA500]/10 border border-[#FFA500]/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#FFA500]" />
              <span className="text-[12px] font-medium text-[#FFA500]">Storage</span>
            </div>
            <p className="text-[10px] text-[#6F7777]">Approaching capacity limit</p>
            <p className="text-[14px] font-bold text-[#FFA500] mt-2">85% Used</p>
          </div>
        </div>
      </div>
    </div>
  );
}


