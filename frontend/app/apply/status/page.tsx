"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Lock, Mail, Key, ShieldCheck, ArrowRight, Loader2, 
  MessageSquare, Send, CheckCircle2, AlertCircle, Calendar, 
  Clock, Check, Building2, User, ChevronRight, RefreshCw, X
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

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !appIdInput.trim()) return;
    handleLogin(emailInput.trim(), appIdInput.trim());
  };

  const handleLogin = async (email: string, appId: string) => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      await fetchStatusAndMessages(email, appId, true);
      // Persist authenticated state in memory
      setSessionEmail(email);
      setSessionAppId(appId);
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

  // Define recruitment workflow stages
  const stages = [
    { key: "screening", label: "Screening", desc: "AI Credential Assessment" },
    { key: "technical", label: "Technical Test", desc: "Coding & Assessment Review" },
    { key: "hr", label: "HR Interview", desc: "Cultural Fit Discussion" },
    { key: "final", label: "Final Decision", desc: "Hiring Team Evaluation" }
  ];

  const getStageIndex = (currentStage: string) => {
    const stageMap: Record<string, number> = {
      screening: 0,
      technical: 1,
      hr: 2,
      final: 3,
      hired: 4,
      rejected: 4
    };
    return stageMap[currentStage] ?? 0;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center font-sans p-6 text-stone-100">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-sm p-8 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-indigo-500" />
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center mx-auto mb-1">
              <Lock className="w-5 h-5 text-teal-400 animate-pulse" />
            </div>
            <h2 className="font-tight font-black text-lg uppercase tracking-wider text-teal-400">
              Track Application Status
            </h2>
            <p className="text-stone-400 text-[11px] uppercase tracking-wide leading-relaxed">
              Kozker Automated Candidate Verification
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block">
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
                  className="w-full pl-9 pr-4 py-2 border border-stone-800 bg-stone-950 rounded-sm text-xs text-stone-100 focus:outline-none focus:border-teal-500 placeholder:text-stone-600 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 block">
                Application ID (from confirmation mail)
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  required
                  value={appIdInput}
                  onChange={(e) => setAppIdInput(e.target.value)}
                  placeholder="e.g., abc-123-xyz-456"
                  className="w-full pl-9 pr-4 py-2 border border-stone-800 bg-stone-950 rounded-sm text-xs text-stone-100 focus:outline-none focus:border-teal-500 placeholder:text-stone-600 font-mono transition-colors"
                />
              </div>
            </div>

            {verifyError && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-sm flex items-start gap-2 text-[11px] text-red-400 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 text-stone-100 font-mono font-bold text-xs uppercase tracking-wider rounded-sm shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
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
            <span className="text-[9px] font-mono text-stone-600 uppercase tracking-widest block">
              Protected by Kozker Secure Gateway
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingDetails && !appDetails) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center font-sans p-6 text-stone-100 select-none">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
          <p className="text-stone-500 font-mono text-xs uppercase tracking-wider animate-pulse">
            Decrypting Application Session Parameters...
          </p>
        </div>
      </div>
    );
  }

  const job = appDetails?.job || {};
  const app = appDetails?.application || {};
  const cand = appDetails?.candidate || {};
  const currentStageIdx = getStageIndex(app.stage);
  const isRejected = app.screening_status === "rejected" || app.stage === "rejected";
  const isHired = app.stage === "hired";

  return (
    <div className="min-h-screen bg-stone-950 font-sans flex flex-col text-stone-100">
      {/* Header Panel */}
      <header className="px-6 py-4 border-b border-stone-900 bg-stone-900/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 text-stone-950 w-7 h-7 rounded flex items-center justify-center font-black shadow-md shadow-teal-500/10">
            TS
          </div>
          <div>
            <h2 className="font-tight font-black text-xs uppercase tracking-wider text-stone-100">
              Kozker Application Portal
            </h2>
            <p className="text-[9px] font-mono text-teal-500 uppercase tracking-wider">
              Secure Live Tracking Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-[9px] font-mono text-stone-500 uppercase block">Candidate</span>
            <span className="text-xs font-semibold text-stone-300">{cand.full_name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 border border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-850 font-mono text-[9px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-all flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Exit Portal
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Progress Stepper & Info Card */}
        <section className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Job Overview */}
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-sm space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-teal-500 bg-teal-950/40 border border-teal-900/30 px-2 py-0.5 rounded-sm">
                  Active Application
                </span>
                <h1 className="text-lg font-bold font-tight uppercase text-stone-100 tracking-wide mt-1.5">
                  {job.title}
                </h1>
                <div className="flex items-center gap-2 text-stone-400 text-xs mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{job.client_name}</span>
                  <span className="text-stone-600">•</span>
                  <span>{job.department}</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span className="text-[9px] font-mono text-stone-500 uppercase block">Current Status</span>
                <span className={`inline-block text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-sm border mt-1 ${
                  isRejected 
                    ? "bg-red-950/40 border-red-900/50 text-red-400" 
                    : isHired
                    ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400"
                    : "bg-teal-950/40 border-teal-900/50 text-teal-400"
                }`}>
                  {isRejected ? "Declined" : isHired ? "Offer Accepted" : `Active: ${app.stage}`}
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-sm space-y-6 shadow-xl flex-1">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 border-b border-stone-850 pb-2">
              Recruitment Stage Tracker
            </h3>

            {isRejected ? (
              <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-red-400 uppercase tracking-wider">Application Status: Closed</h4>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Thank you for taking the time to apply and meet with us. At this time, the hiring team has decided to focus on other candidates for this specific mandate. We will retain your profile details in our talent workspace for relevant opportunities in the future.
                  </p>
                </div>
              </div>
            ) : isHired ? (
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-wider">Congratulations! Hired</h4>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    We are thrilled to officially welcome you to the team! Your assessment rounds have successfully completed and the hiring manager has extended an offer. Please review your email inbox for official onboarding parameters and contract documentation.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Stepper Items */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-stone-800">
              {stages.map((stage, idx) => {
                const isCompleted = idx < currentStageIdx;
                const isActive = idx === currentStageIdx && !isRejected && !isHired;
                
                return (
                  <div key={stage.key} className="relative flex gap-4 transition-all">
                    {/* Circle Node */}
                    <div className={`absolute -left-6 w-4.5 h-4.5 rounded-full flex items-center justify-center border transition-all z-10 ${
                      isCompleted 
                        ? "bg-teal-600 border-teal-600 text-stone-950" 
                        : isActive 
                        ? "bg-stone-950 border-teal-500 text-teal-400 shadow-md shadow-teal-500/20 scale-110" 
                        : "bg-stone-900 border-stone-800 text-stone-600"
                    }`}>
                      {isCompleted ? (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-teal-400 animate-pulse" : "bg-stone-800"}`} />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h4 className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                        isCompleted ? "text-stone-300" : isActive ? "text-teal-400" : "text-stone-600"
                      }`}>
                        {stage.label}
                      </h4>
                      <p className="text-stone-500 text-[11px] font-medium leading-relaxed">
                        {stage.desc}
                      </p>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono text-teal-500 bg-teal-950/20 border border-teal-900/30 px-2 py-0.5 rounded-sm mt-1 animate-pulse">
                          <Clock className="w-3 h-3" />
                          Current Stage Status: {app.stage_status || "in_progress"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Messaging Console */}
        <section className="bg-stone-900 border border-stone-800 rounded-sm flex flex-col shadow-xl h-[600px] lg:h-auto overflow-hidden">
          {/* Chat Header */}
          <div className="px-4 py-3 bg-stone-900 border-b border-stone-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-500" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-100">
                Direct Messaging
              </h3>
            </div>
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
          </div>

          {/* Chat List Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-stone-950/45 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-stone-500">
                <MessageSquare className="w-8 h-8 opacity-25 animate-bounce" />
                <p className="font-mono text-[10px] uppercase tracking-wide">No messages exchanged yet</p>
                <p className="text-[10px] leading-relaxed max-w-[200px] italic">
                  Have queries about this mandate? Type your question below to chat directly with the recruiter.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isCandidate = msg.sender === "candidate";
                const isAi = msg.sender === "ai";
                
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] space-y-1 ${
                      isCandidate ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    {/* Meta Label */}
                    <span className="text-[9px] font-mono text-stone-500 uppercase px-1">
                      {isCandidate ? "You" : isAi ? "AI Recruiter Assist" : "Recruiter"}
                      {msg.source === "apply_form" && " (Apply Form)"}
                    </span>

                    {/* Chat Bubble */}
                    <div className={`p-3 rounded-sm border text-[11.5px] leading-relaxed font-medium ${
                      isCandidate 
                        ? "bg-teal-950/50 border-teal-900/50 text-teal-300 rounded-tr-none" 
                        : isAi
                        ? "bg-stone-900 border-stone-800 text-stone-300 rounded-tl-none italic"
                        : "bg-stone-800 border-stone-750 text-stone-200 rounded-tl-none"
                    }`}>
                      {msg.query_text}
                    </div>

                    {/* Inline resolved response for backward compatible view */}
                    {msg.ai_response && (
                      <div className="mt-1 flex flex-col items-start space-y-1 w-full pl-3 border-l-2 border-teal-800/50">
                        <span className="text-[8px] font-mono text-teal-500 uppercase">AI response / Reply</span>
                        <div className="bg-stone-900 border border-stone-800 p-2.5 rounded-sm text-[11px] text-stone-400 w-full">
                          {msg.ai_response}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-[8px] font-mono text-stone-600 uppercase px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form Input */}
          <div className="p-3 bg-stone-900 border-t border-stone-850">
            <form onSubmit={handleSendMessageSubmit} className="flex gap-2">
              <input
                type="text"
                required
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Ask recruiter a question..."
                disabled={isSendingMessage}
                className="flex-1 px-3 py-2 border border-stone-800 bg-stone-950 rounded-sm text-xs text-stone-200 focus:outline-none focus:border-teal-500 placeholder:text-stone-600 transition-colors"
              />
              <button
                type="submit"
                disabled={isSendingMessage || !newMessageText.trim()}
                className="px-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-800 text-stone-950 font-bold rounded-sm flex items-center justify-center transition-colors cursor-pointer"
              >
                {isSendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                ) : (
                  <Send className="w-4 h-4 text-stone-950" />
                )}
              </button>
            </form>
            {messageError && (
              <span className="text-[10px] text-red-400 block mt-1.5 pl-1 italic">
                {messageError}
              </span>
            )}
          </div>
        </section>
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
