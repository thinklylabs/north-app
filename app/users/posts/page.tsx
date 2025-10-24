"use client";

import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, Trash2, ArrowUpDown, Filter, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: ["400", "700"] });

type PostRow = {
  id: number;
  post_hook: string | null;
  post_content: string | null;
  created_at: string;
  status?: string | null;
};

export default function PostsPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<PostRow | null>(null);
  const [editHook, setEditHook] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");
  const [editFeedback, setEditFeedback] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackMessages, setFeedbackMessages] = useState<{
    id: number;
    authorUserId: string;
    authorRole: 'user' | 'admin';
    body: string;
    createdAt: string;
  }[]>([]);
  const [insightForThread, setInsightForThread] = useState<{ id: number; insight: any } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [showLinkedInConfirm, setShowLinkedInConfirm] = useState(false);
  const [postingToLinkedIn, setPostingToLinkedIn] = useState(false);
  const [sortField, setSortField] = useState<'created_at' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const itemsPerPage = 10;

  const STATUS_OPTIONS = [
    "draft",
    "feedback stage",
    "for later",
    "approved",
    "posted",
  ] as const;

  function getStatusStyles(status: string | null | undefined): string {
    const s = (status || "").toLowerCase();
    if (s === "draft") return "bg-[#EDE8E1] text-[#6F7777]";
    if (s === "feedback stage") return "bg-[#FFF3C4] text-[#856404]";
    if (s === "for later") return "bg-[#E6F7F3] text-[#1DC6A1]";
    if (s === "approved") return "bg-[#DCFCE7] text-[#166534]";
    if (s === "posted") return "bg-[#E5EDFF] text-[#1E40AF]";
    return "bg-[#EDE8E1] text-[#6F7777]";
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  }

  function getFilteredAndSortedPosts() {
    let filtered = posts.filter(post => {
      if (statusFilter && post.status !== statusFilter) return false;
      if (dateFilter) {
        const postDate = new Date(post.created_at).toISOString().split('T')[0];
        if (postDate !== dateFilter) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'created_at') {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      } else {
        aValue = (a.status || '').toLowerCase();
        bValue = (b.status || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  const handleSort = (field: 'created_at' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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

  const handleSelectAll = () => {
    const currentPagePosts = getFilteredAndSortedPosts().slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const allCurrentPageIds = new Set(currentPagePosts.map(post => post.id));
    const allSelected = currentPagePosts.every(post => selectedPosts.has(post.id));
    
    if (allSelected) {
      // Deselect all on current page
      setSelectedPosts(prev => {
        const newSet = new Set(prev);
        allCurrentPageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all on current page
      setSelectedPosts(prev => new Set([...prev, ...allCurrentPageIds]));
    }
  };

  const handleSelectPost = (postId: number) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleBulkCopy = async () => {
    const selectedPostsData = posts.filter(post => selectedPosts.has(post.id));
    if (selectedPostsData.length === 0) return;

    const textToCopy = selectedPostsData.map(post => {
      const hook = post.post_hook || '';
      const content = post.post_content || '';
      return `Hook: ${hook}\nPost: ${content}\n---`;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(`Copied ${selectedPostsData.length} post(s) to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.size === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedPosts.size} post(s)?`);
    if (!confirmed) return;

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .in('id', Array.from(selectedPosts));
      
      if (error) {
        toast.error('Failed to delete posts');
        return;
      }

      // Remove deleted posts from state
      setPosts(prev => prev.filter(post => !selectedPosts.has(post.id)));
      setSelectedPosts(new Set());
      toast.success(`Deleted ${selectedPosts.size} post(s)`);
    } catch {
      toast.error('Failed to delete posts');
    }
  };

  const handleRowSetStatus = async (postId: number, newStatus: string) => {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', postId);
      if (error) {
        toast.error('Failed to update status');
        return;
      }
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: newStatus } : p));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleBulkSetStatus = async (newStatus: string) => {
    if (selectedPosts.size === 0) return;
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .in('id', Array.from(selectedPosts));
      if (error) {
        toast.error('Failed to update statuses');
        return;
      }
      setPosts(prev => prev.map(p => selectedPosts.has(p.id) ? { ...p, status: newStatus } : p));
      toast.success(`Updated ${selectedPosts.size} post(s)`);
    } catch {
      toast.error('Failed to update statuses');
    }
  };

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
          .select("id, post_hook, post_content, created_at, status")
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

  useEffect(() => {
    async function loadFeedbackForSelected() {
      if (!selectedRow) return;
      const supabase = createClient();
      try {
        setLoadingFeedback(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setFeedbackMessages([]);
          return;
        }
        const res = await fetch(`/api/feedbacks?postId=${selectedRow.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          setFeedbackMessages([]);
          return;
        }
        const json = await res.json();
        setFeedbackMessages(Array.isArray(json?.messages) ? json.messages : []);
        setInsightForThread(json?.insight ? json.insight : null);
      } finally {
        setLoadingFeedback(false);
      }
    }
    loadFeedbackForSelected();
  }, [selectedRow]);
  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Users  {'>'}  Posts</span>
        </div>
      </div>

      <div className="px-6 md:px-10 pb-24">

        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>Posts</h1>

        {/* Filter Controls */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter" className="text-[12px] text-[#6F7777] whitespace-nowrap">Status:</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[28px] px-2 rounded-[5px] border border-[#171717]/20 text-[11px] bg-[#FCF9F5] focus:outline-none focus:ring-1 focus:ring-[#1DC6A1]"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="date-filter" className="text-[12px] text-[#6F7777] whitespace-nowrap">Date:</Label>
            <Input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-[28px] px-2 text-[11px] border-[#171717]/20 focus:ring-1 focus:ring-[#1DC6A1]"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setDateFilter('');
            }}
            className="h-[28px] px-3 text-[11px] text-[#6F7777] hover:bg-[#EDE8E1]"
          >
            Clear
          </Button>
        </div>

        {selectedPosts.size > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[12px] text-[#6F7777]">
              {selectedPosts.size} post(s) selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[28px] px-3 text-[11px] border-[#1DC6A1] text-[#1DC6A1] hover:bg-[#EDE8E1]"
                >
                  Set Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {STATUS_OPTIONS.map(opt => (
                  <DropdownMenuItem key={opt} onClick={() => handleBulkSetStatus(opt)}>
                    {opt}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCopy}
              className="h-[28px] px-3 text-[11px] border-[#1DC6A1] text-[#1DC6A1] hover:bg-[#EDE8E1]"
            >
              <Copy className="w-[12px] h-[12px] mr-1" />
              Copy Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="h-[28px] px-3 text-[11px] border-red-500 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-[12px] h-[12px] mr-1" />
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPosts(new Set())}
              className="h-[28px] px-3 text-[11px] text-[#6F7777] hover:bg-[#EDE8E1]"
            >
              Clear Selection
            </Button>
          </div>
        )}

        <div className="mt-6 md:mt-8 w-full max-w-none">
          {loading ? (
            <div className="rounded-[10px] border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] p-5">
              <div className="h-[12px] w-[200px] rounded bg-[#EDE8E1] animate-pulse mb-4" />
              <div className="h-[10px] w-full rounded bg-[#EDE8E1] animate-pulse mb-2" />
              <div className="h-[10px] w-[90%] rounded bg-[#EDE8E1] animate-pulse" />
            </div>
          ) : getFilteredAndSortedPosts().length === 0 ? (
            <div className="text-[12px] text-[#6F7777]">No posts found.</div>
          ) : (
            <div className="overflow-hidden rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
              <table className="w-full table-fixed">
                <thead className="bg-[#F6F2EC]">
                  <tr>
                    <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[5%]">
                      <input
                        type="checkbox"
                        checked={getFilteredAndSortedPosts().slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).every(post => selectedPosts.has(post.id)) && getFilteredAndSortedPosts().slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-[#1DC6A1] text-[#1DC6A1] focus:ring-[#1DC6A1]"
                      />
                    </th>
                    <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[25%]">Hook</th>
                    <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[35%]">Post</th>
                    <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[15%]">
                      <button
                        type="button"
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-[#1DC6A1] transition-colors"
                      >
                        Status
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[15%]">
                      <button
                        type="button"
                        onClick={() => handleSort('created_at')}
                        className="flex items-center gap-1 hover:text-[#1DC6A1] transition-colors"
                      >
                        Created
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedPosts()
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((row) => {
                    const hook = row.post_hook || ''
                    const content = row.post_content || ''
                    return (
                      <tr key={row.id} className="border-t border-[#171717]/10">
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={selectedPosts.has(row.id)}
                            onChange={() => handleSelectPost(row.id)}
                            className="w-4 h-4 rounded border-[#1DC6A1] text-[#1DC6A1] focus:ring-[#1DC6A1]"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className="text-[12px] text-[#0D1717] truncate cursor-pointer"
                              title={hook}
                              onClick={() => {
                                setSelectedRow(row);
                                setEditHook(hook);
                                setEditContent(content);
                                setEditFeedback("");
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
                                setSelectedRow(row);
                                setEditHook(hook);
                                setEditContent(content);
                                setEditFeedback("");
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
                        <td className="px-4 py-3 align-top">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={`inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px] cursor-pointer hover:opacity-80 transition-opacity ${getStatusStyles(row.status || 'draft')}`}
                              >
                                {row.status || 'draft'}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {STATUS_OPTIONS.map(opt => (
                                <DropdownMenuItem key={opt} onClick={() => handleRowSetStatus(row.id, opt)}>
                                  {opt}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="text-[12px] text-[#0D1717]">
                            {formatDate(row.created_at)}
                          </span>
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
                    className="h-[28px] w-[28px] inline-flex items-center justify-center rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] bg-transparent hover:bg-[#EDE8E1] px-0 py-0 text-[10px] disabled:opacity-50 cursor-pointer"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Button>
                  <span className="text-[11px] text-[#6F7777]">
                    Page {currentPage} of {Math.max(1, Math.ceil(getFilteredAndSortedPosts().length / itemsPerPage))}
                  </span>
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-[28px] w-[28px] inline-flex items-center justify-center rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] bg-transparent hover:bg-[#EDE8E1] px-0 py-0 text-[10px] disabled:opacity-50 cursor-pointer"
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

        {selectedRow && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1717]/20 backdrop-blur-[6px] p-4"
            onClick={() => setSelectedRow(null)}
          >
            <div
              className="w-full max-w-[920px] rounded-[10px] bg-[#FCF9F5] shadow-[0_10px_30px_rgba(13,23,23,0.2)] border border-[#171717]/10 [border-width:0.5px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3 border-b border-[#171717]/10 [border-width:0.5px] bg-[#FCF9F5] rounded-t-[10px]">
                <h3 className={`${oldStandard.className} text-[16px] leading-[1.3em] text-[#0D1717] font-bold`}>Post title</h3>
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-[24px] h-[24px] rounded-[5px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer"
                  aria-label="Close"
                  onClick={() => setSelectedRow(null)}
                >
                  ✕
                </button>
              </div>
              {insightForThread ? (
                <div className="px-5 pt-2 text-[10px] text-[#6F7777]">
                  <div className="font-medium text-[#0D1717] mb-1">Insight</div>
                  <pre className="text-[10px] whitespace-pre-wrap bg-[#F6F2EC] text-[#0D1717] rounded-[6px] p-2 max-h-[80px] overflow-auto">{JSON.stringify(insightForThread.insight, null, 2)}</pre>
                </div>
              ) : null}
              {/* Content */}
              <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className={`mb-2 text-[12px] text-[#0D1717] ${oldStandard.className}`}>Post</div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Write your post…"
                    className={`w-full h-[120px] resize-none text-[12px] leading-[1.6em] text-[#0D1717] rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] p-3 outline-none focus:ring-0 ${oldStandard.className}`}
                  />
                  <div className={`mt-3 mb-2 text-[12px] text-[#0D1717] ${oldStandard.className}`}>Hook</div>
                  <input
                    value={editHook}
                    onChange={(e) => setEditHook(e.target.value)}
                    placeholder="Hook"
                    className={`w-full text-[12px] text-[#0D1717] rounded-[8px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] px-3 py-2.5 outline-none ${oldStandard.className}`}
                  />

                </div>
                <div>
                  <div className={`mb-2 text-[12px] text-[#0D1717] ${oldStandard.className}`}>Feedback thread</div>
                  <div className="max-h-[180px] overflow-auto rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-white p-3 mb-3">
                    {loadingFeedback ? (
                      <div className="text-[11px] text-[#6F7777]">Loading feedback…</div>
                    ) : feedbackMessages.length === 0 ? (
                      <div className="text-[11px] text-[#6F7777]">No feedback yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {feedbackMessages.map(m => (
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
                  <div className={`mb-2 text-[12px] text-[#0D1717] ${oldStandard.className}`}>Add feedback</div>
                  <div className="relative">
                    <textarea
                      value={editFeedback}
                      onChange={(e) => setEditFeedback(e.target.value)}
                      placeholder="Didn't like the post? Want some improvements, comment here, we will update the post in 24h"
                      className={`w-full h-[140px] resize-none text-[12px] leading-[1.6em] text-[#0D1717] rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] p-3 pr-10 outline-none focus:ring-0 ${oldStandard.className}`}
                    />
                    <button
                      type="button"
                      aria-label="Send feedback"
                      className="absolute bottom-3 right-3 inline-flex items-center justify-center w-[28px] h-[28px] rounded-[6px] border border-[#1DC6A1] text-white bg-[#1DC6A1] hover:bg-[#19b391] cursor-pointer"
                      onClick={async () => {
                        if (!selectedRow || !editFeedback.trim() || sendingFeedback) return
                        const supabase = createClient()
                        const { data: { session } } = await supabase.auth.getSession()
                        const token = session?.access_token
                        if (!token) {
                          toast.error('Not authenticated')
                          return
                        }
                        try {
                          setSendingFeedback(true)
                          const res = await fetch('/api/feedbacks', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ feedback_for: 'post', target_id: selectedRow.id, feedback: editFeedback })
                          })
                          if (!res.ok) {
                            const j = await res.json().catch(() => ({}))
                            throw new Error(j.error || 'Failed to send feedback')
                          }
                          toast.success('Feedback sent')
                          setEditFeedback('')
                          // refresh list
                          await (async () => {
                            try {
                              const r = await fetch(`/api/feedbacks?postId=${selectedRow.id}`, { headers: { Authorization: `Bearer ${token}` } })
                              if (r.ok) {
                                const j = await r.json();
                                setFeedbackMessages(Array.isArray(j?.messages) ? j.messages : [])
                              }
                            } catch {}
                          })()
                        } catch (e: any) {
                          toast.error(e?.message || 'Failed to send feedback')
                        } finally {
                          setSendingFeedback(false)
                        }
                      }}
                    >
                      <ArrowRight className="w-[16px] h-[16px]" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Footer Buttons */}
              <div className="px-5 pb-5 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="h-[30px] px-3 rounded-[6px] bg-[#1DC6A1] text-white hover:bg-[#19b391] text-[12px] cursor-pointer"
                  disabled={saving}
                  onClick={async () => {
                    if (!selectedRow) return
                    const supabase = createClient()
                    try {
                      setSaving(true)
                      const { error } = await supabase
                        .from('posts')
                        .update({ post_hook: editHook, post_content: editContent })
                        .eq('id', selectedRow.id)
                      if (error) throw error
                      setPosts((prev) => prev.map((p) => p.id === selectedRow.id ? { ...p, post_hook: editHook, post_content: editContent } : p))
                      toast.success('Post saved')
                      setSelectedRow(null)
                    } catch (e) {
                      console.error(e)
                      toast.error('Failed to save post')
                    } finally {
                      setSaving(false)
                    }
                  }}
                >
                  {saving ? 'Saving…' : 'Save post'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-[30px] px-3 rounded-[6px] border border-[#171717]/20 [border-width:0.5px] bg-white text-[#0D1717] hover:bg-[#EDE8E1] text-[12px] cursor-pointer"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(editContent || '')
                      toast.success('Copied to clipboard')
                    } catch {
                      toast.error('Failed to copy')
                    }
                  }}
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  className="h-[30px] px-3 rounded-[6px] bg-[#0077B5] text-white hover:bg-[#005885] text-[12px] cursor-pointer"
                  disabled={postingToLinkedIn}
                  onClick={() => setShowLinkedInConfirm(true)}
                >
                  {postingToLinkedIn ? 'Posting...' : 'Post directly to LinkedIn'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* LinkedIn Post Confirmation Modal */}
        {showLinkedInConfirm && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-[#0D1717]/20 backdrop-blur-[6px] p-4"
            onClick={() => setShowLinkedInConfirm(false)}
          >
            <div
              className="w-full max-w-2xl rounded-[10px] bg-[#FCF9F5] shadow-[0_10px_30px_rgba(13,23,23,0.2)] border border-[#171717]/10 [border-width:0.5px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3 border-b border-[#171717]/10 [border-width:0.5px] bg-[#FCF9F5] rounded-t-[10px]">
                <h3 className={`${oldStandard.className} text-[16px] leading-[1.3em] text-[#0D1717] font-bold`}>Post to LinkedIn</h3>
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-[24px] h-[24px] rounded-[5px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer"
                  aria-label="Close"
                  onClick={() => setShowLinkedInConfirm(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="px-5 py-4">
                <p className="text-[14px] text-[#0D1717] mb-4">
                  Are you sure you want to post this directly to LinkedIn? This will publish the post immediately.
                </p>
                
                {/* Preview Content - Side by Side Layout */}
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Post Preview */}
                  <div className="p-3 bg-[#F6F2EC] rounded-[8px] border border-[#171717]/10">
                    <p className="text-[12px] text-[#6F7777] mb-2 font-medium">Post Preview:</p>
                    <div className="text-[13px] text-[#0D1717] leading-[1.4] whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                      {editContent || selectedRow?.post_content || 'No content'}
                    </div>
                    {editHook && (
                      <div className="mt-2 text-[12px] text-[#6F7777]">
                        <span className="font-medium">Hook:</span> {editHook}
                      </div>
                    )}
                  </div>
                  
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-[30px] px-3 rounded-[6px] border border-[#171717]/20 [border-width:0.5px] bg-white text-[#0D1717] hover:bg-[#EDE8E1] text-[12px] cursor-pointer"
                    onClick={() => setShowLinkedInConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="h-[30px] px-3 rounded-[6px] bg-[#0077B5] text-white hover:bg-[#005885] text-[12px] cursor-pointer"
                    disabled={postingToLinkedIn}
                    onClick={async () => {
                      if (!selectedRow) return;
                      
                      try {
                        setPostingToLinkedIn(true);
                        
                        const supabase = createClient();
                        const { data: { session } } = await supabase.auth.getSession();
                        const token = session?.access_token;
                        
                        if (!token) {
                          toast.error('Not authenticated');
                          return;
                        }

                        const response = await fetch('/api/linkedin/post', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            postId: selectedRow.id,
                            imageData: null // No image upload functionality
                          })
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || 'Failed to post to LinkedIn');
                        }

                        toast.success('Posted to LinkedIn successfully!');
                        setShowLinkedInConfirm(false);
                        setSelectedRow(null);
                        
                        // Refresh posts list to show updated status
                        const res = await fetch('/api/posts', {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (res.ok) {
                          const json = await res.json();
                          setPosts(json.posts || []);
                        }
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to post to LinkedIn');
                      } finally {
                        setPostingToLinkedIn(false);
                      }
                    }}
                  >
                    {postingToLinkedIn ? 'Posting...' : 'Post to LinkedIn'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


