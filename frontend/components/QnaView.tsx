"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { 
  HelpCircle, RefreshCw, Clock, Check, X, Search, 
  MessageSquare, Send, CheckCircle2, AlertCircle, Building2,
  Folder, FolderOpen, FileText, ChevronDown, List, Archive, User, ArrowRight
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
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [queryAnswerText, setQueryAnswerText] = useState<string>("");
  const [answeringConvoId, setAnsweringConvoId] = useState<string | null>(null);

  // Q&A View State Persistence
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("qna_view_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.viewMode !== undefined) setViewMode(parsed.viewMode);
          if (parsed.searchQuery !== undefined) setSearchQuery(parsed.searchQuery);
          if (parsed.clientFilter !== undefined) setClientFilter(parsed.clientFilter);
          if (parsed.statusFilter !== undefined) setStatusFilter(parsed.statusFilter);
          if (parsed.expandedNodes !== undefined) setExpandedNodes(parsed.expandedNodes);
        } catch (e) {
          console.error("Error parsing saved Q&A view state", e);
        }
      }
      setTimeout(() => {
        setIsLoaded(true);
      }, 0);
    }
  }, []);

  React.useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      const handler = setTimeout(() => {
        const stateToSave = {
          viewMode,
          searchQuery,
          clientFilter,
          statusFilter,
          expandedNodes
        };
        localStorage.setItem("qna_view_state", JSON.stringify(stateToSave));
      }, 500);

      return () => clearTimeout(handler);
    }
  }, [isLoaded, viewMode, searchQuery, clientFilter, statusFilter, expandedNodes]);

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
      setQueryAnswerText("");
    }
  });

  // End Conversation mutation
  const endConversationMutation = useMutation({
    mutationFn: ({ email, jobId }: { email: string; jobId: string }) => 
      apiRequest<any>("POST", "/conversations/end", { candidate_email: email, job_id: jobId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard_queries"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    }
  });

  // Group messages by job_id + candidate_email to form Threads
  const conversations = React.useMemo(() => {
    const groups: Record<string, {
      id: string;
      job_id: string;
      job_title: string;
      client_name: string;
      candidate_email: string;
      messages: any[];
      is_resolved: boolean;
      is_ended: boolean;
      last_activity: string;
    }> = {};

    dashboardQueries.forEach(q => {
      const jobId = q.job_openings?.id || q.job_id || "unknown-job";
      const email = q.candidate_email || "unknown@candidate.com";
      const key = `${jobId}:${email}`;

      const clientName = q.job_openings?.requirements?.clients?.name || q.job_openings?.client_name || "Generic Client";
      const jobTitle = q.job_openings?.title || "Unknown Job Opening";

      if (!groups[key]) {
        groups[key] = {
          id: key,
          job_id: jobId,
          job_title: jobTitle,
          client_name: clientName,
          candidate_email: email,
          messages: [],
          is_resolved: true,
          is_ended: false,
          last_activity: q.created_at
        };
      }

      groups[key].messages.push(q);
      
      // A thread is unresolved if any candidate message in it is unresolved and the conversation is not ended
      if (!q.is_resolved && q.sender !== "recruiter" && !q.is_ended) {
        groups[key].is_resolved = false;
      }
      
      // Thread is ended if any message flag is_ended is true
      if (q.is_ended) {
        groups[key].is_ended = true;
      }

      if (new Date(q.created_at) > new Date(groups[key].last_activity)) {
        groups[key].last_activity = q.created_at;
      }
    });

    // Sort messages in each thread chronologically
    Object.values(groups).forEach(g => {
      g.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    return Object.values(groups);
  }, [dashboardQueries]);

  // Derived stats from conversations
  const totalCount = conversations.length;
  const pendingCount = conversations.filter(c => !c.is_resolved && !c.is_ended).length;
  const resolvedCount = conversations.filter(c => c.is_resolved || c.is_ended).length;

  // Extract unique client names
  const uniqueClients = React.useMemo(() => {
    const clients = new Set<string>();
    conversations.forEach(c => {
      if (c.client_name) clients.add(c.client_name);
    });
    return Array.from(clients);
  }, [conversations]);

  // Filter conversations
  const filteredConversations = React.useMemo(() => {
    return conversations.filter(c => {
      // 1. Filter by search query
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const email = c.candidate_email.toLowerCase();
        const role = c.job_title.toLowerCase();
        const client = c.client_name.toLowerCase();
        const contentMatch = c.messages.some(m => (m.query_text || "").toLowerCase().includes(term));
        if (!email.includes(term) && !role.includes(term) && !client.includes(term) && !contentMatch) {
          return false;
        }
      }

      // 2. Filter by client organization
      if (clientFilter !== "all" && c.client_name !== clientFilter) {
        return false;
      }

      // 3. Filter by resolved status
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && (c.is_ended || c.is_resolved)) return false;
        if (statusFilter === "resolved" && (!c.is_ended && !c.is_resolved)) return false;
      }

      return true;
    });
  }, [conversations, searchQuery, clientFilter, statusFilter]);

  // Group filtered conversations for Tree / File System view
  const groupedConversations = React.useMemo(() => {
    const grouped: Record<string, {
      jobs: Record<string, {
        job_title: string;
        conversations: any[];
      }>
    }> = {};

    filteredConversations.forEach(c => {
      if (!grouped[c.client_name]) {
        grouped[c.client_name] = { jobs: {} };
      }

      if (!grouped[c.client_name].jobs[c.job_id]) {
        grouped[c.client_name].jobs[c.job_id] = {
          job_title: c.job_title,
          conversations: []
        };
      }

      grouped[c.client_name].jobs[c.job_id].conversations.push(c);
    });

    return grouped;
  }, [filteredConversations]);

  const toggleNode = (key: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderConversationChat = (c: any) => {
    const lastCandidateMsg = [...c.messages].reverse().find(m => m.sender !== "recruiter" && !m.is_resolved);
    const activeMsgId = lastCandidateMsg?.id || c.messages[c.messages.length - 1]?.id;

    return (
      <div className="flex flex-col gap-3 mt-3 p-4 border border-neutral-200 bg-neutral-50/50 rounded-sm">
        
        {/* Chat Timeline history */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {c.messages.map((m: any) => {
            const isCandidate = m.sender !== "recruiter" && m.sender !== "ai";
            const isAi = m.sender === "ai";
            
            return (
              <div key={m.id} className="space-y-1">
                <div className={`flex flex-col max-w-[85%] ${isCandidate ? "mr-auto items-start" : "ml-auto items-end"}`}>
                  {/* Meta tag */}
                  <div className="flex items-center gap-1.5 px-1 text-[9px] font-mono font-bold uppercase text-neutral-400">
                    <span>{isCandidate ? "Candidate" : isAi ? "AI Agent" : "Recruiter"}</span>
                    <span>•</span>
                    <span className="bg-neutral-200 px-1 py-0.2 rounded-xs border border-neutral-300/40">
                      {m.source === "tracking_portal" ? "Status Portal" : "Apply Form"}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div className={`p-2.5 rounded-sm text-xs border font-medium mt-1 leading-relaxed ${
                    isCandidate 
                      ? "bg-neutral-100 border-neutral-200 text-neutral-800 rounded-tl-none" 
                      : isAi
                      ? "bg-amber-50/50 border-amber-200/50 text-neutral-700 italic rounded-tr-none"
                      : "bg-primary/5 border-primary/10 text-neutral-800 rounded-tr-none"
                  }`}>
                    {m.query_text}
                  </div>
                </div>

                {/* Legacy ai_response preview if present */}
                {m.ai_response && !c.messages.some((x: any) => x.sender === "recruiter" && x.query_text === m.ai_response) && (
                  <div className="ml-6 pl-3 border-l border-neutral-200 py-1 space-y-1">
                    <span className="text-[8.5px] font-mono uppercase text-neutral-400 font-bold block">Auto AI Context Reply</span>
                    <p className="text-[11px] text-neutral-500 italic bg-neutral-100/30 p-2 border rounded-sm">{m.ai_response}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Controls / Reply Area */}
        <div className="border-t border-neutral-200 pt-3 flex flex-col gap-3">
          {c.is_ended ? (
            <div className="p-3 bg-neutral-100 border border-neutral-200/55 rounded-sm flex items-center justify-between text-xs text-neutral-500 font-mono">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-neutral-400" />
                <span>CONVERSATION CLOSED & ARCHIVED BY RECRUITER</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!queryAnswerText.trim() || !activeMsgId) return;
                  answerQueryMutation.mutate({ id: activeMsgId, responseText: queryAnswerText });
                }}
                className="space-y-2.5"
              >
                <textarea
                  required
                  rows={2}
                  value={answeringConvoId === c.id ? queryAnswerText : ""}
                  onChange={(e) => {
                    setAnsweringConvoId(c.id);
                    setQueryAnswerText(e.target.value);
                  }}
                  placeholder="Type a message reply to candidate..."
                  className="w-full px-3 py-2 border border-neutral-250 bg-neutral-50/20 focus:bg-white rounded-sm text-neutral-850 placeholder:text-neutral-450 focus:outline-hidden focus:border-primary text-xs resize-none text-neutral-900"
                />
                <div className="flex justify-between items-center">
                  {/* End Conversation Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if(window.confirm("Are you sure you want to end this conversation session? This will lock the chat portal for this candidate until they raise a new query.")) {
                        endConversationMutation.mutate({ email: c.candidate_email, jobId: c.job_id });
                      }
                    }}
                    className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 font-mono text-[9px] uppercase font-bold rounded-sm cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    End Conversation
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAnsweringConvoId(null);
                        setQueryAnswerText("");
                      }}
                      className="px-2.5 py-1.5 border border-neutral-200 hover:bg-neutral-100 text-neutral-500 font-mono text-[9px] uppercase font-bold rounded-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={answerQueryMutation.isPending || answeringConvoId !== c.id || !queryAnswerText.trim()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white font-mono text-[9px] uppercase font-bold tracking-wider rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      {answerQueryMutation.isPending && answeringConvoId === c.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      Send Reply
                    </button>
                  </div>
                </div>
              </form>
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
            Audit, answer, and manage live candidate chat channels and apply-form questions.
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
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Total Channels</span>
          <span className="text-2xl font-tight font-bold text-neutral-850 mt-1">{totalCount}</span>
        </div>
        
        <div className="bg-neutral-white border border-neutral-200 p-4 rounded-sm shadow-xs flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Active Pending Chats</span>
          <span className="text-2xl font-tight font-bold text-neutral-850 mt-1 text-amber-600">{pendingCount}</span>
        </div>

        <div className="bg-neutral-white border border-neutral-200 p-4 rounded-sm shadow-xs flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600" />
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Resolved / Closed</span>
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
            placeholder="Search candidate email, message content..."
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
            <option value="pending">Pending Reply</option>
            <option value="resolved">Resolved / Ended</option>
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
        ) : filteredConversations.length === 0 ? (
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
          <div className="bg-neutral-white border border-neutral-200 rounded-sm shadow-sm p-4 space-y-2 select-none font-sans">
            {Object.entries(groupedConversations).map(([clientName, clientData]) => {
              const clientKey = `client:${clientName}`;
              const isClientExpanded = expandedNodes[clientKey] !== false; // Default to expanded

              return (
                <div key={clientName} className="space-y-1">
                  {/* Client Level Folder */}
                  <div
                    onClick={() => toggleNode(clientKey)}
                    className="flex items-center justify-between p-2.5 hover:bg-neutral-50 rounded-sm cursor-pointer transition-colors border border-neutral-100 bg-neutral-50/30"
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
                                  {jobData.conversations.length} Thread(s)
                                </span>
                                <ChevronDown
                                  className={`w-3 h-3 text-neutral-400 transition-transform ${
                                    isJobExpanded ? "" : "-rotate-90"
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Candidate Threads Level (Files) */}
                            {isJobExpanded && (
                              <div className="pl-6 border-l border-neutral-150 ml-3.5 space-y-1 mt-1">
                                {jobData.conversations.map((c) => {
                                  const convoKey = `convo:${c.id}`;
                                  const isConvoExpanded = expandedNodes[convoKey] === true; // Default to collapsed
                                  const lastMsg = c.messages[c.messages.length - 1] || {};

                                  return (
                                    <div
                                      key={c.id}
                                      className="border border-neutral-150/50 rounded-sm bg-neutral-white overflow-hidden p-3 hover:bg-neutral-50/30 transition-colors"
                                    >
                                      {/* Thread Header (Click to expand Chat detail) */}
                                      <div
                                        onClick={() => toggleNode(convoKey)}
                                        className="flex items-center justify-between cursor-pointer text-xs gap-3"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <FileText className="w-3.5 h-3.5 text-neutral-450 shrink-0" />
                                          <span className="font-mono text-neutral-850 text-[10.5px] truncate font-bold">
                                            {c.candidate_email}
                                          </span>
                                          <span className="text-[9px] font-mono text-neutral-400 hidden sm:inline shrink-0">
                                            ({c.messages.length} msg)
                                          </span>
                                          <span className="text-[10px] text-neutral-450 font-serif italic truncate max-w-xs sm:max-w-md">
                                            - Last: "{lastMsg.query_text?.substring(0, 60)}{lastMsg.query_text?.length > 60 ? "..." : ""}"
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          {c.is_ended ? (
                                            <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-xs">
                                              Ended
                                            </span>
                                          ) : c.is_resolved ? (
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
                                              isConvoExpanded ? "" : "-rotate-90"
                                            }`}
                                          />
                                        </div>
                                      </div>

                                      {/* Chat timeline inside Tree folder */}
                                      {isConvoExpanded && renderConversationChat(c)}
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
          <div className="border border-neutral-200 bg-neutral-white rounded-sm overflow-hidden shadow-sm font-sans">
            <div className="divide-y divide-neutral-200 bg-neutral-white">
              {filteredConversations.map((c) => {
                return (
                  <div key={c.id} className="p-5 hover:bg-neutral-50/50 transition-colors flex flex-col gap-4 text-xs">
                    
                    {/* Card Header metadata */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-100 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-bold text-neutral-850 text-[10.5px] bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-sm">
                          {c.candidate_email}
                        </span>
                        {c.job_title && (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 bg-neutral-900 text-neutral-100 rounded-sm font-bold uppercase flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Role: {c.job_title}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Last Activity: {new Date(c.last_activity).toLocaleString()}
                        </span>
                      </div>

                      <div>
                        {c.is_ended ? (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-neutral-200 rounded-sm">
                            Ended
                          </span>
                        ) : c.is_resolved ? (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-success bg-success/10 border border-success/20 rounded-sm">
                            Resolved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-250 rounded-sm">
                            Pending Reply
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    {renderConversationChat(c)}
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
