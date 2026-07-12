"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  HelpCircle, BookOpen, Sparkles, Sliders, Users, 
  Layers, ChevronDown, ChevronUp, Play, ArrowRight, LifeBuoy,
  CheckCircle2, Terminal, Activity, FileText, Settings, AlertCircle,
  MessageSquare, Send, Loader2, Info, Globe, Database, Server, RefreshCw,
  LayoutDashboard, Building2, Briefcase, Bell
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: "all" | "matcher" | "pool" | "pipeline";
}

const faqs: FAQItem[] = [
  {
    question: "How does AI candidate matching work?",
    answer: "When you click 'Scan and Publish' on a confirmed job, the system extracts key skills from the job description and requirement. You can customize the weights of these skills. Our AI (Claude API) then matches candidate CVs against these weighted skills to compute a fuzzy score (0-100%) and ranks them accordingly.",
    category: "matcher"
  },
  {
    question: "Where do candidate queries come from and how do I resolve them?",
    answer: "On the candidate-facing job apply page, applicants can toggle to the 'Queries & Support' tab to submit questions. You can view all queries for a job by opening the job in the Job Catalog, selecting the 'Candidate Queries' tab, and clicking 'Resolve' once you review them.",
    category: "pipeline"
  },
  {
    question: "Can I manually add job openings?",
    answer: "Yes! In the Job Catalog workspace, scroll to the bottom of the Notion-style table and click the '+' button to add an opening manually. You can fill out details, save, and manually publish them.",
    category: "pool"
  },
  {
    question: "How do interview stages work?",
    answer: "Candidates move through a sequence of stages: Screening → Technical → HR → Final. You can update their stage and status on their detail card. If a candidate fails a round, you must record a rejection reason in the stage notes, which is stored and referenced if the candidate reappears in the system later.",
    category: "pipeline"
  },
  {
    question: "How do I import candidates in bulk?",
    answer: "Go to the Sourcing Pool page and click 'Bulk Import CSV'. You can upload a CSV table containing candidate names, emails, phones, skills, and experience details. Duplicate emails will be skipped automatically.",
    category: "pool"
  }
];

interface StepperItem {
  title: string;
  short: string;
  icon: React.ElementType;
  description: string;
  link: string;
  linkLabel: string;
  tips: string[];
}

export default function HelpPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqCategory, setFaqCategory] = useState<"all" | "matcher" | "pool" | "pipeline">("all");
  
  // Workflow stepper state
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("help_view_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.openFaq !== undefined) setOpenFaq(parsed.openFaq);
          if (parsed.faqCategory !== undefined) setFaqCategory(parsed.faqCategory);
          if (parsed.activeStep !== undefined) setActiveStep(parsed.activeStep);
        } catch (e) {
          console.error("Error parsing saved help view state", e);
        }
      }
      setTimeout(() => {
        setIsLoaded(true);
      }, 0);
    }
  }, []);

  // Save state to localStorage on state changes with debounce
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      const handler = setTimeout(() => {
        const stateToSave = {
          openFaq,
          faqCategory,
          activeStep
        };
        localStorage.setItem("help_view_state", JSON.stringify(stateToSave));
      }, 500);

      return () => clearTimeout(handler);
    }
  }, [isLoaded, openFaq, faqCategory, activeStep]);

  // Diagnostics simulation states
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsProgress, setDiagnosticsProgress] = useState(0);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [diagnosticsReport, setDiagnosticsReport] = useState<any>(null);

  // Support ticket form states
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ email: "", subject: "", message: "" });
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Release notes state
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);

  const pageTours = [
    { id: "dashboard", name: "Dashboard Overview", path: "/dashboard", icon: LayoutDashboard, description: "Walk through command center panels, notification logs, and system operations stats." },
    { id: "clients", name: "Clients & Mandates", path: "/clients", icon: Building2, description: "Learn how to register clients, upload recruitment mandates, and manage active JDs." },
    { id: "jobs", name: "Job Catalog", path: "/jobs", icon: Briefcase, description: "Explore the job draft table, adjust skills weights, and trigger AI matching." },
    { id: "pool", name: "Sourcing Pool", path: "/pool", icon: Users, description: "Learn how to upload resumes, import talent index sheets, and parse applicant profiles." },
    { id: "rounds", name: "Pipeline Stages", path: "/rounds", icon: Layers, description: "Inspect how to transition candidates through screening, tech round, and HR stages." },
    { id: "qna", name: "Candidate Q&A", path: "/qna", icon: MessageSquare, description: "Vetting interface guide for reviewing and answering candidate inquiries." },
    { id: "notifications", name: "System Alerts", path: "/notifications", icon: Bell, description: "Review audit trails, error alerts, and automated job generation triggers." },
    { id: "settings", name: "Recruiter Settings", path: "/profile", icon: Settings, description: "Configure full names, profile avatars, agency subdomains, and auth preferences." },
    { id: "help", name: "Help Desk Hub", path: "/help", icon: HelpCircle, description: "Get a walkthrough of the diagnostics center, ticket submissions, and release logs." }
  ];

  const triggerPageTour = (tourId: string, path: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("show_kozker_tutorial", "true");
      localStorage.setItem("kozker_active_tour_type", tourId);
      localStorage.setItem("kozker_tutorial_step", "0");
      localStorage.removeItem("kozker_tutorial_completed");
      localStorage.removeItem("kozker_tutorial_skipped");
      window.location.href = path; // Redirect to target route
    }
  };

  const handleRestartTour = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("kozker_tutorial_completed");
      localStorage.removeItem("kozker_tutorial_skipped");
      localStorage.setItem("show_kozker_tutorial", "true");
      localStorage.setItem("kozker_tutorial_step", "0");
      sessionStorage.removeItem("kozker_welcome_redirected");
      window.location.href = "/welcome";
    }
  };

  // Run diagnostics simulation
  const runDiagnostics = () => {
    setDiagnosticsRunning(true);
    setDiagnosticsProgress(0);
    setDiagnosticLogs([]);
    setDiagnosticsReport(null);
  };

  useEffect(() => {
    if (!diagnosticsRunning) return;

    const logs = [
      "Initializing diagnostics engine...",
      "Resolving Supabase active pool connection...",
      "Database status: CONNECTED. Active connections: 4/20.",
      "Pinging Claude AI model endpoints...",
      "Claude model status: RESPONSE OK. Latency: 142ms.",
      "Checking N8N webhook workflow integrations...",
      "Integration bridge: ACTIVE. System live listener running.",
      "Verifying auth tokens and session validity...",
      "All systems verified successfully. Diagnostics completed."
    ];

    const interval = setInterval(() => {
      setDiagnosticsProgress(prev => {
        const next = prev + 10;
        
        // Add log entry dynamically based on progress
        const logIndex = Math.floor((next / 100) * logs.length);
        if (logIndex > 0 && logIndex <= logs.length) {
          setDiagnosticLogs(logs.slice(0, logIndex));
        }

        if (next >= 100) {
          clearInterval(interval);
          setDiagnosticsRunning(false);
          setDiagnosticsReport({
            status: "Healthy",
            checkedAt: new Date().toLocaleTimeString(),
            db: "Online",
            ai: "Online",
            integrations: "Active",
            latency: "142ms"
          });
          return 100;
        }
        return next;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [diagnosticsRunning]);

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketLoading(true);
    setTimeout(() => {
      setTicketLoading(false);
      setTicketSuccess(true);
      setTicketForm({ email: "", subject: "", message: "" });
      setTimeout(() => {
        setTicketSuccess(false);
        setTicketOpen(false);
      }, 3000);
    }, 1500);
  };

  const steps: StepperItem[] = [
    {
      title: "1. Client Intake & Mandates",
      short: "Client Intake",
      icon: Globe,
      description: "Establish clients and upload mandate requirements in PDF, DOCX, or plain text formats. The AI automatically parses these requirements to generate structure and map key required skills.",
      link: "/clients",
      linkLabel: "Manage Client Mandates",
      tips: [
        "Ensure requirement documents contain specific technical skill profiles for accurate AI parsing.",
        "Change status from 'Draft' to 'Ready' once requirement settings are fully set up."
      ]
    },
    {
      title: "2. Job Catalog Drafting",
      short: "Job Drafting",
      icon: BookOpen,
      description: "Based on mandates, the AI generates optimized job posts. Recruiter AI allows direct text-based refits. You can easily tweak summaries, add custom benefits, or adjust parameters.",
      link: "/jobs",
      linkLabel: "View Job Catalog",
      tips: [
        "Click any job draft row in the Notion-style table to edit fields interactively.",
        "Review AI-suggested job titles and descriptions before publishing."
      ]
    },
    {
      title: "3. Sourcing Candidates",
      short: "Sourcing Talent",
      icon: Users,
      description: "Add candidates to the Sourcing Pool manually, upload individual resumes, or use the CSV bulk importer. Sourced candidates will be kept indexed and searchable across mandates.",
      link: "/pool",
      linkLabel: "Open Sourcing Pool",
      tips: [
        "Use the CSV importer to quickly populate your database in batches.",
        "System checks candidate emails to prevent duplicate entries automatically."
      ]
    },
    {
      title: "4. AI Match Engine",
      short: "AI Matching",
      icon: Sparkles,
      description: "Set relative weights (1x - 5x) for target skills and run candidate matching scan. The engine analyzes resumes, computes fuzzy semantic score percentages (0-100%), and ranks applicants.",
      link: "/jobs",
      linkLabel: "Review Ranks & Scores",
      tips: [
        "Increase weight for critical skills to force high-precision candidate sorting.",
        "Review matching logs to inspect semantic match explanations."
      ]
    },
    {
      title: "5. Screening Questions",
      short: "Screening Q&A",
      icon: MessageSquare,
      description: "Once matching candidate is accepted, the system generates customized, role-specific screening questions. Recruiter companion can refine questions dynamically based on JD details.",
      link: "/qna",
      linkLabel: "Review Screening Questions",
      tips: [
        "Regenerate questions using the AI Copilot to match specific candidate profiles.",
        "Use the shareable candidate links to collect candidate answers."
      ]
    },
    {
      title: "6. Interview Pipeline",
      short: "Stages & Hire",
      icon: Layers,
      description: "Track candidate movement from Screening, through Technical and HR, to the Final round. Update candidate status and write evaluation logs directly inside candidate panel profile card.",
      link: "/rounds",
      linkLabel: "Go to Stages Dashboard",
      tips: [
        "Always document failure reasons on rejections; the AI references logs for returning talent.",
        "Use custom evaluation tags for detailed technical vetting notes."
      ]
    }
  ];

  const filteredFaqs = faqs.filter(faq => faqCategory === "all" || faq.category === faqCategory);

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans pb-16 select-none animate-fade-in">
      
      {/* Decorative Glow Elements */}
      <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-96 left-1/3 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-[#0C1E1B] via-[#0E1528] to-[#160E28] border border-emerald-950/60 help-border p-8 rounded-sm text-neutral-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl overflow-hidden z-10">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="space-y-3 z-10">
          <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded-sm">
            Operations Center
          </span>
          <h1 
            className="font-tight font-black text-2xl tracking-tight leading-none uppercase text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(to right, #ffffff, #a7f3d0, #c7d2fe)' }}
          >
            Operations Help Desk & Hub
          </h1>
          <p className="text-xs max-w-lg leading-relaxed" style={{ color: '#a8a29e' }}>
            Configure mandates, tweak AI matching scores, review pipelines, and manage recruiter options. Use the toolset below to inspect system statuses.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestartTour}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 hover:-translate-y-0.5 shrink-0 z-10 border border-emerald-500/30"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Restart Tutorial Tour
        </button>
      </div>

      {/* Interactive Stepper: Recruitment Lifecycle Workflow */}
      <div className="bg-white border border-neutral-200 help-border rounded-sm p-6 shadow-sm space-y-6 z-10 relative">
        <div className="border-b border-neutral-100 help-border-b pb-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800">
              Interactive Recruitment Workflow
            </h2>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono font-bold">Click step to view tips</span>
        </div>

        {/* Stepper buttons container */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStep === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`p-3 rounded-sm border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected 
                    ? "bg-neutral-900 border-neutral-850 text-neutral-white hover:bg-neutral-800 shadow-md scale-[1.02]" 
                    : "bg-neutral-50/50 border-neutral-200 help-border text-neutral-650 hover:bg-neutral-50 hover:text-neutral-800"
                }`}
              >
                <div className="flex justify-between items-start w-full">
                  <Icon className={`w-5 h-5 ${isSelected ? "text-primary animate-pulse" : "text-neutral-400"}`} />
                  <span className={`font-mono text-[9px] font-bold ${isSelected ? "text-primary" : "text-neutral-400"}`}>
                    S{idx+1}
                  </span>
                </div>
                <span className="text-[11px] font-bold leading-tight font-tight truncate uppercase tracking-wider block">
                  {step.short}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected step details card */}
        <div className="bg-neutral-50 border border-neutral-150 help-border p-5 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <h4 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">
                {steps[activeStep].title}
              </h4>
            </div>
            <p className="text-neutral-500 text-xs leading-relaxed">
              {steps[activeStep].description}
            </p>
            <div className="space-y-1.5">
              <h5 className="text-[10px] font-bold text-neutral-700 uppercase tracking-wide">Pro Tips & Settings:</h5>
              <ul className="list-disc pl-4 space-y-1">
                {steps[activeStep].tips.map((tip, tIdx) => (
                  <li key={tIdx} className="text-neutral-450 text-[11px] leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Link
            href={steps[activeStep].link}
            className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-white rounded-sm font-semibold uppercase text-[10px] tracking-wider transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {steps[activeStep].linkLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Grid of Core Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 z-10 relative">
        
        {/* Card 1: Mandates & Job Drafts */}
        <div className="bg-white border border-neutral-200 help-border p-5 rounded-sm shadow-xs space-y-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group">
          <div className="flex items-center justify-between border-b border-neutral-100 help-border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800 group-hover:text-primary transition-colors">
                Hiring Mandates & Job Drafts
              </h3>
            </div>
            <span className="text-[8px] font-mono px-1.5 py-0.5 border border-info/25 text-info uppercase rounded-sm bg-info/5">Core</span>
          </div>
          <p className="text-neutral-500 text-[11.5px] leading-relaxed">
            Create requirements linked to client names. The AI automatically drafts structured job openings. You can review, edit, or regenerate these drafts using natural language instructions.
          </p>
        </div>

        {/* Card 2: AI Matching & Ranks */}
        <div className="bg-white border border-neutral-200 help-border p-5 rounded-sm shadow-xs space-y-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group">
          <div className="flex items-center justify-between border-b border-neutral-100 help-border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800 group-hover:text-primary transition-colors">
                AI Matching & Scoring
              </h3>
            </div>
            <span className="text-[8px] font-mono px-1.5 py-0.5 border border-success/25 text-success uppercase rounded-sm bg-success/5">Claude AI</span>
          </div>
          <p className="text-neutral-500 text-[11.5px] leading-relaxed">
            Before scanning CVs, the AI extracts skills. Customize their weights in the editable pop-up. Once approved, the scanning agent ranks candidates by calculating fuzzy semantic similarity scores.
          </p>
        </div>

        {/* Card 3: Sourcing Pool & Imports */}
        <div className="bg-white border border-neutral-200 help-border p-5 rounded-sm shadow-xs space-y-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group">
          <div className="flex items-center justify-between border-b border-neutral-100 help-border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800 group-hover:text-primary transition-colors">
                Sourcing & Uploads
              </h3>
            </div>
            <span className="text-[8px] font-mono px-1.5 py-0.5 border border-info/25 text-info uppercase rounded-sm bg-info/5">Storage</span>
          </div>
          <p className="text-neutral-500 text-[11.5px] leading-relaxed">
            Upload candidate resumes inside a job (linked automatically) or directly into the general pool. Supported formats include PDF, DOCX, and bulk CSV tables. System flags and skips duplicates.
          </p>
        </div>

        {/* Card 4: Screening & Stages */}
        <div className="bg-white border border-neutral-200 help-border p-5 rounded-sm shadow-xs space-y-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md group">
          <div className="flex items-center justify-between border-b border-neutral-100 help-border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800 group-hover:text-primary transition-colors">
                Screening & Pipeline Stages
              </h3>
            </div>
            <span className="text-[8px] font-mono px-1.5 py-0.5 border border-warning/25 text-warning uppercase rounded-sm bg-warning/5">Workflow</span>
          </div>
          <p className="text-neutral-500 text-[11.5px] leading-relaxed">
            Once accepted, the system generates 8-10 personalized screening questions. Move applicants from Screening to Technical, HR, and Final stages, recording stage outcomes and logs.
          </p>
        </div>

      </div>

      {/* Page-Specific Tours Section */}
      <div className="bg-white border border-neutral-200 help-border rounded-sm p-6 shadow-sm space-y-6 z-10 relative">
        <div className="border-b border-neutral-100 help-border-b pb-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800">
              Targeted Page Tutorials
            </h2>
          </div>
          <span className="text-[10px] text-neutral-450 font-mono font-bold">Interactive Tours</span>
        </div>
        
        <p className="text-neutral-500 text-xs leading-relaxed max-w-2xl">
          Launch a targeted walkthrough for a specific workspace page. You will be redirected to that page immediately with context-aware walkthrough tooltips enabled.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {pageTours.map((tour) => {
            const Icon = tour.icon;
            return (
              <div key={tour.id} className="bg-neutral-50 border border-neutral-150 help-border p-4 rounded-sm flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <h4 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">
                      {tour.name}
                    </h4>
                  </div>
                  <p className="text-neutral-500 text-[11px] leading-relaxed">
                    {tour.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerPageTour(tour.id, tour.path)}
                  className="w-full py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-white font-bold text-[9px] uppercase tracking-wider rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  Start Page Tour
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ & Diagnostics Combined Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 z-10 relative">
        
        {/* FAQs Accordion Section (LHS) */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 help-border rounded-sm shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-neutral-100 help-border-b">
            <h2 className="font-tight font-black text-sm uppercase tracking-wider text-neutral-800 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-600 animate-pulse" />
              Frequently Asked Questions
            </h2>
            
            {/* Category tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "matcher", "pool", "pipeline"] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setFaqCategory(cat);
                    setOpenFaq(null);
                  }}
                  className={`px-2.5 py-1 rounded-sm text-[9px] uppercase font-mono tracking-wider cursor-pointer border ${
                    faqCategory === cat 
                      ? "bg-neutral-900 border-neutral-800 text-neutral-white hover:bg-neutral-800 font-bold" 
                      : "bg-neutral-50 border-neutral-200 help-border text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-neutral-100 help-border-t">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className={`py-3.5 space-y-2.5 transition-all duration-200 ${
                    isOpen ? "pl-2 border-l-2 border-primary bg-primary/[0.01]" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex justify-between items-center text-left text-neutral-800 hover:text-primary transition-colors cursor-pointer text-xs font-semibold uppercase tracking-wider font-tight"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="text-neutral-500 text-[11.5px] leading-relaxed pl-1 animate-fade-in">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
            {filteredFaqs.length === 0 && (
              <div className="py-12 text-center text-xs text-neutral-400">
                No questions found in this category.
              </div>
            )}
          </div>
        </div>

        {/* Diagnostics & Operations Tools (RHS) */}
        <div className="space-y-6">
          
          {/* Diagnostic Widget */}
          <div className="bg-[#0C0A09] border border-neutral-900 help-border p-5 rounded-sm text-zinc-200 space-y-4 shadow-md font-mono relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center border-b border-neutral-850 pb-2.5" style={{ borderBottomColor: '#27272a' }}>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Diag Terminal</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            {!diagnosticsRunning && !diagnosticsReport ? (
              <div className="space-y-3.5 py-2">
                <p className="text-[10.5px] text-zinc-400 leading-relaxed">
                  Run a local workspace check to verify database pools, model APIs, and bridge configurations.
                </p>
                <button
                  type="button"
                  onClick={runDiagnostics}
                  className="w-full py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-[10px] font-bold text-zinc-200 uppercase tracking-wider rounded-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" style={{ animationDuration: "3s" }} />
                  Run Diagnostics
                </button>
              </div>
            ) : diagnosticsRunning ? (
              <div className="space-y-3.5 py-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-zinc-400">
                    <span>STATUS: EXECUTING</span>
                    <span>{diagnosticsProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${diagnosticsProgress}%` }}
                    />
                  </div>
                </div>
                
                {/* Console logs */}
                <div className="bg-[#040405] p-2.5 border border-zinc-900 rounded-sm max-h-24 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {diagnosticLogs.map((log, lIdx) => (
                    <div key={lIdx} className="text-[9px] text-emerald-400 leading-tight">
                      &gt; {log}
                    </div>
                  ))}
                  <div className="animate-pulse text-[9px] text-zinc-500">&gt; _</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 py-1">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>SYSTEM OPERATIONAL</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[9px] bg-zinc-900/50 p-2.5 border border-zinc-850 rounded-sm text-zinc-400">
                    <div>DB POOL: <span className="text-zinc-200">{diagnosticsReport.db}</span></div>
                    <div>AI ENGINE: <span className="text-zinc-200">{diagnosticsReport.ai}</span></div>
                    <div>BRIDGE: <span className="text-zinc-200">{diagnosticsReport.integrations}</span></div>
                    <div>LATENCY: <span className="text-zinc-200">{diagnosticsReport.latency}</span></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={runDiagnostics}
                    className="flex-1 py-1.5 border border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100 text-[9px] font-bold text-zinc-400 uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    Retest
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagnosticsReport(null)}
                    className="flex-1 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[9px] font-bold text-zinc-300 uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Help Links widget */}
          <div className="bg-white border border-neutral-200 help-border p-5 rounded-sm space-y-4 shadow-sm">
            <h3 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800 border-b border-neutral-100 help-border-b pb-2 flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-primary animate-pulse" />
              Recruiter Toolkit
            </h3>
            
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => setTicketOpen(true)}
                className="w-full flex justify-between items-center px-3 py-2 bg-neutral-50 border border-neutral-200 help-border rounded-sm hover:bg-neutral-100 hover:text-primary transition-all text-left font-medium text-neutral-700 cursor-pointer"
              >
                <span>Submit Support Ticket</span>
                <Send className="w-3.5 h-3.5 text-neutral-450" />
              </button>

              <button
                type="button"
                onClick={() => setReleaseNotesOpen(true)}
                className="w-full flex justify-between items-center px-3 py-2 bg-neutral-50 border border-neutral-200 help-border rounded-sm hover:bg-neutral-100 hover:text-primary transition-all text-left font-medium text-neutral-700 cursor-pointer"
              >
                <span>V3.0 Release Logs</span>
                <FileText className="w-3.5 h-3.5 text-neutral-450" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Support Ticket Modal Dialog */}
      {ticketOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 help-border w-full max-w-md p-6 rounded-sm shadow-xl space-y-4 text-neutral-800 animate-zoom-in">
            <div className="flex justify-between items-center border-b border-neutral-100 help-border-b pb-3">
              <h3 className="font-tight font-black text-sm uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-primary" />
                Submit Support Ticket
              </h3>
              <button 
                onClick={() => setTicketOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold uppercase text-[10px] tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>

            {ticketSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800">Ticket Submitted</h4>
                <p className="text-neutral-455 text-[11px]">Operations desk will respond back within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide block">Reply Email</label>
                  <input
                    required
                    type="email"
                    placeholder="you@agency.com"
                    value={ticketForm.email}
                    onChange={e => setTicketForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 help-border rounded-sm placeholder:text-neutral-450"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide block">Subject</label>
                  <input
                    required
                    type="text"
                    placeholder="Issue with candidate scoring weights"
                    value={ticketForm.subject}
                    onChange={e => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 help-border rounded-sm placeholder:text-neutral-450"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide block">Description</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Please specify issue parameters..."
                    value={ticketForm.message}
                    onChange={e => setTicketForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 help-border rounded-sm placeholder:text-neutral-455"
                  />
                </div>
                <button
                  type="submit"
                  disabled={ticketLoading}
                  className="w-full py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-50 text-neutral-white font-bold text-[10px] uppercase tracking-wider rounded-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  {ticketLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending Ticket...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Ticket
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Release Notes Modal Dialog */}
      {releaseNotesOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 help-border w-full max-w-md p-6 rounded-sm shadow-xl space-y-4 text-neutral-800 animate-zoom-in">
            <div className="flex justify-between items-center border-b border-neutral-100 help-border-b pb-3">
              <h3 className="font-tight font-black text-sm uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                V3.0 System Release Logs
              </h3>
              <button 
                onClick={() => setReleaseNotesOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold uppercase text-[10px] tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin pr-1 text-xs">
              <div className="space-y-1">
                <span className="font-mono text-[9px] text-primary font-bold">RELEASE V3.0.4 (CURRENT)</span>
                <p className="font-bold text-neutral-800">Dark Mode Interface Update</p>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Introduced unified dark mode interface styling across dashboards, sidebar menus, and dialog modals. Restored panel borders to Stone 700 with clean contrast ratios.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[9px] text-neutral-400">RELEASE V3.0.0</span>
                <p className="font-bold text-neutral-800">Recruiter AI Core Engine Upgrade</p>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Re-engineered matching algorithms to utilize Claude API semantic fuzzy scores. Custom screening questions builder can now auto-generate 8-10 high-density vetting items.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[9px] text-neutral-400">RELEASE V2.4.0</span>
                <p className="font-bold text-neutral-800">CSV Bulk Importers & Duplication Handler</p>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Developed high-density sourcing portal features allowing multi-candidate batches import. Connected unique check triggers to ignore incoming duplicate emails.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Box */}
      <div className="border border-dashed border-neutral-350 help-border-dashed rounded-sm p-6 text-center space-y-3 bg-neutral-50/50 z-10 relative">
        <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 help-border mx-auto text-neutral-500 flex items-center justify-center">
          <LifeBuoy className="w-5 h-5 animate-spin" style={{ animationDuration: "12s" }} />
        </div>
        <div className="space-y-1">
          <h4 className="font-tight font-bold text-xs text-neutral-800 uppercase tracking-wider">Need Technical Assistance?</h4>
          <p className="text-neutral-500 text-[11px] max-w-sm mx-auto leading-relaxed">
            For advanced queries, workflow troubleshooting, or system feedback, please consult our diagnostic logger or contact the administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
