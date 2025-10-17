"use client";

import { Old_Standard_TT } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

type UserListItem = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

type Integration = {
  provider_config_key: string;
  connection_id: string;
  created_at: string;
};

type ProfileDetails = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  website_url: string | null;
  company_name: string | null;
  website_content: string | null;
  icp: string | null;
  icp_pain_points: string | null;
  themes?: string[] | null;
  role: string;
  created_at: string;
  updated_at: string;
  onboarding_summary: string | null;
};

type LongTermMemory = {
  memory_content: string | null;
  last_updated: string | null;
} | null;

export default function OnboardingDBPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [ltm, setLtm] = useState<LongTermMemory>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const [summaryDraft, setSummaryDraft] = useState<string>("");
  const [themesDraft, setThemesDraft] = useState<string[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const resp = await fetch("/api/admin/onboarding", { cache: "no-store" });
        if (!resp.ok) throw new Error(await resp.text());
        const json = await resp.json();
        setUsers(json.users || []);
      } catch (e) {
        toast.error("Failed to load users");
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedUserId) return;
      try {
        setLoadingDetails(true);
        const resp = await fetch(`/api/admin/onboarding?userId=${encodeURIComponent(selectedUserId)}`, { cache: "no-store" });
        if (!resp.ok) throw new Error(await resp.text());
        const json = await resp.json();
        setProfile(json.profile || null);
        setIntegrations(json.integrations || []);
        setLtm(json.long_term_memory || null);
        setSummaryDraft(json.profile?.onboarding_summary || "");
        const incomingThemes = Array.isArray(json.profile?.themes) ? (json.profile?.themes as string[]) : [];
        setThemesDraft(incomingThemes.slice(0, 4));
      } catch (e) {
        toast.error("Failed to load user details");
      } finally {
        setLoadingDetails(false);
      }
    };
    loadDetails();
  }, [selectedUserId]);

  const selectedUserLabel = useMemo(() => {
    const u = users.find((x) => x.id === selectedUserId);
    if (!u) return "";
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id;
    return name;
  }, [users, selectedUserId]);

  const handleSave = async () => {
    if (!selectedUserId) return;
    try {
      setSaving(true);
      const resp = await fetch('/api/admin/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, onboarding_summary: summaryDraft, themes: themesDraft }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast.success('Saved');
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const canAddTheme = themesDraft.length < 4;
  const addTheme = () => {
    if (!canAddTheme) return;
    setThemesDraft((prev) => [...prev, ""]);
  };
  const updateTheme = (idx: number, value: string) => {
    setThemesDraft((prev) => prev.map((t, i) => (i === idx ? value : t)));
  };
  const removeTheme = (idx: number) => {
    setThemesDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Admin  {'>'}  Onboarding DB</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-24">
        <div className="mt-[30px] flex items-center justify-between">
          <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em]`}>Onboarding DB</h1>
        </div>

        <Card className="p-4 mt-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <Label className="text-[12px]">Select user</Label>
              <select
                className="h-[28px] px-2 rounded-[5px] border border-[#171717]/20 text-[11px] bg-[#FCF9F5] focus:outline-none focus:ring-1 focus:ring-[#1DC6A1] w-full"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers}
              >
                <option value="">{loadingUsers ? 'Loading users...' : 'Choose a user'}</option>
                {users.map((u) => {
                  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id;
                  return (
                    <option key={u.id} value={u.id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex gap-2">
              <Button disabled={!selectedUserId || loadingDetails} onClick={() => setSelectedUserId(selectedUserId)} className="h-[28px] px-3 text-[11px]">
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {selectedUserId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h2 className="text-[14px] mb-2">Onboarding summary for {selectedUserLabel}</h2>
              <Separator className="my-2" />
              <div className="space-y-2">
                <Label className="text-[12px]">Summary (editable)</Label>
                <textarea
                  className="w-full min-h-[160px] text-[12px] border border-[#171717]/20 rounded p-2 bg-[#FCF9F5] focus:outline-none focus:ring-1 focus:ring-[#1DC6A1]"
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                  placeholder="Add or edit onboarding call summary..."
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="h-[28px] px-3 text-[11px]">
                    {saving ? 'Saving...' : 'Save summary'}
                  </Button>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              <Card className="p-4">
                <h3 className="text-[14px] mb-2">Content themes</h3>
                <Separator className="my-2" />
                <div className="space-y-2">
                  {themesDraft.length === 0 && (
                    <p className="text-[12px] text-[#6F7777]">No themes yet. Add up to 4.</p>
                  )}
                  <div className="space-y-2">
                    {themesDraft.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          className="h-[28px] px-2 rounded-[5px] border border-[#171717]/20 text-[11px] bg-[#FCF9F5] focus:outline-none focus:ring-1 focus:ring-[#1DC6A1] flex-1"
                          value={t}
                          onChange={(e) => updateTheme(idx, e.target.value)}
                          placeholder={`Theme ${idx + 1}`}
                          maxLength={100}
                        />
                        <Button variant="secondary" className="h-[28px] px-3 text-[11px]" onClick={() => removeTheme(idx)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addTheme} disabled={!canAddTheme} className="h-[28px] px-3 text-[11px]">
                      {canAddTheme ? 'Add theme' : 'Max 4 reached'}
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="h-[28px] px-3 text=[11px]">
                      {saving ? 'Saving...' : 'Save themes'}
                    </Button>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="text-[14px] mb-2">Integrations</h3>
                <Separator className="my-2" />
                {integrations.length === 0 ? (
                  <p className="text-[12px] text-[#6F7777]">No integrations found.</p>
                ) : (
                  <ul className="space-y-2">
                    {integrations.map((i) => (
                      <li key={`${i.provider_config_key}-${i.connection_id}`} className="text-[12px]">
                        <span className="font-medium">{i.provider_config_key}</span>
                        <span className="text-[#6F7777]"> — {i.connection_id}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="text-[14px] mb-2">Profile details</h3>
                <Separator className="my-2" />
                {!profile ? (
                  <p className="text-[12px] text-[#6F7777]">No profile loaded.</p>
                ) : (
                  <div className="text-[12px] space-y-1">
                    <div>Email: {profile.email || '-'}</div>
                    <div>Name: {[profile.first_name, profile.last_name].filter(Boolean).join(' ') || '-'}</div>
                    <div>Company: {profile.company_name || '-'}</div>
                    <div>Website: {profile.website_url || '-'}</div>
                    <div>ICP: {profile.icp || '-'}</div>
                    <div>ICP Pain Points: {profile.icp_pain_points || '-'}</div>
                    <div>Role: {profile.role}</div>
                    <div>Created: {new Date(profile.created_at).toLocaleString()}</div>
                    <div>Updated: {new Date(profile.updated_at).toLocaleString()}</div>
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="text-[14px] mb-2">User long-term memory</h3>
                <Separator className="my-2" />
                {!ltm || !ltm.memory_content ? (
                  <p className="text-[12px] text-[#6F7777]">No memory generated yet.</p>
                ) : (
                  <pre className="whitespace-pre-wrap text-[11px] max-h-[260px] overflow-auto bg-white p-2 rounded border">
                    {ltm.memory_content}
                  </pre>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


