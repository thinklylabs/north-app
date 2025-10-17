"use client";

import { Old_Standard_TT } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import { useEffect, useMemo, useState } from "react";
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

const oldStandard = Old_Standard_TT({ subsets: ["latin"], weight: "400" });

type IdeaRow = {
  id: number;
  idea_topic: string | null;
  idea_eq: string | null;
  idea_takeaway: string | null;
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

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [owners, setOwners] = useState<Array<{ id: string; email: string | null; first_name: string | null; last_name: string | null; company_name: string | null }>>([])
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IdeaRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());
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

  const ownerOptions = useMemo(() => {
    return owners
      .map(o => {
        const name = o.first_name || o.last_name ? `${o.first_name || ''} ${o.last_name || ''}`.trim() : (o.email || 'Unknown')
        const company = o.company_name ? ` • ${o.company_name}` : ''
        return { id: o.id, label: `${name}${company}` }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [owners])

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
      if (ownerFilter && (idea.owner?.id || '') !== ownerFilter) return false;
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

    try {
      const res = await fetch('/api/admin/ideas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIdeas) }),
      });
      if (!res.ok) {
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
    try {
      const res = await fetch('/api/admin/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [ideaId], status: newStatus }),
      });
      if (!res.ok) {
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
    try {
      const res = await fetch('/api/admin/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIdeas), status: newStatus }),
      });
      if (!res.ok) {
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
    async function loadIdeas() {
      try {
        const params = new URLSearchParams()
        if (ownerFilter) params.set('owner', ownerFilter)
        const res = await fetch(`/api/admin/ideas?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load ideas')
        const json = await res.json()
        setIdeas((json.ideas || []) as IdeaRow[])
        setOwners((json.owners || []) as any[])
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e)
        toast.error('Failed to load ideas')
      } finally {
        setLoading(false)
      }
    }
    loadIdeas()
  }, [ownerFilter])

  return (
    <div className="min-h-screen w-full bg-[#FCF9F5] text-[#0D1717]">
      <div className="flex items-center justify-between p-6 md:px-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-sans text-[12px] leading-[1.3em]">ThinklyLabs  {'>'}  Admin  {'>'}  Ideas</span>
        </div>
        <LogoutButton />
      </div>

      <div className="px-6 md:px-10 pb-24">

          <div className="mt-[30px] flex items-center justify-between">
            <h1 className={`${oldStandard.className} text-[30px] leading-[1.236em]`}>All Ideas</h1>
          </div>

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
                {ownerOptions.map(o => (
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
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[20%]">Topic</th>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[20%]">Owner</th>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[20%]">EQ</th>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[20%]">Takeaway</th>
                      <th className="text-left text-[11px] font-medium text-[#6F7777] px-4 py-3 w-[10%]">
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
                      const ownerName = idea.owner?.first_name || idea.owner?.last_name 
                        ? `${idea.owner?.first_name || ''} ${idea.owner?.last_name || ''}`.trim()
                        : (idea.owner?.email || 'Unknown')
                      const ownerCompany = idea.owner?.company_name || ''
                      return (
                        <tr
                          key={idea.id}
                          className="border-t border-[#171717]/10 hover:bg-[#F9F6F1] cursor-pointer"
                          onClick={() => setSelected(idea)}
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
                            <div className="flex flex-col">
                              <span className="text-[12px] text-[#0D1717] truncate" title={ownerName}>{ownerName}</span>
                              {ownerCompany ? (
                                <span className="text-[10px] text-[#6F7777] truncate" title={ownerCompany}>{ownerCompany}</span>
                              ) : null}
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}



