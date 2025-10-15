"use client";

import { Old_Standard_TT } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

type IdeaRow = {
  id: number;
  idea_topic: string | null;
  idea_eq: string | null;
  idea_takeaway: string | null;
  created_at: string;
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IdeaRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackFor, setFeedbackFor] = useState<'idea' | 'post' | 'hook' | 'insight'>("idea");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function loadIdeas() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("ideas")
          .select("id, idea_topic, idea_eq, idea_takeaway, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) {
          console.error("Failed to load ideas:", error);
        } else {
          setIdeas(data || []);
        }
      } finally {
        setLoading(false);
      }
    }
    loadIdeas();
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Ideas</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-24">

          <div className="mt-[30px] flex items-center justify-between">
            <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em]`}>Ideas</h1>
            <Button
              type="button"
              className="h-[27px] rounded-[5px] bg-[#A4D6CB] hover:bg-[#97CFC3] text-[#0D1717] px-3 py-0 text-[10px] cursor-pointer"
              onClick={() => {
                setFeedbackOpen(true);
                setFeedbackText("");
                setFeedbackFor('idea');
              }}
            >
              Feedback
            </Button>
          </div>

          <div className="mt-6 md:mt-8 w-full max-w-none -mx-4 md:-mx-6">
            {loading ? (
              <div className="rounded-[10px] border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] p-5">
                <div className="h-[12px] w-[200px] rounded bg-[#EDE8E1] animate-pulse mb-4" />
                <div className="h-[10px] w-full rounded bg-[#EDE8E1] animate-pulse mb-2" />
                <div className="h-[10px] w-[90%] rounded bg-[#EDE8E1] animate-pulse" />
              </div>
            ) : ideas.length === 0 ? (
              <div className="text-[12px] text-[#6F7777]">No ideas yet.</div>
            ) : (
              <div className="overflow-hidden rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
                <table className="w-full table-fixed">
                  <thead className="bg-[#F6F2EC]">
                    <tr>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[30%]">Topic</th>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[30%]">EQ</th>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[30%]">Takeaway</th>
                      <th className="text-right text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[10%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ideas
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((idea) => {
                      const topic = idea.idea_topic || 'Untitled idea'
                      const eq = idea.idea_eq || ''
                      const takeaway = idea.idea_takeaway || ''
                      return (
                        <tr
                          key={idea.id}
                          className="border-t border-[#171717]/10 hover:bg-[#F9F6F1] cursor-pointer"
                          onClick={() => setSelected(idea)}
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="text-[12px] text-[#0D1717] truncate" title={topic}>{topic}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="text-[12px] text-[#0D1717] truncate" title={eq}>{eq}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="text-[12px] text-[#0D1717] truncate" title={takeaway}>{takeaway}</div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                aria-label="Copy idea"
                                title="Copy"
                                className="inline-flex items-center gap-1 h-[22px] rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] hover:text-[#19b391] bg-[#FCF9F5] hover:bg-[#EDE8E1] px-2 cursor-pointer"
                                onClick={async () => {
                                  const parts: string[] = []
                                  parts.push(topic)
                                  if (eq) parts.push(`EQ: ${eq}`)
                                  if (takeaway) parts.push(`Takeaway: ${takeaway}`)
                                  const text = parts.join('\n')
                                  try {
                                    await navigator.clipboard.writeText(text)
                                    toast.success('Copied to clipboard')
                                  } catch {
                                    toast.error('Failed to copy')
                                  }
                                }}
                              >
                                <Copy className="w-[12px] h-[12px]" />
                              </button>
                              <Button
                                type="button"
                                className="inline-flex items-center justify-center h-[22px] rounded-[5px] bg-[#1DC6A1] hover:bg-[#19b391] text-white px-2 py-0 text-[10px]"
                                onClick={() => {
                                  // Placeholder: trigger pipeline for this idea
                                }}
                              >
                                Generate post
                              </Button>
                              {/* Feedback moved to page-level button above table */}
                            </div>
                          </td>
                        </tr>
                      )
                      })}
                  </tbody>
                </table>
                {/* Pagination */}
                <div className="flex items-center justify-center px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-[28px] w-[28px] inline-flex items-center justify-center rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] bg-transparent hover:bg-[#EDE8E1] px-0 py-0 text-[10px] disabled:opacity-50"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      {/* Left arrow */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Button>
                    <span className="text-[11px] text-[#6F7777]">
                      Page {currentPage} of {Math.max(1, Math.ceil(ideas.length / itemsPerPage))}
                    </span>
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-[28px] w-[28px] inline-flex items-center justify-center rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] bg-transparent hover:bg-[#EDE8E1] px-0 py-0 text-[10px] disabled:opacity-50"
                      onClick={() => setCurrentPage((p) => Math.min(Math.ceil(ideas.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(ideas.length / itemsPerPage)}
                      aria-label="Next page"
                    >
                      {/* Right arrow */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {selected && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setSelected(null)}
            >
              <div
                className="w-full max-w-[640px] rounded-[10px] bg-white shadow-[0_10px_30px_rgba(13,23,23,0.2)] border border-[#171717]/10 [border-width:0.5px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
                  <h3 className="text-[16px] font-medium text-[#0D1717]">{selected.idea_topic || 'Untitled idea'}</h3>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-[24px] h-[24px] rounded-[5px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] hover:bg-[#EDE8E1]"
                    aria-label="Close"
                    onClick={() => setSelected(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="px-5 pb-5 text-[12px] leading-[1.7em] text-[#0D1717] space-y-3">
                  {selected.idea_eq && (
                    <p><span className="text-[#6F7777]">EQ:</span> {selected.idea_eq}</p>
                  )}
                  {selected.idea_takeaway && (
                    <p><span className="text-[#6F7777]">Takeaway:</span> {selected.idea_takeaway}</p>
                  )}
                </div>
              </div>
            </div>
          )}

        {feedbackOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/20 backdrop-blur-[6px]"
              onClick={() => setFeedbackOpen(false)}
            />
            <div className="relative z-10 w-[640px] max-w-[92vw] rounded-[8px] bg-white shadow-xl border border-[#0D1717]/10">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className={`${oldStandard.className} text-[18px] leading-[1.2] text-[#0D1717]`}>
                      Leave feedback
                    </h2>
                    <p className="mt-3 text-[12px] leading-[1.3em] text-[#0D1717]/80 max-w-[560px]">
                      Tell us how we can improve this item.
                    </p>
                  </div>
                  <button
                    aria-label="Close"
                    className="ml-4 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-black/5 text-[#0D1717]/70 cursor-pointer"
                    onClick={() => setFeedbackOpen(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Your feedback..."
                    className="w-full h-[140px] rounded-[6px] border border-[#0D1717]/15 bg-white px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#1DC6A1]/30 resize-none"
                  />
                  <div>
                    <label className="block text-[11px] text-[#6F7777] mb-1">Feedback for</label>
                    <select
                      value={feedbackFor}
                      onChange={(e) => setFeedbackFor(e.target.value as any)}
                      className="h-[30px] w-full rounded-[6px] border border-[#0D1717]/15 bg-white px-3 text-[12px] outline-none focus:ring-2 focus:ring-[#1DC6A1]/30"
                    >
                      <option value="idea">ideas</option>
                      <option value="post">posts</option>
                      <option value="hook">hook</option>
                      <option value="insight">insight</option>
                    </select>
                    <p className="mt-1 text-[10px] text-[#6F7777]">Make sure your DB constraint allows 'idea'.</p>
                  </div>
                  {/* No target selection required */}
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    className="w-full h-[32px] rounded-[6px] bg-[#1DC6A1] hover:bg-[#19b391] text-white text-[12px] cursor-pointer disabled:opacity-60"
                    disabled={submittingFeedback || !feedbackText.trim()}
                    onClick={async () => {
                      try {
                        setSubmittingFeedback(true);
                        const supabase = createClient();
                        const { data: { session }, error } = await supabase.auth.getSession();
                        if (error) throw error;
                        const token = session?.access_token;
                        if (!token) throw new Error('You must be logged in');

                        const targetId = 0; // General feedback without specific target

                        const res = await fetch('/api/feedbacks', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            feedback_for: feedbackFor,
                            target_id: targetId,
                            feedback: feedbackText.trim(),
                          }),
                        });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json?.error || 'Failed to submit feedback');

                        toast.success('Thanks for your feedback!');
                        setFeedbackOpen(false);
                      } catch (e: any) {
                        toast.error(e?.message || 'Failed to submit feedback');
                      } finally {
                        setSubmittingFeedback(false);
                      }
                    }}
                  >
                    {submittingFeedback ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


