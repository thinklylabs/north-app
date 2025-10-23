"use client";

import { Old_Standard_TT } from "next/font/google";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

type IdeaRow = {
  id: number;
  idea_topic: string | null;
  idea_eq: string | null;
  idea_takeaway: string | null;
  created_at: string;
  status?: string | null;
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IdeaRow | null>(null);
  const [editTopic, setEditTopic] = useState<string>("");
  const [editEq, setEditEq] = useState<string>("");
  const [editTakeaway, setEditTakeaway] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<'created_at' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const itemsPerPage = 10;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackFor, setFeedbackFor] = useState<'idea' | 'post' | 'hook' | 'insight'>("idea");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [threadMessages, setThreadMessages] = useState<{
    id: number;
    authorUserId: string;
    authorRole: 'user' | 'admin';
    body: string;
    createdAt: string;
  }[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [newIdeaFeedback, setNewIdeaFeedback] = useState("");
  const [sendingIdeaFeedback, setSendingIdeaFeedback] = useState(false);
  const [insightForIdea, setInsightForIdea] = useState<{ id: number; insight: any } | null>(null);

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

  function getFilteredAndSortedIdeas() {
    let filtered = ideas.filter(idea => {
      if (statusFilter && idea.status !== statusFilter) return false;
      if (dateFilter) {
        const ideaDate = new Date(idea.created_at).toISOString().split('T')[0];
        if (ideaDate !== dateFilter) return false;
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

  const handleSelectAll = () => {
    const currentPageIdeas = getFilteredAndSortedIdeas().slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const allCurrentPageIds = new Set(currentPageIdeas.map(idea => idea.id));
    const allSelected = currentPageIdeas.every(idea => selectedIdeas.has(idea.id));
    
    if (allSelected) {
      setSelectedIdeas(prev => {
        const newSet = new Set(prev);
        allCurrentPageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedIdeas(prev => new Set([...prev, ...allCurrentPageIds]));
    }
  };

  const handleSelectIdea = (ideaId: number) => {
    setSelectedIdeas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  };

  const handleBulkCopy = async () => {
    const selectedIdeasData = ideas.filter(idea => selectedIdeas.has(idea.id));
    if (selectedIdeasData.length === 0) return;

    const textToCopy = selectedIdeasData.map(idea => {
      const topic = idea.idea_topic || 'Untitled idea';
      const eq = idea.idea_eq || '';
      const takeaway = idea.idea_takeaway || '';
      return `Topic: ${topic}\nEQ: ${eq}\nTakeaway: ${takeaway}\n---`;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(`Copied ${selectedIdeasData.length} idea(s) to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIdeas.size === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIdeas.size} idea(s)?`);
    if (!confirmed) return;

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .in('id', Array.from(selectedIdeas));
      
      if (error) {
        toast.error('Failed to delete ideas');
        return;
      }

      setIdeas(prev => prev.filter(idea => !selectedIdeas.has(idea.id)));
      setSelectedIdeas(new Set());
      toast.success(`Deleted ${selectedIdeas.size} idea(s)`);
    } catch {
      toast.error('Failed to delete ideas');
    }
  };

  const handleRowSetStatus = async (ideaId: number, newStatus: string) => {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('ideas')
        .update({ status: newStatus })
        .eq('id', ideaId);
      if (error) {
        toast.error('Failed to update status');
        return;
      }
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, status: newStatus } : i));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleBulkSetStatus = async (newStatus: string) => {
    if (selectedIdeas.size === 0) return;
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('ideas')
        .update({ status: newStatus })
        .in('id', Array.from(selectedIdeas));
      if (error) {
        toast.error('Failed to update statuses');
        return;
      }
      setIdeas(prev => prev.map(i => selectedIdeas.has(i.id) ? { ...i, status: newStatus } : i));
      toast.success(`Updated ${selectedIdeas.size} idea(s)`);
    } catch {
      toast.error('Failed to update statuses');
    }
  };

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
          .select("id, idea_topic, idea_eq, idea_takeaway, created_at, status")
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

  useEffect(() => {
    async function loadIdeaFeedback() {
      if (!selected) return;
      const supabase = createClient();
      try {
        setLoadingThread(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setThreadMessages([]);
          return;
        }
        const res = await fetch(`/api/feedbacks?ideaId=${selected.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          setThreadMessages([]);
          return;
        }
        const json = await res.json();
        setThreadMessages(Array.isArray(json?.messages) ? json.messages : []);
        setInsightForIdea(json?.insight ? json.insight : null);
      } finally {
        setLoadingThread(false);
      }
    }
    loadIdeaFeedback();
  }, [selected]);

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Users  {'>'}  Ideas</span>
        </div>
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

          {selectedIdeas.size > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[12px] text-[#6F7777]">
                {selectedIdeas.size} idea(s) selected
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
                onClick={() => setSelectedIdeas(new Set())}
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
            ) : getFilteredAndSortedIdeas().length === 0 ? (
              <div className="text-[12px] text-[#6F7777]">No ideas found.</div>
            ) : (
              <div className="overflow-hidden rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] shadow-[0_6px_20px_rgba(13,23,23,0.08)]">
                <table className="w-full table-fixed">
                  <thead className="bg-[#F6F2EC]">
                    <tr>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[5%]">
                        <input
                          type="checkbox"
                          checked={getFilteredAndSortedIdeas().slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).every(idea => selectedIdeas.has(idea.id)) && getFilteredAndSortedIdeas().slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-[#1DC6A1] text-[#1DC6A1] focus:ring-[#1DC6A1]"
                        />
                      </th>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[25%]">Topic</th>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[25%]">EQ</th>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[20%]">Takeaway</th>
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
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[10%]">
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
                    {getFilteredAndSortedIdeas()
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((idea) => {
                      const topic = idea.idea_topic || 'Untitled idea'
                      const eq = idea.idea_eq || ''
                      const takeaway = idea.idea_takeaway || ''
                      return (
                        <tr
                          key={idea.id}
                          className="border-t border-[#171717]/10 hover:bg-[#F9F6F1] cursor-pointer"
                          onClick={() => {
                            setSelected(idea)
                            setEditTopic(idea.idea_topic || '')
                            setEditEq(idea.idea_eq || '')
                            setEditTakeaway(idea.idea_takeaway || '')
                          }}
                        >
                          <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIdeas.has(idea.id)}
                              onChange={() => handleSelectIdea(idea.id)}
                              className="w-4 h-4 rounded border-[#1DC6A1] text-[#1DC6A1] focus:ring-[#1DC6A1]"
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-[12px] text-[#0D1717] truncate" title={topic}>{topic}</div>
                              <button
                                type="button"
                                aria-label="Copy topic"
                                title="Copy topic"
                                className="mt-[1px] inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] hover:text-[#19b391] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer flex-shrink-0"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await navigator.clipboard.writeText(topic);
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
                              <div className="text-[12px] text-[#0D1717] truncate" title={eq}>{eq}</div>
                              <button
                                type="button"
                                aria-label="Copy EQ"
                                title="Copy EQ"
                                className="mt-[1px] inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] hover:text-[#19b391] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer flex-shrink-0"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!eq) return;
                                  try {
                                    await navigator.clipboard.writeText(eq);
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
                              <div className="text-[12px] text-[#0D1717] truncate" title={takeaway}>{takeaway}</div>
                              <button
                                type="button"
                                aria-label="Copy takeaway"
                                title="Copy takeaway"
                                className="mt-[1px] inline-flex items-center justify-center w-[22px] h-[22px] rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] hover:text-[#19b391] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer flex-shrink-0"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!takeaway) return;
                                  try {
                                    await navigator.clipboard.writeText(takeaway);
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
                                  className={`inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px] cursor-pointer hover:opacity-80 transition-opacity ${getStatusStyles(idea.status || 'draft')}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {idea.status || 'draft'}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {STATUS_OPTIONS.map(opt => (
                                  <DropdownMenuItem key={opt} onClick={() => handleRowSetStatus(idea.id, opt)}>
                                    {opt}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="text-[12px] text-[#0D1717]">
                              {formatDate(idea.created_at)}
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
                      {/* Left arrow */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Button>
                    <span className="text-[11px] text-[#6F7777]">
                      Page {currentPage} of {Math.max(1, Math.ceil(getFilteredAndSortedIdeas().length / itemsPerPage))}
                    </span>
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-[28px] w-[28px] inline-flex items-center justify-center rounded-[5px] border border-[#1DC6A1] text-[#1DC6A1] bg-transparent hover:bg-[#EDE8E1] px-0 py-0 text-[10px] disabled:opacity-50"
                      onClick={() => setCurrentPage((p) => Math.min(Math.ceil(getFilteredAndSortedIdeas().length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(getFilteredAndSortedIdeas().length / itemsPerPage)}
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1717]/20 backdrop-blur-[6px] p-4"
              onClick={() => setSelected(null)}
            >
              <div
                className="w-full max-w-[90vw] max-h-[90vh] rounded-[10px] bg-[#FCF9F5] shadow-[0_10px_30px_rgba(13,23,23,0.2)] border border-[#171717]/10 [border-width:0.5px] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3 border-b border-[#171717]/10 [border-width:0.5px] bg-[#FCF9F5] rounded-t-[10px] flex-shrink-0">
                  <h3 className={`${oldStandard.className} text-[16px] leading-[1.3em] text-[#0D1717] font-bold`}>Idea</h3>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-[24px] h-[24px] rounded-[5px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] hover:bg-[#EDE8E1] cursor-pointer flex-shrink-0"
                    aria-label="Close"
                    onClick={() => setSelected(null)}
                  >
                    ✕
                  </button>
                </div>
                
                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto">
                  {insightForIdea ? (
                    <div className="px-5 pt-2 text-[11px] text-[#6F7777]">
                      <div className="font-medium text-[#0D1717] mb-1">Insight</div>
                      <pre className="text-[11px] whitespace-pre-wrap bg-[#F6F2EC] text-[#0D1717] rounded-[8px] p-2 max-h-[160px] overflow-auto">{JSON.stringify(insightForIdea.insight, null, 2)}</pre>
                    </div>
                  ) : null}
                  {/* Editable content */}
                  <div className="px-5 py-4 grid grid-cols-1 gap-3">
                    <div>
                      <div className={`mb-1.5 text-[12px] text-[#0D1717] ${oldStandard.className}`}>Topic</div>
                      <input
                        value={editTopic}
                        onChange={(e) => setEditTopic(e.target.value)}
                        placeholder="Topic"
                        className={`w-full text-[12px] text-[#0D1717] rounded-[8px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] px-3 py-2.5 outline-none`}
                      />
                    </div>
                    <div>
                      <div className={`mb-1.5 text-[12px] text-[#0D1717] ${oldStandard.className}`}>EQ</div>
                      <textarea
                        value={editEq}
                        onChange={(e) => setEditEq(e.target.value)}
                        placeholder="EQ"
                        className={`w-full h-[100px] resize-none text-[12px] leading-[1.6em] text-[#0D1717] rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] p-3 outline-none`}
                      />
                    </div>
                    <div>
                      <div className={`mb-1.5 text-[12px] text-[#0D1717] ${oldStandard.className}`}>Takeaway</div>
                      <textarea
                        value={editTakeaway}
                        onChange={(e) => setEditTakeaway(e.target.value)}
                        placeholder="Takeaway"
                        className={`w-full h-[100px] resize-none text-[12px] leading-[1.6em] text-[#0D1717] rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] p-3 outline-none`}
                      />
                    </div>
                  </div>
                  {/* Feedback thread */}
                  <div className="px-5 pb-4">
                    <div className={`mb-2 text-[12px] text-[#0D1717] ${oldStandard.className}`}>Feedback thread</div>
                    <div className="max-h-[180px] overflow-auto rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-white p-3 mb-3">
                      {loadingThread ? (
                        <div className="text-[11px] text-[#6F7777]">Loading feedback…</div>
                      ) : threadMessages.length === 0 ? (
                        <div className="text-[11px] text-[#6F7777]">No feedback yet.</div>
                      ) : (
                        <div className="space-y-2">
                          {threadMessages.map(m => (
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
                    <div className="flex items-start gap-2">
                      <textarea
                        value={newIdeaFeedback}
                        onChange={(e) => setNewIdeaFeedback(e.target.value)}
                        placeholder="Suggest changes, ask questions…"
                        className="flex-1 h-[90px] resize-none text-[12px] leading-[1.6em] text-[#0D1717] rounded-[10px] border border-[#171717]/20 [border-width:0.5px] bg-[#FCF9F5] p-3 outline-none"
                      />
                      <Button
                        type="button"
                        className="h-[32px] px-3 rounded-[6px] bg-[#1DC6A1] text-white hover:bg-[#19b391] text-[12px] cursor-pointer"
                        disabled={sendingIdeaFeedback || !selected || !newIdeaFeedback.trim()}
                        onClick={async () => {
                          if (!selected) return;
                          const supabase = createClient();
                          const { data: { session } } = await supabase.auth.getSession();
                          const token = session?.access_token;
                          if (!token) {
                            toast.error('Not authenticated');
                            return;
                          }
                          try {
                            setSendingIdeaFeedback(true);
                            const res = await fetch('/api/feedbacks', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                feedback_for: 'idea',
                                target_id: selected.id,
                                feedback: newIdeaFeedback.trim(),
                              }),
                            });
                            if (!res.ok) {
                              const j = await res.json().catch(() => ({}));
                              throw new Error(j.error || 'Failed to send feedback');
                            }
                            toast.success('Feedback sent');
                            setNewIdeaFeedback('');
                            // refresh messages
                            try {
                              const r = await fetch(`/api/feedbacks?ideaId=${selected.id}`, { headers: { Authorization: `Bearer ${token}` } });
                              if (r.ok) {
                                const j = await r.json();
                                setThreadMessages(Array.isArray(j?.messages) ? j.messages : []);
                              }
                            } catch {}
                          } catch (e: any) {
                            toast.error(e?.message || 'Failed to send feedback');
                          } finally {
                            setSendingIdeaFeedback(false);
                          }
                        }}
                      >
                        {sendingIdeaFeedback ? 'Sending…' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Footer Buttons - Fixed at bottom */}
                <div className="px-5 pb-4 flex flex-wrap items-center gap-2 flex-shrink-0 border-t border-[#171717]/10 [border-width:0.5px] bg-[#FCF9F5]">
                  <Button
                    type="button"
                    className="h-[30px] px-3 rounded-[6px] bg-[#1DC6A1] text-white hover:bg-[#19b391] text-[12px] cursor-pointer"
                    disabled={saving}
                    onClick={async () => {
                      if (!selected) return
                      const supabase = createClient()
                      try {
                        setSaving(true)
                        const { error } = await supabase
                          .from('ideas')
                          .update({ idea_topic: editTopic, idea_eq: editEq, idea_takeaway: editTakeaway })
                          .eq('id', selected.id)
                        if (error) throw error
                        setIdeas((prev) => prev.map((i) => i.id === selected.id ? { ...i, idea_topic: editTopic, idea_eq: editEq, idea_takeaway: editTakeaway } : i))
                        toast.success('Idea saved')
                        setSelected(null)
                      } catch (e) {
                        console.error(e)
                        toast.error('Failed to save')
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-[30px] px-3 rounded-[6px] border border-[#171717]/20 [border-width:0.5px] bg-white text-[#0D1717] hover:bg-[#EDE8E1] text-[12px] cursor-pointer"
                    onClick={async () => {
                      const parts: string[] = []
                      if (editTopic) parts.push(editTopic)
                      if (editEq) parts.push(`EQ: ${editEq}`)
                      if (editTakeaway) parts.push(`Takeaway: ${editTakeaway}`)
                      const text = parts.join('\n')
                      try {
                        await navigator.clipboard.writeText(text)
                        toast.success('Copied to clipboard')
                      } catch {
                        toast.error('Failed to copy')
                      }
                    }}
                  >
                    Copy
                  </Button>
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
            <div className="relative z-10 w-[640px] max-w-[92vw] rounded-[8px] bg-[#FCF9F5] shadow-xl border border-[#0D1717]/10">
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


