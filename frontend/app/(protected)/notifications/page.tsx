"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { Notification, ActivityLog, Client, Candidate } from "@/types";
import { 
  Bell, Briefcase, Sparkles, Upload, AlertCircle, Layers, 
  User, Check, Trash2, Search, Calendar, Shield, Clock,
  CheckSquare, ArrowRight, ExternalLink
} from "lucide-react";

interface DisplayItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  type: string;
  is_read?: boolean;
  isActivity?: boolean;
  actor_name?: string;
  metadata?: any;
}

const formatActivityLog = (act: ActivityLog): DisplayItem => {
  const actor = act.actor_name || "Recruiter";
  const meta = act.metadata || {};
  let title = "System Event";
  let message = act.action;
  let type = "recruiter_action";

  switch (act.action) {
    case "client_created":
      title = "Client Registered";
      message = `${actor} registered client "${meta.client_name || "New Client"}"`;
      type = "upload";
      break;
    case "client_updated":
      title = "Client Updated";
      message = `${actor} updated client details for "${meta.client_name || "Client"}"`;
      type = "upload";
      break;
    case "req_created":
    case "requirement_created":
      title = "Hiring Mandate Created";
      message = `${actor} created hiring mandate "${meta.req_title || "New Mandate"}"`;
      type = "job_generation";
      break;
    case "job_created":
    case "job_created_manual":
      title = "Job Opening Drafted";
      message = `${actor} drafted job opening "${meta.job_title || "Job Option"}"`;
      type = "job_generation";
      break;
    case "job_confirmed":
      title = "Job Mandate Confirmed";
      message = `${actor} confirmed job details for "${meta.job_title || "Job Opening"}"`;
      type = "job_generation";
      break;
    case "skills_extracted":
      title = "Skills Extracted";
      message = `Mandate skills extracted for job "${meta.job_title || "Job"}"`;
      type = "job_generation";
      break;
    case "skills_approved":
      title = "Skills Approved";
      message = `${actor} approved requirement skills for "${meta.job_title || "Job"}"`;
      type = "job_generation";
      break;
    case "job_published":
      title = "Job Opening Published";
      message = `${actor} published job opening "${meta.job_title || "Job"}"`;
      type = "job_generation";
      break;
    case "job_regenerated":
      title = "Job Regenerated";
      message = `Job opening "${meta.job_title || "Job"}" successfully regenerated.`;
      type = "job_generation";
      break;
    case "candidate_matching_completed":
      title = "AI Matching Completed";
      message = `Candidate matching completed for "${meta.job_title || "Job"}". Found ${meta.matches_count || 0} matches.`;
      type = "candidate_matching";
      break;
    case "candidate_matching_failed":
      title = "AI Matching Failed";
      message = `Failed matching candidates for "${meta.job_title || "Job"}": ${meta.error || "Unknown Error"}`;
      type = "error";
      break;
    case "candidate_cv_downloaded":
    case "candidate_uploaded":
      title = "Resume Uploaded & Parsed";
      message = `Successfully uploaded and parsed resume for candidate "${meta.candidate_name || "Candidate"}"`;
      type = "upload";
      break;
    case "candidate_cv_download_failed":
      title = "Resume Parsing Failed";
      message = `Error downloading or parsing resume for candidate "${meta.candidate_name || "Candidate"}": ${meta.error || "Parsing error"}`;
      type = "error";
      break;
    case "candidate_csv_imported":
      title = "CSV Directory Imported";
      message = `${actor} imported candidate list (${meta.candidates_count || 0} candidates)`;
      type = "upload";
      break;
    case "application_accepted":
      title = "Candidate Accepted";
      message = `${actor} accepted candidate "${meta.candidate_name || "Candidate"}" for "${meta.job_title || "Job"}"`;
      type = "candidate_matching";
      break;
    case "application_rejected":
      title = "Candidate Rejected";
      message = `${actor} rejected candidate "${meta.candidate_name || "Candidate"}" for "${meta.job_title || "Job"}"`;
      type = "candidate_matching";
      break;
    case "screening_questions_generated":
      title = "Screening Questions Ready";
      message = `Screening questions generated for "${meta.candidate_name || "Candidate"}" applying for "${meta.job_title || "Job"}"`;
      type = "screening_questions";
      break;
    case "screening_question_added":
      title = "Screening Question Added";
      message = `${actor} added custom screening question for "${meta.candidate_name || "Candidate"}"`;
      type = "screening_questions";
      break;
    case "screening_question_updated":
    case "screening_question_refined":
      title = "Screening Question Refined";
      message = `Screening question for "${meta.candidate_name || "Candidate"}" refined by AI.`;
      type = "screening_questions";
      break;
    case "n8n_dispatch_failed":
      title = "Automation Error";
      message = `N8N workflow dispatch failed for mandate "${meta.req_title || "Mandate"}"`;
      type = "error";
      break;
    default:
      title = act.action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      message = act.metadata?.message || `${actor} executed ${act.action}`;
      type = "recruiter_action";
      break;
  }

  return {
    id: act.id,
    title,
    message,
    created_at: act.created_at,
    type,
    is_read: true,
    isActivity: true,
    actor_name: actor,
    metadata: meta,
  };
};

export default function NotificationsTimelinePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [filterTab, setFilterTab] = useState<"all" | "alerts" | "activities" | "errors">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  // States for clear/delete animations
  const [isClearing, setIsClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<string[]>([]);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiRequest<Notification[]>("GET", "/notifications"),
    refetchInterval: 4000,
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["activityLogs"],
    queryFn: () => apiRequest<ActivityLog[]>("GET", "/activity_log"),
    refetchInterval: 4000,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => apiRequest<Client[]>("GET", "/clients"),
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["candidates"],
    queryFn: () => apiRequest<Candidate[]>("GET", "/candidates"),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const deleteNotifMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const deleteActivityLogMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/activity_log/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
    }
  });

  const clearAllNotificationsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/notifications"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setIsClearing(false);
    },
    onError: () => {
      setIsClearing(false);
    }
  });

  const clearAllActivityLogsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/activity_log"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      setIsClearing(false);
    },
    onError: () => {
      setIsClearing(false);
    }
  });

  const handleClearAll = () => {
    setIsClearing(true);
    const itemsCount = formattedItems.length;
    const animDelay = Math.min((itemsCount * 50) + 600, 2500); // 50ms stagger delay + 600ms transition
    
    // Determine which IDs are being cleared
    const idsToClear = formattedItems
      .filter(item => {
        if (filterTab === "activities") return item.isActivity;
        if (filterTab === "alerts") return !item.isActivity;
        if (filterTab === "errors") return item.type === "error";
        return true;
      })
      .map(item => item.id);

    setTimeout(() => {
      setLocallyDeletedIds(prev => [...prev, ...idsToClear]);
      if (filterTab === "activities") {
        clearAllActivityLogsMutation.mutate();
      } else if (filterTab === "alerts") {
        clearAllNotificationsMutation.mutate();
      } else {
        clearAllNotificationsMutation.mutate();
        clearAllActivityLogsMutation.mutate();
      }
    }, animDelay);
  };

  const handleDeleteIndividual = (id: string, isActivity?: boolean) => {
    setDeletingId(id);
    setTimeout(() => {
      setLocallyDeletedIds(prev => [...prev, id]);
      if (isActivity) {
        deleteActivityLogMutation.mutate(id);
      } else {
        deleteNotifMutation.mutate(id);
      }
      setDeletingId(null);
    }, 550); // 350ms slide-off + 200ms height collapse
  };

  const handleResetFilters = () => {
    setDateFilter("all");
    setCustomDate("");
    setTypeFilter("all");
    setClientFilter("all");
    setCandidateFilter("all");
    setSearchQuery("");
  };

  const navigateNotificationRoute = (type: string, metadata?: any) => {
    const meta = metadata || {};
    if (type === "job_generation") {
      if (meta.job_opening_id) {
        router.push(`/jobs?id=${meta.job_opening_id}`);
      } else if (meta.requirement_id) {
        router.push(`/clients?id=${meta.requirement_id}`);
      } else {
        router.push("/jobs");
      }
    } else if (type === "candidate_matching") {
      if (meta.job_opening_id) {
        router.push(`/jobs?id=${meta.job_opening_id}`);
      } else {
        router.push("/jobs");
      }
    } else if (type === "screening_questions") {
      if (meta.application_id && meta.job_opening_id) {
        router.push(`/jobs?id=${meta.job_opening_id}&appId=${meta.application_id}`);
      } else if (meta.job_opening_id) {
        router.push(`/jobs?id=${meta.job_opening_id}`);
      } else {
        router.push("/jobs");
      }
    } else if (type === "upload") {
      router.push("/pool");
    } else {
      router.push("/dashboard");
    }
  };

  const formattedItems = React.useMemo(() => {
    const formattedNotifs: DisplayItem[] = notifications.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      created_at: n.created_at,
      type: n.type,
      is_read: n.is_read,
      isActivity: false,
      metadata: n.metadata
    }));

    const formattedActs: DisplayItem[] = activityLogs.map(formatActivityLog);

    let combined = [...formattedNotifs, ...formattedActs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (filterTab === "alerts") {
      combined = combined.filter(item => !item.isActivity);
    } else if (filterTab === "activities") {
      combined = combined.filter(item => item.isActivity);
    } else if (filterTab === "errors") {
      combined = combined.filter(item => item.type === "error");
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      combined = combined.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.message.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (dateFilter !== "all") {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      combined = combined.filter(item => {
        const itemDate = new Date(item.created_at);
        if (dateFilter === "today") {
          return itemDate >= startOfToday;
        } else if (dateFilter === "yesterday") {
          const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
          return itemDate >= startOfYesterday && itemDate < startOfToday;
        } else if (dateFilter === "week") {
          const limit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= limit;
        } else if (dateFilter === "month") {
          const limit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return itemDate >= limit;
        } else if (dateFilter === "custom" && customDate) {
          const selectedDate = new Date(customDate);
          return (
            itemDate.getFullYear() === selectedDate.getFullYear() &&
            itemDate.getMonth() === selectedDate.getMonth() &&
            itemDate.getDate() === selectedDate.getDate()
          );
        }
        return true;
      });
    }

    // Event type filter
    if (typeFilter !== "all") {
      combined = combined.filter(item => item.type === typeFilter);
    }

    // Client filter
    if (clientFilter !== "all") {
      const clientName = clientFilter.toLowerCase();
      combined = combined.filter(item => {
        const meta = item.metadata || {};
        return (
          item.message.toLowerCase().includes(clientName) ||
          item.title.toLowerCase().includes(clientName) ||
          (meta.client_name && meta.client_name.toLowerCase().includes(clientName)) ||
          (meta.client_id === clientFilter) ||
          (meta.job_title && meta.job_title.toLowerCase().includes(clientName)) ||
          (meta.req_title && meta.req_title.toLowerCase().includes(clientName)) ||
          (meta.requirement_title && meta.requirement_title.toLowerCase().includes(clientName))
        );
      });
    }

    // Candidate filter
    if (candidateFilter !== "all") {
      const candName = candidateFilter.toLowerCase();
      combined = combined.filter(item => {
        const meta = item.metadata || {};
        return (
          item.message.toLowerCase().includes(candName) ||
          item.title.toLowerCase().includes(candName) ||
          (meta.candidate_name && meta.candidate_name.toLowerCase().includes(candName)) ||
          (meta.candidate_id === candidateFilter)
        );
      });
    }

    combined = combined.filter(item => !locallyDeletedIds.includes(item.id));
    return combined;
  }, [notifications, activityLogs, filterTab, searchQuery, dateFilter, customDate, typeFilter, clientFilter, candidateFilter, locallyDeletedIds]);

  const stats = React.useMemo(() => {
    return {
      unreadAlerts: notifications.filter(n => !n.is_read).length,
      systemErrors: notifications.filter(n => n.type === "error").length + activityLogs.filter(a => a.action.includes("fail")).length,
      recruiterActions: activityLogs.length,
    };
  }, [notifications, activityLogs]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const context = {
        page: "notifications",
        alerts: notifications.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          is_read: n.is_read,
          created_at: n.created_at
        })),
        audit_logs: activityLogs.map(a => ({
          id: a.id,
          action: a.action,
          actor_name: a.actor_name,
          created_at: a.created_at,
          metadata: a.metadata
        })),
        system_errors: notifications.filter(n => n.type === "error").map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          created_at: n.created_at
        })),
        unread_alerts: stats.unreadAlerts,
        system_error_count: stats.systemErrors,
        audit_log_count: stats.recruiterActions,
        // Global format
        selected_entity: null,
        visible_rows: formattedItems.slice(0, 15).map(item => ({
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type
        })),
        visible_data: {
          unread_count: stats.unreadAlerts,
          total_items: formattedItems.length
        },
        entities: {
          notification_ids: notifications.map(n => n.id),
          activity_log_ids: activityLogs.map(a => a.id)
        }
      };

      window.dispatchEvent(new CustomEvent("copilot-context-update", { detail: context }));
    }
  }, [notifications, activityLogs, stats, formattedItems]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50">
      <style dangerouslySetInnerHTML={{__html: `
        .timeline-card {
          transition: transform 350ms cubic-bezier(0.25, 1, 0.5, 1),
                      opacity 350ms cubic-bezier(0.25, 1, 0.5, 1),
                      max-height 200ms ease-out 350ms,
                      padding-top 200ms ease-out 350ms,
                      padding-bottom 200ms ease-out 350ms,
                      border-width 200ms ease-out 350ms,
                      margin-top 200ms ease-out 350ms,
                      margin-bottom 200ms ease-out 350ms;
          transform: translateX(0);
          opacity: 1;
          max-height: 300px;
        }

        .timeline-card-deleting {
          transform: translateX(100%) !important;
          opacity: 0 !important;
          max-height: 0px !important;
          padding-top: 0px !important;
          padding-bottom: 0px !important;
          border-width: 0px !important;
          margin-top: 0px !important;
          margin-bottom: 0px !important;
          pointer-events: none;
        }
      `}} />
      {/* Title Header */}
      <div className="p-6 border-b border-neutral-200 bg-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-tight font-extrabold text-lg uppercase tracking-wider text-neutral-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Operations Timeline & Alerts
            </h2>
            <p className="text-neutral-550 text-xs mt-1">
              Audit trail of background n8n automation status, recruiter actions, and system logs.
            </p>
          </div>
          <div className="flex gap-2.5">
            {notifications.some(n => !n.is_read) && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="px-3 py-1.5 bg-white border border-neutral-250 hover:bg-neutral-50 text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-600 rounded-sm cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            {(notifications.length > 0 || activityLogs.length > 0) && (
              <button
                onClick={handleClearAll}
                disabled={clearAllNotificationsMutation.isPending || clearAllActivityLogsMutation.isPending || isClearing}
                className="px-3 py-1.5 bg-rose-50 border border-rose-250 hover:bg-rose-100 disabled:opacity-50 text-[10px] uppercase font-mono font-bold tracking-wider text-rose-600 rounded-sm cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {filterTab === "alerts" ? "Clear Alerts" : 
                 filterTab === "activities" ? "Clear Logs" : 
                 filterTab === "errors" ? "Clear Errors" : "Clear Timeline"}
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <button
            onClick={() => setFilterTab("alerts")}
            className={`bg-white border p-4 rounded-sm shadow-xs flex items-center gap-3 text-left transition-all cursor-pointer ${
              filterTab === "alerts" ? "border-primary ring-1 ring-primary/25" : "border-neutral-200 hover:border-neutral-350 hover:bg-neutral-50/30"
            }`}
          >
            <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold font-mono text-neutral-450 uppercase tracking-wider">Unread Alerts</p>
              <h3 className="text-xl font-extrabold text-neutral-850 mt-0.5">{stats.unreadAlerts}</h3>
            </div>
          </button>
          
          <button
            onClick={() => setFilterTab("errors")}
            className={`bg-white border p-4 rounded-sm shadow-xs flex items-center gap-3 text-left transition-all cursor-pointer ${
              filterTab === "errors" ? "border-rose-500 ring-1 ring-rose-500/25" : "border-neutral-200 hover:border-neutral-350 hover:bg-neutral-50/30"
            }`}
          >
            <div className="w-10 h-10 rounded-sm bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold font-mono text-rose-555 uppercase tracking-wider">System Errors</p>
              <h3 className="text-xl font-extrabold text-neutral-850 mt-0.5">{stats.systemErrors}</h3>
            </div>
          </button>

          <button
            onClick={() => setFilterTab("activities")}
            className={`bg-white border p-4 rounded-sm shadow-xs flex items-center gap-3 text-left transition-all cursor-pointer ${
              filterTab === "activities" ? "border-purple-500 ring-1 ring-purple-500/25" : "border-neutral-200 hover:border-neutral-350 hover:bg-neutral-50/30"
            }`}
          >
            <div className="w-10 h-10 rounded-sm bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold font-mono text-purple-600 uppercase tracking-wider">Audited Logs</p>
              <h3 className="text-xl font-extrabold text-neutral-850 mt-0.5">{stats.recruiterActions}</h3>
            </div>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
          {/* Tabs */}
          <div className="flex border border-neutral-200 rounded-sm overflow-hidden bg-neutral-100 shrink-0 self-start">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer transition-colors ${
                filterTab === "all" ? "bg-white text-primary border-r border-neutral-200 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              All Events ({notifications.length + activityLogs.length})
            </button>
            <button
              onClick={() => setFilterTab("alerts")}
              className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer transition-colors ${
                filterTab === "alerts" ? "bg-white text-primary border-r border-neutral-200 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Alerts ({notifications.length})
            </button>
            <button
              onClick={() => setFilterTab("activities")}
              className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer transition-colors ${
                filterTab === "activities" ? "bg-white text-primary border-r border-neutral-200 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Activities ({activityLogs.length})
            </button>
            <button
              onClick={() => setFilterTab("errors")}
              className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer transition-colors ${
                filterTab === "errors" ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Errors ({stats.systemErrors})
            </button>
          </div>

          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search timeline events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-sm bg-white text-neutral-800 placeholder:text-neutral-450 transition-all text-xs outline-none focus:border-primary shadow-xs"
            />
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        <div className="mt-4 shrink-0">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
              className="text-[10px] uppercase font-mono font-bold text-neutral-500 hover:text-neutral-850 flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 border border-neutral-250 hover:bg-neutral-50 transition-colors shadow-sm rounded-sm"
            >
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              {isAdvancedFiltersOpen ? "Hide Advanced Filters" : "Show Advanced Filters"}
              {(dateFilter !== "all" || typeFilter !== "all" || clientFilter !== "all" || candidateFilter !== "all") && (
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
              )}
            </button>
            
            {(dateFilter !== "all" || typeFilter !== "all" || clientFilter !== "all" || candidateFilter !== "all" || searchQuery !== "") && (
              <button
                onClick={handleResetFilters}
                className="text-[9px] uppercase font-mono font-bold text-primary hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          {isAdvancedFiltersOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-3 p-4 bg-white border border-neutral-200 rounded-sm shadow-xs animate-fade-in">
              {/* Date Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold font-mono text-neutral-450 uppercase tracking-wider block">Time Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-200 rounded-sm bg-neutral-50 outline-none focus:border-primary focus:bg-white transition-colors"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Date</option>
                </select>
                {dateFilter === "custom" && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full text-xs p-1.5 border border-neutral-200 rounded-sm bg-neutral-50 outline-none focus:border-primary focus:bg-white transition-colors mt-1.5"
                  />
                )}
              </div>

              {/* Type Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold font-mono text-neutral-450 uppercase tracking-wider block">Event Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-200 rounded-sm bg-neutral-50 outline-none focus:border-primary focus:bg-white transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="job_generation">Job Generation</option>
                  <option value="candidate_matching">Candidate Matching</option>
                  <option value="upload">Resume Uploads</option>
                  <option value="screening_questions">Screening Questions</option>
                  <option value="error">System Errors</option>
                  <option value="recruiter_action">Recruiter Actions</option>
                </select>
              </div>

              {/* Client Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold font-mono text-neutral-450 uppercase tracking-wider block">Client Mandate</label>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-200 rounded-sm bg-neutral-50 outline-none focus:border-primary focus:bg-white transition-colors"
                >
                  <option value="all">All Clients</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Candidate Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold font-mono text-neutral-450 uppercase tracking-wider block">Target Candidate</label>
                <select
                  value={candidateFilter}
                  onChange={(e) => setCandidateFilter(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-200 rounded-sm bg-neutral-50 outline-none focus:border-primary focus:bg-white transition-colors"
                >
                  <option value="all">All Candidates</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.full_name}>{c.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Feed List */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-4xl mx-auto space-y-4">
          {formattedItems.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-neutral-200 bg-white rounded-sm shadow-xs select-none flex flex-col items-center justify-center">
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes mail-drop-1 {
                  0% { transform: translateY(-40px) rotate(-8deg); opacity: 0; }
                  15% { opacity: 1; }
                  50% { transform: translateY(18px) rotate(2deg); opacity: 0.8; }
                  70%, 100% { transform: translateY(32px) rotate(0deg); opacity: 0; }
                }
                @keyframes mail-drop-2 {
                  0%, 35% { transform: translateY(-40px) rotate(6deg); opacity: 0; }
                  50% { opacity: 1; }
                  80% { transform: translateY(18px) rotate(-4deg); opacity: 0.8; }
                  92%, 100% { transform: translateY(32px) rotate(0deg); opacity: 0; }
                }
                @keyframes tray-bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(2px); }
                }
                .animate-mail-1 { animation: mail-drop-1 3s infinite cubic-bezier(0.25, 1, 0.5, 1); }
                .animate-mail-2 { animation: mail-drop-2 3s infinite cubic-bezier(0.25, 1, 0.5, 1); }
                .animate-tray { animation: tray-bounce 3s infinite ease-in-out; }
              `}} />
              
              <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2 animate-tray">
                {/* Envelope 1 */}
                <g className="animate-mail-1">
                  <rect x="42" y="8" width="36" height="22" rx="2" fill="#F4F4F5" stroke="#71717A" strokeWidth="1.5" />
                  <path d="M42 8L60 20L78 8" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                {/* Envelope 2 */}
                <g className="animate-mail-2">
                  <rect x="44" y="8" width="36" height="22" rx="2" fill="#E4E4E7" stroke="#3F3F46" strokeWidth="1.5" />
                  <path d="M44 8L62 20L80 8" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                {/* Document Tray */}
                <path d="M25 48H15V78H105V48H95V68H25V48Z" fill="#F4F4F5" stroke="#18181B" strokeWidth="2" strokeLinejoin="round" />
                <line x1="35" y1="73" x2="85" y2="73" stroke="#D4D4D8" strokeWidth="2" strokeLinecap="round" />
              </svg>

              <h4 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Timeline Empty</h4>
              <p className="text-neutral-450 text-[11px] max-w-xs mt-1.5 leading-relaxed">
                The operations log is clean. Incoming alerts and background automation activities will be collected here.
              </p>
            </div>
          ) : (
            formattedItems.map((item, idx) => {
              let Icon = Bell;
              let iconColor = "text-neutral-400 bg-neutral-50 border-neutral-250";
              if (item.type === "job_generation") {
                Icon = Briefcase;
                iconColor = "text-indigo-600 bg-indigo-50 border-indigo-100";
              } else if (item.type === "candidate_matching") {
                Icon = Sparkles;
                iconColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
              } else if (item.type === "upload") {
                Icon = Upload;
                iconColor = "text-blue-600 bg-blue-50 border-blue-100";
              } else if (item.type === "error") {
                Icon = AlertCircle;
                iconColor = "text-rose-600 bg-rose-50 border-rose-100";
              } else if (item.type === "screening_questions") {
                Icon = Layers;
                iconColor = "text-amber-600 bg-amber-50 border-amber-100";
              } else if (item.type === "recruiter_action") {
                Icon = User;
                iconColor = "text-purple-600 bg-purple-50 border-purple-100";
              }

              const isItemDeleting = deletingId === item.id || (isClearing && (
                filterTab === "all" || 
                filterTab === "errors" ||
                (filterTab === "alerts" && !item.isActivity) ||
                (filterTab === "activities" && item.isActivity)
              ));

              return (
                <div 
                  key={item.id}
                  className={`timeline-card bg-white border border-neutral-200 rounded-sm p-4 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 relative group overflow-hidden ${
                    !item.isActivity && !item.is_read ? "border-l-4 border-l-primary bg-primary/[0.01]" : ""
                  } ${
                    isItemDeleting ? "timeline-card-deleting" : ""
                  }`}
                  style={{
                    transitionDelay: isClearing ? `${idx * 50}ms` : "0ms"
                  }}
                >
                  <div className="flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-sm border flex items-center justify-center shrink-0 shadow-xs ${iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-bold text-neutral-800 text-xs">{item.title}</span>
                        {item.isActivity ? (
                          <span className="bg-neutral-100 text-neutral-500 border border-neutral-200 text-[8px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wide select-none">
                            System Log
                          </span>
                        ) : (
                          <span className="bg-primary/10 text-primary border border-primary/20 text-[8px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wide select-none">
                            Alert
                          </span>
                        )}
                        {!item.isActivity && !item.is_read && (
                          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block shrink-0 animate-pulse"></span>
                        )}
                      </div>
                      <p className="text-neutral-550 text-xs mt-1.5 leading-relaxed">{item.message}</p>
                      
                      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-neutral-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-neutral-300" />
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                        {item.actor_name && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <span className="font-semibold text-neutral-500">Actor: {item.actor_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => navigateNotificationRoute(item.type, item.metadata)}
                      className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-[9px] uppercase font-mono font-bold text-neutral-550 rounded-sm cursor-pointer transition-colors flex items-center gap-1"
                    >
                      Navigate
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </button>
                    
                    <div className="flex gap-1">
                      {!item.isActivity && !item.is_read && (
                        <button
                          onClick={() => markReadMutation.mutate(item.id)}
                          className="p-1.5 border border-neutral-200 hover:border-success hover:bg-success/5 text-neutral-450 hover:text-success rounded-sm cursor-pointer transition-all shadow-xs"
                          title="Mark as read"
                          aria-label="Mark alert read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteIndividual(item.id, item.isActivity)}
                        className="p-1.5 border border-neutral-200 hover:border-red-250 hover:bg-red-50 text-neutral-450 hover:text-red-500 rounded-sm cursor-pointer transition-all shadow-xs"
                        title={item.isActivity ? "Delete activity log" : "Delete notification"}
                        aria-label="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
