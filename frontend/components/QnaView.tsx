"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { 
  HelpCircle, RefreshCw, Clock, Check, X, Search, 
  MessageSquare, Send, CheckCircle2, AlertCircle, Building2
} from "lucide-react";

interface QnaViewProps {
  onNavigate?: (view: string, targetId?: string) => void;
}

export default function QnaView({ onNavigate }: QnaViewProps) {
  const queryClient = useQueryClient();
  
  // Local state for filters and queries
  const [qnaFilter, setQnaFilter] = useState<"pending" | "resolved">("pending");
  const [searchQuery, setSearchQuery] = useState<string>("");
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

  // Filter & Search logic
  const filteredQueries = dashboardQueries.filter(q => {
    // 1. Filter by tab status
    const matchesStatus = qnaFilter === "pending" ? !q.is_resolved : q.is_resolved;
    if (!matchesStatus) return false;

    // 2. Filter by search query
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    const email = (q.candidate_email || "").toLowerCase();
    const text = (q.query_text || "").toLowerCase();
    const role = (q.job_openings?.title || "").toLowerCase();
    return email.includes(term) || text.includes(term) || role.includes(term);
  });

  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none pb-12 p-6">
      
      {/* Header */}
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
        
        <button
          onClick={() => refetch()}
          className="self-start md:self-auto px-3 py-1.5 border border-neutral-250 hover:bg-neutral-100 text-neutral-600 font-mono text-[10px] uppercase font-bold tracking-wider rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Queries
        </button>
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
      <div className="border border-neutral-200 bg-neutral-white rounded-sm p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-2 bg-neutral-100 p-0.5 rounded-sm border border-neutral-250 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              setQnaFilter("pending");
              setAnsweringQueryId(null);
            }}
            className={`px-4 py-1.5 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              qnaFilter === "pending" ? "bg-white text-neutral-800 shadow-xs" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setQnaFilter("resolved");
              setAnsweringQueryId(null);
            }}
            className={`px-4 py-1.5 rounded-xs text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              qnaFilter === "resolved" ? "bg-white text-neutral-800 shadow-xs" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-405" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by candidate email, role title, or query..."
            className="w-full pl-9 pr-4 py-2 border border-neutral-250 bg-neutral-50/50 rounded-sm text-xs focus:bg-white focus:outline-hidden focus:border-primary transition-all text-neutral-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main List Container */}
      <div className="border border-neutral-200 bg-neutral-white rounded-sm overflow-hidden shadow-sm">
        {loadingQueries ? (
          <div className="p-16 text-center text-xs text-neutral-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-neutral-300" />
            <span>Retrieving candidate queries...</span>
          </div>
        ) : filteredQueries.length === 0 ? (
          <div className="p-16 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 rounded-full flex items-center justify-center mx-auto text-neutral-400">
              <CheckCircle2 className="w-6 h-6 text-neutral-300" />
            </div>
            <div className="space-y-1">
              <h4 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider">
                {searchQuery ? "No matches found" : (qnaFilter === "pending" ? "All caught up!" : "No resolved queries")}
              </h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                {searchQuery 
                  ? "Try adjusting your search keywords to find specific queries." 
                  : (qnaFilter === "pending" 
                      ? "There are no incoming candidate questions waiting for feedback." 
                      : "Resolved questions from applicants will show up here.")}
              </p>
            </div>
          </div>
        ) : (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            className="w-full px-3 py-2 border border-neutral-250 bg-neutral-50/20 focus:bg-white rounded-sm text-neutral-800 placeholder:text-neutral-450 focus:outline-hidden focus:border-primary text-xs resize-none animate-fadeIn"
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
