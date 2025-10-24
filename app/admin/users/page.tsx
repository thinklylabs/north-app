"use client";

import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { requireAdmin } from "@/lib/auth";
import { Users, Search, Filter, Download, UserPlus } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");

  // Mock user data
  const users = [
    { id: 1, name: "John Doe", email: "john@example.com", role: "user", status: "active", lastLogin: "2 hours ago" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "admin", status: "active", lastLogin: "1 hour ago" },
    { id: 3, name: "Bob Wilson", email: "bob@example.com", role: "user", status: "inactive", lastLogin: "2 days ago" },
    { id: 4, name: "Alice Brown", email: "alice@example.com", role: "user", status: "active", lastLogin: "30 minutes ago" },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Admin  {'>'}  Users</span>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-[140px]">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>
          User Management
        </h1>

        <div className="mt-6 md:mt-10">
          <p className="text-[14px] leading-[1.3em] text-[#6F7777]">
            Manage user accounts, roles, and permissions across the platform.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6F7777] w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-[#171717]/20 rounded-[5px] text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1DC6A1]/20"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-[#171717]/20 rounded-[5px] text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1DC6A1]/20"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-[10px] h-8">
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button size="sm" className="text-[10px] h-8">
              <UserPlus className="w-3 h-3 mr-1" />
              Add User
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="mt-8 rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FCF9F5] border-b border-[#171717]/10">
                <tr>
                  <th className="text-left p-4 text-[12px] font-medium text-[#6F7777]">User</th>
                  <th className="text-left p-4 text-[12px] font-medium text-[#6F7777]">Role</th>
                  <th className="text-left p-4 text-[12px] font-medium text-[#6F7777]">Status</th>
                  <th className="text-left p-4 text-[12px] font-medium text-[#6F7777]">Last Login</th>
                  <th className="text-left p-4 text-[12px] font-medium text-[#6F7777]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[#171717]/5 last:border-b-0 hover:bg-[#FCF9F5]/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#B1DAD0] flex items-center justify-center">
                          <Users className="w-4 h-4 text-[#6F7777]" />
                        </div>
                        <div>
                          <p className="text-[12px] font-medium">{user.name}</p>
                          <p className="text-[10px] text-[#6F7777]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-[3px] text-[10px] font-medium ${
                        user.role === 'admin' 
                          ? 'bg-[#1DC6A1]/10 text-[#1DC6A1]' 
                          : 'bg-[#6F7777]/10 text-[#6F7777]'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-[3px] text-[10px] font-medium ${
                        user.status === 'active' 
                          ? 'bg-[#1DC6A1]/10 text-[#1DC6A1]' 
                          : 'bg-[#FFA500]/10 text-[#FFA500]'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-[10px] text-[#6F7777]">{user.lastLogin}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-[8px] h-6 px-2">
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-[8px] h-6 px-2">
                          {user.role === 'admin' ? 'Demote' : 'Promote'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#1DC6A1]" />
              <span className="text-[12px] font-medium">Total Users</span>
            </div>
            <p className="text-[18px] font-bold">{users.length}</p>
          </div>
          <div className="p-4 rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-[#1DC6A1]" />
              <span className="text-[12px] font-medium">Active Users</span>
            </div>
            <p className="text-[18px] font-bold">{users.filter(u => u.status === 'active').length}</p>
          </div>
          <div className="p-4 rounded-[10px] bg-white border border-[#171717]/20 [border-width:0.5px] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-[#FFA500]" />
              <span className="text-[12px] font-medium">Admins</span>
            </div>
            <p className="text-[18px] font-bold">{users.filter(u => u.role === 'admin').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
