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
  ChevronRight, ChevronDown, CheckSquare, List, RefreshCw, Pencil, MessageSquare
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
    primary: "bg-emerald-700 hover:bg-emerald-800 text-white",
    primaryText: "text-emerald-700",
    border: "border-emerald-150",
    accent: "bg-emerald-50 text-emerald-800 border-emerald-200",
    bg: "bg-[#f4f7f6]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-emerald-600",
    ring: "focus:ring-emerald-600 focus:border-emerald-600",
    badge: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    studioHeader: "bg-emerald-950 text-emerald-100",
  },
  indigo: {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    primaryText: "text-indigo-600",
    border: "border-indigo-150",
    accent: "bg-indigo-50 text-indigo-700 border-indigo-200",
    bg: "bg-slate-50",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-indigo-600",
    ring: "focus:ring-indigo-600 focus:border-indigo-600",
    badge: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    studioHeader: "bg-indigo-950 text-indigo-100",
  },
  dark: {
    primary: "bg-slate-700 hover:bg-slate-650 text-white border border-slate-600",
    primaryText: "text-slate-200",
    border: "border-slate-800",
    accent: "bg-slate-800 text-slate-355 border-slate-800",
    bg: "bg-slate-950 text-slate-100",
    card: "bg-slate-900 border-slate-800 text-slate-100",
    accentBorder: "border-slate-500",
    ring: "focus:ring-slate-500 focus:border-slate-500 bg-slate-950 text-slate-100",
    badge: "bg-slate-800 text-slate-200 border border-slate-700",
    studioHeader: "bg-slate-900 text-slate-100 border-b border-slate-800",
  },
  amber: {
    primary: "bg-amber-600 hover:bg-amber-700 text-white",
    primaryText: "text-amber-800",
    border: "border-amber-150",
    accent: "bg-amber-50 text-amber-800 border-amber-200",
    bg: "bg-[#fdfbf7]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-amber-600",
    ring: "focus:ring-amber-600 focus:border-amber-600",
    badge: "bg-amber-50 text-amber-800 border border-amber-200",
    studioHeader: "bg-amber-950 text-amber-100",
  },
  rose: {
    primary: "bg-rose-600 hover:bg-rose-700 text-white",
    primaryText: "text-rose-600",
    border: "border-rose-150",
    accent: "bg-rose-50 text-rose-800 border-rose-200",
    bg: "bg-[#fff1f2]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-rose-600",
    ring: "focus:ring-rose-600 focus:border-rose-600",
    badge: "bg-rose-50 text-rose-800 border border-rose-200",
    studioHeader: "bg-rose-955 text-rose-100",
  },
  cyber: {
    primary: "bg-purple-600 hover:bg-purple-700 text-white border border-purple-500",
    primaryText: "text-purple-600",
    border: "border-purple-200",
    accent: "bg-purple-50 text-purple-700 border-purple-200",
    bg: "bg-[#FAF5FF]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-purple-600",
    ring: "focus:ring-purple-600 focus:border-purple-600",
    badge: "bg-purple-50 text-purple-750 border border-purple-200",
    studioHeader: "bg-purple-955 text-purple-100",
  },
  ocean: {
    primary: "bg-cyan-700 hover:bg-cyan-800 text-white",
    primaryText: "text-cyan-700",
    border: "border-cyan-150",
    accent: "bg-cyan-50 text-cyan-800 border-cyan-200",
    bg: "bg-[#ecfeff]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-cyan-600",
    ring: "focus:ring-cyan-600 focus:border-cyan-600",
    badge: "bg-cyan-50 text-cyan-800 border border-cyan-200",
    studioHeader: "bg-cyan-955 text-cyan-100",
  },
  sunset: {
    primary: "bg-orange-600 hover:bg-orange-700 text-white",
    primaryText: "text-orange-600",
    border: "border-orange-150",
    accent: "bg-orange-50 text-orange-850 border-orange-200",
    bg: "bg-[#fff7ed]",
    card: "bg-white border-neutral-200 text-neutral-800",
    accentBorder: "border-orange-600",
    ring: "focus:ring-orange-600 focus:border-orange-600",
    badge: "bg-orange-50 text-orange-800 border border-orange-200",
    studioHeader: "bg-orange-955 text-orange-100",
  }
};

export default function PublicApplyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params?.jobId as string;
  const recruiterId = searchParams ? searchParams.get("recruiter_id") : null;
  const isEditMode = searchParams ? searchParams.get("edit") === "true" : false;

  // App mode: "design" (Studio Designer) or "preview" (Candidate View)
  // By default, if accessed with edit=true, load designer. Otherwise load candidate view.
  const [mode, setMode] = useState<"design" | "preview">("preview");

  // Load configuration from local storage or set defaults
  const [fields, setFields] = useState<FormFieldConfig[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<"pine" | "indigo" | "dark" | "amber" | "rose" | "cyber" | "ocean" | "sunset">("sunset");
  const [bgMode, setBgMode] = useState<"light" | "dark">("light");

  // Job opening state
  const [job, setJob] = useState<any>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [errorJob, setErrorJob] = useState<string | null>(null);

  // Form states (Candidate responses)
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
  
  // Custom fields answers mapping
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  // File parsing states
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");

  // Form submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  // Card editing states
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>("");
  const [editingOptions, setEditingOptions] = useState<string>("");
  const [editingType, setEditingType] = useState<string>("text");

  // Designer local editing states
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<string>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Support Form & Queries States
  const [candidateEmail, setCandidateEmail] = useState("");
  const [chatbotQueryText, setChatbotQueryText] = useState("");
  const [candidateQueries, setCandidateQueries] = useState<any[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<"description" | "queries">("description");
  const [isSendingQuery, setIsSendingQuery] = useState(false);

  // Sync candidate email from main form values if filled
  useEffect(() => {
    if (fieldValues.email && !candidateEmail) {
      setCandidateEmail(fieldValues.email);
    }
  }, [fieldValues.email, candidateEmail]);

  // Load saved email on startup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem(`cand_email_query_${jobId}`) || localStorage.getItem("cand_email_general") || "";
      if (savedEmail) {
        setCandidateEmail(savedEmail);
      }
    }
  }, [jobId]);

  // Fetch queries for this specific candidate email when Queries tab is active
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

  // Active theme properties
  const theme = themes[selectedTheme];
  const isDarkBg = bgMode === "dark";
  const resolvedBgClass = isDarkBg ? "bg-slate-950 text-slate-100" : (selectedTheme === "dark" ? "bg-slate-50" : theme.bg);
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

  // Fetch job details on load
  useEffect(() => {
    if (!jobId) return;
    
    const fetchJobDetails = async () => {
      try {
        setLoadingJob(true);
        setErrorJob(null);
        const result = await apiRequest<any>("GET", `/jobs/${jobId}`);
        setJob(result);
        
        // If edit=true exists in URL, set mode to design by default
        if (isEditMode) {
          setMode("design");
        }
      } catch (err: any) {
        console.error("Error fetching job details:", err);
        setErrorJob(err.message || "Failed to load job details. The job opening may not exist or has been archived.");
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJobDetails();
  }, [jobId, recruiterId, isEditMode]);

  // Load/Save Configuration from localStorage
  useEffect(() => {
    if (!jobId) return;
    const localConfig = localStorage.getItem(`form_config_${jobId}`);
    const localTheme = localStorage.getItem(`form_theme_${jobId}`);
    const localBgMode = localStorage.getItem(`form_bg_mode_${jobId}`);
    
    if (localConfig) {
      try {
        setFields(JSON.parse(localConfig));
      } catch (e) {
        setFields([...defaultFields]);
      }
    } else {
      setFields([...defaultFields]);
    }

    if (localTheme && Object.keys(themes).includes(localTheme)) {
      setSelectedTheme(localTheme as any);
    }

    if (localBgMode === "light" || localBgMode === "dark") {
      setBgMode(localBgMode);
    }
  }, [jobId]);

  const handleSaveConfig = (customFieldsList = fields, customTheme = selectedTheme, customBgMode = bgMode) => {
    localStorage.setItem(`form_config_${jobId}`, JSON.stringify(customFieldsList));
    localStorage.setItem(`form_theme_${jobId}`, customTheme);
    localStorage.setItem(`form_bg_mode_${jobId}`, customBgMode);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleResetToDefault = () => {
    if (window.confirm("Are you sure you want to reset the form design to default? All custom fields will be removed.")) {
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

  // Reordering fields
  const moveField = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= fields.length) return;
    
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    
    setFields(updated);
    handleSaveConfig(updated);
  };

  // Toggling standard field settings
  const toggleFieldProp = (id: string, prop: "enabled" | "required") => {
    // Basic validation: Full Name and Email must be enabled and required
    if ((id === "full_name" || id === "email") && (prop === "enabled" || prop === "required")) {
      return; 
    }

    const updated = fields.map(f => {
      if (f.id === id) {
        return { ...f, [prop]: !f[prop] };
      }
      return f;
    });
    setFields(updated);
    handleSaveConfig(updated);
  };

  // Add custom field
  const handleAddCustomField = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFieldName.trim()) return;

    const newId = `custom_${Date.now()}`;
    const optionsArray = newFieldOptions
      ? newFieldOptions.split(",").map(o => o.trim()).filter(Boolean)
      : undefined;

    const newField: FormFieldConfig = {
      id: newId,
      label: newFieldName.trim(),
      type: newFieldType,
      enabled: true,
      required: false,
      isCustom: true,
      options: optionsArray
    };

    const updated = [...fields, newField];
    setFields(updated);
    setNewFieldName("");
    setNewFieldOptions("");
    handleSaveConfig(updated);
  };

  // Add AI suggested question
  const handleAddSuggestedQuestion = (label: string, type: string, options?: string[]) => {
    const newId = `custom_${Date.now()}`;
    const newField: FormFieldConfig = {
      id: newId,
      label: label,
      type: type,
      enabled: true,
      required: false,
      isCustom: true,
      options: options
    };
    const updated = [...fields, newField];
    setFields(updated);
    handleSaveConfig(updated);
  };

  // Delete custom field
  const handleDeleteCustomField = (id: string) => {
    const updated = fields.filter(f => f.id !== id);
    setFields(updated);
    handleSaveConfig(updated);
  };

  // AI-Powered Insights Engine
  const aiInsights = useMemo(() => {
    if (!job) return null;
    
    const title = (job.title || "").toLowerCase();
    const desc = (job.description || "").toLowerCase();
    const skillsList = job.keywords || [];
    
    const insightsList: string[] = [];
    const questionSuggestions: { label: string; type: string; options?: string[] }[] = [];
    
    // 1. Seniority Insights
    if (title.includes("lead") || title.includes("senior") || title.includes("director") || title.includes("manager") || title.includes("patner") || title.includes("partner")) {
      insightsList.push("💡 High-Seniority / Leadership role detected. We recommend making Achievements and Executive Summary required fields to capture key career impacts.");
      questionSuggestions.push({
        label: "Describe a major leadership project you delivered from concept to completion.",
        type: "textarea"
      });
      questionSuggestions.push({
        label: "How many years of experience do you have managing stakeholders/clients directly?",
        type: "number"
      });
    } else if (title.includes("junior") || title.includes("associate") || title.includes("intern")) {
      insightsList.push("💡 Entry-level / Junior role detected. We recommend enabling Academic Details and requiring Education to assess academic foundations.");
      questionSuggestions.push({
        label: "What was your GPA or equivalent score in your highest qualification?",
        type: "text"
      });
    } else {
      insightsList.push("💡 Mid-Level role detected. Standard fields work best, with an emphasis on specific skill endorsements.");
    }

    // 2. Swiggy / Delivery / Logistics Insights
    if (title.includes("delivery") || title.includes("logistics") || title.includes("swiggy") || desc.includes("delivery") || desc.includes("bike")) {
      insightsList.push("💡 Logistics/Delivery role profile. Ensure Candidate Phone Number and Employment Status are enabled for rapid recruiter outreach.");
      questionSuggestions.push({
        label: "Do you own a valid two-wheeler license and a smartphone?",
        type: "select",
        options: ["Yes, both license & smartphone", "License only", "Smartphone only", "No, neither"]
      });
      questionSuggestions.push({
        label: "Which area/neighborhood in the city are you most comfortable with for deliveries?",
        type: "text"
      });
      questionSuggestions.push({
        label: "Are you willing to work night shifts and weekends?",
        type: "checkbox"
      });
    }

    // 3. Technical / Developer Insights
    if (title.includes("engineer") || title.includes("developer") || title.includes("tech") || desc.includes("react") || desc.includes("software")) {
      insightsList.push("💡 Technical role profile. Ensure the Skills field is active and required. Resume Upload is highly critical.");
      questionSuggestions.push({
        label: "Provide your GitHub Profile or Portfolio URL.",
        type: "text"
      });
      questionSuggestions.push({
        label: "Rate your expertise in React/Next.js/Tailwind CSS.",
        type: "select",
        options: ["Expert (4+ years)", "Proficient (2-3 years)", "Intermediate (1-2 years)", "Beginner / No Experience"]
      });
    }

    // Default general suggestions if question suggestions are dry
    if (questionSuggestions.length < 3) {
      questionSuggestions.push({
        label: "What is your official notice period?",
        type: "select",
        options: ["Immediate (Less than 7 days)", "15 Days", "30 Days", "60 Days", "90 Days"]
      });
      questionSuggestions.push({
        label: "Are you open to hybrid/onsite work arrangements?",
        type: "checkbox"
      });
    }

    return {
      insights: insightsList,
      suggestions: questionSuggestions
    };
  }, [job]);

  // Resume Upload parser
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFileName(file.name);
    setResumeUrl(`/resumes/${file.name}`);
    setIsExtracting(true);
    setParseNotice(null);
    
    try {
      let text = "";
      if (file.type === "text/plain") {
        const reader = new FileReader();
        text = await new Promise<string>((resolve) => {
          reader.onload = (evt) => resolve(evt.target?.result as string || "");
          reader.readAsText(file);
        });
      } else {
        const result = await apiUploadFile("/requirements/parse-file", file);
        text = result.text || "";
      }

      if (text) {
        setRawText(text);
        const parsed = parseResumeTextHeuristically(text);
        
        setFieldValues(prev => ({
          ...prev,
          full_name: parsed.name || prev.full_name,
          email: parsed.email || prev.email,
          phone: parsed.phone || prev.phone,
          skills: parsed.skills || prev.skills,
          experience_years: parsed.experience_years !== undefined ? parsed.experience_years : prev.experience_years,
          education: parsed.education || prev.education,
          academic_details: parsed.academicDetails || prev.academic_details,
          achievements: parsed.achievements || prev.achievements,
          summary: parsed.summary || prev.summary,
        }));

        setParseNotice("Resume parsed successfully! Please review the auto-filled fields below.");
      } else {
        throw new Error("No text content could be extracted from this resume.");
      }
    } catch (err: any) {
      console.error("Resume extraction failed:", err);
      setParseNotice("Resume parsing failed. Please fill out the form details manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Submit Candidate Form
  const handleSubmitCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setSubmitError("Please consent to the processing of your application.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Format skills
    const skillsList = fieldValues.skills
      ? fieldValues.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    // Bundle custom questions responses
    const customFormResponses = fields
      .filter(f => f.enabled && f.isCustom)
      .map(f => ({
        field_id: f.id,
        question: f.label,
        response: customAnswers[f.id] || ""
      }));

    // Standard payload mapping
    const payload: Record<string, any> = {
      full_name: fieldValues.full_name,
      email: fieldValues.email,
      phone: fieldValues.phone || null,
      skills: skillsList,
      experience_years: Number(fieldValues.experience_years) || 0,
      resume_url: resumeUrl || null,
      raw_text: rawText || null,
      education: fieldValues.education || null,
      working_or_not: fieldValues.working_or_not === "true" || fieldValues.working_or_not === true,
      academic_details: fieldValues.academic_details || null,
      achievements: fieldValues.achievements || null,
      source: "manual",
      summary: fieldValues.summary || null,
      job_id: jobId,
      uploaded_by: recruiterId || job?.created_by || null,
      parsed_resume_json: {
        custom_form_responses: customFormResponses
      }
    };

    // If in Live Preview Mode, intercept and show mock success dialog
    if (mode === "design" || (searchParams && searchParams.get("preview") === "true")) {
      setTimeout(() => {
        setSubmitSuccess(true);
        setSubmitting(false);
      }, 1000);
      return;
    }

    try {
      await apiRequest("POST", "/candidates", payload);
      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Failed to submit candidate profile:", err);
      setSubmitError(err.message || "Failed to submit your application. Please check your inputs and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans p-6 select-none">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-[#004D40] animate-spin mx-auto" />
          <p className="text-neutral-500 font-mono text-xs uppercase tracking-wider animate-pulse">
            Retrieving Mandate Posting Parameters...
          </p>
        </div>
      </div>
    );
  }

  if (errorJob || !job) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-neutral-white border border-neutral-200 rounded-sm p-6 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-error mx-auto" />
          <div className="space-y-1.5">
            <h3 className="font-tight font-bold text-base text-neutral-800 uppercase tracking-wider">
              Posting Unavailable
            </h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              {errorJob || "The requested job opening details could not be retrieved. It may have been closed or deleted."}
            </p>
          </div>
          <button
            onClick={() => router.refresh()}
            className="w-full py-2 bg-primary text-neutral-white font-medium text-xs rounded-sm hover:bg-primary/95 transition-colors cursor-pointer uppercase tracking-wider"
          >
            Retry Loading Page
          </button>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-neutral-white border border-neutral-200 rounded-sm p-8 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-tight font-bold text-lg text-neutral-800 uppercase tracking-wider">
              {mode === "design" ? "Preview Submission Success!" : "Application Submitted!"}
            </h3>
            <p className="text-neutral-500 text-xs leading-relaxed">
              {mode === "design"
                ? "Form design validation succeeded. This mock application has been successfully compiled and verified."
                : `Thank you for applying, ${fieldValues.full_name || "Applicant"}. Your profile details have been securely logged in our recruitment engine.`}
            </p>
            <div className="bg-neutral-50 border border-neutral-150 p-3 rounded-sm font-mono text-[11px] text-left text-neutral-600 space-y-1.5 mt-2">
              <div><span className="text-neutral-400 font-semibold uppercase block text-[9px]">Applied For</span> {job.title}</div>
              {job.client_name && (
                <div><span className="text-neutral-400 font-semibold uppercase block text-[9px] mt-1">Client Org</span> {job.client_name}</div>
              )}
            </div>
            
            {mode === "design" ? (
              <button
                type="button"
                onClick={() => {
                  setSubmitSuccess(false);
                  setFieldValues({
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
                  setCustomAnswers({});
                  setResumeFileName("");
                  setResumeUrl("");
                }}
                className={`mt-4 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm ${theme.primary}`}
              >
                Back to Designer
              </button>
            ) : (
              <p className="text-neutral-450 text-[10px] italic pt-1.5">
                Our automated matching pipeline and screening agents will evaluate your credentials shortly.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${resolvedBgClass} font-sans flex flex-col transition-colors duration-250`}>
      {/* Studio Header (Only shown when edit=true is present to manage form) */}
      {isEditMode && (
        <div className={`px-6 py-3 flex items-center justify-between border-b ${theme.studioHeader} transition-colors duration-250`}>
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-600 text-white w-6 h-6 rounded-xs flex items-center justify-center text-xs font-black">
              FS
            </div>
            <div>
              <h2 className="font-tight font-black text-xs uppercase tracking-wider">Kozker Form Studio</h2>
              <p className="text-[9px] font-mono text-neutral-400 uppercase">Hiring Mandate Form Editor & AI Assistent</p>
            </div>
          </div>

          {/* Mode Switcher Toggle */}
          <div className="flex items-center gap-4">
            <div className="bg-neutral-900/60 p-0.5 rounded-sm flex border border-neutral-800">
              <button
                onClick={() => setMode("design")}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                  mode === "design" 
                    ? "bg-neutral-800 text-white shadow-xs" 
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Settings className="w-3 h-3" />
                Designer
              </button>
              <button
                onClick={() => setMode("preview")}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-1 cursor-pointer ${
                  mode === "preview" 
                    ? "bg-neutral-800 text-white shadow-xs" 
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Eye className="w-3 h-3" />
                Live Preview
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {saveSuccess ? (
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-1 rounded-sm text-[9.5px] font-mono font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              ) : (
                <button
                  onClick={() => handleSaveConfig()}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                >
                  Save Config
                </button>
              )}
              <button
                onClick={handleResetToDefault}
                className="px-2 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                title="Reset to default fields"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* DESIGNER PANEL VIEW: 3-column view */}
        {mode === "design" && isEditMode ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
            
            {/* COLUMN 1: Job Details & AI Insights (Col span: 4) */}
            <div className="lg:col-span-4 border-r border-neutral-200 p-5 space-y-5 bg-white/50 backdrop-blur-xs overflow-y-auto max-h-[calc(100vh-56px)] select-none">
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-sm">
                  Active Target Opening
                </span>
                <h3 className="font-tight font-black text-sm text-neutral-800 leading-tight">
                  {job.title}
                </h3>
                {job.client_name && (
                  <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                    <Building2 className="w-3.5 h-3.5 text-neutral-450" />
                    <span>{job.client_name}</span>
                  </div>
                )}
              </div>

              {/* AI-Insights Block */}
              {aiInsights && (
                <div className="space-y-4">
                  <div className="border-t border-neutral-200 pt-4">
                    <h4 className="text-[10px] font-black text-neutral-450 uppercase tracking-widest font-mono flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      AI Optimization Insights
                    </h4>
                    
                    <div className="mt-2.5 space-y-2">
                      {aiInsights.insights.map((insight, idx) => (
                        <div key={idx} className="p-3 bg-amber-50/75 border border-amber-200/50 rounded-sm text-amber-900 text-xs leading-relaxed">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Questions Suggestions */}
                  <div className="border-t border-neutral-200 pt-4">
                    <h4 className="text-[10px] font-black text-neutral-450 uppercase tracking-widest font-mono flex items-center gap-1 mb-2">
                      <Sparkle className="w-3.5 h-3.5 text-emerald-600" />
                      AI Screening Recommendations
                    </h4>
                    <p className="text-neutral-400 text-[10.5px] leading-relaxed italic mb-3">
                      Add these tailored custom screening fields based on the job requirements to filter applications:
                    </p>

                    <div className="space-y-2">
                      {aiInsights.suggestions.map((sug, idx) => (
                        <div key={idx} className="p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-sm flex flex-col justify-between gap-2.5 transition-colors">
                          <div className="space-y-1">
                            <span className="px-1.5 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-wider text-neutral-500 bg-neutral-200 border border-neutral-250 rounded-xs">
                              {sug.type}
                            </span>
                            <p className="text-neutral-700 text-xs font-semibold leading-relaxed">
                              {sug.label}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSuggestedQuestion(sug.label, sug.type, sug.options)}
                            className="self-end px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-250 hover:border-emerald-350 text-[9.5px] font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer flex items-center gap-1"
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

            {/* COLUMN 2: Interactive Form Canvas Editor (Col span: 5) */}
            <div className="lg:col-span-5 border-r border-neutral-200 p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-56px)] bg-neutral-50/50">
              <div className="border-b border-neutral-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800">Form Designer Canvas</h3>
                  <p className="text-[10px] text-neutral-400">Order, enable, or require fields dynamically.</p>
                </div>
                <Layout className="w-5 h-5 text-neutral-400" />
              </div>

              {/* Drag/Reorder Canvas Container */}
              <div className="space-y-2.5">
                {fields.map((field, idx) => {
                  const isCore = field.id === "full_name" || field.id === "email";
                  const isEditing = editingFieldId === field.id;

                  if (isEditing) {
                    return (
                      <div 
                        key={field.id} 
                        className="p-3.5 rounded-sm border bg-white border-emerald-600 shadow-md space-y-3"
                      >
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="text-[9px] uppercase font-mono text-neutral-450 block font-bold mb-0.5">Field Label</label>
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-neutral-200 rounded-xs text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                            />
                          </div>

                          {field.isCustom && (
                            <div>
                              <label className="text-[9px] uppercase font-mono text-neutral-450 block font-bold mb-0.5">Field Type</label>
                              <select
                                value={editingType}
                                onChange={(e) => setEditingType(e.target.value)}
                                className="w-full px-2.5 py-1 text-xs border border-neutral-200 bg-white rounded-xs text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
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
                              <label className="text-[9px] uppercase font-mono text-neutral-450 block font-bold mb-0.5">Dropdown Options (Comma separated)</label>
                              <input
                                type="text"
                                value={editingOptions}
                                onChange={(e) => setEditingOptions(e.target.value)}
                                placeholder="e.g. Option 1, Option 2, Option 3"
                                className="w-full px-2.5 py-1 text-xs border border-neutral-200 rounded-xs text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 justify-end pt-1">
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
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-[9px] uppercase rounded-xs cursor-pointer"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFieldId(null)}
                            className="px-2.5 py-1 border border-neutral-200 text-neutral-500 hover:bg-neutral-50 font-mono text-[9px] uppercase rounded-xs cursor-pointer"
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
                      className={`p-3.5 rounded-sm border transition-all flex items-center justify-between ${
                        field.enabled 
                          ? "bg-white border-neutral-200 shadow-xs" 
                          : "bg-neutral-100 border-neutral-200/60 opacity-60"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-neutral-800 truncate">
                            {field.label}
                          </span>
                          
                          {field.required && (
                            <span className="text-red-500 text-xs font-bold" title="Required">*</span>
                          )}
                          
                          {field.isCustom && (
                            <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 rounded-xs">
                              Custom
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-[9px] font-mono text-neutral-400 uppercase">
                          <span>ID: {field.id}</span>
                          <span>•</span>
                          <span>Type: {field.type}</span>
                        </div>
                      </div>

                      {/* Field Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Edit card label/options details */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFieldId(field.id);
                            setEditingLabel(field.label);
                            setEditingType(field.type);
                            setEditingOptions(field.options ? field.options.join(", ") : "");
                          }}
                          className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 rounded-sm border border-neutral-200 transition-colors cursor-pointer"
                          title="Edit Card Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Order Reordering */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveField(idx, "up")}
                            disabled={idx === 0}
                            className="p-0.5 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-30 rounded-xs text-neutral-500 border border-neutral-200 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveField(idx, "down")}
                            disabled={idx === fields.length - 1}
                            className="p-0.5 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-30 rounded-xs text-neutral-500 border border-neutral-200 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-col gap-1 pl-1">
                          {/* Enabled Toggle */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[9.5px] font-mono font-bold text-neutral-500">
                            <input
                              type="checkbox"
                              checked={field.enabled}
                              disabled={isCore}
                              onChange={() => toggleFieldProp(field.id, "enabled")}
                              className="w-3 h-3 accent-emerald-600 rounded-sm border-neutral-350 cursor-pointer"
                            />
                            <span>Show</span>
                          </label>

                          {/* Required Toggle */}
                          <label className="flex items-center gap-1.5 cursor-pointer text-[9.5px] font-mono font-bold text-neutral-500">
                            <input
                              type="checkbox"
                              checked={field.required}
                              disabled={isCore || !field.enabled}
                              onChange={() => toggleFieldProp(field.id, "required")}
                              className="w-3 h-3 accent-emerald-600 rounded-sm border-neutral-350 cursor-pointer"
                            />
                            <span>Require</span>
                          </label>
                        </div>

                        {/* Custom Fields - Delete option */}
                        {field.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomField(field.id)}
                            className="p-2 ml-1 text-neutral-400 hover:text-red-650 hover:bg-red-50 rounded-sm transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                            title="Delete Custom Field"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-neutral-450 hover:text-red-550" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 3: Toolbox & Custom Field Inserter (Col span: 3) */}
            <div className="lg:col-span-3 p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-56px)] bg-white select-none">
              
              {/* Insert Custom Field */}
              <div className="space-y-4">
                <div className="border-b border-neutral-200 pb-2.5">
                  <h3 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-primary" />
                    Insert Custom Field
                  </h3>
                  <p className="text-[10px] text-neutral-400">Append custom questions to candidate forms.</p>
                </div>

                <form onSubmit={handleAddCustomField} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase tracking-wider block font-bold text-[9px] font-mono">Field Name / Question Label *</label>
                    <input
                      type="text"
                      placeholder="e.g. Notice Period"
                      required
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-sm text-neutral-800 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase tracking-wider block font-bold text-[9px] font-mono">Field Input Type</label>
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-sm text-neutral-800 bg-white focus:ring-1 focus:ring-primary focus:outline-hidden"
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
                      <label className="text-neutral-400 uppercase tracking-wider block font-bold text-[9px] font-mono">Dropdown Options (Comma separated) *</label>
                      <input
                        type="text"
                        placeholder="Option 1, Option 2, Option 3"
                        required
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-sm text-neutral-800 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary focus:outline-hidden"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] uppercase tracking-wider rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Insert Field Card
                  </button>
                </form>
              </div>

              {/* Form Theme Customizer */}
              <div className="space-y-3.5 border-t border-neutral-200 pt-5">
                <div className="border-b border-neutral-200 pb-2">
                  <h3 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800">Form Aesthetic Theme</h3>
                  <p className="text-[10px] text-neutral-400">Match form aesthetics with company branding.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <button
                    onClick={() => {
                      setSelectedTheme("pine");
                      handleSaveConfig(fields, "pine");
                    }}
                    className={`p-2 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedTheme === "pine"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
                    Pine Green
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTheme("indigo");
                      handleSaveConfig(fields, "indigo");
                    }}
                    className={`p-2 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedTheme === "indigo"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    Indigo
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTheme("dark");
                      handleSaveConfig(fields, "dark");
                    }}
                    className={`p-2 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedTheme === "dark"
                        ? "border-slate-400 bg-slate-800 text-slate-200 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Kozker Dark
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTheme("amber");
                      handleSaveConfig(fields, "amber");
                    }}
                    className={`p-2 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedTheme === "amber"
                        ? "border-amber-600 bg-amber-50 text-amber-800 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    Amber
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTheme("rose");
                      handleSaveConfig(fields, "rose");
                    }}
                    className={`p-2 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedTheme === "rose"
                        ? "border-rose-600 bg-rose-50 text-rose-800 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    Rose Petal
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTheme("cyber");
                      handleSaveConfig(fields, "cyber");
                    }}
                    className={`p-2 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedTheme === "cyber"
                        ? "border-purple-600 bg-purple-50 text-purple-800 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    Neon Cyber
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTheme("ocean");
                      handleSaveConfig(fields, "ocean");
                    }}
                    className={`p-2 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedTheme === "ocean"
                        ? "border-cyan-600 bg-cyan-50 text-cyan-800 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-700"></span>
                    Ocean Teal
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTheme("sunset");
                      handleSaveConfig(fields, "sunset");
                    }}
                    className={`p-2 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      selectedTheme === "sunset"
                        ? "border-orange-600 bg-orange-50 text-orange-850 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                    Sunset Coral
                  </button>
                </div>
              </div>

              {/* Form Background Mode Customizer */}
              <div className="space-y-3.5 border-t border-neutral-200 pt-5">
                <div className="border-b border-neutral-200 pb-2">
                  <h3 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800">Form Background Mode</h3>
                  <p className="text-[10px] text-neutral-400">Choose between light and dark backgrounds.</p>
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
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Light Background
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBgMode("dark");
                      handleSaveConfig(fields, selectedTheme, "dark");
                    }}
                    className={`flex-1 p-2.5 border rounded-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      bgMode === "dark"
                        ? "border-slate-600 bg-slate-900 text-slate-100 font-bold"
                        : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    Dark Background
                  </button>
                </div>
              </div>
            </div>

          </div>
        ) : (
          
          /* LIVE PREVIEW / CANDIDATE APPLICATION VIEW (2-column layout matching original look but customized dynamically) */
          <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 transition-colors duration-250">
            
            {/* Left Column: Job Description & Details */}
            <section className="lg:col-span-5 space-y-4 select-none">
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

                {/* Quick Stats Grid */}
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

                {/* Job Description Block */}
                {job.description && (
                  <div className={`space-y-1.5 border-t pt-3 ${isDarkBg ? 'border-slate-800' : 'border-neutral-150'}`}>
                    <h4 className="text-[10px] font-bold opacity-75 uppercase tracking-wider font-mono">
                      Role Overview
                    </h4>
                    <p className="text-xs leading-relaxed whitespace-pre-line opacity-85">
                      {job.description}
                    </p>
                  </div>
                )}

                {/* Responsibilities */}
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <div className={`space-y-2 border-t pt-3 ${isDarkBg ? 'border-slate-800' : 'border-neutral-150'}`}>
                    <h4 className="text-[10px] font-bold opacity-75 uppercase tracking-wider font-mono">
                      Key Responsibilities
                    </h4>
                    <ul className="list-disc pl-4 text-xs space-y-1.5 opacity-85">
                      {job.responsibilities.map((resp: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{resp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Qualifications */}
                {job.qualifications && job.qualifications.length > 0 && (
                  <div className={`space-y-2 border-t pt-3 ${isDarkBg ? 'border-slate-800' : 'border-neutral-150'}`}>
                    <h4 className="text-[10px] font-bold opacity-75 uppercase tracking-wider font-mono">
                      Preferred Qualifications
                    </h4>
                    <ul className="list-disc pl-4 text-xs space-y-1.5 opacity-85">
                      {job.qualifications.map((qual: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{qual}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Support Chatbot Widget */}
              <div className={`border rounded-sm p-5 space-y-4 shadow-sm transition-colors duration-250 ${resolvedCardClass} mt-4`}>
                <div className="flex items-center justify-between border-b pb-3 border-neutral-200/50">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <h3 className="font-tight font-black text-xs uppercase tracking-wider text-neutral-800 dark:text-slate-200">
                      Candidate Support Chatbot
                    </h3>
                  </div>
                  <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 rounded-sm">
                    AI Active
                  </span>
                </div>

                {/* Chat Log Window */}
                <div className={`p-3 rounded-sm h-[200px] overflow-y-auto space-y-3 border text-xs leading-relaxed ${isDarkBg ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-neutral-50/50 border-neutral-200 text-neutral-600'}`}>
                  {chatbotHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-md p-2.5 shadow-2xs ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : `${isDarkBg ? 'bg-slate-850 border border-slate-700' : 'bg-white border border-neutral-200'} rounded-bl-none text-neutral-800 dark:text-slate-200`
                      }`}>
                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isSendingQuery && (
                    <div className="flex justify-start">
                      <div className={`max-w-[85%] rounded-md p-2.5 rounded-bl-none ${isDarkBg ? 'bg-slate-850 border border-slate-700' : 'bg-white border border-neutral-200'} text-neutral-400 flex items-center gap-1.5`}>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>AI is typing...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Controls Form */}
                <form onSubmit={handleSendCandidateQuery} className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-[9.5px] font-mono uppercase font-bold text-neutral-400 mb-1">
                        Your Email (for recruiter response)
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="candidate@example.com"
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        className={`w-full p-2 text-xs border rounded-sm outline-none transition-all ${
                          isDarkBg 
                            ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-600' 
                            : 'bg-white border-neutral-350 text-neutral-800 focus:border-emerald-600'
                        }`}
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Ask about salary, qualifications, remote..."
                        value={chatbotQueryText}
                        onChange={(e) => setChatbotQueryText(e.target.value)}
                        className={`flex-1 p-2 text-xs border rounded-sm outline-none transition-all ${
                          isDarkBg 
                            ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-600' 
                            : 'bg-white border-neutral-350 text-neutral-800 focus:border-emerald-600'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={isSendingQuery || !candidateEmail.trim() || !chatbotQueryText.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        Ask
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>

            {/* Right Column: Dynamic Application Form */}
            <section className="lg:col-span-7 space-y-4">
              <div className={`border rounded-sm p-6 shadow-xs transition-colors duration-250 ${resolvedCardClass}`}>
                <div className={`border-b pb-4 mb-4 flex items-center justify-between ${isDarkBg ? 'border-slate-800' : 'border-neutral-200'}`}>
                  <div className="space-y-0.5">
                    <h3 className="font-tight font-black text-sm uppercase tracking-wider">
                      Apply for this position
                    </h3>
                    <p className="opacity-60 text-xs">
                      Fill out the details below. {fields.some(f => f.id === "resume" && f.enabled) && "Uploading a resume auto-fills the form."}
                    </p>
                  </div>
                  <Sparkles className={`w-5 h-5 opacity-80 ${theme.primaryText}`} />
                </div>

                {/* Resume File Upload Widget (Only render if enabled in fields config) */}
                {fields.find(f => f.id === "resume")?.enabled && (
                  <div className={`mb-5 p-4 border border-dashed rounded-sm transition-all text-xs ${
                    isDarkBg 
                      ? 'bg-slate-950 border-slate-700 hover:border-slate-550 text-slate-300' 
                      : 'bg-neutral-50 border-neutral-250 hover:border-primary/50 hover:bg-primary/5 text-neutral-600'
                  }`}>
                    <div className="flex flex-col items-center justify-center text-center space-y-2 py-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-xs border ${
                        isDarkBg ? 'bg-slate-900 border-slate-700' : 'bg-white border-neutral-200'
                      }`}>
                        <Upload className="w-4 h-4 opacity-60" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold">Upload your Resume / CV</p>
                        <p className="opacity-50 font-mono text-[9px]">PDF, DOCX, or TXT (Max 5MB)</p>
                      </div>
                      
                      <label className={`mt-1 px-3 py-1.5 border font-semibold rounded-sm cursor-pointer shadow-xs transition-colors inline-flex items-center gap-1.5 ${
                        isDarkBg 
                          ? 'border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-100' 
                          : 'border-neutral-300 hover:border-primary bg-white text-neutral-700'
                      }`}>
                        Choose File
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Extraction Progress Indicator */}
                    {isExtracting && (
                      <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm flex items-center justify-center gap-2 text-emerald-500 font-semibold font-mono text-[10px] animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        <span>Parsing resume profile parameters...</span>
                      </div>
                    )}

                    {/* File Info */}
                    {!isExtracting && resumeFileName && (
                      <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-sm flex items-center justify-between text-emerald-500 font-semibold font-mono text-[10px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle className="w-4 h-4" />
                          <span className="truncate">{resumeFileName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setResumeFileName("");
                            setResumeUrl("");
                            setParseNotice(null);
                          }}
                          className="text-red-500 font-bold underline hover:text-red-400 cursor-pointer shrink-0 ml-2"
                        >
                          Reset File
                        </button>
                      </div>
                    )}

                    {/* Parse Notice */}
                    {parseNotice && (
                      <div className={`mt-3 p-2.5 border rounded-sm text-[10.5px] leading-relaxed italic ${
                        isDarkBg ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                      }`}>
                        {parseNotice}
                      </div>
                    )}
                  </div>
                )}

                {/* Main Dynamic Fields Form */}
                <form onSubmit={handleSubmitCandidate} className="space-y-4 text-xs font-sans">
                  
                  {fields.map((field) => {
                    // Skip resume file upload in the standard list loop since it's rendered separately above
                    if (field.id === "resume" || !field.enabled) return null;

                    const inputClass = `w-full px-3 py-2 border rounded-sm focus:ring-1 focus:outline-hidden transition-colors ${
                      isDarkBg 
                        ? 'bg-slate-950 border-slate-800 text-slate-100 focus:ring-slate-500 focus:border-slate-500' 
                        : 'bg-white border-neutral-200 text-neutral-800 focus:ring-primary focus:border-primary'
                    }`;

                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="text-neutral-400 uppercase tracking-wider block font-bold text-[9.5px] font-mono">
                          {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                        </label>

                        {/* Custom / Standard SELECT type */}
                        {field.type === "select" ? (
                          <select
                            required={field.required}
                            value={field.isCustom ? (customAnswers[field.id] || "") : (fieldValues[field.id] || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (field.isCustom) {
                                setCustomAnswers(prev => ({ ...prev, [field.id]: val }));
                              } else {
                                setFieldValues(prev => ({ ...prev, [field.id]: val }));
                              }
                            }}
                            className={inputClass}
                          >
                            <option value="">Select option...</option>
                            {field.options?.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === "textarea" ? (
                          /* Textarea block */
                          <textarea
                            required={field.required}
                            rows={3}
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            value={field.isCustom ? (customAnswers[field.id] || "") : (fieldValues[field.id] || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (field.isCustom) {
                                setCustomAnswers(prev => ({ ...prev, [field.id]: val }));
                              } else {
                                setFieldValues(prev => ({ ...prev, [field.id]: val }));
                              }
                            }}
                            className={inputClass}
                          />
                        ) : field.type === "checkbox" ? (
                          /* Checkbox option */
                          <label className="flex items-center gap-2.5 py-1 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              required={field.required}
                              checked={field.isCustom ? (customAnswers[field.id] === "true") : (fieldValues[field.id] === true || fieldValues[field.id] === "true")}
                              onChange={(e) => {
                                const checkedVal = e.target.checked ? "true" : "false";
                                if (field.isCustom) {
                                  setCustomAnswers(prev => ({ ...prev, [field.id]: checkedVal }));
                                } else {
                                  setFieldValues(prev => ({ ...prev, [field.id]: e.target.checked }));
                                }
                              }}
                              className="w-4 h-4 accent-emerald-600 rounded-xs cursor-pointer border-neutral-350"
                            />
                            <span className={`${isDarkBg ? 'text-slate-300' : 'text-neutral-500'} font-semibold text-xs leading-normal`}>
                              {field.label} {field.required && <span className="text-red-500 font-bold">*</span>}
                            </span>
                          </label>
                        ) : (
                          /* Default text / email / number inputs */
                          <input
                            type={field.type}
                            required={field.required}
                            placeholder={`e.g. ${field.label}`}
                            value={field.isCustom ? (customAnswers[field.id] || "") : (fieldValues[field.id] || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (field.isCustom) {
                                setCustomAnswers(prev => ({ ...prev, [field.id]: val }));
                              } else {
                                setFieldValues(prev => ({ ...prev, [field.id]: val }));
                              }
                            }}
                            className={inputClass}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Hidden raw text profile parser storage */}
                  {rawText && (
                    <div className="space-y-1">
                      <label className="text-neutral-400 uppercase tracking-wider block font-bold text-[9.5px] font-mono">Parsed Raw Text Profile Outline</label>
                      <textarea
                        readOnly
                        rows={2}
                        value={rawText}
                        className={`w-full px-3 py-2 border rounded-sm font-mono text-[10px] select-all cursor-text focus:outline-hidden ${
                          isDarkBg ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-neutral-50 border-neutral-150 text-neutral-500'
                        }`}
                      />
                    </div>
                  )}

                  {/* Consent Checkbox */}
                  <div className="pt-2 border-t border-dashed border-neutral-200 mt-4">
                    <label className={`flex items-start gap-2.5 text-[11px] leading-normal cursor-pointer select-none ${isDarkBg ? 'text-slate-400' : 'text-neutral-500'}`}>
                      <input
                        type="checkbox"
                        checked={consent}
                        required
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 rounded-sm accent-emerald-600 border-neutral-350 cursor-pointer"
                      />
                      <span>
                        I consent to having my profile processed, structured, and matched against job requirement parameters using machine intelligence algorithms. *
                      </span>
                    </label>
                  </div>

                  {/* Error Notice */}
                  {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200/50 rounded-sm text-red-650 font-medium flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className={`pt-3 border-t flex justify-end gap-3 ${isDarkBg ? 'border-slate-800' : 'border-neutral-150'}`}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`px-6 py-2.5 font-bold uppercase tracking-wider rounded-sm shadow-xs hover:shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 ${theme.primary}`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting Application...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </main>
        )}

      </div>

      {/* Premium Footer */}
      <footer className={`border-t py-5 px-6 text-center text-[10px] font-mono mt-auto select-none transition-colors duration-250 ${
        isDarkBg ? "bg-slate-950 border-slate-900 text-slate-500" : "bg-white border-neutral-200 text-neutral-400"
      }`}>
        <p>© 2026 Kozker Recruiter AI. All applicant data is governed by tenant confidentiality guidelines.</p>
        <p className="mt-1">Powered by Form Studio Customizer Engine</p>
      </footer>
    </div>
  );
}
