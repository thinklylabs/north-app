"use client";

import { Old_Standard_TT } from "next/font/google";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/LogoutButton";
import { useEffect, useState } from "react";
import { Copy, Trash2, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

type PostRow = {
  id: number;
  post_hook: string | null;
  post_content: string | null;
  created_at: string;
  status?: string | null;
  owner?: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;
};

export default function AdminPostsPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [owners, setOwners] = useState<Array<{ id: string; email: string | null; first_name: string | null; last_name: string | null; company_name: string | null }>>([])
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<'created_at' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
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
      if (ownerFilter && (post.owner?.id || '') !== ownerFilter) return false;
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

    try {
      const res = await fetch('/api/admin/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedPosts) }),
      });
      if (!res.ok) {
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
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [postId], status: newStatus }),
      });
      if (!res.ok) {
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
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedPosts), status: newStatus }),
      });
      if (!res.ok) {
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
    async function loadPosts() {
      try {
        const params = new URLSearchParams()
        if (ownerFilter) params.set('owner', ownerFilter)
        const res = await fetch(`/api/admin/posts?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load posts');
        const json = await res.json();
        setPosts((json.posts || []) as PostRow[]);
        setOwners((json.owners || []) as any[])
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        toast.error('Failed to load posts');
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, [ownerFilter]);

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Admin  {'>'}  Posts</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-24">

        <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em] mt-[30px]`}>All Posts</h1>

        {/* Filter Controls */}
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-[12px] text-[#6F7777] whitespace-nowrap">Status:</label>
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
            <label htmlFor="owner-filter" className="text-[12px] text-[#6F7777] whitespace-nowrap">Owner:</label>
            <select
              id="owner-filter"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="h-[28px] px-2 rounded-[5px] border border-[#171717]/20 text-[11px] bg-[#FCF9F5] focus:outline-none focus:ring-1 focus:ring-[#1DC6A1]"
            >
              <option value="">All</option>
              {owners
                .map(o => {
                  const name = o.first_name || o.last_name ? `${o.first_name || ''} ${o.last_name || ''}`.trim() : (o.email || 'Unknown')
                  const company = o.company_name ? ` • ${o.company_name}` : ''
                  return { id: o.id, label: `${name}${company}` }
                })
                .sort((a, b) => a.label.localeCompare(b.label))
                .map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="date-filter" className="text-[12px] text-[#6F7777] whitespace-nowrap">Date:</label>
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
              setOwnerFilter('');
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
                    <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[20%]">Hook</th>
                    <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[20%]">Owner</th>
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
                    const ownerName = row.owner?.first_name || row.owner?.last_name 
                      ? `${row.owner?.first_name || ''} ${row.owner?.last_name || ''}`.trim()
                      : (row.owner?.email || 'Unknown')
                    const ownerCompany = row.owner?.company_name || ''
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
                          <div className="flex flex-col">
                            <span className="text-[12px] text-[#0D1717] truncate" title={ownerName}>{ownerName}</span>
                            {ownerCompany ? (
                              <span className="text-[10px] text-[#6F7777] truncate" title={ownerCompany}>{ownerCompany}</span>
                            ) : null}
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
                    className="h-[28px] w-[28px] inline-flex items-center justify-center rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] bg-transparent hover:bg-[#EDE8E1] px-0 py-0 text-[10px] disabled:opacity-50"
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
                    className="h-[28px] w-[28px] inline-flex items-center justify-center rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] bg-transparent hover:bg-[#EDE8E1] px-0 py-0 text-[10px] disabled:opacity-50"
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(getFilteredAndSortedPosts().length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(getFilteredAndSortedPosts().length / itemsPerPage)}
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



