"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { JobOpening, Candidate, Application, ActivityLog } from "../types";
import { 
  Briefcase, Users, FileCheck, Landmark, Play, AlertCircle, 
  Sparkles, CheckCircle2, RefreshCw, ChevronRight, Clock 
} from "lucide-react";

interface DashboardViewProps {
  onNavigate: (view: string, targetId?: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const queryClient = useQueryClient();

  // Queries
  const { data: jobs = [], isLoading: loadingJobs } = useQuery<JobOpening[]>({
    queryKey: ["jobs"],
    queryFn: () => apiRequest<JobOpening[]>("GET", "/jobs"),
    refetchInterval: 3000 // Refetch every 3s to capture async mock AI state updates
  });

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["candidates"],
    queryFn: () => apiRequest<Candidate[]>("GET", "/candidates")
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery<ActivityLog[]>({
    queryKey: ["activity_log"],
    queryFn: () => apiRequest<ActivityLog[]>("GET", "/activity_log"),
    refetchInterval: 3000
  });

  // Calculate stats based on fetched data
  const publishedCount = jobs.filter(j => j.status === "published" || j.status === "confirmed").length;
  const totalCandidates = candidates.length;
  
  // Pending reviews: applications where screening_status is pending
  // We can query all applications or count mockDb values.
  const pendingReviewsCount = jobs.reduce((sum, j) => sum + (j.candidate_count || 0), 0); 
  const inProgressStages = jobs.filter(j => j.status === "published").length; // active processes

  // Check if any job is currently in generating/matching processing state
  const processingJobs = jobs.filter(j => 
    j.processing_status === "generating" || 
    j.processing_status === "matching" || 
    j.processing_status === "skill_approval"
  );

  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
      {/* 1. AI Processing Status Queue Banner */}
      {processingJobs.length > 0 && (
        <div className="bg-neutral-900 border border-primary/30 p-4 rounded-sm flex items-center justify-between shadow-sm animate-pulse text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-sm">
              <Sparkles className="w-4 h-4 text-primary animate-spin" />
            </div>
            <div>
              <p className="font-tight font-semibold text-neutral-white">AI Automation Pipeline Active</p>
              <div className="flex gap-4 mt-1 text-neutral-400 font-mono text-[10px]">
                {processingJobs.map(j => (
                  <span key={j.id} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></span>
                    {j.title || "JD Generation"}: <span className="text-primary font-bold uppercase">{j.processing_status.replace("_", " ")}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-neutral-400 font-mono text-[10px]">
            <RefreshCw className="w-3 h-3 animate-spin text-neutral-600" />
            <span>SYNCING REALTIME STATES</span>
          </div>
        </div>
      )}

      {/* 2. Top Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-neutral-white border border-neutral-200 p-4 rounded-sm hover:border-neutral-300 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Active Open Jobs</span>
            <div className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-sm">
              <Briefcase className="w-4 h-4 text-neutral-500" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-tight font-bold text-neutral-800 tracking-tight">{publishedCount}</h4>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">Confirmed or Published</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-neutral-white border border-neutral-200 p-4 rounded-sm hover:border-neutral-300 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Candidates Sourced</span>
            <div className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-sm">
              <Users className="w-4 h-4 text-neutral-500" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-tight font-bold text-neutral-800 tracking-tight">{totalCandidates}</h4>
            <p className="text-[10px] text-success font-semibold mt-1 font-mono flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" />
              DEDUPLICATED POOL
            </p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-neutral-white border border-neutral-200 p-4 rounded-sm hover:border-neutral-300 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Active Applications</span>
            <div className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-sm">
              <FileCheck className="w-4 h-4 text-neutral-500" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-tight font-bold text-neutral-800 tracking-tight">{pendingReviewsCount}</h4>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">Linked to active posts</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-neutral-white border border-neutral-200 p-4 rounded-sm hover:border-neutral-300 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Active Pipelines</span>
            <div className="p-1.5 bg-neutral-50 border border-neutral-200 rounded-sm">
              <Landmark className="w-4 h-4 text-neutral-500" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-tight font-bold text-neutral-800 tracking-tight">{inProgressStages}</h4>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">Active screening processes</p>
          </div>
        </div>
      </div>

      {/* 3. Main Split Panel: Job Feed & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Job openings grouped by requirement */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-neutral-200 bg-neutral-white rounded-sm overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Recent Job Posts & Pipelines</h3>
              <button 
                onClick={() => onNavigate("jobs")}
                className="text-[10px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
              >
                View Workspace
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingJobs ? (
              <div className="p-8 text-center text-xs text-neutral-400">Loading openings...</div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">No active job posts. Create a requirement to begin.</div>
            ) : (
              <div className="divide-y divide-neutral-200 text-xs">
                {jobs.map((j) => (
                  <div key={j.id} className="p-4 hover:bg-neutral-50 transition-colors flex items-center justify-between">
                    <div className="space-y-1.5 max-w-[70%]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded-sm font-medium text-neutral-500 uppercase">
                          {j.client_name}
                        </span>
                        <span className="font-tight font-bold text-neutral-850 hover:text-primary transition-colors cursor-pointer text-sm" onClick={() => onNavigate("jobs", j.id)}>
                          {j.title}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-xs truncate max-w-md">
                        {j.description || "No description generated yet."}
                      </p>
                      <div className="flex gap-2">
                        {j.keywords.slice(0, 3).map((kw, idx) => (
                          <span key={idx} className="text-[9px] font-mono text-neutral-500 bg-neutral-50 px-1 py-0.5 border border-neutral-200/60 rounded-sm">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2 font-mono">
                      <span className={`text-[9px] px-2 py-0.5 rounded-sm border uppercase font-semibold ${
                        j.status === "published" ? "bg-success/10 border-success/20 text-success" :
                        j.status === "confirmed" ? "bg-info/10 border-info/20 text-info" :
                        "bg-neutral-100 border-neutral-200 text-neutral-400"
                      }`}>
                        {j.status}
                      </span>
                      <div className="text-[10px] text-neutral-400">
                        {j.candidate_count || 0} candidates linked
                      </div>
                      {j.top_score && j.top_score > 0 ? (
                        <div className="text-[10px] text-neutral-500">
                          Top Match: <span className="text-primary font-bold">{j.top_score}%</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Vertical Timeline Activity Feed */}
        <div className="space-y-4">
          <div className="border border-neutral-200 bg-neutral-white rounded-sm overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50">
              <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">System Audit Trail</h3>
            </div>

            {loadingLogs ? (
              <div className="p-8 text-center text-xs text-neutral-400">Loading trail logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">No events logged yet.</div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="relative border-l border-neutral-200 ml-2.5 pl-5 space-y-5 text-xs">
                  {logs.slice(0, 8).map((log) => (
                    <div key={log.id} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-7.5 top-0.5 w-3.5 h-3.5 bg-neutral-white border-2 border-neutral-300 rounded-full group-hover:border-primary transition-colors flex items-center justify-center">
                        <span className="w-1 h-1 bg-neutral-400 group-hover:bg-primary rounded-full"></span>
                      </span>
                      
                      {/* Event Details */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-neutral-400 font-mono text-[9px]">
                          <span className="font-semibold text-neutral-600">{log.actor_name || "System"}</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-neutral-700">
                          <span className="font-medium text-neutral-850 lowercase italic">
                            {log.action.replace("_", " ")}:
                          </span>{" "}
                          {log.metadata.job_title || log.metadata.candidate_name || log.metadata.req_title || log.metadata.client_name || ""}
                        </p>
                        {log.metadata.count && (
                          <p className="text-[10px] text-success font-mono">Matched {log.metadata.count} candidates in index</p>
                        )}
                        {log.metadata.fuzzy_score && (
                          <p className="text-[10px] text-primary font-mono">Fuzzy Index score: {log.metadata.fuzzy_score}%</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
