"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { 
  HelpCircle, RefreshCw, Clock, Check, X, Search, 
  MessageSquare, Send, CheckCircle2, AlertCircle, Building2,
  Folder, FolderOpen, FileText, ChevronDown, List
} from "lucide-react";

interface QnaViewProps {
  onNavigate?: (view: string, targetId?: string) => void;
}

export default function QnaView({ onNavigate }: QnaViewProps) {
  const queryClient = useQueryClient();
  
  // View mode, filtering and node states
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const [answeringQueryId, setAnsweringQueryId] = useState<string | null>(null);
  const [queryAnswerText, setQueryAnswerText] = useState<string>("");

  // Fetch all candidate queries
  const { data: dashboardQueries = [], isLoading: loadingQueries, refetch } = useQuery<any[]>({
    queryKey: ["dashboard_queries"],
    queryFn: () => apiRequest<any[]>("GET", "/queries"),
    refetchInterval: 4000 // Poll every 4 seconds to match notifications
  });

  // Answer query mutation
  const answerQueryMutation = useMutation({
    mutationFn: ({ id, responseText }: { id: string; responseText: string }) => 
      apiRequest<any>("POST", `/queries/${id}/answer`, { response_text: responseText }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard_queries"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setAnsweringQueryId(null);
      setQueryAnswerText("");
    }
  });

  // Derived stats
  const totalCount = dashboardQueries.length;
  const pendingCount = dashboardQueries.filter(q => !q.is_resolved).length;
  const resolvedCount = dashboardQueries.filter(q => q.is_resolved).length;

  // Extract unique client names
  const uniqueClients = React.useMemo(() => {
    const clients = new Set<string>();
    dashboardQueries.forEach(q => {
      const name = q.job_openings?.requirements?.clients?.name || q.job_openings?.client_name;
      if (name) clients.add(name);
    });
    return Array.from(clients);
  }, [dashboardQueries]);

  // Filter & Search logic
  const filteredQueries = React.useMemo(() => {
    return dashboardQueries.filter(q => {
      // 1. Filter by search query
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const email = (q.candidate_email || "").toLowerCase();
        const text = (q.query_text || "").toLowerCase();
        const role = (q.job_openings?.title || "").toLowerCase();
        const client = (q.job_openings?.requirements?.clients?.name || q.job_openings?.client_name || "").toLowerCase();
        if (!email.includes(term) && !text.includes(term) && !role.includes(term) && !client.includes(term)) {
          return false;
        }
      }

      // 2. Filter by client organization
      if (clientFilter !== "all") {
        const clientName = q.job_openings?.requirements?.clients?.name || q.job_openings?.client_name;
        if (clientName !== clientFilter) return false;
      }

      // 3. Filter by resolved status
      if (statusFilter !== "all") {
        if (statusFilter === "resolved" && !q.is_resolved) return false;
        if (statusFilter === "pending" && q.is_resolved) return false;
      }

      return true;
    });
  }, [dashboardQueries, searchQuery, clientFilter, statusFilter]);

  // Group queries for the Tree / File System view
  // Hierarchy: Client -> Job Opening -> Queries
  const groupedQueries = React.useMemo(() => {
    const grouped: Record<string, {
      jobs: Record<string, {
        job_title: string;
        queries: any[];
      }>
    }> = {};

    filteredQueries.forEach(q => {
      const clientName = q.job_openings?.requirements?.clients?.name || q.job_openings?.client_name || "Generic Client";
      const jobId = q.job_openings?.id || "unknown-job";
      const jobTitle = q.job_openings?.title || "Unknown Job Opening";

      if (!grouped[clientName]) {
        grouped[clientName] = { jobs: {} };
      }

      if (!grouped[clientName].jobs[jobId]) {
        grouped[clientName].jobs[jobId] = {
          job_title: jobTitle,
          queries: []
        };
      }

      grouped[clientName].jobs[jobId].queries.push(q);
    });

    return grouped;
  }, [filteredQueries]);

  const toggleNode = (key: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderQueryDetail = (q: any, isAnswering: boolean) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2.5 p-4 border border-neutral-100 bg-neutral-50/30 rounded-sm">
        {/* Question Column */}
        <div className="space-y-1.5 bg-neutral-50/50 p-3.5 rounded-sm border border-neutral-200/50">
          <span className="text-[9.5px] font-mono font-bold uppercase text-neutral-400 block">Candidate Question</span>
          <p className="text-neutral-850 font-medium text-xs leading-relaxed italic">
            "{q.query_text}"
          </p>
        </div>

        {/* Answer Column */}
        <div className="space-y-2">
          {q.is_resolved ? (
            <div className="space-y-1.5 bg-primary/5 p-3.5 rounded-sm border border-primary/10 h-full">
              <span className="text-[9.5px] font-mono font-bold uppercase text-primary block">Official Answer / AI Reply</span>
              <p className="text-neutral-700 text-xs leading-relaxed">
                {q.ai_response}
              </p>
            </div>
          ) : isAnswering ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!queryAnswerText.trim()) return;
                answerQueryMutation.mutate({ id: q.id, responseText: queryAnswerText });
              }}
              className="space-y-2.5"
            >
              <textarea
                required
                rows={3}
                value={queryAnswerText}
                onChange={(e) => setQueryAnswerText(e.target.value)}
                placeholder="Write your answer to the candidate..."
                className="w-full px-3 py-2 border border-neutral-250 bg-neutral-50/20 focus:bg-white rounded-sm text-neutral-850 placeholder:text-neutral-450 focus:outline-hidden focus:border-primary text-xs resize-none animate-fadeIn text-neutral-900"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAnsweringQueryId(null);
                    setQueryAnswerText("");
                  }}
                  className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-100 text-neutral-500 font-mono text-[9px] uppercase font-bold rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={answerQueryMutation.isPending}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] uppercase font-bold tracking-wider rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {answerQueryMutation.isPending ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Submit Answer
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between h-full bg-neutral-50 p-4 border border-dashed border-neutral-350 rounded-sm">
              <div className="space-y-0.5">
                <span className="font-semibold text-neutral-500 text-[11px]">No custom reply submitted.</span>
                {q.ai_response && (
                  <p className="text-neutral-405 text-[10.5px]">AI generated an initial context response.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAnsweringQueryId(q.id);
                  setQueryAnswerText(q.ai_response || "");
                }}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-white font-mono text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors cursor-pointer flex items-center gap-1"
              >
                Answer Query
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none pb-12 p-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <h2 className="text-xl font-tight font-black uppercase tracking-wider text-neutral-900 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            Candidate Q&A Desk
          </h2>
          <p className="text-neutral-500 text-xs mt-1">
            Audit, answer, and manage candidate questions submitted from job application forms.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 border border-neutral-250 hover:bg-neutral-100 text-neutral-600 font-mono text-[10px] uppercase font-bold tracking-wider rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          {/* View Toggle */}
          <div className="flex items-center border border-neutral-200 rounded-sm overflow-hidden p-0.5 bg-neutral-50 shrink-0">
            <button
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "tree" ? "bg-neutral-900 text-neutral-white shadow-xs" : "text-neutral-500 hover:text-neutral-850"
              }`}
              title="File System View"
            >
              <Folder className="w-3.5 h-3.5" />
              File System
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "list" ? "bg-neutral-900 text-neutral-white shadow-xs" : "text-neutral-500 hover:text-neutral-850"
              }`}
              title="Flat List View"
            >
              <List className="w-3.5 h-3.5" />
              Flat List
            </button>
          </div>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-neutral-white border border-neutral-200 p-4 rounded-sm shadow-xs flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-neutral-350" />
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Total Questions</span>
          <span className="text-2xl font-tight font-bold text-neutral-850 mt-1">{totalCount}</span>
        </div>
        
        <div className="bg-neutral-white border border-neutral-200 p-4 rounded-sm shadow-xs flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Awaiting Reply</span>
          <span className="text-2xl font-tight font-bold text-neutral-850 mt-1 text-amber-600">{pendingCount}</span>
        </div>

        <div className="bg-neutral-white border border-neutral-200 p-4 rounded-sm shadow-xs flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600" />
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Resolved</span>
          <span className="text-2xl font-tight font-bold text-neutral-850 mt-1 text-emerald-600">{resolvedCount}</span>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="border border-neutral-200 bg-neutral-white rounded-sm p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate email, query..."
            className="w-full pl-9 pr-8 py-2 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Client dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-450 uppercase font-mono font-semibold shrink-0">Client:</span>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
          >
            <option value="all">All Clients</option>
            {uniqueClients.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>

        {/* Status dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-450 uppercase font-mono font-semibold shrink-0">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main List Container */}
      <div className="space-y-4">
        {loadingQueries ? (
          <div className="border border-neutral-200 bg-neutral-white rounded-sm p-16 text-center text-xs text-neutral-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-neutral-300" />
            <span>Retrieving candidate queries...</span>
          </div>
        ) : filteredQueries.length === 0 ? (
          <div className="border border-neutral-200 bg-neutral-white rounded-sm p-16 text-center max-w-lg mx-auto space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 rounded-full flex items-center justify-center mx-auto text-neutral-400">
              <CheckCircle2 className="w-6 h-6 text-neutral-300" />
            </div>
            <div className="space-y-1">
              <h4 className="font-tight font-bold text-sm text-neutral-850 uppercase tracking-wider">
                {searchQuery || clientFilter !== "all" || statusFilter !== "all" ? "No matches found" : "All caught up!"}
              </h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Try adjusting your search keywords or active filters to find specific candidate queries.
              </p>
            </div>
          </div>
        ) : viewMode === "tree" ? (
          /* File System View Layout */
          <div className="bg-neutral-white border border-neutral-200 rounded-sm shadow-sm p-4 space-y-2 select-none">
            {Object.entries(groupedQueries).map(([clientName, clientData]) => {
              const clientKey = `client:${clientName}`;
              const isClientExpanded = expandedNodes[clientKey] !== false; // Default to expanded

              return (
                <div key={clientName} className="space-y-1">
                  {/* Client Level Folder */}
                  <div
                    onClick={() => toggleNode(clientKey)}
                    className="flex items-center justify-between p-2.5 hover:bg-neutral-55 rounded-sm cursor-pointer transition-colors border border-neutral-100 bg-neutral-50/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-neutral-400" />
                      {isClientExpanded ? (
                        <FolderOpen className="w-4 h-4 text-primary/70" />
                      ) : (
                        <Folder className="w-4 h-4 text-primary/70" />
                      )}
                      <span className="font-semibold text-neutral-850 text-xs uppercase tracking-tight">
                        {clientName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-neutral-400 px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded-xs">
                        {Object.keys(clientData.jobs).length} Job(s)
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-neutral-450 transition-transform ${
                          isClientExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Jobs Level Subfolders */}
                  {isClientExpanded && (
                    <div className="pl-6 border-l border-neutral-150 ml-4.5 space-y-1 mt-1">
                      {Object.entries(clientData.jobs).map(([jobId, jobData]) => {
                        const jobKey = `job:${clientName}:${jobId}`;
                        const isJobExpanded = expandedNodes[jobKey] !== false; // Default to expanded

                        return (
                          <div key={jobId} className="space-y-1">
                            {/* Job Folder */}
                            <div
                              onClick={() => toggleNode(jobKey)}
                              className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-sm cursor-pointer transition-colors border border-neutral-100/50 bg-neutral-50/10"
                            >
                              <div className="flex items-center gap-2">
                                {isJobExpanded ? (
                                  <FolderOpen className="w-3.5 h-3.5 text-neutral-450" />
                                ) : (
                                  <Folder className="w-3.5 h-3.5 text-neutral-450" />
                                )}
                                <span className="font-medium text-neutral-800 text-xs">
                                  {jobData.job_title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono text-neutral-450 px-1.5 py-0.2 bg-neutral-100 border border-neutral-200 rounded-xs">
                                  {jobData.queries.length} Question(s)
                                </span>
                                <ChevronDown
                                  className={`w-3 h-3 text-neutral-400 transition-transform ${
                                    isJobExpanded ? "" : "-rotate-90"
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Candidate Queries Level (Files) */}
                            {isJobExpanded && (
                              <div className="pl-6 border-l border-neutral-150 ml-3.5 space-y-1 mt-1">
                                {jobData.queries.map((q) => {
                                  const queryKey = `query:${q.id}`;
                                  const isQueryExpanded = expandedNodes[queryKey] === true; // Default to collapsed
                                  const isAnswering = answeringQueryId === q.id;

                                  return (
                                    <div
                                      key={q.id}
                                      className="border border-neutral-150/50 rounded-sm bg-neutral-white overflow-hidden p-3 hover:bg-neutral-50/30 transition-colors"
                                    >
                                      {/* File Header (Click to expand Q&A detail) */}
                                      <div
                                        onClick={() => toggleNode(queryKey)}
                                        className="flex items-center justify-between cursor-pointer text-xs gap-3"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <FileText className="w-3.5 h-3.5 text-neutral-450 shrink-0" />
                                          <span className="font-mono text-neutral-850 text-[10.5px] truncate">
                                            {q.candidate_email}
                                          </span>
                                          <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                                            ({new Date(q.created_at).toLocaleDateString()})
                                          </span>
                                          <span className="text-[10px] text-neutral-550 font-serif italic truncate max-w-xs sm:max-w-md">
                                            - "{q.query_text.substring(0, 70)}{q.query_text.length > 70 ? "..." : ""}"
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          {q.is_resolved ? (
                                            <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase tracking-wider text-success bg-success/10 border border-success/20 rounded-xs">
                                              Resolved
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-250 rounded-xs">
                                              Pending
                                            </span>
                                          )}
                                          <ChevronDown
                                            className={`w-3 h-3 text-neutral-450 transition-transform ${
                                              isQueryExpanded ? "" : "-rotate-90"
                                            }`}
                                          />
                                        </div>
                                      </div>

                                      {/* File Content (Expanded Q&A details) */}
                                      {isQueryExpanded && renderQueryDetail(q, isAnswering)}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat List View Layout */
          <div className="border border-neutral-200 bg-neutral-white rounded-sm overflow-hidden shadow-sm">
            <div className="divide-y divide-neutral-200 bg-neutral-white">
              {filteredQueries.map((q) => {
                const isAnswering = answeringQueryId === q.id;
                return (
                  <div key={q.id} className="p-5 hover:bg-neutral-50/50 transition-colors flex flex-col gap-4 text-xs">
                    
                    {/* Card Header metadata */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-bold text-neutral-850 text-[10.5px] bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-sm">
                          {q.candidate_email}
                        </span>
                        {q.job_openings?.title && (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 bg-neutral-900 text-neutral-100 rounded-sm font-bold uppercase flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Role: {q.job_openings.title}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(q.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div>
                        {q.is_resolved ? (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-success bg-success/10 border border-success/20 rounded-sm">
                            Resolved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-250 rounded-sm">
                            Pending Feedback
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    {renderQueryDetail(q, isAnswering)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
