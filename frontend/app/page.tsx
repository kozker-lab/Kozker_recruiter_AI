"use client";

import React, { useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import DashboardView from "@/components/DashboardView";
import ClientsView from "@/components/ClientsView";
import JobsView from "@/components/JobsView";
import PoolView from "@/components/PoolView";
import ReviewWorkspace from "@/components/ReviewWorkspace";
import ChatbotPanel from "@/components/ChatbotPanel";

import { 
  LayoutDashboard, Building2, Briefcase, Users, LogOut, 
  Sparkles, Menu, Shield, User, ChevronRight, MessageSquare 
} from "lucide-react";

export default function Home() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  
  // Chat drawer collapse state
  const [isChatOpen, setIsChatOpen] = useState(true);

  const handleNavigate = (view: string, targetId?: string) => {
    if (view === "jobs" && targetId) {
      setSelectedJobId(targetId);
    } else {
      setSelectedJobId(null);
    }
    setCurrentView(view);
  };

  const handleNavigateToReview = (appId: string) => {
    setSelectedAppId(appId);
    setCurrentView("review");
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clients", label: "Clients & Mandates", icon: Building2 },
    { id: "jobs", label: "Job Catalog", icon: Briefcase },
    { id: "pool", label: "Sourcing Pool", icon: Users },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-800 font-sans selection:bg-primary/20">
      {/* 1. Sidebar Navigation */}
      <aside className="w-64 border-r border-neutral-200 bg-neutral-white flex flex-col justify-between h-full select-none z-30 shadow-xs">
        <div>
          {/* Logo Brand Header */}
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

          {/* Subdomain & Agency Indicator */}
          <div className="mx-4 mt-4 p-3 bg-neutral-50 border border-neutral-150 rounded-sm font-mono text-[10px]">
            <p className="text-neutral-400 font-semibold uppercase tracking-wider">Active Workspace</p>
            <p className="font-bold text-neutral-800 mt-0.5 truncate">{user?.metadata?.agencyName || "Enterprise recruiter"}</p>
            <p className="text-primary font-bold mt-1 text-[9px]">@{user?.metadata?.domainName || "default"}.kozker.ai</p>
          </div>

          {/* Menu Items */}
          <nav className="mt-6 px-3 space-y-1 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || (item.id === "jobs" && currentView === "review");
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm font-medium transition-all cursor-pointer ${
                    isActive 
                      ? "bg-neutral-900 border-neutral-800 text-neutral-white font-semibold" 
                      : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-neutral-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-primary" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Account footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50/50 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-neutral-200 border border-neutral-300 rounded-sm flex items-center justify-center">
              <User className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-neutral-800 truncate">{user?.email}</p>
              <p className="text-[9px] text-neutral-400 font-mono">RECRUITER AGENCY</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-neutral-200 hover:bg-neutral-150 rounded-sm text-[10px] uppercase font-mono font-bold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-400" />
            Exit Workspace
          </button>
        </div>
      </aside>

      {/* 2. Main Scrollable Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-50">
        {/* Header toolbar */}
        <header className="h-14 border-b border-neutral-200 bg-neutral-white flex items-center justify-between px-6 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <Menu className="w-4 h-4 text-neutral-400 lg:hidden cursor-pointer" />
            <h1 className="font-tight font-extrabold text-sm uppercase tracking-wider text-neutral-800 flex items-center gap-1.5 select-none">
              <Shield className="w-4 h-4 text-primary animate-pulse" />
              Recruitment Operations Command Center
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-2 border border-neutral-200 hover:bg-neutral-50 rounded-sm cursor-pointer transition-colors ${
                isChatOpen ? "bg-neutral-50 border-primary/40 text-primary" : "text-neutral-500 bg-neutral-white"
              }`}
              title="Toggle AI Copilot Drawer"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* View Router content area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {currentView === "dashboard" && (
            <DashboardView onNavigate={handleNavigate} />
          )}
          {currentView === "clients" && (
            <ClientsView />
          )}
          {currentView === "jobs" && (
            <JobsView initialJobId={selectedJobId} onNavigateToReview={handleNavigateToReview} />
          )}
          {currentView === "pool" && (
            <PoolView />
          )}
          {currentView === "review" && selectedAppId && (
            <ReviewWorkspace applicationId={selectedAppId} onBack={() => setCurrentView("jobs")} />
          )}
        </div>
      </main>

      {/* 3. Global AI Copilot Sidebar Drawer */}
      <ChatbotPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        currentPage={currentView} 
      />
    </div>
  );
}
