"use client";

import { useEffect, useMemo, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Old_Standard_TT } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: ["400", "700"] });

type RowItem = {
  id: number;
  type: "post" | "idea";
  title: string;
  status: string;
  created_at: string;
  feedback_count: number;
  last_feedback_at: string;
};

export default function AdminFeedbacksPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [selected, setSelected] = useState<RowItem | null>(null);
  const [thread, setThread] = useState<{ messages: any[]; insight: any } | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch('/api/admin/feedbacks', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        const json = await res.json();
        const merged: RowItem[] = [
          ...(json.posts || []),
          ...(json.ideas || []),
        ].sort((a: RowItem, b: RowItem) => new Date(b.last_feedback_at).getTime() - new Date(a.last_feedback_at).getTime());
        setRows(merged);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadThread() {
      if (!selected) return;
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      setLoadingThread(true);
      try {
        const qs = selected.type === 'post' ? `postId=${selected.id}` : `ideaId=${selected.id}`;
        const res = await fetch(`/api/feedbacks?${qs}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        const json = await res.json();
        setThread({ messages: json.messages || [], insight: json.insight || null });
      } finally {
        setLoadingThread(false);
      }
    }
    loadThread();
  }, [selected]);

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Admin  {'>'}  Feedbacks</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-24">
        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Feedbacks</h1>

        {loading ? (
          <div className="mt-6 rounded-[10px] border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] p-5">
            <div className="h-[12px] w-[200px] rounded bg-[#EDE8E1] animate-pulse mb-4" />
            <div className="h-[10px] w-full rounded bg-[#EDE8E1] animate-pulse mb-2" />
            <div className="h-[10px] w-[90%] rounded bg-[#EDE8E1] animate-pulse" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-6 text-[12px] text-[#6F7777]">No feedback yet.</div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
            <table className="w-full table-fixed">
              <thead className="bg-[#F6F2EC]">
                <tr>
                  <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[10%]">Type</th>
                  <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[40%]">Title</th>
                  <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[15%]">Status</th>
                  <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[10%]">Feedbacks</th>
                  <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[25%]">Last feedback</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.type}-${r.id}`} className="border-t border-[#171717]/10 hover:bg-[#F9F6F1] cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3 align-top text-[12px]">{r.type}</td>
                    <td className="px-4 py-3 align-top text-[12px] text-[#0D1717] truncate" title={r.title}>{r.title}</td>
                    <td className="px-4 py-3 align-top text-[12px]">{r.status}</td>
                    <td className="px-4 py-3 align-top text-[12px]">{r.feedback_count}</td>
                    <td className="px-4 py-3 align-top text-[12px]">{new Date(r.last_feedback_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1717]/20 backdrop-blur-[6px] p-4" onClick={() => setSelected(null)}>
            <div className="w-full max-w-[920px] rounded-[10px] bg-[#FCF9F5] shadow-[0_10px_30px_rgba(13,23,23,0.2)] border border-[#171717]/10 [border-width:0.5px]" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3 border-b border-[#171717]/10 [border-width:0.5px] bg-[#FCF9F5] rounded-t-[10px]">
                <h3 className={`${oldStandard.className} text-[16px] leading-[1.3em] text-[#0D1717] font-bold`}>{selected.type === 'post' ? 'Post' : 'Idea'} details</h3>
                <button type="button" className="inline-flex items-center justify-center w-[24px] h-[24px] rounded-[5px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer" aria-label="Close" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[12px] text-[#0D1717]">Title</div>
                  <div className="text-[12px] text-[#0D1717] mt-1">{selected.title}</div>
                  <div className="mt-3 text-[12px] text-[#0D1717]">Status: {selected.status}</div>
                  <div className="mt-3 text-[12px] text-[#0D1717]">Created: {new Date(selected.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="mb-2 text-[12px] text-[#0D1717]">Feedback thread</div>
                  <div className="max-h-[220px] overflow-auto rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-white p-3 mb-3">
                    {loadingThread ? (
                      <div className="text-[11px] text-[#6F7777]">Loading…</div>
                    ) : !thread || (thread.messages || []).length === 0 ? (
                      <div className="text-[11px] text-[#6F7777]">No feedback yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {thread.messages.map((m: any) => (
                          <div key={m.id} className="text-[12px]">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-[6px] px-1.5 py-[1px] text-[10px] ${m.authorRole === 'admin' ? 'bg-[#E5EDFF] text-[#1E40AF]' : 'bg-[#EDE8E1] text-[#6F7777]'}`}>{m.authorRole}</span>
                              <span className="text-[#6F7777] text-[10px]">{new Date(m.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="mt-1 text-[#0D1717] whitespace-pre-wrap">{m.body}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {thread?.insight ? (
                    <div className="text-[12px]">
                      <div className="font-medium text-[#0D1717] mb-1">Insight</div>
                      <pre className="text-[11px] whitespace-pre-wrap bg-[#F6F2EC] text-[#0D1717] rounded-[8px] p-2 max-h-[160px] overflow-auto">{JSON.stringify(thread.insight.insight, null, 2)}</pre>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="px-5 pb-5 flex items-center justify-end">
                <Button type="button" className="h-[30px] px-3 rounded-[6px] bg-[#1DC6A1] text-white hover:bg-[#19b391] text-[12px] cursor-pointer" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


