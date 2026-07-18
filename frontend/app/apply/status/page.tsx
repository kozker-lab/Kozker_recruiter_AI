"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Lock, Mail, Key, ShieldCheck, ArrowRight, Loader2, 
  MessageSquare, Send, CheckCircle2, AlertCircle, Calendar, 
  Clock, Check, Building2, User, ChevronRight, RefreshCw, X,
  Sun, Moon, HelpCircle, Search, Filter
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface Message {
  id: string;
  sender: "candidate" | "recruiter" | "ai";
  source: "apply_form" | "tracking_portal";
  query_text: string;
  ai_response?: string;
  created_at: string;
}

function ApplicationStatusContent() {
  const searchParams = useSearchParams();
  
  // Theme Mode State
  const [isDarkMode, setIsDarkMode] = useState(true);
  useEffect(() => {
    const savedMode = localStorage.getItem("kozker_cand_status_mode") || "dark";
    setIsDarkMode(savedMode === "dark");
  }, []);
  
  const toggleThemeMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    localStorage.setItem("kozker_cand_status_mode", nextMode ? "dark" : "light");
  };

  // Mobile Placard State
  const [showMobilePlacard, setShowMobilePlacard] = useState(true);
  useEffect(() => {
    const savedPlacard = localStorage.getItem("kozker_mobile_placard_hidden");
    if (savedPlacard === "true") {
      setShowMobilePlacard(false);
    }
  }, []);

  const hideMobilePlacard = () => {
    setShowMobilePlacard(false);
    localStorage.setItem("kozker_mobile_placard_hidden", "true");
  };

  // Q&A Helpdesk Tab & Public Corpus State
  const [activeQnaTab, setActiveQnaTab] = useState<"ask" | "corpus">("ask");
  const [publicQueries, setPublicQueries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingPublicQueries, setIsLoadingPublicQueries] = useState(false);

  // Login State
  const [emailInput, setEmailInput] = useState("");
  const [appIdInput, setAppIdInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  
  // Session State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");
  const [sessionAppId, setSessionAppId] = useState("");
  
  // Data State
  const [appDetails, setAppDetails] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // New Message State
  const [newMessageText, setNewMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-login if query params exist
  useEffect(() => {
    if (searchParams) {
      const email = searchParams.get("email");
      const appId = searchParams.get("appId");
      if (email && appId) {
        setEmailInput(email);
        setAppIdInput(appId);
        handleLogin(email, appId);
      }
    }
  }, [searchParams]);

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Periodic polling for status and messages
  useEffect(() => {
    if (!isAuthenticated || !sessionEmail || !sessionAppId) return;

    const interval = setInterval(() => {
      fetchStatusAndMessages(sessionEmail, sessionAppId, false);
    }, 4500);

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionEmail, sessionAppId]);

  // Load public resolved queries for this job when authenticated or tab switches to corpus
  useEffect(() => {
    if (!isAuthenticated || !appDetails?.job?.id) return;
    const fetchPublicQueries = async () => {
      setIsLoadingPublicQueries(true);
      try {
        const res = await apiRequest<any[]>("GET", `/jobs/${appDetails.job.id}/queries/public`);
        setPublicQueries(res || []);
      } catch (err) {
        console.error("Failed to load public resolved queries:", err);
      } finally {
        setIsLoadingPublicQueries(false);
      }
    };
    fetchPublicQueries();
  }, [isAuthenticated, appDetails?.job?.id, activeQnaTab]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    handleLogin(emailInput.trim(), appIdInput.trim());
  };

  const handleLogin = async (email: string, appId: string) => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetchStatusAndMessages(email, appId, true);
      // Persist authenticated state in memory
      setSessionEmail(email);
      setSessionAppId(res?.application?.id || appId);
      setIsAuthenticated(true);
    } catch (err: any) {
      setVerifyError(err.message || "Invalid Email or Application ID. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const fetchStatusAndMessages = async (email: string, appId: string, showLoader: boolean) => {
    if (showLoader) setIsLoadingDetails(true);
    try {
      const res = await apiRequest<any>("POST", "/applications/verify-status", {
        email,
        application_id: appId
      });
      setAppDetails(res);
      setMessages(res.messages || []);
      return res;
    } catch (err) {
      throw err;
    } finally {
      if (showLoader) setIsLoadingDetails(false);
    }
  };

  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || isSendingMessage || !sessionAppId) return;
    
    setIsSendingMessage(true);
    setMessageError(null);
    const msgToSend = newMessageText.trim();
    
    try {
      // Optimitistic message insertion
      const mockMsg = {
        id: "temp-" + Date.now(),
        sender: "candidate",
        source: "tracking_portal",
        query_text: msgToSend,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, mockMsg]);
      setNewMessageText("");

      await apiRequest("POST", `/applications/${sessionAppId}/messages`, {
        message_text: msgToSend
      });
      
      // Refresh messages list
      fetchStatusAndMessages(sessionEmail, sessionAppId, false);
    } catch (err: any) {
      setMessageError(err.message || "Failed to send message.");
      // Rollback optimistic update on error
      fetchStatusAndMessages(sessionEmail, sessionAppId, false);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSessionEmail("");
    setSessionAppId("");
    setAppDetails(null);
    setMessages([]);
    setEmailInput("");
    setAppIdInput("");
  };

  

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center font-sans p-6 transition-colors duration-250 ${
        isDarkMode ? "bg-stone-950 text-stone-100" : "bg-stone-50 text-stone-900"
      }`}>
        {/* Floating Theme Toggle (Top Right) */}
        <div className="absolute top-6 right-6">
          <button
            onClick={toggleThemeMode}
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              isDarkMode 
                ? "border-stone-850 text-stone-400 hover:text-stone-200 hover:bg-stone-900" 
                : "border-stone-250 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className={`max-w-md w-full border rounded-sm p-8 space-y-6 shadow-2xl relative overflow-hidden transition-all ${
          isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"
        }`}>
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-indigo-500" />
          
          <div className="text-center space-y-2">
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center mx-auto mb-1 transition-all ${
              isDarkMode ? "bg-stone-800 border-stone-700 text-teal-400" : "bg-stone-100 border-stone-200 text-teal-600"
            }`}>
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className={`font-tight font-black text-lg uppercase tracking-wider ${
              isDarkMode ? "text-teal-400" : "text-teal-600"
            }`}>
              Track Application Status
            </h2>
            <p className={`text-[11px] uppercase tracking-wide leading-relaxed ${
              isDarkMode ? "text-stone-400" : "text-stone-500"
            }`}>
              Kozker Automated Candidate Verification
            </p>
          </div>

          {/* Mobile Placard inside card container for mobile responsiveness awareness */}
          {showMobilePlacard && (
            <div className={`p-3 rounded-sm border flex items-center justify-between text-[10.5px] leading-relaxed transition-all ${
              isDarkMode 
                ? "bg-teal-955/20 border-teal-900/30 text-teal-450" 
                : "bg-teal-50 border-teal-200 text-teal-800"
            }`}>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold font-mono uppercase tracking-wide mr-1">[Mobile Ready]</span>
                  Optimized for access on all smartphones and tablets.
                </div>
              </div>
              <button 
                onClick={hideMobilePlacard} 
                className="p-0.5 rounded-sm hover:bg-teal-500/10 cursor-pointer text-current shrink-0 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                isDarkMode ? "text-stone-400" : "text-stone-500"
              }`}>
                Registered Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className={`w-full pl-9 pr-4 py-2 border rounded-sm text-xs transition-colors focus:outline-none ${
                    isDarkMode 
                      ? "border-stone-800 bg-stone-950 text-stone-100 placeholder:text-stone-750 focus:border-teal-500" 
                      : "border-stone-250 bg-white text-stone-900 placeholder:text-stone-405 focus:border-teal-500"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                isDarkMode ? "text-stone-400" : "text-stone-500"
              }`}>
                Application ID (Optional if process completed)
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  placeholder="e.g., abc-123-xyz-456"
                  className={`w-full pl-9 pr-4 py-2 border rounded-sm text-xs font-mono transition-colors focus:outline-none ${
                    isDarkMode 
                      ? "border-stone-800 bg-stone-955 text-stone-100 placeholder:text-stone-750 focus:border-teal-500" 
                      : "border-stone-250 bg-white text-stone-900 placeholder:text-stone-405 focus:border-teal-500"
                  }`}
                />
              </div>
            </div>

            {verifyError && (
              <div className="p-3 bg-red-955/10 border border-red-900/30 rounded-sm flex items-start gap-2 text-[11px] text-red-500 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className={`w-full py-2.5 font-mono font-bold text-xs uppercase tracking-wider rounded-sm shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2 ${
                isDarkMode
                  ? "bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 text-stone-950"
                  : "bg-teal-600 hover:bg-teal-700 disabled:bg-teal-805 text-white"
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying ID...
                </>
              ) : (
                <>
                  Enter Tracking Board
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          
          <div className="pt-2 text-center">
            <span className={`text-[9px] font-mono uppercase tracking-widest block ${
              isDarkMode ? "text-stone-600" : "text-stone-400"
            }`}>
              Protected by Kozker Secure Gateway
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingDetails && !appDetails) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans p-6 select-none transition-colors duration-250 ${
        isDarkMode ? "bg-stone-950 text-stone-100" : "bg-stone-50 text-stone-900"
      }`}>
        <div className="text-center space-y-3">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isDarkMode ? "text-teal-400" : "text-teal-605"}`} />
          <p className={`font-mono text-xs uppercase tracking-wider animate-pulse ${
            isDarkMode ? "text-stone-500" : "text-stone-400"
          }`}>
            Decrypting Application Session Parameters...
          </p>
        </div>
      </div>
    );
  }

  const job = appDetails?.job || {};
  const app = appDetails?.application || {};
  const cand = appDetails?.candidate || {};

  // Define recruitment workflow stages dynamically based on custom stages
  const getJobStagesList = () => {
    const viewSettings = job.candidate_view_settings || {};
    const custom = job.custom_stages || [];
    if (custom.length > 0) {
      const list = [];
      if (viewSettings.screening !== false) {
        list.push({ key: "screening", label: "Screening", desc: "AI Credential Assessment" });
      }
      custom.forEach((stgKey: string) => {
        const lowerKey = stgKey.toLowerCase().replace(/\s+/g, "_");
        if (viewSettings[lowerKey] === true) {
          if (lowerKey === "technical") {
            list.push({ key: stgKey, label: "Technical Test", desc: "Coding & Assessment Review" });
          } else if (lowerKey === "hr") {
            list.push({ key: stgKey, label: "HR Interview", desc: "Cultural Fit Discussion" });
          } else if (lowerKey === "final") {
            list.push({ key: stgKey, label: "Final Decision", desc: "Hiring Team Evaluation" });
          } else {
            list.push({ 
              key: stgKey, 
              label: stgKey, 
              desc: "Custom Evaluation Round" 
            });
          }
        }
      });
      return list;
    }
    const defaultStages = [
      { key: "screening", label: "Screening", desc: "AI Credential Assessment" },
      { key: "technical", label: "Technical Test", desc: "Coding & Assessment Review" },
      { key: "hr", label: "HR Interview", desc: "Cultural Fit Discussion" },
      { key: "final", label: "Final Decision", desc: "Hiring Team Evaluation" }
    ];
    return defaultStages.filter(s => viewSettings[s.key] === true || (s.key === "screening" && viewSettings.screening !== false));
  };

  const stages = getJobStagesList();

  const getStageIndex = (currentStage: string) => {
    if (!currentStage) return 0;
    const idx = stages.findIndex(s => s.key.toLowerCase() === currentStage.toLowerCase());
    if (idx !== -1) return idx;
    if (currentStage.toLowerCase() === "hired" || currentStage.toLowerCase() === "rejected") return stages.length;
    return 0;
  };

  const currentStageIdx = getStageIndex(app.stage);
  const isRejected = app.screening_status === "rejected" || app.stage === "rejected" || app.stage_status === "failed";
  const isHired = app.stage === "hired";

  const pendingQuery = messages.find(m => m.sender === "candidate" && !m.is_resolved);
  const hasPendingQuery = !!pendingQuery;

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-250 ${
      isDarkMode ? "bg-stone-950 text-stone-100" : "bg-stone-50 text-stone-900"
    }`}>
      {/* Header Panel */}
      <header className={`px-6 py-4 border-b backdrop-blur-md flex items-center justify-between sticky top-0 z-50 transition-all ${
        isDarkMode ? "border-stone-900 bg-stone-900/50" : "border-stone-200 bg-white/85 shadow-xs"
      }`}>
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 text-white w-7 h-7 rounded flex items-center justify-center font-black shadow-md shadow-teal-500/10">
            TS
          </div>
          <div>
            <h2 className="font-tight font-black text-xs uppercase tracking-wider">
              Kozker Application Portal
            </h2>
            <p className={`text-[9px] font-mono uppercase tracking-wider ${
              isDarkMode ? "text-teal-400" : "text-teal-650"
            }`}>
              Secure Live Tracking Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className={`text-[9px] font-mono uppercase block ${isDarkMode ? "text-stone-500" : "text-stone-405"}`}>Candidate</span>
            <span className={`text-xs font-semibold ${isDarkMode ? "text-stone-300" : "text-stone-700"}`}>{cand.full_name}</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleThemeMode}
            className={`p-1.5 rounded-full border transition-all cursor-pointer ${
              isDarkMode 
                ? "border-stone-805 text-stone-400 hover:text-stone-200 hover:bg-stone-850" 
                : "border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleLogout}
            className={`px-3 py-1.5 border font-mono text-[9px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-all flex items-center gap-1 ${
              isDarkMode 
                ? "border-stone-805 text-stone-400 hover:text-stone-200 hover:bg-stone-850" 
                : "border-stone-200 text-stone-600 hover:text-stone-800 hover:bg-stone-100"
            }`}
          >
            <X className="w-3.5 h-3.5" />
            Exit Portal
          </button>
        </div>
      </header>

      {/* Main Grid Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-4">
        
        {/* Mobile Compatibility Placard */}
        {showMobilePlacard && (
          <div className={`p-4 rounded-sm border flex items-center justify-between text-xs transition-all ${
            isDarkMode 
              ? "bg-teal-955/20 border-teal-900/30 text-teal-450" 
              : "bg-teal-50 border-teal-200 text-teal-800"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded shrink-0 ${isDarkMode ? "bg-teal-900/30 text-teal-300" : "bg-teal-100 text-teal-700"}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold font-mono uppercase tracking-wide mr-1.5">[Mobile Optimized]</span>
                This tracking board is designed to be fully compatible and optimized for mobile interfaces.
              </div>
            </div>
            <button 
              onClick={hideMobilePlacard} 
              className="p-1 rounded-sm cursor-pointer text-current shrink-0 hover:bg-teal-500/10 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Progress Stepper & Info Card */}
          <section className="lg:col-span-2 space-y-6 flex flex-col">
            {/* Job Overview */}
            <div className={`p-6 rounded-sm space-y-4 border transition-all duration-250 ${
              isDarkMode ? "bg-stone-900 border-stone-800 text-stone-100" : "bg-white border-stone-200 text-stone-900 shadow-sm"
            }`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                    isDarkMode 
                      ? "text-teal-450 bg-teal-955/20 border-teal-900/30" 
                      : "text-teal-700 bg-teal-50 border-teal-200"
                  }`}>
                    Active Application
                  </span>
                  <h1 className="text-lg font-bold font-tight uppercase tracking-wide mt-1.5">
                    {job.title}
                  </h1>
                  <div className={`flex items-center gap-2 text-xs mt-1 ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{job.client_name}</span>
                    <span className="text-stone-605">•</span>
                    <span>{job.department}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="text-right">
                  <span className={`text-[9px] font-mono uppercase block ${isDarkMode ? "text-stone-500" : "text-stone-400"}`}>Current Status</span>
                  <span className={`inline-block text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-sm border mt-1 ${
                    isRejected 
                      ? "bg-red-955/40 border-red-900/50 text-red-400" 
                      : isHired
                      ? "bg-emerald-955/40 border-emerald-900/50 text-emerald-400"
                      : "bg-teal-955/40 border-teal-900/50 text-teal-400"
                  }`}>
                    {isRejected ? "Declined" : isHired ? "Offer Accepted" : `Active: ${app.stage}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className={`p-6 rounded-sm space-y-6 flex-1 border transition-all duration-250 ${
              isDarkMode ? "bg-stone-900 border-stone-800 text-stone-100" : "bg-white border-stone-200 text-stone-900 shadow-sm"
            }`}>
              <h3 className={`text-[10px] font-mono font-bold uppercase tracking-wider border-b pb-2 ${
                isDarkMode ? "text-stone-400 border-stone-850" : "text-stone-500 border-stone-200"
              }`}>
                Recruitment Stage Tracker
              </h3>

              {isRejected ? (
                <div className={`p-4 border rounded-sm flex items-start gap-3 transition-all ${
                  isDarkMode ? "bg-red-955/20 border-red-900/40 text-red-450" : "bg-red-55 border-red-200 text-red-800"
                }`}>
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider">Application Status: Closed</h4>
                    <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-stone-400" : "text-stone-605"}`}>
                      Thank you for taking the time to apply and meet with us. At this time, the hiring team has decided to focus on other candidates for this specific mandate. We will retain your profile details in our talent workspace for relevant opportunities in the future.
                    </p>
                  </div>
                </div>
              ) : isHired ? (
                <div className={`p-4 border rounded-sm flex items-start gap-3 transition-all ${
                  isDarkMode ? "bg-emerald-955/20 border-emerald-900/40 text-emerald-450" : "bg-emerald-55 border-emerald-250 text-emerald-850"
                }`}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-505 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider">Congratulations! Hired</h4>
                    <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-stone-400" : "text-stone-605"}`}>
                      We are thrilled to officially welcome you to the team! Your assessment rounds have successfully completed and the hiring manager has extended an offer. Please review your email inbox for official onboarding parameters and contract documentation.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Stepper Items */}
              <div className={`relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] ${
                isDarkMode ? "before:bg-stone-800" : "before:bg-stone-200"
              }`}>
                {stages.map((stage, idx) => {
                  const isFailedStage = isRejected && (
                    (app.stage === "rejected" || app.stage_status === "failed") 
                      ? idx === currentStageIdx 
                      : (app.screening_status === "rejected" ? idx === 0 : false)
                  );
                  const isCompleted = idx < currentStageIdx && !isFailedStage;
                  const isActive = idx === currentStageIdx && !isRejected && !isHired;
                  
                  return (
                    <div key={stage.key} className="relative flex gap-4 transition-all">
                      {/* Circle Node */}
                      <div className={`absolute -left-[26px] w-5 h-5 rounded-full flex items-center justify-center border transition-all z-10 ${
                        isCompleted 
                          ? (isDarkMode ? "bg-teal-600 border-teal-600 text-stone-950" : "bg-teal-600 border-teal-650 text-white")
                          : isActive 
                          ? (isDarkMode ? "bg-stone-955 border-teal-500 text-teal-400 shadow-md shadow-teal-500/20 scale-110" : "bg-white border-teal-650 text-teal-655 shadow-md shadow-teal-550/20 scale-110") 
                          : isFailedStage
                          ? (isDarkMode ? "bg-red-950/40 border-red-500 text-red-400 shadow-md shadow-red-500/10 scale-110" : "bg-red-50 border-red-500 text-red-600 shadow-md shadow-red-500/10 scale-110")
                          : (isDarkMode ? "bg-stone-900 border-stone-800 text-stone-605" : "bg-white border-stone-200 text-stone-400")
                      }`}>
                        {isCompleted ? (
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        ) : isFailedStage ? (
                          <X className="w-3 h-3 stroke-[3.5]" />
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            isActive 
                              ? (isDarkMode ? "bg-teal-450 animate-pulse" : "bg-teal-555 animate-pulse") 
                              : (isDarkMode ? "bg-stone-800" : "bg-stone-250")
                          }`} />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                          isCompleted 
                            ? (isDarkMode ? "text-stone-300" : "text-stone-700") 
                            : isActive 
                            ? (isDarkMode ? "text-teal-400" : "text-teal-650") 
                            : isFailedStage
                            ? "text-red-500"
                            : "text-stone-500"
                        }`}>
                          {stage.label}
                        </h4>
                        <p className={`text-[11px] font-medium leading-relaxed ${isDarkMode ? "text-stone-550" : "text-stone-500"}`}>
                          {stage.desc}
                        </p>
                        {isActive && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-mono border px-2 py-0.5 rounded-sm mt-1 animate-pulse ${
                            isDarkMode 
                              ? "text-teal-455 bg-teal-955/20 border-teal-900/30" 
                              : "text-teal-700 bg-teal-50 border-teal-200"
                          }`}>
                            <Clock className="w-3 h-3" />
                            Current Stage Status: {app.stage_status || "in_progress"}
                          </span>
                        )}
                        {isFailedStage && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-mono border px-2 py-0.5 rounded-sm mt-1 ${
                            isDarkMode 
                              ? "text-red-400 bg-red-955/15 border-red-900/30" 
                              : "text-red-700 bg-red-50 border-red-200"
                          }`}>
                            <X className="w-3 h-3" />
                            Current Stage Status: {app.stage_status === "failed" ? "Failed / Rejected" : "Rejected"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Right Column: Q&A Helpdesk */}
          <section className={`border rounded-sm flex flex-col shadow-xl h-[620px] lg:h-auto overflow-hidden transition-all duration-250 ${
            isDarkMode 
              ? "bg-stone-900 border-stone-800 text-stone-100" 
              : "bg-white border-stone-200 text-stone-900"
          }`}>
            {/* Helpdesk Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between transition-all ${
              isDarkMode ? "bg-stone-900 border-stone-850" : "bg-stone-50 border-stone-150"
            }`}>
              <div className="flex items-center gap-2">
                <HelpCircle className={`w-4 h-4 ${isDarkMode ? "text-teal-400" : "text-teal-600"}`} />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
                  Q&A Helpdesk
                </h3>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${
                hasPendingQuery 
                  ? (isDarkMode ? "bg-amber-400 animate-pulse" : "bg-amber-500 animate-pulse") 
                  : (isDarkMode ? "bg-teal-400 animate-pulse" : "bg-teal-500 animate-pulse")
              }`} />
            </div>

            {/* Tabs Selector */}
            <div className={`flex border-b text-[10px] font-mono font-bold uppercase tracking-wider ${
              isDarkMode ? "border-stone-850 bg-stone-950/20" : "border-stone-150 bg-stone-100/50"
            }`}>
              <button
                onClick={() => setActiveQnaTab("ask")}
                className={`flex-1 py-2.5 text-center border-r cursor-pointer transition-all ${
                  activeQnaTab === "ask"
                    ? (isDarkMode ? "bg-stone-800 text-teal-450 border-b-2 border-b-teal-500 border-r-stone-850" : "bg-white text-teal-650 border-b-2 border-b-teal-600 border-r-stone-150")
                    : (isDarkMode ? "text-stone-500 hover:text-stone-300 border-r-stone-850" : "text-stone-500 hover:text-stone-700 border-r-stone-150")
                }`}
              >
                Ask & My Queries
              </button>
              <button
                onClick={() => setActiveQnaTab("corpus")}
                className={`flex-1 py-2.5 text-center cursor-pointer transition-all ${
                  activeQnaTab === "corpus"
                    ? (isDarkMode ? "bg-stone-800 text-teal-450 border-b-2 border-b-teal-500" : "bg-white text-teal-650 border-b-2 border-b-teal-600")
                    : (isDarkMode ? "text-stone-500 hover:text-stone-300" : "text-stone-500 hover:text-stone-700")
                }`}
              >
                Q&A Corpus / FAQs
              </button>
            </div>

            {/* Tab Contents */}
            <div className={`flex-1 p-4 overflow-y-auto space-y-4 transition-all scrollbar-thin ${
              isDarkMode ? "bg-stone-950/45" : "bg-stone-50/50"
            }`}>
              {activeQnaTab === "ask" ? (
                <div className="space-y-4">
                  {/* If there is a pending query */}
                  {hasPendingQuery ? (
                    <div className={`p-4 rounded-sm border space-y-3 transition-all ${
                      isDarkMode 
                        ? "bg-amber-955/15 border-amber-900/40 text-amber-400" 
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
                        <span className="font-bold text-xs uppercase tracking-wide">Query Pending Response</span>
                      </div>
                      <div className={`p-3 rounded-sm text-xs leading-relaxed transition-all ${
                        isDarkMode ? "bg-stone-900/80 text-stone-305 border border-stone-850" : "bg-white text-stone-700 border border-stone-200"
                      }`}>
                        {pendingQuery.query_text}
                      </div>
                      <p className="text-[10px] leading-relaxed italic">
                        The recruiter has been notified of your query. You will be able to submit a new question as soon as this is resolved.
                      </p>
                    </div>
                  ) : (
                    /* Ask Query Form */
                    <div className={`p-4 rounded-sm border space-y-3 transition-all ${
                      isDarkMode ? "bg-stone-900/40 border-stone-800/80" : "bg-white border-stone-200 shadow-xs"
                    }`}>
                      <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider">Ask a New Query</h4>
                      <form onSubmit={handleSendMessageSubmit} className="space-y-3">
                        <textarea
                          required
                          rows={3}
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          placeholder="Type your question about schedule, requirements, location, etc..."
                          disabled={isSendingMessage}
                          className={`w-full p-2.5 text-xs rounded-sm transition-all focus:outline-none ${
                            isDarkMode 
                              ? "bg-stone-950 border border-stone-800 text-stone-105 placeholder:text-stone-700 focus:border-teal-500" 
                              : "bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-teal-500"
                          }`}
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isSendingMessage || !newMessageText.trim()}
                            className={`px-4 py-2 font-mono font-bold text-xs uppercase tracking-wider rounded-sm shadow-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                              isDarkMode
                                ? "bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 text-stone-950"
                                : "bg-teal-600 hover:bg-teal-700 disabled:bg-teal-805 text-white"
                            }`}
                          >
                            {isSendingMessage ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                Submit Query
                                <Send className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                      {messageError && (
                        <span className="text-[10px] text-red-550 block italic">
                          {messageError}
                        </span>
                      )}
                    </div>
                  )}

                  {/* My Previous Queries List */}
                  <div className="space-y-3 pt-2">
                    <h4 className={`text-[10px] font-mono font-bold uppercase tracking-wider border-b pb-2 ${
                      isDarkMode ? "text-stone-400 border-stone-850" : "text-stone-500 border-stone-200"
                    }`}>
                      My Queries History
                    </h4>
                    
                    {messages.filter(m => m.sender === "candidate").length === 0 ? (
                      <p className="text-[10px] text-stone-500 italic text-center py-4">No queries submitted yet.</p>
                    ) : (
                      messages
                        .filter(m => m.sender === "candidate")
                        .slice()
                        .reverse()
                        .map((msg) => {
                          const isAnswered = msg.is_resolved || !!msg.ai_response;
                          return (
                            <div 
                              key={msg.id} 
                              className={`p-3 rounded-sm border text-[11px] space-y-2 transition-all ${
                                isDarkMode 
                                  ? "bg-stone-900 border-stone-800 text-stone-300" 
                                  : "bg-white border-stone-200 text-stone-800 shadow-xs"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className={`text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm border ${
                                  isAnswered 
                                    ? (isDarkMode ? "bg-teal-955/40 border-teal-900/40 text-teal-400" : "bg-teal-50 border-teal-200 text-teal-800")
                                    : (isDarkMode ? "bg-amber-955/40 border-amber-900/40 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-850")
                                }`}>
                                  {isAnswered ? "Answered" : "Pending"}
                                </span>
                                <span className="text-[8.5px] font-mono text-stone-550">
                                  {new Date(msg.created_at).toLocaleDateString()} at {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div className="font-semibold">{msg.query_text}</div>

                              {isAnswered && (
                                <div className={`mt-2 p-2.5 rounded-sm border text-[11px] leading-relaxed transition-all ${
                                  isDarkMode 
                                    ? "bg-stone-950 border-stone-850 text-stone-400" 
                                    : "bg-stone-50 border-stone-150 text-stone-605"
                                }`}>
                                  <span className="font-mono text-[9px] uppercase font-bold text-teal-650 block mb-1">Response:</span>
                                  {msg.ai_response || "Query has been marked resolved."}
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              ) : (
                /* Q&A Corpus / FAQs Tab */
                <div className="space-y-4">
                  {/* Search bar */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search FAQs..."
                        className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-sm transition-all focus:outline-none ${
                          isDarkMode 
                            ? "bg-stone-950 border border-stone-800 text-stone-105 placeholder:text-stone-700 focus:border-teal-500" 
                            : "bg-white border border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-teal-500"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Corpus Queries List */}
                  {isLoadingPublicQueries ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-2">
                      <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                      <span className="text-[10px] font-mono text-stone-500 uppercase animate-pulse">Loading FAQs...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {publicQueries.filter(q => {
                        if (!searchQuery.trim()) return true;
                        const queryText = (q.query_text || "").toLowerCase();
                        const responseText = (q.ai_response || "").toLowerCase();
                        const matchTerm = searchQuery.toLowerCase();
                        return queryText.includes(matchTerm) || responseText.includes(matchTerm);
                      }).length === 0 ? (
                        <div className="text-center py-6 space-y-2">
                          <HelpCircle className="w-8 h-8 mx-auto text-stone-600 opacity-20" />
                          <p className="text-[10px] text-stone-500 italic">No similar resolved queries found.</p>
                        </div>
                      ) : (
                        publicQueries
                          .filter(q => {
                            if (!searchQuery.trim()) return true;
                            const queryText = (q.query_text || "").toLowerCase();
                            const responseText = (q.ai_response || "").toLowerCase();
                            const matchTerm = searchQuery.toLowerCase();
                            return queryText.includes(matchTerm) || responseText.includes(matchTerm);
                          })
                          .map((q, idx) => (
                            <div 
                              key={idx} 
                              className={`p-3 rounded-sm border text-[11px] space-y-2 transition-all ${
                                isDarkMode 
                                  ? "bg-stone-900 border-stone-800 text-stone-300" 
                                  : "bg-white border-stone-200 text-stone-850 shadow-xs"
                              }`}
                            >
                              <div className="font-semibold text-[11px]">{q.query_text}</div>
                              <div className={`p-2.5 rounded-sm border text-[11px] leading-relaxed transition-all ${
                                isDarkMode 
                                  ? "bg-stone-950 border-stone-850 text-stone-400" 
                                  : "bg-stone-50 border-stone-150 text-stone-605"
                                }`}>
                                <span className="font-mono text-[9px] uppercase font-bold text-teal-650 block mb-1">Resolved Answer:</span>
                                {q.ai_response}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function ApplicationStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-950 flex items-center justify-center font-sans p-6 text-stone-100 select-none">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto animate-pulse" />
          <p className="text-stone-500 font-mono text-xs uppercase tracking-wider">
            Loading Application Session...
          </p>
        </div>
      </div>
    }>
      <ApplicationStatusContent />
    </Suspense>
  );
}
