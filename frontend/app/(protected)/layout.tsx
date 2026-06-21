"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser, useProfile, useLogout, useUpdateProfile } from "@/lib/hooks/useAuth";
import ChatbotPanel from "@/components/ChatbotPanel";
import UserAvatar from "@/components/UserAvatar";

import {
  LayoutDashboard, Building2, Briefcase, Users, LogOut,
  Sparkles, Menu, Shield, User, ChevronRight, MessageSquare, Settings, Upload,
  X, AlertCircle, Layers, Bell, Clock, Check, Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { Notification, ActivityLog } from "@/types";

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

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { mutate: logout } = useLogout();

  const pathname = usePathname();
  const router = useRouter();

  // Onboarding Form States
  const [onboardStep, setOnboardStep] = useState<number>(1);
  const [onboardName, setOnboardName] = useState<string>("");
  const [onboardAgency, setOnboardAgency] = useState<string>("");
  const [onboardDomain, setOnboardDomain] = useState<string>("");

  // Chat drawer collapse state
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Exit Confirmation Modal State
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  // Onboarding Tour States
  const [activeTutorial, setActiveTutorial] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Notifications States & Queries
  interface Toast {
    id: string;
    title: string;
    message: string;
    type: string;
    metadata?: any;
  }
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<"all" | "alerts" | "activities">("all");
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiRequest<Notification[]>("GET", "/notifications"),
    refetchInterval: 4000, // Poll every 4 seconds for snappy real-time feedback
    enabled: !!user, // Only run if user is logged in
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["activityLogs"],
    queryFn: () => apiRequest<ActivityLog[]>("GET", "/activity_log"),
    refetchInterval: 4000,
    enabled: !!user,
  });

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

    const combined = [...formattedNotifs, ...formattedActs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (notifTab === "alerts") {
      return combined.filter(item => !item.isActivity);
    }
    if (notifTab === "activities") {
      return combined.filter(item => item.isActivity);
    }
    return combined;
  }, [notifications, activityLogs, notifTab]);

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

  // Request browser desktop notification permissions on mount
  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Sync notifiedIds and trigger real-time toasts / browser notifications
  React.useEffect(() => {
    if (notifications.length === 0) return;

    // First load: initialize the seen Set with existing notifications
    if (notifiedIds.size === 0) {
      const ids = new Set(notifications.map(n => n.id));
      setNotifiedIds(ids);
      return;
    }

    // Subsequent loads: find new unread notifications that we haven't seen yet
    const newNotifications = notifications.filter(
      n => !n.is_read && !notifiedIds.has(n.id)
    );

    if (newNotifications.length > 0) {
      const updatedIds = new Set(notifiedIds);

      newNotifications.forEach(n => {
        updatedIds.add(n.id);

        // Slide in custom in-app glassmorphic toast alert
        const toastId = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => [
          ...prev,
          { id: toastId, title: n.title, message: n.message, type: n.type, metadata: n.metadata }
        ]);

        // Auto-dismiss the toast after 5 seconds
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toastId));
        }, 5000);

        // Native Desktop notification if tab is in background / hidden
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted" && (document.hidden || !document.hasFocus())) {
            new Notification(n.title, {
              body: n.message,
              icon: "/favicon.ico"
            });
          }
        }
      });

      setNotifiedIds(updatedIds);
    }
  }, [notifications, notifiedIds]);

  const handleNotificationClick = (notif: DisplayItem) => {
    if (!notif.isActivity && !notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    setIsNotificationsOpen(false);
    navigateNotificationRoute(notif.type, notif.metadata);
  };

  const handleToastClick = (toast: Toast) => {
    // Dismiss toast on click
    setToasts(prev => prev.filter(t => t.id !== toast.id));
    navigateNotificationRoute(toast.type, toast.metadata);
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

  const tourSteps = [
    {
      title: "Welcome to Kozker Recruiter AI",
      content: "Let's take an interactive walkthrough of your new AI-powered recruiting workspace to learn how everything works.",
      targetId: "",
      path: "/dashboard"
    },
    {
      title: "Workspace Command Center",
      content: "This is your main dashboard. Here you can track active pipelines, monitor AI processing queues, and review system audit trails.",
      targetId: "sidebar-navigation",
      position: "right",
      path: "/dashboard"
    },
    {
      title: "Clients & Mandate Requirements",
      content: "Register organizational clients and configure hiring mandates here. Let's navigate to the Clients page.",
      targetId: "nav-clients",
      position: "right",
      path: "/clients"
    },
    {
      title: "Register Organization",
      content: "Click this '+' button to register a new organization like Google, Stripe, or Vercel.",
      targetId: "add-client-btn",
      position: "right",
      path: "/clients"
    },
    {
      title: "Uploading Hiring Mandates",
      content: "Once a client is registered, click 'Add Requirement' to upload descriptions (PDF, DOCX, TXT) and let AI extract key requirement skills.",
      targetId: "add-requirement-btn",
      position: "left-bottom",
      path: "/clients"
    },
    {
      title: "Search, Filter & Edit Requirements",
      content: "Manage mandates efficiently by searching, filtering by status, editing parameters, or updating requirement status from 'Draft' to 'Ready' or 'Archived'.",
      targetId: "requirements-search-bar",
      position: "bottom",
      path: "/clients"
    },
    {
      title: "AI Job Catalog",
      content: "AI-generated job drafts are stored in this catalog. Let's switch to the Job Catalog.",
      targetId: "nav-jobs",
      position: "right",
      path: "/jobs"
    },
    {
      title: "Guiding Job Openings",
      content: "Open any draft from the catalog. In the workspace, you can edit titles, confirm AI drafts, adjust skills weights, and trigger matching.",
      targetId: "nav-jobs",
      position: "right",
      path: "/jobs"
    },
    {
      title: "Sourcing Pool",
      content: "Review sourced candidate profiles in this central catalog. Let's navigate to the Sourcing Pool.",
      targetId: "nav-pool",
      position: "right",
      path: "/pool"
    },
    {
      title: "Adding Sourced Talent",
      content: "Click 'Add Candidate' to paste resume text summaries manually, or use 'Bulk Import CSV' to upload talent indexes in batches.",
      targetId: "add-candidate-btn",
      position: "left-bottom",
      path: "/pool"
    },
    {
      title: "AI Copilot Command Panel",
      content: "Open the Recruiter AI Companion anywhere. Ask it to audit candidate profiles, check database stats, or generate custom questions in real-time.",
      targetId: "header-chatbot-toggle",
      position: "left-bottom",
      path: "/dashboard"
    },
    {
      title: "You're Ready to Hire!",
      content: "Congratulations! You have completed the recruitment workflow walkthrough. Start exploring your workspace now!",
      targetId: "",
      path: "/dashboard"
    }
  ];

  // Redirect to Welcome page if onboarding is complete but tutorial state is not initialized
  React.useEffect(() => {
    if (profile?.is_onboarded) {
      const isCompleted = localStorage.getItem("kozker_tutorial_completed") === "true";
      const isSkipped = localStorage.getItem("kozker_tutorial_skipped") === "true";
      const hasSessionRedirected = sessionStorage.getItem("kozker_welcome_redirected") === "true";

      if (!isCompleted && !isSkipped && !hasSessionRedirected && pathname !== "/welcome") {
        sessionStorage.setItem("kozker_welcome_redirected", "true");
        router.push("/welcome");
      }
    }
  }, [profile, pathname, router]);

  // Check if we should auto-start or resume the tour
  React.useEffect(() => {
    if (profile?.is_onboarded) {
      const showTut = localStorage.getItem("show_kozker_tutorial");
      if (showTut === "true") {
        const savedStepStr = localStorage.getItem("kozker_tutorial_step");
        const savedStep = savedStepStr ? parseInt(savedStepStr, 10) : 0;
        setTourStep(savedStep);
        setActiveTutorial(true);
      }
    }
  }, [profile]);

  // Bounding rect calculator & DOM Polling
  React.useEffect(() => {
    if (!activeTutorial) return;
    const step = tourSteps[tourStep];

    // Route transition if needed
    if (step.path && pathname !== step.path) {
      router.push(step.path);
      return;
    }

    const locateElement = () => {
      if (!step.targetId) {
        setTooltipPos({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 175,
        });
        return;
      }

      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        let top = rect.top + window.scrollY;
        let left = rect.left + window.scrollX;

        if (step.position === "right") {
          top = rect.top + rect.height / 2 - 60;
          left = rect.right + 15;
        } else if (step.position === "left-bottom") {
          top = rect.bottom + 15;
          left = rect.left - 300;
        } else if (step.position === "top") {
          top = rect.top - 180;
          left = rect.left + rect.width / 2 - 175;
        } else if (step.position === "bottom") {
          top = rect.bottom + 15;
          left = rect.left + rect.width / 2 - 175;
        }

        // Safety checks to ensure it fits in screen
        if (left < 10) left = 10;
        if (left + 350 > window.innerWidth) left = window.innerWidth - 360;
        if (top < 10) top = 10;
        if (top + 200 > window.innerHeight) top = window.innerHeight - 210;

        setTooltipPos({ top, left });
      } else {
        // Fallback to center of screen while element is loading
        setTooltipPos({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 175,
        });
      }
    };

    locateElement();
    const interval = setInterval(locateElement, 300);
    return () => clearInterval(interval);
  }, [tourStep, activeTutorial, pathname]);

  const handleSkipTutorial = () => {
    setActiveTutorial(false);
    localStorage.setItem("kozker_tutorial_skipped", "true");
    localStorage.setItem("kozker_tutorial_step", tourStep.toString());
    localStorage.removeItem("show_kozker_tutorial");
    router.push("/dashboard");
  };

  const handleNextStep = () => {
    if (tourStep < tourSteps.length - 1) {
      const nextStep = tourStep + 1;
      setTourStep(nextStep);
      localStorage.setItem("kozker_tutorial_step", nextStep.toString());

      const step = tourSteps[nextStep];
      if (step.path && pathname !== step.path) {
        router.push(step.path);
      }
    } else {
      setActiveTutorial(false);
      localStorage.setItem("kozker_tutorial_completed", "true");
      localStorage.removeItem("kozker_tutorial_skipped");
      localStorage.removeItem("kozker_tutorial_step");
      localStorage.removeItem("show_kozker_tutorial");
      router.push("/dashboard");
    }
  };

  const handleBackStep = () => {
    if (tourStep > 0) {
      const prevStep = tourStep - 1;
      setTourStep(prevStep);
      localStorage.setItem("kozker_tutorial_step", prevStep.toString());

      const step = tourSteps[prevStep];
      if (step.path && pathname !== step.path) {
        router.push(step.path);
      }
    }
  };

  const handleResumeTutorial = () => {
    const savedStepStr = localStorage.getItem("kozker_tutorial_step");
    const savedStep = savedStepStr ? parseInt(savedStepStr, 10) : 0;
    setTourStep(savedStep);
    setActiveTutorial(true);
    localStorage.setItem("show_kozker_tutorial", "true");
    localStorage.removeItem("kozker_tutorial_skipped");

    const step = tourSteps[savedStep];
    if (step.path && pathname !== step.path) {
      router.push(step.path);
    }
  };

  const handleOnboard = async () => {
    try {
      await updateProfile.mutateAsync({
        full_name: onboardName,
        is_onboarded: true,
      });
      router.push("/welcome");
    } catch (err) {
      console.error("Onboarding failed", err);
    }
  };

  const navItems = [
    { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clients", href: "/clients", label: "Clients & Mandates", icon: Building2 },
    { id: "jobs", href: "/jobs", label: "Job Catalog", icon: Briefcase },
    { id: "pool", href: "/pool", label: "Sourcing Pool", icon: Users },
    { id: "rounds", href: "/rounds", label: "Interview Rounds", icon: Layers },
    { id: "notifications", href: "/notifications", label: "Notifications", icon: Bell },
    { id: "settings", href: "/profile", label: "Settings", icon: Settings },
  ];

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-200">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent animate-spin rounded-full mb-4"></div>
        <p className="font-tight text-sm tracking-wider text-neutral-400">LOADING KOZKER RECRUITER AI...</p>
      </div>
    );
  }

  // Onboarding Gate
  if (!profile.is_onboarded) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-neutral-200">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-primary rounded-sm"></span>
              <span className="font-tight font-bold tracking-wider text-xs text-neutral-white">RECRUITER ONBOARDING</span>
            </div>
            <span className="font-mono text-xs text-neutral-500">Step {onboardStep} of 2</span>
          </div>

          {onboardStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-tight font-semibold text-neutral-white">Personal Profile Setup</h3>
                <p className="text-neutral-400 text-xs">Specify your recruiter name for client audit logging.</p>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  placeholder="Alex Mercer"
                  value={onboardName}
                  onChange={(e) => setOnboardName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all text-xs"
                />
              </div>

              <button
                disabled={!onboardName}
                onClick={() => setOnboardStep(2)}
                className="w-full py-2 bg-primary disabled:opacity-50 hover:bg-primary/95 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer mt-2"
              >
                Continue Setup
              </button>
            </div>
          )}

          {onboardStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-tight font-semibold text-neutral-white">Recruitment Workspace</h3>
                <p className="text-neutral-400 text-xs">Configure your organization and workspace subdomains.</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Agency / Organization Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-neutral-600" />
                    <input
                      type="text"
                      placeholder="Kozker Talent Hub"
                      value={onboardAgency}
                      onChange={(e) => setOnboardAgency(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Subdomain Mapping</label>
                  <div className="flex rounded-sm overflow-hidden border border-neutral-800">
                    <input
                      type="text"
                      placeholder="kozker-agency"
                      value={onboardDomain}
                      onChange={(e) => setOnboardDomain(e.target.value)}
                      className="flex-1 px-3 py-2 bg-neutral-950 text-neutral-white placeholder:text-neutral-600 transition-all text-xs border-r border-neutral-800"
                    />
                    <span className="bg-neutral-850 px-3 py-2 text-xs text-neutral-500 font-mono flex items-center">.kozker.ai</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setOnboardStep(1)}
                  className="flex-1 py-2 border border-neutral-800 hover:bg-neutral-850 text-neutral-400 text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={!onboardAgency || !onboardDomain || updateProfile.isPending}
                  onClick={handleOnboard}
                  className="flex-1 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 text-neutral-white text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {updateProfile.isPending ? "Finishing..." : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Complete Onboarding
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main App Shell
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-800 font-sans selection:bg-primary/20">
      {/* Sidebar Navigation */}
      <aside id="sidebar-navigation" className="w-64 border-r border-neutral-200 bg-neutral-white flex flex-col justify-between h-full select-none z-30 shadow-xs">
        <div>
          <div className="p-5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5.5 h-5.5 bg-primary flex items-center justify-center rounded-sm">
                <Sparkles className="w-3.5 h-3.5 text-neutral-white animate-pulse" />
              </div>
              <span className="font-tight font-extrabold text-sm uppercase tracking-wider text-neutral-900">
                Kozker <span className="text-primary font-light text-xs lowercase">recruiter</span>
              </span>
            </div>
            <span className="font-mono text-[8px] bg-neutral-100 border border-neutral-250 text-neutral-500 px-1.5 py-0.2 rounded-sm font-semibold">
              V3.0
            </span>
          </div>

          <div className="mx-4 mt-4 p-3 bg-neutral-50 border border-neutral-150 rounded-sm font-mono text-[10px]">
            <p className="text-neutral-400 font-semibold uppercase tracking-wider">Active Workspace</p>
            <p className="font-bold text-neutral-800 mt-0.5 truncate">{"Enterprise recruiter"}</p>
            <p className="text-primary font-bold mt-1 text-[9px]">@{"default"}.kozker.ai</p>
          </div>

          <nav className="mt-6 px-3 space-y-1 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  id={`nav-${item.id}`}
                  href={item.href}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm font-medium transition-all cursor-pointer ${isActive
                      ? "bg-neutral-900 border-neutral-800 text-neutral-white font-semibold"
                      : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-neutral-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-primary" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Account footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/50 space-y-3">
          <Link href="/profile" className="flex items-center gap-2.5 hover:bg-neutral-100 p-1.5 rounded-sm transition-all cursor-pointer group">
            <UserAvatar 
              avatarUrl={profile.avatar_url} 
              fullName={profile.full_name} 
              email={user?.email} 
              className="w-7 h-7"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-neutral-800 truncate group-hover:text-primary transition-colors">{profile.full_name || user?.email}</p>
              <p className="text-[9px] text-neutral-400 font-mono uppercase">{profile.role || "RECRUITER"}</p>
            </div>
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded-sm text-[10px] uppercase font-mono font-bold transition-all cursor-pointer ${
                isChatOpen 
                  ? "bg-neutral-900 border-neutral-850 text-neutral-white hover:bg-neutral-800" 
                  : "border-neutral-200 hover:bg-neutral-150 text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              AI Copilot
            </button>
            <button
              onClick={() => setIsExitConfirmOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-neutral-200 hover:bg-neutral-150 rounded-sm text-[10px] uppercase font-mono font-bold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-neutral-400" />
              Exit Workspace
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-50">
        <header className="h-14 border-b border-neutral-200 bg-neutral-white flex items-center justify-between px-6 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <Menu className="w-4 h-4 text-neutral-400 lg:hidden cursor-pointer" />
            <h1 className="font-tight font-extrabold text-sm uppercase tracking-wider text-neutral-800 flex items-center gap-1.5 select-none">
              <Shield className="w-4 h-4 text-primary animate-pulse" />
              Recruitment Operations Command Center
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                id="header-notifications-toggle"
                className="p-2 border border-neutral-200 hover:bg-neutral-50 rounded-sm cursor-pointer transition-colors text-neutral-550 bg-neutral-white relative flex items-center justify-center"
                title="System Notifications"
                aria-haspopup="true"
                aria-expanded={isNotificationsOpen}
                aria-label={`System Notifications - ${notifications.filter(n => !n.is_read).length} unread`}
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsNotificationsOpen(false);
                  }
                }}
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[8px] rounded-full w-4 h-4 flex items-center justify-center border border-white animate-pulse">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30 cursor-default" 
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <div 
                    className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-sm shadow-lg z-40 animate-fade-in text-neutral-700 max-h-96 flex flex-col"
                    role="dialog"
                    aria-label="Notifications Panel"
                  >
                    <div className="p-3 border-b border-neutral-250 flex justify-between items-center bg-neutral-50 shrink-0">
                      <span className="font-tight font-extrabold text-[10px] uppercase tracking-wider text-neutral-800">Important Alerts</span>
                      {notifications.some(n => !n.is_read) && (
                        <button
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-[9px] text-primary hover:underline font-mono font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto divide-y divide-neutral-150 scrollbar-thin flex-1 max-h-80">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-neutral-400">No alerts or notifications.</div>
                      ) : (
                        [...notifications]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((notif) => {
                            let Icon = Bell;
                            let iconColor = "text-neutral-400 bg-neutral-50 border-neutral-250";
                            if (notif.type === "job_generation") {
                              Icon = Briefcase;
                              iconColor = "text-indigo-600 bg-indigo-50 border-indigo-100";
                            } else if (notif.type === "candidate_matching") {
                              Icon = Sparkles;
                              iconColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
                            } else if (notif.type === "upload") {
                              Icon = Upload;
                              iconColor = "text-blue-600 bg-blue-50 border-blue-100";
                            } else if (notif.type === "error") {
                              Icon = AlertCircle;
                              iconColor = "text-rose-600 bg-rose-50 border-rose-100";
                            } else if (notif.type === "screening_questions") {
                              Icon = Layers;
                              iconColor = "text-amber-600 bg-amber-50 border-amber-100";
                            }

                            return (
                              <div 
                                key={notif.id} 
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3 text-xs flex gap-3 transition-colors hover:bg-neutral-50 relative cursor-pointer ${notif.is_read ? '' : 'bg-primary/[0.02]'}`}
                              >
                                <div className={`w-7 h-7 rounded-sm border flex items-center justify-center shrink-0 ${iconColor}`}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="space-y-0.5 flex-1 pr-8">
                                  <div className="flex justify-between items-baseline gap-1.5">
                                    <span className={`font-bold text-[11px] leading-tight ${!notif.is_read ? 'text-neutral-900' : 'text-neutral-600'}`}>{notif.title}</span>
                                    <span className="text-[8px] text-neutral-400 font-mono shrink-0">
                                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-neutral-500 text-[10px] leading-snug">{notif.message}</p>
                                </div>
                                <div className="absolute right-2 top-2 flex items-center gap-1">
                                  {!notif.is_read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markReadMutation.mutate(notif.id);
                                      }}
                                      className="p-0.5 text-neutral-450 hover:text-success cursor-pointer transition-colors"
                                      title="Mark as read"
                                      aria-label="Mark notification as read"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotifMutation.mutate(notif.id);
                                    }}
                                    className="p-0.5 text-neutral-450 hover:text-red-500 cursor-pointer transition-colors"
                                    title="Delete notification"
                                    aria-label="Delete notification"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              id="header-chatbot-toggle"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-2 border border-neutral-200 hover:bg-neutral-50 rounded-sm cursor-pointer transition-colors ${isChatOpen ? "bg-neutral-50 border-primary/40 text-primary" : "text-neutral-500 bg-neutral-white"
                }`}
              title="Toggle AI Copilot Drawer"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </header>
        
        {/* Top Notification Bar */}
        <div className="bg-primary/5 border-b border-primary/10 px-6 py-2 flex items-center justify-between text-[10px] text-neutral-600 font-sans select-none animate-fade-in z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-success rounded-full animate-ping"></span>
            <span className="font-semibold text-neutral-700">System Live:</span>
            <span>All background matching agents and parsed pipeline queues are active.</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[9px] text-neutral-400">
            <span>Supabase: Connected</span>
            <span className="w-1 h-3 bg-neutral-200"></span>
            <span>Claude AI: Ready</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </div>
      </main>

      <ChatbotPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpen={() => setIsChatOpen(true)}
        currentPage={pathname.substring(1) || "dashboard"}
      />

      {/* Onboarding Tour Tooltips */}
      {activeTutorial && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Backdrop for welcome/finish steps (no targetId) */}
          {!tourSteps[tourStep].targetId && (
            <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs pointer-events-auto" />
          )}

          {/* Highlight target element (dim surrounding area without blur) */}
          {tourSteps[tourStep].targetId && (
            <div
              className="fixed border-2 border-primary rounded-sm bg-transparent z-50 transition-all duration-300 pointer-events-none"
              style={{
                boxShadow: "0 0 0 9999px rgba(12, 10, 9, 0.45), 0 0 15px rgba(255,110,48,0.5)",
                ...(() => {
                  const el = document.getElementById(tourSteps[tourStep].targetId);
                  if (!el) return { display: "none" };
                  const rect = el.getBoundingClientRect();
                  return {
                    top: rect.top - 4,
                    left: rect.left - 4,
                    width: rect.width + 8,
                    height: rect.height + 8,
                  };
                })()
              }}
            />
          )}

          {/* Floating Tooltip Card */}
          <div
            className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-5 space-y-4 shadow-xl z-50 transition-all duration-300 absolute pointer-events-auto"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
            }}
          >
            <div className="space-y-1">
              <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary font-mono px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider">
                Workspace Tour • Step {tourStep + 1} of {tourSteps.length}
              </span>
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider pt-1">
                {tourSteps[tourStep].title}
              </h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                {tourSteps[tourStep].content}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-neutral-100 text-xs">
              <button
                onClick={handleSkipTutorial}
                className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer font-medium uppercase text-[10px] tracking-wider"
              >
                Skip Tour
              </button>
              <div className="flex gap-2">
                {tourStep > 0 && (
                  <button
                    onClick={() => setTourStep(prev => prev - 1)}
                    className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-600 cursor-pointer font-medium text-[10px] tracking-wider uppercase"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNextStep}
                  className="px-3.5 py-1 bg-primary hover:bg-primary/95 text-neutral-white rounded-sm cursor-pointer font-semibold text-[10px] tracking-wider uppercase"
                >
                  {tourStep === tourSteps.length - 1 ? "Get Started" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Workspace Confirmation Modal */}
      {isExitConfirmOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-6 space-y-4 shadow-xl text-neutral-700">
            <div className="space-y-1">
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider">Exit Workspace?</h3>
              <p className="text-neutral-450 text-xs">Are you sure you want to exit your active workspace? You will be signed out of your account.</p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setIsExitConfirmOpen(false)}
                className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer font-medium uppercase text-[10px] tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExitConfirmOpen(false);
                  logout();
                }}
                className="px-4 py-1.5 bg-error text-neutral-white font-medium hover:bg-error/95 rounded-sm cursor-pointer flex items-center gap-1.5 text-[10px] tracking-wider uppercase"
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Tutorial Progress & Resume Banner */}
      {!activeTutorial && pathname !== "/welcome" && profile?.is_onboarded && !isBannerDismissed && (() => {
        const isCompleted = localStorage.getItem("kozker_tutorial_completed") === "true";
        if (isCompleted) return null;

        const savedStepStr = localStorage.getItem("kozker_tutorial_step");
        const savedStep = savedStepStr ? parseInt(savedStepStr, 10) : 0;
        const progressPercent = Math.round((savedStep / (tourSteps.length - 1)) * 100);

        return (
          <div className="fixed bottom-24 right-6 bg-neutral-900 border border-neutral-800 text-neutral-100 p-4 rounded-sm shadow-2xl max-w-sm w-full z-45 flex flex-col gap-3.5 select-none font-sans text-xs">
            <div className="flex justify-between items-start gap-2">
              <div className="flex gap-2.5 items-start">
                <div className="p-1.5 bg-primary/10 rounded-sm text-primary">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-white">
                    Walkthrough Progress
                  </h4>
                  <p className="text-neutral-400 text-[10px] leading-relaxed">
                    Resume the interactive walkthrough to learn all features and workflows of Kozker.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBannerDismissed(true)}
                className="text-neutral-500 hover:text-neutral-350 cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                <span>Progress: {progressPercent}%</span>
                <span>Step {savedStep + 1} of {tourSteps.length}</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => {
                  localStorage.setItem("kozker_tutorial_completed", "true");
                  localStorage.removeItem("kozker_tutorial_step");
                  localStorage.removeItem("kozker_tutorial_skipped");
                  setIsBannerDismissed(true);
                }}
                className="px-2.5 py-1 border border-neutral-800 hover:bg-neutral-800 text-neutral-450 hover:text-neutral-350 rounded-sm font-mono text-[9px] uppercase tracking-wider cursor-pointer"
              >
                Don't show again
              </button>
              <button
                onClick={handleResumeTutorial}
                className="px-3 py-1 bg-primary hover:bg-primary/95 text-neutral-white rounded-sm font-semibold uppercase tracking-wider text-[9px] cursor-pointer"
              >
                Resume Walkthrough
              </button>
            </div>
          </div>
        );
      })()}

      {/* Toast Notifications Container Overlay */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
        {toasts.map((toast) => {
          let ToastIcon = Bell;
          let iconColor = "text-neutral-500 bg-neutral-100 border-neutral-200";
          if (toast.type === "job_generation") {
            ToastIcon = Briefcase;
            iconColor = "text-indigo-600 bg-indigo-50 border-indigo-100";
          } else if (toast.type === "candidate_matching") {
            ToastIcon = Sparkles;
            iconColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
          } else if (toast.type === "upload") {
            ToastIcon = Upload;
            iconColor = "text-blue-600 bg-blue-50 border-blue-100";
          } else if (toast.type === "error") {
            ToastIcon = AlertCircle;
            iconColor = "text-rose-600 bg-rose-50 border-rose-100";
          } else if (toast.type === "screening_questions") {
            ToastIcon = Layers;
            iconColor = "text-amber-600 bg-amber-50 border-amber-100";
          }

          return (
            <div
              key={toast.id}
              onClick={() => handleToastClick(toast)}
              className="pointer-events-auto cursor-pointer bg-white/90 backdrop-blur-md border border-neutral-200 shadow-md rounded-sm p-3.5 flex gap-3 text-xs text-neutral-800 transition-all duration-300 hover:bg-neutral-50 hover:shadow-lg animate-slide-in relative font-sans group"
            >
              <div className={`w-8 h-8 rounded-sm border flex items-center justify-center shrink-0 ${iconColor}`}>
                <ToastIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5 pr-4">
                <p className="font-bold text-[11px] leading-tight text-neutral-900 group-hover:text-primary transition-colors flex items-center gap-1.5">
                  {toast.title}
                </p>
                <p className="text-neutral-500 text-[10px] leading-snug">{toast.message}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="absolute right-2 top-2 text-neutral-450 hover:text-neutral-700 cursor-pointer p-0.5 rounded-xs hover:bg-neutral-100 transition-colors"
                title="Dismiss alert"
                aria-label="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
