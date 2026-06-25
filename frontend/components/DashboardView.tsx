"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { JobOpening, Candidate, Application, ActivityLog } from "../types";
import { 
  Briefcase, Users, FileCheck, Landmark, Play, AlertCircle, 
  Sparkles, CheckCircle2, RefreshCw, ChevronRight, Clock,
  ThumbsUp, ThumbsDown, Eye, FileText, Check, X, ShieldAlert, Award, 
  UserCheck, UserX, ExternalLink, MessageSquareQuote, Search, HelpCircle,
  BriefcaseBusiness, GraduationCap, Flame, ArrowUpRight
} from "lucide-react";

interface ExtendedApplication extends Application {
  candidates?: Candidate;
  job_openings?: JobOpening & {
    clients?: { name: string } | null;
    client_name?: string;
  };
}

interface DashboardViewProps {
  onNavigate: (view: string, targetId?: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const queryClient = useQueryClient();
  
  // State for rejection modal
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  
  // State for detailed analysis expansion
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

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

  const { data: applications = [], isLoading: loadingApplications } = useQuery<ExtendedApplication[]>({
    queryKey: ["applications"],
    queryFn: () => apiRequest<ExtendedApplication[]>("GET", "/applications"),
    refetchInterval: 3000
  });

  // Mutations
  const acceptApplicationMutation = useMutation({
    mutationFn: (id: string) => apiRequest<Application>("PATCH", `/applications/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    }
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      apiRequest<Application>("PATCH", `/applications/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setRejectingAppId(null);
      setRejectReason("");
    }
  });

  // Publish dashboard stats and selected item context to AI Copilot
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const activeApp = expandedAppId 
        ? applications.find(a => a.id === expandedAppId)
        : null;

      const context = {
        stats: {
          active_jobs_count: jobs.filter(j => j.status === "published").length,
          total_candidates_count: candidates.length,
          total_applications_count: applications.length,
          pending_reviews_count: applications.filter(a => a.screening_status === "pending").length
        },
        recent_activity_logs: logs.slice(0, 10).map(l => ({
          action: l.action,
          actor_name: l.actor_name,
          created_at: l.created_at,
          metadata: l.metadata
        })),
        expanded_application: activeApp ? {
          id: activeApp.id,
          candidate_name: activeApp.candidates?.full_name,
          candidate_email: activeApp.candidates?.email,
          job_title: activeApp.job_openings?.title,
          client_name: activeApp.job_openings?.client_name || activeApp.job_openings?.clients?.name,
          status: activeApp.screening_status,
          fit_score: activeApp.fuzzy_score,
          fit_analysis: activeApp.match_reason,
          screening_questions: activeApp.screening_questions
        } : null
      };

      window.dispatchEvent(new CustomEvent("copilot-context-update", { detail: context }));
    }
  }, [jobs, candidates, logs, applications, expandedAppId]);

  // Calculate statistics based on fetched data
  const activeJobsCount = jobs.filter(j => j.status === "published" || j.status === "confirmed").length;
  const totalCandidates = candidates.length;
  
  // Pending reviews: applications where screening_status is pending
  const pendingReviews = applications.filter(app => app.screening_status === "pending");
  const pendingReviewsCount = pendingReviews.length;
  
  // Active Pipelines: applications accepted but not yet closed/hired/rejected
  const activePipelinesCount = applications.filter(
    app => app.screening_status === "accepted" && app.stage !== "rejected" && app.stage !== "hired"
  ).length;

  // Check if any job is currently in generating/matching processing state
  const processingJobs = jobs.filter(j => 
    j.processing_status === "generating" || 
    j.processing_status === "matching" || 
    j.processing_status === "skill_approval"
  );

  const handleAccept = (appId: string) => {
    acceptApplicationMutation.mutate(appId);
  };

  const handleRejectClick = (appId: string) => {
    setRejectingAppId(appId);
    setRejectReason("");
  };

  const handleConfirmReject = () => {
    if (!rejectingAppId) return;
    rejectApplicationMutation.mutate({
      id: rejectingAppId,
      reason: rejectReason || "Qualifications did not align with job requirement weights."
    });
  };

  const getFuzzyScoreColor = (score: number | null) => {
    if (!score) return "text-neutral-400 bg-neutral-100 border-neutral-200";
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-orange-700 bg-orange-50 border-orange-200";
  };

  const getFuzzyScoreProgress = (score: number | null) => {
    if (!score) return "bg-neutral-300";
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-orange-500";
  };

  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none pb-12">
      {/* 1. AI Processing Status Queue Banner */}
      {processingJobs.length > 0 && (
        <div className="bg-neutral-900 border border-primary/30 p-4 rounded-sm flex items-center justify-between shadow-md animate-pulse text-xs">
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
        <div 
          onClick={() => onNavigate("jobs")}
          className="bg-neutral-white border border-neutral-200 p-5 rounded-sm hover:border-primary/50 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/30 group-hover:bg-primary transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Open Jobs</span>
            <div className="p-2 bg-neutral-50 border border-neutral-150 rounded-sm group-hover:bg-primary/5 transition-colors">
              <Briefcase className="w-4 h-4 text-neutral-500 group-hover:text-primary transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <h4 className="text-3xl font-tight font-bold text-neutral-800 tracking-tight">{activeJobsCount}</h4>
              <span className="text-neutral-400 font-mono text-[10px]">active</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono flex items-center gap-1">
              Confirmed or Published catalog
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* Stat 2 */}
        <div 
          onClick={() => onNavigate("pool")}
          className="bg-neutral-white border border-neutral-200 p-5 rounded-sm hover:border-primary/50 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-success/30 group-hover:bg-success transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Candidates Sourced</span>
            <div className="p-2 bg-neutral-50 border border-neutral-150 rounded-sm group-hover:bg-success/5 transition-colors">
              <Users className="w-4 h-4 text-neutral-500 group-hover:text-success transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <h4 className="text-3xl font-tight font-bold text-neutral-800 tracking-tight">{totalCandidates}</h4>
              <span className="text-neutral-400 font-mono text-[10px]">profiles</span>
            </div>
            <p className="text-[10px] text-success font-semibold mt-1 font-mono flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" />
              DEDUPLICATED POOL
            </p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-neutral-white border border-neutral-200 p-5 rounded-sm hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/30 group-hover:bg-amber-500 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pending Reviews</span>
            <div className="p-2 bg-neutral-50 border border-neutral-150 rounded-sm group-hover:bg-amber-500/5 transition-colors">
              <FileCheck className="w-4 h-4 text-neutral-500 group-hover:text-amber-500 transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <h4 className="text-3xl font-tight font-bold text-neutral-800 tracking-tight">{pendingReviewsCount}</h4>
              <span className="text-neutral-400 font-mono text-[10px]">awaiting</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">Requires recruiter decision</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div 
          onClick={() => onNavigate("rounds")}
          className="bg-neutral-white border border-neutral-200 p-5 rounded-sm hover:border-primary/50 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-info/30 group-hover:bg-info transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Pipelines</span>
            <div className="p-2 bg-neutral-50 border border-neutral-150 rounded-sm group-hover:bg-info/5 transition-colors">
              <Landmark className="w-4 h-4 text-neutral-500 group-hover:text-info transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <h4 className="text-3xl font-tight font-bold text-neutral-800 tracking-tight">{activePipelinesCount}</h4>
              <span className="text-neutral-400 font-mono text-[10px]">candidates</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">Active screening rounds</p>
          </div>
        </div>
      </div>


      {/* 4. Main Split Panel: Job Feed & Audit Trail */}
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
                {jobs.slice(0, 5).map((j) => (
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
                        {j.keywords?.slice(0, 3).map((kw, idx) => (
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
                  {logs.slice(0, 8).map((log) => {
                    // Resolve icons and colors based on action type
                    let dotColor = "border-neutral-300 bg-neutral-100";
                    let innerDot = "bg-neutral-400 group-hover:bg-primary";
                    
                    if (log.action === "client_created" || log.action === "client_updated") {
                      dotColor = "border-blue-300 bg-blue-50";
                      innerDot = "bg-blue-500";
                    } else if (log.action === "requirement_created" || log.action === "requirement_updated") {
                      dotColor = "border-violet-300 bg-violet-50";
                      innerDot = "bg-violet-500";
                    } else if (log.action === "job_confirmed") {
                      dotColor = "border-indigo-300 bg-indigo-50";
                      innerDot = "bg-indigo-500";
                    } else if (log.action === "job_published" || log.action === "skills_approved") {
                      dotColor = "border-primary/30 bg-primary/5";
                      innerDot = "bg-primary";
                    } else if (log.action.includes("imported") || log.action.includes("downloaded") || log.action.includes("success")) {
                      dotColor = "border-emerald-300 bg-emerald-50";
                      innerDot = "bg-emerald-500";
                    } else if (log.action.includes("failed") || log.action.includes("error")) {
                      dotColor = "border-rose-300 bg-rose-50";
                      innerDot = "bg-rose-500";
                    } else if (log.action === "application_accepted") {
                      dotColor = "border-teal-300 bg-teal-50";
                      innerDot = "bg-teal-500";
                    } else if (log.action === "application_rejected") {
                      dotColor = "border-red-300 bg-red-50";
                      innerDot = "bg-red-500";
                    } else if (log.action === "stage_updated") {
                      dotColor = "border-amber-300 bg-amber-50";
                      innerDot = "bg-amber-500";
                    } else if (log.action === "screening_questions_generated" || log.action === "screening_question_added" || log.action === "screening_question_updated") {
                      dotColor = "border-sky-300 bg-sky-50";
                      innerDot = "bg-sky-500";
                    }

                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline dot */}
                        <span className={`absolute -left-7.5 top-0.5 w-3.5 h-3.5 rounded-full border transition-colors flex items-center justify-center ${dotColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${innerDot}`}></span>
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
                            <span className="font-bold text-neutral-800 uppercase tracking-wider text-[8px] mr-1">
                              {log.action?.replace("_", " ")}:
                            </span>{" "}
                            {log.metadata?.job_title || log.metadata?.candidate_name || log.metadata?.req_title || log.metadata?.client_name || ""}
                          </p>
                          {log.metadata?.inserted !== undefined && (
                            <p className="text-[10px] text-emerald-600 font-mono">
                              Imported {log.metadata.inserted} new profiles, updated {log.metadata.skipped}
                            </p>
                          )}
                          {log.metadata?.skills_count !== undefined && (
                            <p className="text-[10px] text-primary font-mono">
                              Approved {log.metadata.skills_count} core job requirements
                            </p>
                          )}
                          {log.metadata?.matches_count !== undefined && (
                            <p className="text-[10px] text-emerald-600 font-mono">
                              Identified {log.metadata.matches_count} matching candidates
                            </p>
                          )}
                          {log.metadata?.count && (
                            <p className="text-[10px] text-success font-mono">Matched {log.metadata.count} candidates in index</p>
                          )}
                          {log.metadata?.fuzzy_score && (
                            <p className="text-[10px] text-primary font-mono">Fuzzy Index score: {log.metadata.fuzzy_score}%</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Pending Candidate Reviews Section (Highly Engaging) */}
      <div className="border border-neutral-200 bg-neutral-white rounded-sm overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Pending Candidate Reviews</h3>
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-850 font-mono text-[10px] rounded-full font-bold">
              {pendingReviewsCount} action items
            </span>
          </div>
          {pendingReviewsCount > 0 && (
            <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Fuzzy Match calculations powered by Claude 3.5 Sonnet
            </span>
          )}
        </div>

        {loadingApplications ? (
          <div className="p-12 text-center text-xs text-neutral-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-neutral-300" />
            <span>Retrieving candidate submissions...</span>
          </div>
        ) : pendingReviews.length === 0 ? (
          <div className="p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 bg-neutral-50 border border-neutral-200 rounded-full flex items-center justify-center mx-auto text-neutral-400">
              <CheckCircle2 className="w-6 h-6 text-neutral-300" />
            </div>
            <div className="space-y-1">
              <h4 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider">All caught up!</h4>
              <p className="text-neutral-500 text-xs leading-relaxed">
                There are no candidates currently pending screening review. Sourced candidates and CSV uploads automatically process and match against jobs.
              </p>
            </div>
            <button
              onClick={() => onNavigate("pool")}
              className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-white font-mono text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors cursor-pointer"
            >
              Upload Candidates to Pool
            </button>
          </div>
        ) : (
          <div className="divide-y divide-neutral-250 bg-neutral-white">
            {pendingReviews.map((app) => {
              const cand = app.candidates;
              const job = app.job_openings;
              const clientName = job?.client_name || job?.clients?.name || "Generic Client";
              const isExpanded = expandedAppId === app.id;
              
              const isAccepting = acceptApplicationMutation.isPending && acceptApplicationMutation.variables === app.id;
              const isRejecting = rejectApplicationMutation.isPending && rejectingAppId === app.id;

              return (
                <div 
                  key={app.id} 
                  className={`p-5 hover:bg-neutral-50/70 transition-colors duration-250 flex flex-col gap-4 ${
                    isExpanded ? "bg-neutral-50/40" : ""
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Left details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span 
                          onClick={() => onNavigate("pool", cand?.id)}
                          className="font-tight font-bold text-neutral-850 text-sm hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group"
                        >
                          {cand?.full_name || app.candidate_name || "Unknown Candidate"}
                          <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                        </span>
                        
                        {cand?.experience_years !== undefined && (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-500 rounded-sm flex items-center gap-1 font-semibold uppercase">
                            <Flame className="w-2.5 h-2.5 text-orange-500" />
                            {cand?.experience_years} Years Exp
                          </span>
                        )}
                        
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-500 rounded-sm font-medium uppercase">
                          Source: {cand?.source || "manual"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                        {cand?.email && (
                          <span className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-400 font-mono text-[10px]">EMAIL:</span>
                            {cand.email}
                          </span>
                        )}
                        {cand?.phone && (
                          <span className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-400 font-mono text-[10px]">PHONE:</span>
                            {cand.phone}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-mono text-neutral-400 font-semibold uppercase">Applied for:</span>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-neutral-900 text-neutral-100 rounded-sm font-bold uppercase">
                          {clientName}
                        </span>
                        <span 
                          onClick={() => onNavigate("jobs", job?.id)}
                          className="text-xs font-semibold text-neutral-800 hover:text-primary cursor-pointer hover:underline"
                        >
                          {job?.title || "Unknown Opening"}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Match Rating */}
                    <div className="flex flex-col gap-1 md:w-56 md:items-end justify-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-neutral-450 uppercase font-semibold">AI Match Score</span>
                        <div className={`font-mono text-xs font-bold px-2 py-0.5 rounded-sm border uppercase ${getFuzzyScoreColor(app.fuzzy_score)}`}>
                          {app.fuzzy_score !== null ? `${app.fuzzy_score}%` : "Pending"}
                        </div>
                      </div>
                      
                      {app.fuzzy_score !== null && (
                        <div className="w-full bg-neutral-150 h-1.5 rounded-full overflow-hidden mt-1 max-w-[200px]">
                          <div 
                            className={`h-full ${getFuzzyScoreProgress(app.fuzzy_score)}`}
                            style={{ width: `${app.fuzzy_score}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: Quick actions */}
                    <div className="flex items-center gap-2 self-end md:self-start">
                      <button
                        onClick={() => handleAccept(app.id)}
                        disabled={isAccepting || isRejecting}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-neutral-white font-mono text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        {isAccepting ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectClick(app.id)}
                        disabled={isAccepting || isRejecting}
                        className="px-3 py-1.5 border border-neutral-250 hover:bg-neutral-100 disabled:opacity-50 text-neutral-600 font-mono text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {isRejecting ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserX className="w-3.5 h-3.5" />
                        )}
                        Reject
                      </button>
                      <button
                        onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                        className={`p-1.5 border rounded-sm transition-colors cursor-pointer ${
                          isExpanded 
                            ? "bg-neutral-900 border-neutral-950 text-neutral-white" 
                            : "border-neutral-250 text-neutral-500 hover:bg-neutral-100"
                        }`}
                        title={isExpanded ? "Collapse Analysis" : "Expand Analysis"}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable details area */}
                  {isExpanded && (
                    <div className="mt-2 border-t border-neutral-200/60 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs animate-fade-in">
                      {/* Left: Strengths */}
                      <div className="space-y-2 bg-emerald-50/30 border border-emerald-500/15 p-3 rounded-sm">
                        <div className="flex items-center gap-1.5 text-emerald-850 font-semibold uppercase tracking-wider text-[10px] font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Key Strengths
                        </div>
                        {app.strengths && app.strengths.length > 0 ? (
                          <ul className="space-y-1.5 pl-4 list-disc text-neutral-650">
                            {app.strengths.map((str, idx) => (
                              <li key={idx} className="leading-relaxed">{str}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-neutral-450 italic">No key strengths extracted.</p>
                        )}
                      </div>

                      {/* Middle: Skill Gaps */}
                      <div className="space-y-2 bg-orange-50/20 border border-orange-500/10 p-3 rounded-sm">
                        <div className="flex items-center gap-1.5 text-orange-850 font-semibold uppercase tracking-wider text-[10px] font-mono">
                          <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                          Identified Skill Gaps
                        </div>
                        {app.skill_gaps && app.skill_gaps.length > 0 ? (
                          <ul className="space-y-1.5 pl-4 list-disc text-neutral-650">
                            {app.skill_gaps.map((gap, idx) => (
                              <li key={idx} className="leading-relaxed">{gap}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-neutral-450 italic">No significant skill gaps found.</p>
                        )}
                      </div>

                      {/* Right: AI Match Reason */}
                      <div className="space-y-2 bg-neutral-50 border border-neutral-200/55 p-3 rounded-sm md:col-span-1">
                        <div className="flex items-center gap-1.5 text-neutral-800 font-semibold uppercase tracking-wider text-[10px] font-mono">
                          <MessageSquareQuote className="w-3.5 h-3.5 text-neutral-500" />
                          Matching Evaluation
                        </div>
                        <p className="text-neutral-650 leading-relaxed italic bg-neutral-white border border-neutral-100 p-2.5 rounded-sm">
                          "{app.match_reason || "Evaluated by AI matching engine using candidate experience parameters."}"
                        </p>
                      </div>

                      {/* Skills listed */}
                      {cand?.skills && cand.skills.length > 0 && (
                        <div className="md:col-span-3 border-t border-neutral-150 pt-3 flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-mono text-neutral-400 uppercase font-semibold mr-1.5">Skills:</span>
                          {cand.skills.map((skill: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 border border-neutral-200/60 rounded-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectingAppId !== null && (
        <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-white border border-neutral-250 w-full max-w-md p-6 rounded-sm shadow-xl space-y-4 text-neutral-700">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-orange-600 font-bold uppercase tracking-wider text-xs">
                <ShieldAlert className="w-4 h-4" />
                Reject Candidate Submission
              </div>
              <button 
                onClick={() => setRejectingAppId(null)}
                className="text-neutral-450 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1 text-xs">
              <p className="text-neutral-500">
                Please provide rejection feedback for audits. This logs the decision details to the candidate's history and helps refine matching parameters.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-neutral-450 uppercase font-bold tracking-wider text-[10px]">Rejection Reason / Feedback Notes</label>
              <textarea
                placeholder="Candidate lacked necessary React expertise or senior architectural experience as weighted by job criteria..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-primary transition-colors text-xs resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                type="button"
                onClick={() => setRejectingAppId(null)}
                className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-100 rounded-sm text-neutral-500 cursor-pointer uppercase font-mono text-[9px] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectApplicationMutation.isPending}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-neutral-white font-mono text-[9px] uppercase font-bold tracking-wider rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {rejectApplicationMutation.isPending && <RefreshCw className="w-3 h-3 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
