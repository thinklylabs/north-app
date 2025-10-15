"use client";

import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/LogoutButton";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

type PostRow = {
  id: number;
  post_hook: string | null;
  post_content: string | null;
  created_at: string;
};

export default function PostsPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  function formatIntoParagraphs(text: string): string[] {
    const clean = String(text || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
    if (!clean) return [];
    const sentences = clean.split(/(?<=[.!?])\s+/);
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      const chunk = sentences.slice(i, i + 2).join(" ").trim();
      if (chunk) paragraphs.push(chunk);
    }
    return paragraphs;
  }

  useEffect(() => {
    const supabase = createClient();
    async function loadPosts() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("posts")
          .select("id, post_hook, post_content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) {
          console.error("Failed to load posts:", error);
        } else {
          setPosts((data || []) as PostRow[]);
        }
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, []);
  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Posts</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-24">

        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Posts</h1>

        <div className="mt-6 md:mt-8 w-full max-w-none -mx-4 md:-mx-6">
          {loading ? (
            <div className="rounded-[10px] border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] p-5">
              <div className="h-[12px] w-[200px] rounded bg-[#EDE8E1] animate-pulse mb-4" />
              <div className="h-[10px] w-full rounded bg-[#EDE8E1] animate-pulse mb-2" />
              <div className="h-[10px] w-[90%] rounded bg-[#EDE8E1] animate-pulse" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-[12px] text-[#6F7777]">No posts yet.</div>
          ) : (
            <div className="overflow-hidden rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
              <table className="w-full table-fixed">
                <thead className="bg-[#F6F2EC]">
                  <tr>
                    <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[40%]">Hook</th>
                    <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[60%]">Post</th>
                  </tr>
                </thead>
                <tbody>
                  {posts
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((row) => {
                    const hook = row.post_hook || ''
                    const content = row.post_content || ''
                    return (
                      <tr key={row.id} className="border-t border-[#171717]/10">
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className="text-[12px] text-[#0D1717] truncate cursor-pointer"
                              title={hook}
                              onClick={() => {
                                if (!hook) return;
                                setSelectedTitle("Hook");
                                setSelectedText(hook);
                              }}
                            >
                              {hook}
                            </div>
                            <button
                              type="button"
                              aria-label="Copy hook"
                              title="Copy hook"
                              className="mt-[1px] inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] hover:text-[#19b391] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer flex-shrink-0"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!hook) return;
                                try {
                                  await navigator.clipboard.writeText(hook);
                                  toast.success('Copied to clipboard');
                                } catch {
                                  toast.error('Failed to copy');
                                }
                              }}
                            >
                              <Copy className="w-[12px] h-[12px]" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className="text-[12px] text-[#0D1717] truncate cursor-pointer"
                              title={content}
                              onClick={() => {
                                if (!content) return;
                                setSelectedTitle("Post");
                                setSelectedText(content);
                              }}
                            >
                              {content}
                            </div>
                            <button
                              type="button"
                              aria-label="Copy post"
                              title="Copy post"
                              className="mt-[1px] inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] hover:text-[#19b391] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer flex-shrink-0"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!content) return;
                                try {
                                  await navigator.clipboard.writeText(content);
                                  toast.success('Copied to clipboard');
                                } catch {
                                  toast.error('Failed to copy');
                                }
                              }}
                            >
                              <Copy className="w-[12px] h-[12px]" />
                            </button>
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Button>
                  <span className="text-[11px] text-[#6F7777]">
                    Page {currentPage} of {Math.max(1, Math.ceil(posts.length / itemsPerPage))}
                  </span>
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-[28px] w-[28px] inline-flex items-center justify-center rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] bg-transparent hover:bg-[#EDE8E1] px-0 py-0 text-[10px] disabled:opacity-50"
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(posts.length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(posts.length / itemsPerPage)}
                    aria-label="Next page"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedText && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSelectedText(null)}
          >
            <div
              className="w-full max-w-[720px] rounded-[10px] bg-white shadow-[0_10px_30px_rgba(13,23,23,0.2)] border border-[#171717]/10 [border-width:0.5px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-medium text-[#0D1717]">{selectedTitle}</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Copy"
                    title="Copy"
                    className="inline-flex items-center justify-center w-[24px] h-[24px] rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] hover:text-[#19b391] bg-[#FCF9F5] hover:bg-[#EDE8E1]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(selectedText || "");
                        toast.success('Copied to clipboard');
                      } catch {
                        toast.error('Failed to copy');
                      }
                    }}
                  >
                    <Copy className="w-[12px] h-[12px]" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-[24px] h-[24px] rounded-[5px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] hover:bg-[#EDE8E1]"
                    aria-label="Close"
                    onClick={() => setSelectedText(null)}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="px-5 pb-5 text-[12px] leading-[1.7em] text-[#0D1717] whitespace-pre-wrap break-words">
                {selectedText}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


