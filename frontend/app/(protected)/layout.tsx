"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser, useProfile, useLogout, useUpdateProfile } from "@/lib/hooks/useAuth";
import ChatbotPanel from "@/components/ChatbotPanel";

import { 
  LayoutDashboard, Building2, Briefcase, Users, LogOut, 
  Sparkles, Menu, Shield, User, ChevronRight, MessageSquare, Settings, Upload
} from "lucide-react";

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

  // Onboarding Tour States
  const [activeTutorial, setActiveTutorial] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const tourSteps = [
    {
      title: "Welcome to Kozker Recruiter AI",
      content: `Welcome, ${profile?.full_name || onboardName || "Recruiter"}! Let's take a quick 1-minute tour of your new AI-powered recruiting workspace.`,
      targetId: "",
    },
    {
      title: "Sidebar Navigation",
      content: "This is your control sidebar. You can manage your Clients & Mandate Requirements, check the AI Job Catalog, and review the Candidate Sourcing Pool.",
      targetId: "sidebar-navigation",
      position: "right",
    },
    {
      title: "Clients & Mandate Requirements",
      content: "Register organizational clients and add hiring mandates. You can upload mandate description documents directly to extract requirement details automatically.",
      targetId: "nav-clients",
      position: "right",
    },
    {
      title: "Job Catalog",
      content: "View all AI-generated or manually created job drafts. Manage recruitment pipeline, confirm drafts, adjust skill weights, and run candidate scoring.",
      targetId: "nav-jobs",
      position: "right",
    },
    {
      title: "Sourcing Pool",
      content: "The universal sourcing pool. Review all indexed profiles, perform bulk CSV uploads, and track active client pipeline assignments.",
      targetId: "nav-pool",
      position: "right",
    },
    {
      title: "AI Copilot Command Panel",
      content: "Click this button to open the AI Copilot. It reads the current page context to help you audit resumes and query recruitment stats.",
      targetId: "header-chatbot-toggle",
      position: "left-bottom",
    },
    {
      title: "Ready to Recruit!",
      content: "You're all set! Let's find your next hire.",
      targetId: "",
    }
  ];

  // Check if we should auto-start the tour
  React.useEffect(() => {
    if (profile?.is_onboarded) {
      const showTut = localStorage.getItem("show_kozker_tutorial");
      if (showTut === "true") {
        setActiveTutorial(true);
        setTourStep(0);
      }
    }
  }, [profile]);

  // Bounding rect calculator
  React.useEffect(() => {
    if (!activeTutorial) return;
    const step = tourSteps[tourStep];
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
      }

      // Safety checks
      if (left < 10) left = 10;
      if (left + 350 > window.innerWidth) left = window.innerWidth - 360;
      if (top < 10) top = 10;
      if (top + 200 > window.innerHeight) top = window.innerHeight - 210;

      setTooltipPos({ top, left });
    } else {
      setTooltipPos({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 175,
      });
    }
  }, [tourStep, activeTutorial]);

  const handleSkipTutorial = () => {
    setActiveTutorial(false);
    localStorage.removeItem("show_kozker_tutorial");
  };

  const handleNextStep = () => {
    if (tourStep < tourSteps.length - 1) {
      setTourStep(prev => prev + 1);
    } else {
      setActiveTutorial(false);
      localStorage.removeItem("show_kozker_tutorial");
    }
  };

  const handleOnboard = async () => {
    try {
      await updateProfile.mutateAsync({
        full_name: onboardName,
        is_onboarded: true,
      });
      localStorage.setItem("show_kozker_tutorial", "true");
      setActiveTutorial(true);
      setTourStep(0);
    } catch (err) {
      console.error("Onboarding failed", err);
    }
  };

  const navItems = [
    { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clients", href: "/clients", label: "Clients & Mandates", icon: Building2 },
    { id: "jobs", href: "/jobs", label: "Job Catalog", icon: Briefcase },
    { id: "pool", href: "/pool", label: "Sourcing Pool", icon: Users },
    { id: "settings", href: "/settings", label: "Settings", icon: Settings },
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
                </Link>
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
              <p className="text-[11px] font-semibold text-neutral-800 truncate">{profile.full_name || user?.email}</p>
              <p className="text-[9px] text-neutral-400 font-mono uppercase">{profile.role || "RECRUITER"}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-neutral-200 hover:bg-neutral-150 rounded-sm text-[10px] uppercase font-mono font-bold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-400" />
            Exit Workspace
          </button>
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
            <button
              id="header-chatbot-toggle"
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

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </div>
      </main>

      <ChatbotPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        currentPage={pathname.substring(1) || "dashboard"} 
      />

      {/* Onboarding Tour Tooltips */}
      {activeTutorial && (
        <div className="fixed inset-0 bg-neutral-950/40 z-50 flex items-center justify-center backdrop-blur-xs">
          {/* Highlight target element */}
          {tourSteps[tourStep].targetId && (
            <div 
              className="fixed border-2 border-primary rounded-sm shadow-[0_0_15px_rgba(255,110,48,0.5)] bg-transparent z-50 transition-all duration-300 pointer-events-none"
              style={{
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
            className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-5 space-y-4 shadow-xl z-50 transition-all duration-300 absolute"
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
    </div>
  );
}
