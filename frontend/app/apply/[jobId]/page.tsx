"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiRequest, apiUploadFile } from "@/lib/api";
import { parseResumeTextHeuristically } from "@/components/PoolView";
import { 
  Upload, Briefcase, GraduationCap, Trophy, Code, 
  CheckCircle, AlertCircle, Calendar, DollarSign, 
  MapPin, Loader2, ArrowLeft, Building2, Sparkles, Check,
  Eye, Settings, Plus, Trash2, ArrowUp, ArrowDown, Sparkle,
  Copy, ExternalLink, Moon, Sun, Info, Layout, AlignLeft,
  ChevronRight, ChevronDown, CheckSquare, List, RefreshCw, Pencil, MessageSquare, X, HelpCircle
} from "lucide-react";

interface FormFieldConfig {
  id: string;
  label: string;
  type: string; // "text" | "textarea" | "number" | "select" | "checkbox" | "file" | "email"
  enabled: boolean;
  required: boolean;
  isCustom?: boolean;
  options?: string[]; // for select dropdowns
}

const defaultFields: FormFieldConfig[] = [
  { id: "full_name", label: "Full Name", type: "text", enabled: true, required: true },
  { id: "email", label: "Email Address", type: "email", enabled: true, required: true },
  { id: "phone", label: "Phone Number", type: "text", enabled: true, required: false },
  { id: "resume", label: "Upload your Resume / CV", type: "file", enabled: true, required: false },
  { id: "skills", label: "Skills (Comma Separated)", type: "text", enabled: true, required: true },
  { id: "experience_years", label: "Years of Experience", type: "number", enabled: true, required: true },
  { id: "education", label: "Education / Degree", type: "text", enabled: true, required: false },
  { id: "working_or_not", label: "Employment Status", type: "select", enabled: true, required: false, options: ["Employed (Working)", "Open to Work (Not Working)"] },
  { id: "academic_details", label: "Academic Details", type: "textarea", enabled: true, required: false },
  { id: "achievements", label: "Achievements", type: "textarea", enabled: true, required: false },
  { id: "summary", label: "Executive Summary", type: "textarea", enabled: true, required: false },
];

const themes = {
  pine: {
    primary: "bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition-colors duration-150",
    primaryText: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-150 dark:border-emerald-900/30",
    accent: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40",
    bg: "bg-[#f4f7f6]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-emerald-600 dark:border-emerald-500",
    ring: "focus:ring-emerald-600 focus:border-emerald-600 dark:focus:ring-emerald-500 dark:focus:border-emerald-500",
    badge: "bg-emerald-50 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    studioHeader: "bg-emerald-950 text-emerald-100 border-b border-emerald-900",
  },
  indigo: {
    primary: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white transition-colors duration-150",
    primaryText: "text-indigo-650 dark:text-indigo-400",
    border: "border-indigo-150 dark:border-indigo-900/30",
    accent: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/40",
    bg: "bg-slate-50",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-indigo-600 dark:border-indigo-500",
    ring: "focus:ring-indigo-600 focus:border-indigo-600 dark:focus:ring-indigo-500 dark:focus:border-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 border border-indigo-250 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50",
    studioHeader: "bg-indigo-950 text-indigo-100 border-b border-indigo-900",
  },
  dark: {
    primary: "bg-slate-700 hover:bg-slate-650 dark:bg-slate-600 dark:hover:bg-slate-500 text-white border border-slate-600 transition-colors duration-150",
    primaryText: "text-slate-205 dark:text-slate-100",
    border: "border-slate-800 dark:border-slate-700",
    accent: "bg-slate-800 text-slate-300 border-slate-800 dark:bg-slate-900 dark:text-slate-205 dark:border-slate-800",
    bg: "bg-slate-950 text-slate-100",
    card: "bg-slate-900 border-slate-800 text-slate-100",
    accentBorder: "border-slate-500 dark:border-slate-400",
    ring: "focus:ring-slate-500 focus:border-slate-500 dark:focus:ring-slate-400 dark:focus:border-slate-400 bg-slate-955 text-slate-100",
    badge: "bg-slate-800 text-slate-200 border border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800",
    studioHeader: "bg-slate-900 text-slate-100 border-b border-slate-800",
  },
  amber: {
    primary: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white transition-colors duration-150",
    primaryText: "text-amber-800 dark:text-amber-400",
    border: "border-amber-150 dark:border-amber-900/30",
    accent: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-955/20 dark:text-amber-300 dark:border-amber-900/40",
    bg: "bg-[#fdfbf7]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-amber-600 dark:border-amber-505",
    ring: "focus:ring-amber-606 focus:border-amber-606 dark:focus:ring-amber-500 dark:focus:border-amber-500",
    badge: "bg-amber-50 text-amber-800 border border-amber-250 dark:bg-amber-955/30 dark:text-amber-400 dark:border-amber-900/50",
    studioHeader: "bg-amber-955 text-amber-100 border-b border-amber-900",
  },
  rose: {
    primary: "bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 text-white transition-colors duration-150",
    primaryText: "text-rose-600 dark:text-rose-400",
    border: "border-rose-150 dark:border-rose-900/30",
    accent: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-955/20 dark:text-rose-300 dark:border-rose-900/40",
    bg: "bg-[#fff1f2]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-rose-600 dark:border-rose-500",
    ring: "focus:ring-rose-600 focus:border-rose-600 dark:focus:ring-rose-500 dark:focus:border-rose-500",
    badge: "bg-rose-50 text-rose-800 border border-rose-250 dark:bg-rose-955/30 dark:text-rose-400 dark:border-rose-900/50",
    studioHeader: "bg-rose-955 text-rose-100 border-b border-rose-900",
  },
  cyber: {
    primary: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-405 text-white border border-purple-500 transition-colors duration-150",
    primaryText: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-900/30",
    accent: "bg-purple-50 text-purple-750 border-purple-200 dark:bg-purple-955/20 dark:text-purple-300 dark:border-purple-900/40",
    bg: "bg-[#FAF5FF]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-purple-600 dark:border-purple-500",
    ring: "focus:ring-purple-600 focus:border-purple-600 dark:focus:ring-purple-500 dark:focus:border-purple-500",
    badge: "bg-purple-50 text-purple-750 border border-purple-250 dark:bg-purple-955/30 dark:text-purple-400 dark:border-purple-900/50",
    studioHeader: "bg-purple-955 text-purple-100 border-b border-purple-900",
  },
  ocean: {
    primary: "bg-cyan-705 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white transition-colors duration-150",
    primaryText: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-150 dark:border-cyan-900/30",
    accent: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-955/20 dark:text-cyan-300 dark:border-cyan-900/40",
    bg: "bg-[#ecfeff]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-cyan-600 dark:border-cyan-500",
    ring: "focus:ring-cyan-606 focus:border-cyan-606 dark:focus:ring-cyan-500 dark:focus:border-cyan-500",
    badge: "bg-cyan-50 text-cyan-800 border border-cyan-255 dark:bg-cyan-955/30 dark:text-cyan-400 dark:border-cyan-900/50",
    studioHeader: "bg-cyan-955 text-cyan-100 border-b border-cyan-900",
  },
  sunset: {
    primary: "bg-[#FF6E30] hover:bg-[#E05B20] text-white transition-colors duration-150",
    primaryText: "text-[#FF6E30] dark:text-[#FF7F47]",
    border: "border-orange-150 dark:border-orange-900/30",
    accent: "bg-orange-50 text-orange-850 border-orange-200 dark:bg-orange-955/20 dark:text-orange-300 dark:border-orange-900/40",
    bg: "bg-[#fff7ed]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-[#FF6E30] dark:border-[#FF7F47]",
    ring: "focus:ring-[#FF6E30] focus:border-[#FF6E30] dark:focus:ring-[#FF7F47] dark:focus:border-[#FF7F47]",
    badge: "bg-orange-50 text-orange-800 border border-orange-255 dark:bg-orange-955/30 dark:text-orange-400 dark:border-orange-900/50",
    studioHeader: "bg-orange-955 text-orange-100 border-b border-orange-900",
  }
};

const themeButtons = [
  { id: "sunset", label: "Sunset Coral", color: "bg-orange-600", activeClass: "border-primary bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary dark:border-primary font-bold" },
  { id: "pine", label: "Pine Green", color: "bg-emerald-700", activeClass: "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-405 dark:border-emerald-500 font-bold" },
  { id: "indigo", label: "Indigo", color: "bg-indigo-650", activeClass: "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-500 font-bold" },
  { id: "dark", label: "Kozker Dark", color: "bg-slate-700", activeClass: "border-slate-500 bg-slate-800 text-slate-100 dark:bg-slate-850 dark:text-slate-100 dark:border-slate-550 font-bold" },
  { id: "amber", label: "Amber", color: "bg-amber-600", activeClass: "border-amber-600 bg-amber-55 border-amber-200 text-amber-800 dark:bg-amber-955/30 dark:text-amber-400 dark:border-amber-500 font-bold" },
  { id: "rose", label: "Rose Petal", color: "bg-rose-600", activeClass: "border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-955/30 dark:text-rose-400 dark:border-rose-500 font-bold" },
  { id: "cyber", label: "Neon Cyber", color: "bg-purple-600", activeClass: "border-purple-600 bg-purple-50 text-purple-800 dark:bg-purple-955/30 dark:text-purple-405 dark:border-purple-500 font-bold" },
  { id: "ocean", label: "Ocean Teal", color: "bg-cyan-700", activeClass: "border-cyan-600 bg-cyan-50 text-cyan-800 dark:bg-cyan-955/30 dark:text-cyan-405 dark:border-cyan-500 font-bold" },
];

const inactiveClass = "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-505 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-850 dark:text-neutral-450";

const mapMainThemeToFormTheme = (mainTheme: string): "pine" | "indigo" | "dark" | "amber" | "rose" | "cyber" | "ocean" | "sunset" => {
  switch (mainTheme) {
    case "sunset": return "sunset";
    case "ocean": return "ocean";
    case "forest": return "pine";
    case "pine": return "pine";
    case "cosmic": return "cyber";
    case "rose": return "rose";
    case "amber": return "amber";
    case "midnight": return "indigo";
    default: return "sunset";
  }
};

export default function PublicApplyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params?.jobId as string;
  const recruiterId = searchParams ? searchParams.get("recruiter_id") : null;
  const isEditMode = searchParams ? searchParams.get("edit") === "true" : false;

  const [mode, setMode] = useState<"design" | "preview">("preview");

  const [fields, setFields] = useState<FormFieldConfig[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<"pine" | "indigo" | "dark" | "amber" | "rose" | "cyber" | "ocean" | "sunset" >("sunset");
  const [bgMode, setBgMode] = useState<"light" | "dark">("light");

  const [job, setJob] = useState<any>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [errorJob, setErrorJob] = useState<string | null>(null);

  const [fieldValues, setFieldValues] = useState<Record<string, any>>({
    full_name: "",
    email: "",
    phone: "",
    skills: "",
    experience_years: 0,
    education: "",
    working_or_not: "true",
    academic_details: "",
    achievements: "",
    summary: "",
    resume: ""
  });
  
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>("");
  const [editingOptions, setEditingOptions] = useState<string>("");
  const [editingType, setEditingType] = useState<string>("text");

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<string>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"customize" | "ai_insights">("customize");

  const [candidateEmail, setCandidateEmail] = useState("");
  const [chatbotQueryText, setChatbotQueryText] = useState("");
  const [candidateQueries, setCandidateQueries] = useState<any[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<"description" | "queries">("description");
  const [isSendingQuery, setIsSendingQuery] = useState(false);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [modalQueryText, setModalQueryText] = useState("");

  useEffect(() => {
    if (fieldValues.email && !candidateEmail) {
      setCandidateEmail(fieldValues.email);
    }
  }, [fieldValues.email, candidateEmail]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem(`cand_email_query_${jobId}`) || localStorage.getItem("cand_email_general") || "";
      if (savedEmail) {
        setCandidateEmail(savedEmail);
      }
    }
  }, [jobId]);

  useEffect(() => {
    if (!candidateEmail || leftPanelTab !== "queries") return;
    
    const loadQueries = async () => {
      setLoadingQueries(true);
      try {
        const res = await apiRequest<any[]>("GET", `/jobs/${jobId}/queries?email=${encodeURIComponent(candidateEmail.trim())}`);
        setCandidateQueries(res);
      } catch (err) {
        console.error("Failed to load candidate queries:", err);
      } finally {
        setLoadingQueries(false);
      }
    };
    
    loadQueries();
  }, [jobId, candidateEmail, leftPanelTab]);

  const handleSendCandidateQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateEmail.trim() || !chatbotQueryText.trim() || isSendingQuery) return;
    
    if (typeof window !== "undefined") {
      localStorage.setItem(`cand_email_query_${jobId}`, candidateEmail);
      localStorage.setItem("cand_email_general", candidateEmail);
    }

    const userText = chatbotQueryText;
    setChatbotQueryText("");
    setIsSendingQuery(true);
    
    try {
      const result = await apiRequest<any>("POST", `/jobs/${jobId}/queries`, {
        candidate_email: candidateEmail.trim(),
        query_text: userText
      });
      
      setCandidateQueries(prev => [result, ...prev]);
    } catch (err: any) {
      console.error("Failed to submit query:", err);
      const fallbackQuery = {
        id: `q-fallback-${Date.now()}`,
        job_id: jobId,
        candidate_email: candidateEmail.trim(),
        query_text: userText,
        ai_response: "Thanks for your question. We've recorded your query and forwarded it to the hiring team.",
        is_resolved: false,
        created_at: new Date().toISOString()
      };
      setCandidateQueries(prev => [fallbackQuery, ...prev]);
    } finally {
      setIsSendingQuery(false);
    }
  };

  const handleSendModalQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateEmail.trim() || !modalQueryText.trim() || isSendingQuery) return;
    
    if (typeof window !== "undefined") {
      localStorage.setItem(`cand_email_query_${jobId}`, candidateEmail);
      localStorage.setItem("cand_email_general", candidateEmail);
    }

    const userText = modalQueryText;
    setModalQueryText("");
    setIsSendingQuery(true);
    
    try {
      const result = await apiRequest<any>("POST", `/jobs/${jobId}/queries`, {
        candidate_email: candidateEmail.trim(),
        query_text: userText
      });
      
      setCandidateQueries(prev => [result, ...prev]);
      setIsQueryModalOpen(false);
      setLeftPanelTab("queries");
    } catch (err: any) {
      console.error("Failed to submit query:", err);
      const fallbackQuery = {
        id: `q-fallback-${Date.now()}`,
        job_id: jobId,
        candidate_email: candidateEmail.trim(),
        query_text: userText,
        ai_response: "Thanks for your question. We've recorded your query and forwarded it to the hiring team.",
        is_resolved: false,
        created_at: new Date().toISOString()
      };
      setCandidateQueries(prev => [fallbackQuery, ...prev]);
      setIsQueryModalOpen(false);
      setLeftPanelTab("queries");
    } finally {
      setIsSendingQuery(false);
    }
  };

  const theme = themes[selectedTheme];
  const isDarkBg = bgMode === "dark";
  const resolvedBgClass = isDarkBg ? "bg-slate-955 text-slate-100" : (selectedTheme === "dark" ? "bg-slate-50" : theme.bg);
  const resolvedCardClass = isDarkBg 
    ? "bg-slate-900 border-slate-800 text-slate-100 shadow-lg" 
    : (selectedTheme === "dark" ? "bg-white border-neutral-200 text-neutral-800" : theme.card);

  const darkBadges: Record<string, string> = {
    pine: "bg-emerald-950 text-emerald-400 border border-emerald-900",
    indigo: "bg-indigo-950 text-indigo-400 border border-indigo-900",
    dark: "bg-slate-800 text-slate-200 border border-slate-700",
    amber: "bg-amber-950 text-amber-400 border border-amber-900",
    rose: "bg-rose-955 text-rose-400 border border-rose-900",
    cyber: "bg-purple-955 text-purple-400 border border-purple-900",
    ocean: "bg-cyan-955 text-cyan-400 border border-cyan-900",
    sunset: "bg-orange-955 text-orange-400 border border-orange-900",
  };
  const resolvedBadgeClass = isDarkBg ? darkBadges[selectedTheme] : theme.badge;

  useEffect(() => {
    if (!jobId) return;
    
    const fetchJobDetails = async () => {
      try {
        setLoadingJob(true);
        setErrorJob(null);
        const result = await apiRequest<any>("GET", `/jobs/${jobId}`);
        setJob(result);
        if (isEditMode) setMode("design");
      } catch (err: any) {
        console.error("Error fetching job details:", err);
        setErrorJob(err.message || "Failed to load job details.");
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJobDetails();
  }, [jobId, recruiterId, isEditMode]);

  useEffect(() => {
    if (!jobId) return;
    const localConfig = localStorage.getItem(`form_config_${jobId}`);
    const localTheme = localStorage.getItem(`form_theme_${jobId}`);
    const localBgMode = localStorage.getItem(`form_bg_mode_${jobId}`);
    
    if (localConfig) {
      try { setFields(JSON.parse(localConfig)); } catch (e) { setFields([...defaultFields]); }
    } else { setFields([...defaultFields]); }

    if (localTheme && Object.keys(themes).includes(localTheme)) {
      setSelectedTheme(localTheme as any);
    } else {
      const mainTheme = localStorage.getItem("kozker_pref_theme") || "sunset";
      setSelectedTheme(mapMainThemeToFormTheme(mainTheme));
    }

    if (localBgMode === "light" || localBgMode === "dark") {
      setBgMode(localBgMode);
    } else {
      const mainMode = (localStorage.getItem("kozker_pref_mode") as "light" | "dark") || "light";
      setBgMode(mainMode);
    }
  }, [jobId]);

  useEffect(() => {
    const originalMode = document.documentElement.getAttribute("data-mode") || "light";
    const originalTheme = document.documentElement.getAttribute("data-theme") || "sunset";

    if (isEditMode) {
      const mainMode = localStorage.getItem("kozker_pref_mode") || "light";
      const mainTheme = localStorage.getItem("kozker_pref_theme") || "sunset";
      document.documentElement.setAttribute("data-mode", mainMode);
      document.documentElement.setAttribute("data-theme", mainTheme);
    } else {
      document.documentElement.setAttribute("data-mode", bgMode);
      document.documentElement.setAttribute("data-theme", selectedTheme);
    }

    return () => {
      document.documentElement.setAttribute("data-mode", originalMode);
      document.documentElement.setAttribute("data-theme", originalTheme);
    };
  }, [isEditMode, bgMode, selectedTheme]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "kozker_pref_mode" || e.key === "kozker_pref_theme") {
        const mainMode = localStorage.getItem("kozker_pref_mode") || "light";
        const mainTheme = localStorage.getItem("kozker_pref_theme") || "sunset";
        
        if (isEditMode) {
          document.documentElement.setAttribute("data-mode", mainMode);
          document.documentElement.setAttribute("data-theme", mainTheme);
        }
        
        const localTheme = localStorage.getItem(`form_theme_${jobId}`);
        const localBgMode = localStorage.getItem(`form_bg_mode_${jobId}`);
        
        if (!localTheme) {
          setSelectedTheme(mapMainThemeToFormTheme(mainTheme));
        }
        if (!localBgMode) {
          setBgMode(mainMode as any);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isEditMode, jobId]);

  const handleSaveConfig = (customFieldsList = fields, customTheme = selectedTheme, customBgMode = bgMode) => {
    localStorage.setItem(`form_config_${jobId}`, JSON.stringify(customFieldsList));
    localStorage.setItem(`form_theme_${jobId}`, customTheme);
    localStorage.setItem(`form_bg_mode_${jobId}`, customBgMode);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleResetToDefault = () => {
    if (window.confirm("Are you sure you want to reset the form design to default?")) {
      setFields([...defaultFields]);
      setSelectedTheme("sunset");
      setBgMode("light");
      localStorage.removeItem(`form_config_${jobId}`);
      localStorage.removeItem(`form_theme_${jobId}`);
      localStorage.removeItem(`form_bg_mode_${jobId}`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
    setFields(updated);
    handleSaveConfig(updated);
  };

  const toggleFieldProp = (id: string, prop: "enabled" | "required") => {
    if ((id === "full_name" || id === "email") && (prop === "enabled" || prop === "required")) return;
    const updated = fields.map(f => f.id === id ? { ...f, [prop]: !f[prop] } : f);
    setFields(updated);
    handleSaveConfig(updated);
  };

  const handleAddCustomField = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFieldName.trim()) return;
    const newId = `custom_${Date.now()}`;
    const optionsArray = newFieldOptions ? newFieldOptions.split(",").map(o => o.trim()).filter(Boolean) : undefined;
    const newField: FormFieldConfig = { id: newId, label: newFieldName.trim(), type: newFieldType, enabled: true, required: false, isCustom: true, options: optionsArray };
    const updated = [...fields, newField];
    setFields(updated);
    setNewFieldName("");
    setNewFieldOptions("");
    handleSaveConfig(updated);
  };

  const handleAddSuggestedQuestion = (label: string, type: string, options?: string[]) => {
    const newId = `custom_${Date.now()}`;
    const newField: FormFieldConfig = { id: newId, label: label, type: type, enabled: true, required: false, isCustom: true, options: options };
    const updated = [...fields, newField];
    setFields(updated);
    handleSaveConfig(updated);
  };

  const handleDeleteCustomField = (id: string) => {
    const updated = fields.filter(f => f.id !== id);
    setFields(updated);
    handleSaveConfig(updated);
  };

  const aiInsights = useMemo(() => {
    if (!job) return null;
    const title = (job.title || "").toLowerCase();
    const desc = (job.description || "").toLowerCase();
    const insightsList: string[] = [];
    const questionSuggestions: { label: string; type: string; options?: string[] }[] = [];
    if (title.includes("lead") || title.includes("senior")) {
      insightsList.push("💡 High-Seniority / Leadership role detected.");
      questionSuggestions.push({ label: "Describe a major leadership project you delivered.", type: "textarea" });
    }
    return { insights: insightsList, suggestions: questionSuggestions };
  }, [job]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name);
    setResumeUrl(`/resumes/${file.name}`);
    setIsExtracting(true);
    try {
      const result = await apiUploadFile("/requirements/parse-file", file);
      if (result.text) {
        setRawText(result.text);
        const parsed = parseResumeTextHeuristically(result.text);
        setFieldValues(prev => ({ ...prev, ...parsed }));
        setParseNotice("Resume parsed successfully!");
      }
    } catch (err) {
      setParseNotice("Resume parsing failed.");
    } finally { setIsExtracting(false); }
  };

  const handleSubmitCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setSubmitError("Please consent to the processing."); return; }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/candidates", { ...fieldValues, job_id: jobId });
      setSubmitSuccess(true);
    } catch (err: any) { setSubmitError("Submission failed."); } finally { setSubmitting(false); }
  };

  if (loadingJob) return <div className="min-h-screen bg-neutral-50 flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10" /></div>;

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 text-center border shadow-sm">
          <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Application Submitted!</h3>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-black text-white rounded">Back to Portal</button>
        </div>
      </div>
    );
  }

  const renderStudioHeader = () => {
    return (
      <div className="px-6 py-3 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-stone-900 transition-colors duration-250">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-white w-7 h-7 rounded-sm flex items-center justify-center text-xs font-black shadow-sm">
            FS
          </div>
          <div>
            <h2 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Kozker Form Studio</h2>
            <p className="text-[9px] font-mono text-neutral-450 dark:text-neutral-500 uppercase tracking-widest">Hiring Mandate Form Editor & AI Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-neutral-100 dark:bg-stone-800/80 p-0.5 rounded-sm flex border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setMode("design")}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                mode === "design" 
                  ? "bg-primary text-white shadow-xs" 
                  : "text-neutral-505 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-205"
              }`}
            >
              <Settings className="w-3 h-3" />
              Designer
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                mode === "preview" 
                  ? "bg-primary text-white shadow-xs" 
                  : "text-neutral-505 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-205"
              }`}
            >
              <Eye className="w-3 h-3" />
              Live Preview
            </button>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess ? (
              <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 px-3 py-1 rounded-sm text-[10px] font-mono font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            ) : (
              <button
                onClick={() => handleSaveConfig()}
                className="px-3 py-1.5 bg-primary hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-xs"
              >
                Save Config
              </button>
            )}
            <button
              onClick={handleResetToDefault}
              className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
              title="Reset to default fields"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDesignerCanvas = () => {
    return (
      <div data-theme={selectedTheme} className="space-y-6">
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 flex items-center justify-between">
          <div>
            <h3 className="font-tight font-black text-lg uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Form Designer Canvas</h3>
            <p className="text-xs text-neutral-450 dark:text-neutral-500">Order, enable, or require fields dynamically.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Layout className="w-5 h-5" />
          </div>
        </div>

        <div className="space-y-3">
          {fields.map((field, idx) => {
            const isCore = field.id === "full_name" || field.id === "email";
            const isEditing = editingFieldId === field.id;

            if (isEditing) {
              return (
                <div 
                  key={field.id} 
                  className="p-5 rounded-sm border bg-white dark:bg-stone-900 border-primary dark:border-primary shadow-md space-y-4 animate-slide-in"
                >
                  <div className="text-xs space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-neutral-400 dark:text-neutral-500 block font-bold mb-1">Field Label</label>
                      <input
                        type="text"
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-stone-900 rounded-sm text-neutral-800 dark:text-neutral-100 focus:ring-1 focus:ring-primary focus:outline-hidden"
                      />
                    </div>
                    {field.isCustom && (
                      <div>
                        <label className="text-[10px] uppercase font-mono text-neutral-400 dark:text-neutral-500 block font-bold mb-1">Field Type</label>
                        <select
                          value={editingType}
                          onChange={(e) => setEditingType(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-stone-900 rounded-sm text-neutral-800 dark:text-neutral-100 focus:ring-1 focus:ring-primary focus:outline-hidden"
                        >
                          <option value="text">Short Text</option>
                          <option value="textarea">Paragraph</option>
                          <option value="number">Number</option>
                          <option value="select">Dropdown</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                    )}
                    {(editingType === "select" || (!field.isCustom && field.type === "select")) && (
                      <div>
                        <label className="text-[10px] uppercase font-mono text-neutral-400 dark:text-neutral-500 block font-bold mb-1">Dropdown Options (Comma separated)</label>
                        <input
                          type="text"
                          value={editingOptions}
                          onChange={(e) => setEditingOptions(e.target.value)}
                          placeholder="e.g. Option 1, Option 2, Option 3"
                          className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-stone-900 rounded-sm text-neutral-800 dark:text-neutral-100 focus:ring-1 focus:ring-primary focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = fields.map(f => {
                          if (f.id === field.id) {
                            const opts = (editingType === "select" || (!f.isCustom && f.type === "select"))
                              ? editingOptions.split(",").map(o => o.trim()).filter(Boolean)
                              : f.options;
                            return {
                              ...f,
                              label: editingLabel.trim() || f.label,
                              type: f.isCustom ? editingType : f.type,
                              options: opts
                            };
                          }
                          return f;
                        });
                        setFields(updated);
                        handleSaveConfig(updated);
                        setEditingFieldId(null);
                      }}
                      className="px-4 py-1.5 bg-primary hover:opacity-90 text-white font-mono font-bold text-[10px] uppercase rounded-sm cursor-pointer transition-colors"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingFieldId(null)}
                      className="px-4 py-1.5 border border-neutral-200 dark:border-neutral-800 text-neutral-505 hover:bg-neutral-50 dark:hover:bg-neutral-850 font-mono text-[10px] uppercase rounded-sm cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={field.id} 
                className={`p-4 rounded-sm border transition-all duration-150 flex items-center justify-between ${
                  field.enabled 
                    ? "bg-white dark:bg-stone-900 border-neutral-200 dark:border-neutral-800 shadow-xs hover:shadow-sm" 
                    : "bg-neutral-100 dark:bg-stone-900/40 border-neutral-200/50 dark:border-neutral-800/50 opacity-50"
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-800 dark:text-neutral-100 truncate">
                      {field.label}
                    </span>
                    {field.required && <span className="text-red-500 text-sm font-bold" title="Required">*</span>}
                    {field.isCustom && (
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-50 text-purple-705 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 rounded-xs">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase">
                    <span>ID: {field.id}</span>
                    <span>•</span>
                    <span>Type: {field.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFieldId(field.id);
                      setEditingLabel(field.label);
                      setEditingType(field.type);
                      setEditingOptions(field.options ? field.options.join(", ") : "");
                    }}
                    className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-450 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-sm border border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => moveField(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 bg-neutral-50 hover:bg-neutral-100 dark:bg-stone-900 dark:hover:bg-neutral-850 disabled:opacity-30 rounded-sm text-neutral-505 border border-neutral-200 dark:border-neutral-800 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveField(idx, "down")}
                      disabled={idx === fields.length - 1}
                      className="p-1 bg-neutral-50 hover:bg-neutral-100 dark:bg-stone-900 dark:hover:bg-neutral-850 disabled:opacity-30 rounded-sm text-neutral-505 border border-neutral-200 dark:border-neutral-800 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 pl-2 border-l border-neutral-200 dark:border-neutral-800">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      <input type="checkbox" checked={field.enabled} disabled={isCore} onChange={() => toggleFieldProp(field.id, "enabled")} className="w-3.5 h-3.5 accent-primary rounded-sm border-neutral-350 cursor-pointer" />
                      <span>Show</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      <input type="checkbox" checked={field.required} disabled={isCore || !field.enabled} onChange={() => toggleFieldProp(field.id, "required")} className="w-3.5 h-3.5 accent-primary rounded-sm border-neutral-350 cursor-pointer" />
                      <span>Require</span>
                    </label>
                  </div>
                  {field.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomField(field.id)}
                      className="p-1.5 ml-1 text-neutral-400 hover:text-red-655 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-sm transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-neutral-455 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSidebar = () => {
    return (
      <div className="space-y-6">
        {sidebarTab === "customize" ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-4">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-primary" />
                  Insert Custom Field
                </h3>
                <p className="text-[10px] text-neutral-450 dark:text-neutral-500">Append custom questions to candidate forms.</p>
              </div>
              <form onSubmit={handleAddCustomField} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block font-bold text-[9px] font-mono">Field Name / Question Label *</label>
                  <input
                    type="text"
                    placeholder="e.g. Notice Period"
                    required
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-stone-900 rounded-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 dark:text-neutral-505 uppercase tracking-wider block font-bold text-[9px] font-mono">Field Input Type</label>
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-stone-900 rounded-sm text-neutral-800 dark:text-neutral-100 focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="text">Short Text (Text Input)</option>
                    <option value="textarea">Paragraph (Textarea)</option>
                    <option value="number">Number</option>
                    <option value="select">Dropdown Selector</option>
                    <option value="checkbox">Checkbox Toggle</option>
                  </select>
                </div>
                {newFieldType === "select" && (
                  <div className="space-y-1">
                    <label className="text-neutral-400 dark:text-neutral-505 uppercase tracking-wider block font-bold text-[9px] font-mono">Dropdown Options (Comma separated) *</label>
                    <input
                      type="text"
                      placeholder="Option 1, Option 2, Option 3"
                      required
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-stone-900 rounded-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-450 focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-2 bg-primary hover:opacity-90 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs font-mono"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Insert Field Card
                </button>
              </form>
            </div>
            <div className="space-y-3.5 border-t border-neutral-200 dark:border-neutral-800 pt-5">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Form Aesthetic Theme</h3>
                <p className="text-[10px] text-neutral-450 dark:text-neutral-500">Match form aesthetics with company branding.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {themeButtons.map((tBtn) => {
                  const isActive = selectedTheme === tBtn.id;
                  return (
                    <button
                      key={tBtn.id}
                      onClick={() => {
                        setSelectedTheme(tBtn.id as any);
                        handleSaveConfig(fields, tBtn.id as any);
                      }}
                      className={`p-2 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isActive ? tBtn.activeClass : inactiveClass
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tBtn.color}`}></span>
                      {tBtn.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3.5 border-t border-neutral-200 dark:border-neutral-800 pt-5">
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <h3 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-100">Form Background Mode</h3>
                <p className="text-[10px] text-neutral-450 dark:text-neutral-500">Choose between light and dark backgrounds.</p>
              </div>
              <div className="flex gap-2 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setBgMode("light");
                    handleSaveConfig(fields, selectedTheme, "light");
                  }}
                  className={`flex-1 p-2.5 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    bgMode === "light"
                      ? "border-primary bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary dark:border-primary font-bold"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-stone-900 text-neutral-505 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-850"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Light Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBgMode("dark");
                    handleSaveConfig(fields, selectedTheme, "dark");
                  }}
                  className={`flex-1 p-2.5 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    bgMode === "dark"
                      ? "border-primary bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary dark:border-primary font-bold"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-stone-900 text-neutral-550 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-850"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  Dark Mode
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fadeIn">
            <div className="space-y-1.5 bg-neutral-50 dark:bg-stone-950 p-4 border border-neutral-200 dark:border-neutral-800 rounded-sm">
              <span className="px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-sm">
                Active Target Opening
              </span>
              <h3 className="font-tight font-black text-sm text-neutral-800 dark:text-neutral-100 leading-tight">
                {job.title}
              </h3>
              {job.client_name && (
                <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-neutral-450" />
                  <span>{job.client_name}</span>
                </div>
              )}
            </div>
            {aiInsights && (
              <div className="space-y-4">
                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                  <h4 className="text-[10px] font-black text-neutral-405 dark:text-neutral-500 uppercase tracking-widest font-mono flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    AI Optimization Insights
                  </h4>
                  <div className="mt-2.5 space-y-2">
                    {aiInsights.insights.map((insight, idx) => (
                      <div key={idx} className="p-3 bg-amber-50/75 dark:bg-amber-955/15 border border-amber-200/50 dark:border-amber-900/30 rounded-sm text-amber-900 dark:text-amber-300 text-xs leading-relaxed">
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-neutral-250 dark:border-neutral-800 pt-4">
                  <h4 className="text-[10px] font-black text-neutral-405 dark:text-neutral-500 uppercase tracking-widest font-mono flex items-center gap-1 mb-2">
                    <Sparkle className="w-3.5 h-3.5 text-emerald-600" />
                    AI Screening Recommendations
                  </h4>
                  <p className="text-neutral-450 dark:text-neutral-500 text-[10.5px] leading-relaxed italic mb-3">
                    Add these tailored custom screening fields based on the job requirements to filter applications:
                  </p>
                  <div className="space-y-2">
                    {aiInsights.suggestions.map((sug, idx) => (
                      <div key={idx} className="p-3 bg-neutral-50 dark:bg-stone-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-sm flex flex-col justify-between gap-2.5 transition-colors">
                        <div className="space-y-1">
                          <span className="px-1.5 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-wider text-neutral-550 bg-neutral-200 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 rounded-xs">
                            {sug.type}
                          </span>
                          <p className="text-neutral-700 dark:text-neutral-200 text-xs font-semibold leading-relaxed">
                            {sug.label}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSuggestedQuestion(sug.label, sug.type, sug.options)}
                          className="self-end px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-800 hover:border-emerald-350 text-[9.5px] font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add to Form
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderLivePreview = () => {
    return (
      <main 
        data-theme={selectedTheme} 
        data-mode={bgMode} 
        className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 transition-colors duration-250"
      >
        <section className="lg:col-span-5 space-y-4">
          <div className={`border rounded-sm p-5 space-y-4 shadow-xs transition-colors duration-250 ${resolvedCardClass}`}>
            <div className="space-y-1.5">
              <span className={`px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-sm ${resolvedBadgeClass}`}>
                Active Opening
              </span>
              <h2 className="font-tight font-black text-base leading-tight">
                {job.title}
              </h2>
              {job.client_name && (
                <div className="flex items-center gap-1 text-xs font-mono opacity-80">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{job.client_name}</span>
                </div>
              )}
            </div>

            <div className={`flex border-b text-xs font-mono font-semibold ${isDarkBg ? 'border-slate-800' : 'border-neutral-200'}`}>
              <button
                type="button"
                onClick={() => setLeftPanelTab("description")}
                className={`flex-1 pb-2.5 text-center uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  leftPanelTab === "description"
                    ? `border-emerald-600 ${theme.primaryText} font-bold`
                    : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-350"
                }`}
              >
                Job Description
              </button>
              <button
                type="button"
                onClick={() => setLeftPanelTab("queries")}
                className={`flex-1 pb-2.5 text-center uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  leftPanelTab === "queries"
                    ? `border-emerald-600 ${theme.primaryText} font-bold`
                    : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-slate-350"
                }`}
              >
                Queries & Support
              </button>
            </div>

            {leftPanelTab === "description" ? (
              <div className="space-y-4">
                <div className={`grid grid-cols-2 gap-3 p-3 border rounded-sm text-[11px] font-mono opacity-90 ${isDarkBg ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-neutral-50 border-neutral-200 text-neutral-600'}`}>
                  {job.salary_range && (
                    <div className="space-y-0.5">
                      <span className="text-[9px] opacity-65 uppercase font-semibold block">Salary Range</span>
                      <span className="flex items-center gap-0.5">{job.salary_range}</span>
                    </div>
                  )}
                  {job.keywords && job.keywords.length > 0 && (
                    <div className="space-y-0.5">
                      <span className="text-[9px] opacity-65 uppercase font-semibold block">Key Tags</span>
                      <span className="truncate block" title={job.keywords.join(", ")}>{job.keywords.slice(0, 2).join(", ")}</span>
                    </div>
                  )}
                </div>

                {job.description && (
                  <div className={`space-y-1.5 border-t pt-3 ${isDarkBg ? 'border-slate-800' : 'border-neutral-150'}`}>
                    <h4 className="text-[10px] font-bold opacity-75 uppercase tracking-wider font-mono">Role Overview</h4>
                    <p className="text-xs leading-relaxed whitespace-pre-line opacity-85">{job.description}</p>
                  </div>
                )}

                {job.responsibilities && job.responsibilities.length > 0 && (
                  <div className={`space-y-2 border-t pt-3 ${isDarkBg ? 'border-slate-800' : 'border-neutral-150'}`}>
                    <h4 className="text-[10px] font-bold opacity-75 uppercase tracking-wider font-mono">Key Responsibilities</h4>
                    <ul className="list-disc pl-4 text-xs space-y-1.5 opacity-85">
                      {job.responsibilities.map((resp: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{resp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {job.qualifications && job.qualifications.length > 0 && (
                  <div className={`space-y-2 border-t pt-3 ${isDarkBg ? 'border-slate-800' : 'border-neutral-150'}`}>
                    <h4 className="text-[10px] font-bold opacity-75 uppercase tracking-wider font-mono">Preferred Qualifications</h4>
                    <ul className="list-disc pl-4 text-xs space-y-1.5 opacity-85">
                      {job.qualifications.map((qual: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{qual}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                <form onSubmit={handleSendCandidateQuery} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase tracking-wider block font-bold text-[9.5px] font-mono">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="candidate@example.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-sm outline-none transition-colors bg-white dark:bg-stone-900 border-neutral-200 dark:border-neutral-800`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase tracking-wider block font-bold text-[9.5px] font-mono">Your Question *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Ask about salary, qualifications, remote, tech stack..."
                      value={chatbotQueryText}
                      onChange={(e) => setChatbotQueryText(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-sm outline-none transition-colors bg-white dark:bg-stone-900 border-neutral-200 dark:border-neutral-800`}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSendingQuery || !candidateEmail.trim() || !chatbotQueryText.trim()}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {isSendingQuery ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Submit Question</span>
                      )}
                    </button>
                  </div>
                </form>

                <div className={`border-t pt-4 ${isDarkBg ? 'border-slate-800' : 'border-neutral-200'}`}>
                  <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-slate-200 mb-3">Your Submitted Queries</h3>
                  {!candidateEmail.trim() ? (
                    <p className="text-neutral-450 dark:text-slate-500 text-xs italic text-center py-4">Enter your email address above to view your query history.</p>
                  ) : loadingQueries ? (
                    <div className="text-center py-6 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                      <span className="text-neutral-400 font-mono text-[9px] uppercase tracking-wider">Retrieving query logs...</span>
                    </div>
                  ) : candidateQueries.length === 0 ? (
                    <p className="text-neutral-450 dark:text-slate-500 text-xs italic text-center py-4">No queries submitted yet for this email.</p>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {candidateQueries.map((q) => (
                        <div
                          key={q.id}
                          className={`p-3 border rounded-sm space-y-2 text-xs transition-all ${
                            isDarkBg ? 'bg-slate-900/50 border-slate-800 text-slate-350 shadow-xs' : 'bg-neutral-50/50 border-neutral-200 text-neutral-600 shadow-xs'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-semibold break-words max-w-[70%]">{q.query_text}</span>
                            {q.is_resolved ? (
                              <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider text-success bg-success/10 border border-success/20 rounded-xs shrink-0">Resolved</span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-250 rounded-xs shrink-0">Pending Review</span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-450 font-mono">Submitted: {new Date(q.created_at).toLocaleDateString()}</p>
                          {q.ai_response && (
                            <div className={`p-2 rounded-xs border text-[11px] leading-relaxed ${isDarkBg ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-neutral-150 text-neutral-800'}`}>
                              <span className="font-mono text-[8px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block font-bold mb-1">Reply from Team / AI:</span>
                              {q.ai_response}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-7 space-y-4">
          <div className={`border rounded-sm p-6 shadow-xs transition-colors duration-250 ${resolvedCardClass}`}>
            <div className={`border-b pb-4 mb-4 flex items-center justify-between ${isDarkBg ? 'border-slate-800' : 'border-neutral-200'}`}>
              <div className="space-y-0.5">
                <h3 className="font-tight font-black text-sm uppercase tracking-wider">Apply for this position</h3>
                <p className="opacity-60 text-xs">Fill out the details below. {fields.some(f => f.id === "resume" && f.enabled) && "Uploading a resume auto-fills the form."}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQueryModalOpen(true)}
                  className={`px-2.5 py-1.5 border rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                    isDarkBg ? 'border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-200 bg-slate-900' : 'border-neutral-350 hover:bg-neutral-100 text-neutral-650 bg-white'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Queries
                </button>
                <Sparkles className={`w-5 h-5 opacity-80 ${theme.primaryText}`} />
              </div>
            </div>

            {fields.find(f => f.id === "resume")?.enabled && (
              <div className={`mb-5 p-4 border border-dashed rounded-sm transition-all text-xs ${
                isDarkBg ? 'bg-slate-950 border-slate-700 hover:border-slate-550 text-slate-350 bg-slate-950' : 'bg-neutral-50 border-neutral-250 hover:border-primary/50 hover:bg-primary/5 text-neutral-600 bg-neutral-50'
              }`}>
                <div className="flex flex-col items-center justify-center text-center space-y-2 py-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-xs border ${isDarkBg ? 'bg-slate-900 border-slate-700' : 'bg-white border-neutral-200'}`}>
                    <Upload className="w-4 h-4 opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">Upload your Resume / CV</p>
                    <p className="opacity-50 font-mono text-[9px]">PDF, DOCX, or TXT (Max 5MB)</p>
                  </div>
                  <label className={`mt-1 px-3 py-1.5 border font-semibold rounded-sm cursor-pointer shadow-xs transition-colors inline-flex items-center gap-1.5 ${
                    isDarkBg ? 'border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-100' : 'border-neutral-300 hover:border-primary bg-white text-neutral-700'
                  }`}>
                    Choose File
                    <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                {isExtracting && (
                  <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-sm flex items-center justify-center gap-2 text-emerald-500 font-semibold font-mono text-[10px] animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Parsing resume profile parameters...</span>
                  </div>
                )}

                {!isExtracting && resumeFileName && (
                  <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-sm flex items-center justify-between text-emerald-500 font-semibold font-mono text-[10px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle className="w-4 h-4" />
                      <span className="truncate">{resumeFileName}</span>
                    </div>
                    <button type="button" onClick={() => { setResumeFileName(""); setResumeUrl(""); setParseNotice(null); }} className="text-red-500 font-bold underline hover:text-red-400 cursor-pointer shrink-0 ml-2">Reset File</button>
                  </div>
                )}

                {parseNotice && (
                  <div className={`mt-3 p-2.5 border rounded-sm text-[10.5px] leading-relaxed italic ${isDarkBg ? 'bg-slate-950 border-slate-800 text-slate-400 bg-slate-950' : 'bg-neutral-100 border-neutral-200 text-neutral-600 bg-neutral-100'}`}>
                    {parseNotice}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitCandidate} className="space-y-4 text-xs font-sans">
              {fields.map((field) => {
                if (field.id === "resume" || !field.enabled) return null;
                const inputClass = `w-full px-3 py-2 border rounded-sm focus:ring-1 focus:outline-hidden transition-colors bg-white dark:bg-stone-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100`;
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="text-neutral-450 dark:text-neutral-400 uppercase tracking-wider block font-bold text-[9.5px] font-mono">
                      {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                    </label>
                    {field.type === "select" ? (
                      <select
                        required={field.required}
                        value={field.isCustom ? (customAnswers[field.id] || "") : (fieldValues[field.id] || "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (field.isCustom) setCustomAnswers(prev => ({ ...prev, [field.id]: val }));
                          else setFieldValues(prev => ({ ...prev, [field.id]: val }));
                        }}
                        className={inputClass}
                      >
                        <option value="">Select option...</option>
                        {field.options?.map((opt, oIdx) => <option key={oIdx} value={opt}>{opt}</option>)}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        required={field.required}
                        rows={3}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        value={field.isCustom ? (customAnswers[field.id] || "") : (fieldValues[field.id] || "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (field.isCustom) setCustomAnswers(prev => ({ ...prev, [field.id]: val }));
                          else setFieldValues(prev => ({ ...prev, [field.id]: val }));
                        }}
                        className={inputClass}
                      />
                    ) : field.type === "checkbox" ? (
                      <label className="flex items-center gap-2.5 py-1 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          required={field.required}
                          checked={field.isCustom ? (customAnswers[field.id] === "true") : (fieldValues[field.id] === true || fieldValues[field.id] === "true")}
                          onChange={(e) => {
                            const checkedVal = e.target.checked ? "true" : "false";
                            if (field.isCustom) setCustomAnswers(prev => ({ ...prev, [field.id]: checkedVal }));
                            else setFieldValues(prev => ({ ...prev, [field.id]: e.target.checked }));
                          }}
                          className="w-4 h-4 accent-emerald-600 rounded-xs cursor-pointer border-neutral-350"
                        />
                        <span className={`${isDarkBg ? 'text-slate-350' : 'text-neutral-550'} font-semibold text-xs leading-normal`}>
                          {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                        </span>
                      </label>
                    ) : (
                      <input
                        type={field.type}
                        required={field.required}
                        placeholder={`e.g. ${field.label}`}
                        value={field.isCustom ? (customAnswers[field.id] || "") : (fieldValues[field.id] || "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (field.isCustom) setCustomAnswers(prev => ({ ...prev, [field.id]: val }));
                          else setFieldValues(prev => ({ ...prev, [field.id]: val }));
                        }}
                        className={inputClass}
                      />
                    )}
                  </div>
                );
              })}
              {rawText && (
                <div className="space-y-1">
                  <label className="text-neutral-450 uppercase tracking-wider block font-bold text-[9.5px] font-mono">Parsed Raw Text Profile Outline</label>
                  <textarea readOnly rows={2} value={rawText} className={`w-full px-3 py-2 border rounded-sm font-mono text-[10px] select-all cursor-text focus:outline-hidden ${isDarkBg ? 'bg-slate-950 border-slate-800 text-slate-400 bg-slate-950' : 'bg-neutral-50 border-neutral-150 text-neutral-500 bg-neutral-50'}`} />
                </div>
              )}
              <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 mt-4">
                <label className={`flex items-start gap-2.5 text-[11px] leading-normal cursor-pointer select-none ${isDarkBg ? 'text-slate-400' : 'text-neutral-500'}`}>
                  <input type="checkbox" checked={consent} required onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 rounded-sm accent-emerald-600 border-neutral-350 cursor-pointer" />
                  <span>I consent to having my profile processed, structured, and matched against job requirement parameters using machine intelligence algorithms. *</span>
                </label>
              </div>
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200/50 rounded-sm text-red-650 font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
              <div className={`pt-3 border-t flex justify-end gap-3 ${isDarkBg ? 'border-slate-800' : 'border-neutral-150'}`}>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 font-bold uppercase tracking-wider rounded-sm shadow-xs hover:shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 ${theme.primary}`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    );
  };

  const renderQueryModal = () => {
    return (
      <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
        <div className={`border w-full max-w-md p-6 rounded-sm shadow-xl space-y-4 text-xs ${
          isDarkBg ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/50 bg-stone-900' : 'bg-white border-neutral-200 text-neutral-800'
        }`}>
          <div className="flex justify-between items-center border-b border-neutral-200/50 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-emerald-650" />
              Submit a Query to Recruiter
            </div>
            <button type="button" onClick={() => setIsQueryModalOpen(false)} className="text-neutral-450 hover:text-neutral-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSendModalQuery} className="space-y-4">
            <div className="space-y-1">
              <label className="text-neutral-450 uppercase font-bold tracking-wider text-[10.5px] font-mono block">Email Address *</label>
              <input
                type="email"
                required
                placeholder="candidate@example.com"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-sm outline-none transition-colors ${
                  isDarkBg ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-605 bg-slate-955' : 'bg-white border-neutral-200 text-neutral-800 focus:border-emerald-650'
                }`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-neutral-450 uppercase font-bold tracking-wider text-[10.5px] font-mono block">Your Question *</label>
              <textarea
                required
                rows={4}
                placeholder="Ask about salary, qualifications, remote, tech stack..."
                value={modalQueryText}
                onChange={(e) => setModalQueryText(e.target.value)}
                className={`w-full px-3 py-2 border rounded-sm outline-none transition-colors resize-none ${
                  isDarkBg ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-650 bg-slate-955' : 'bg-white border-neutral-200 text-neutral-800 focus:border-emerald-650'
                }`}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsQueryModalOpen(false)}
                className={`px-3 py-1.5 border rounded-sm font-mono text-[10px] uppercase font-bold cursor-pointer transition-colors ${
                  isDarkBg ? 'border-slate-800 hover:bg-slate-800 text-slate-400 bg-stone-900' : 'border-neutral-200 hover:bg-neutral-50 text-neutral-500 bg-white'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingQuery || !candidateEmail.trim() || !modalQueryText.trim()}
                className="px-4 py-1.5 bg-primary hover:opacity-90 disabled:opacity-50 text-white font-mono text-[10px] uppercase font-bold tracking-wider rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isSendingQuery && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Send Query
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${resolvedBgClass} font-sans flex flex-col transition-colors duration-250`}>
      {isEditMode && renderStudioHeader()}
      <div className="flex-1 flex flex-col lg:flex-row">
        {mode === "design" && isEditMode ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
            <div className="lg:col-span-8 p-6 md:p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-56px)] bg-neutral-50 dark:bg-stone-950">
              {renderDesignerCanvas()}
            </div>
            <div className="lg:col-span-4 border-l border-neutral-200 dark:border-neutral-800 p-6 space-y-6 bg-white dark:bg-stone-900 overflow-y-auto max-h-[calc(100vh-56px)] select-none flex flex-col">
              {renderSidebar()}
            </div>
          </div>
        ) : (
          renderLivePreview()
        )}
      </div>
      {isQueryModalOpen && renderQueryModal()}
    </div>
  );
}
