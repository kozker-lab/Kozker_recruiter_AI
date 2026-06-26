"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { Client, Requirement } from "../types";
import { 
  Building2, Plus, FileText, ChevronRight, CheckCircle2, 
  MapPin, DollarSign, BrainCircuit, Loader2, Award, Upload, Edit, Trash2, Pencil,
  ChevronDown, UserCheck, Code, Users, CheckSquare, XCircle, Activity,
  Copy, ExternalLink, Check, Download
} from "lucide-react";
import { RequirementStatus } from "../types";

const generatePostContent = (tone: string, jobTitle: string, clientName: string, desc: string, requirements: string[], applyUrl: string) => {
  const cleanTitle = jobTitle.trim();
  const cleanClient = clientName.trim();
  const requirementsBullets = requirements && requirements.length > 0
    ? requirements.map(r => `• ${r}`).join("\n")
    : "• Strong experience in this domain\n• Excellent problem-solving skills\n• Great team player";

  switch (tone) {
    case "casual":
      return `Hey network! 👋

We are on the hunt for a talented ${cleanTitle} to join the team at ${cleanClient}! 

If you are looking for a new challenge, want to build amazing things, and work with a stellar team, this is the role for you. 

Apply directly here: ${applyUrl}

Or share this with someone who would be a perfect fit!

#hiring #${cleanTitle.replace(/\s+/g, "")} #jobopportunity #recruiting`;

    case "exciting":
      return `🚀 WE ARE HIRING! 🚀

The team at ${cleanClient} is growing rapidly, and we are looking for a stellar ${cleanTitle} to jump on board!

What you'll bring:
${requirementsBullets}

Why you'll love it:
✨ High impact role
✨ Competitive package
✨ Dynamic and collaborative culture

👉 Apply instantly here: ${applyUrl}

#growth #hiring #${cleanTitle.replace(/\s+/g, "")} #jobsearch #techjobs`;

    case "storytelling":
      return `Every great product starts with a great team.

At ${cleanClient}, we believe in empowering builders to do their best work. That's why we're looking for our next ${cleanTitle} to help us shape the future.

If you love solving complex problems, pushing boundaries, and collaborating with passionate peers, we'd love to chat.

Check out the full details and apply here: ${applyUrl}

Not for you? A repost goes a long way for someone in your network!

#hiring #careers #recruitment #${cleanTitle.replace(/\s+/g, "")} #culture`;

    case "professional":
    default:
      return `We are currently seeking a qualified ${cleanTitle} to join our client ${cleanClient}.

In this position, you will be responsible for driving key project initiatives, collaborating with cross-functional teams, and delivering high-quality solutions.

Key Qualifications:
${requirementsBullets}

Interested candidates can review the full job description and submit their application directly using the link below:

👉 ${applyUrl}

#recruiting #hiring #${cleanTitle.replace(/\s+/g, "")} #careers #${cleanClient.replace(/\s+/g, "")}`;
  }
};

export default function ClientsView() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams ? searchParams.get("clientId") : null;
  const initialReqId = searchParams ? searchParams.get("reqId") : null;

  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId);
  const [expandedReqId, setExpandedReqId] = useState<string | null>(initialReqId);

  React.useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
    if (initialReqId) {
      setExpandedReqId(initialReqId);
    }
  }, [initialClientId, initialReqId]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (selectedClientId) {
        url.searchParams.set("clientId", selectedClientId);
      } else {
        url.searchParams.delete("clientId");
      }
      if (expandedReqId) {
        url.searchParams.set("reqId", expandedReqId);
      } else {
        url.searchParams.delete("reqId");
      }
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [selectedClientId, expandedReqId, router]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  const stages = [
    { id: "screening", label: "Screening", icon: UserCheck, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { id: "technical", label: "Technical", icon: Code, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { id: "hr", label: "HR Round", icon: Users, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { id: "final", label: "Final Round", icon: CheckSquare, color: "text-teal-600 bg-teal-50 border-teal-200" },
    { id: "hired", label: "Hired", icon: Award, color: "text-green-600 bg-green-50 border-green-200" }
  ];
  
  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);

  // Client edit/delete state
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [isDeleteClientConfirmOpen, setIsDeleteClientConfirmOpen] = useState(false);
  
  // Requirement Editing & Filtering States
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [reqStatus, setReqStatus] = useState<RequirementStatus>("ready");
  const [reqSearchQuery, setReqSearchQuery] = useState("");
  const [reqStatusFilter, setReqStatusFilter] = useState<string>("all");

  // Forms inputs
  const [clientNameInput, setClientNameInput] = useState("");
  const [reqTitle, setReqTitle] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqSkills, setReqSkills] = useState("");
  const [reqExpMin, setReqExpMin] = useState(2);
  const [reqExpMax, setReqExpMax] = useState(5);
  const [reqBudgetMin, setReqBudgetMin] = useState(8);
  const [reqBudgetMax, setReqBudgetMax] = useState(15);
  const [reqSeniority, setReqSeniority] = useState<"junior" | "mid" | "senior" | "lead" | "any">("mid");
  const [reqNotes, setReqNotes] = useState("");
  const [reqPosts, setReqPosts] = useState(1);

  // File upload / parsing states
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  // LinkedIn Post generation state
  const [activeLinkedInJob, setActiveLinkedInJob] = useState<{
    id: string;
    title: string;
    clientName: string;
    description: string;
    keywords: string[];
    created_by?: string | null;
  } | null>(null);
  const [linkedinTone, setLinkedinTone] = useState("professional");
  const [customPostContent, setCustomPostContent] = useState("");
  const [copiedPost, setCopiedPost] = useState(false);

  // LinkedIn Integration States
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinHasCompanyPage, setLinkedinHasCompanyPage] = useState(false);
  const [checkingLinkedinStatus, setCheckingLinkedinStatus] = useState(false);
  const [sharingToLinkedin, setSharingToLinkedin] = useState(false);
  const [linkedinShareSuccess, setLinkedinShareSuccess] = useState(false);
  const [linkedinShareSuccessMessage, setLinkedinShareSuccessMessage] = useState<string | null>(null);
  const [linkedinShareError, setLinkedinShareError] = useState<string | null>(null);

  // Check LinkedIn connection status when modal opens
  React.useEffect(() => {
    if (activeLinkedInJob) {
      setCheckingLinkedinStatus(true);
      setLinkedinShareSuccess(false);
      setLinkedinShareSuccessMessage(null);
      setLinkedinShareError(null);
      apiRequest<{ connected: boolean; company_page_id?: string | null }>(
        "GET",
        "/integrations/linkedin/status"
      )
        .then((data) => {
          setLinkedinConnected(data.connected);
          setLinkedinHasCompanyPage(!!data.company_page_id);
        })
        .catch((err) => {
          console.error("Error checking LinkedIn status in modal", err);
          setLinkedinConnected(false);
          setLinkedinHasCompanyPage(false);
        })
        .finally(() => {
          setCheckingLinkedinStatus(false);
        });
    }
  }, [activeLinkedInJob]);

  const handlePostToLinkedin = async () => {
    if (!activeLinkedInJob) return;
    setSharingToLinkedin(true);
    setLinkedinShareSuccess(false);
    setLinkedinShareSuccessMessage(null);
    setLinkedinShareError(null);
    try {
      const data = await apiRequest<{ success: boolean; message?: string; post_id?: string }>(
        "POST",
        `/jobs/${activeLinkedInJob.id}/share-linkedin`,
        { text: customPostContent }
      );
      setLinkedinShareSuccess(true);
      setLinkedinShareSuccessMessage(data.message || "Successfully published job opening post to LinkedIn!");
    } catch (err: any) {
      console.error("Error sharing post on LinkedIn", err);
      setLinkedinShareError(err.message || "Failed to publish post to LinkedIn.");
    } finally {
      setSharingToLinkedin(false);
    }
  };

  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  const handleCopyLink = (jobId: string, recruiterId?: string | null) => {
    if (typeof window !== "undefined") {
      const queryParam = recruiterId ? `?recruiter_id=${recruiterId}` : "";
      const applyUrl = `${window.location.origin}/apply/${jobId}${queryParam}`;
      navigator.clipboard.writeText(applyUrl);
      setCopiedJobId(jobId);
      setTimeout(() => setCopiedJobId(null), 2000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setFileError(null);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "txt") {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReqDesc(event.target.result as string);
        }
        setIsParsingFile(false);
      };
      reader.onerror = () => {
        setFileError("Failed to read text file");
        setIsParsingFile(false);
      };
      reader.readAsText(file);
    } else if (ext === "pdf" || ext === "docx" || ext === "doc") {
      try {
        const { apiUploadFile } = await import("../lib/api");
        const result = await apiUploadFile("/requirements/parse-file", file);
        if (result && result.text) {
          setReqDesc(result.text);
        } else {
          setFileError("No text content could be extracted from this document.");
        }
      } catch (err: any) {
        setFileError(err.message || "Failed to parse document. Is the backend running?");
      } finally {
        setIsParsingFile(false);
      }
    } else {
      setFileError("Supported formats are PDF, DOCX, and TXT");
      setIsParsingFile(false);
    }
  };


  // Queries
  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => apiRequest<Client[]>("GET", "/clients")
  });

  const { data: requirements = [], isLoading: loadingReqs } = useQuery<Requirement[]>({
    queryKey: ["requirements"],
    queryFn: () => apiRequest<Requirement[]>("GET", "/requirements"),
    refetchInterval: 3000 // Refetch every 3s to capture background AI/n8n status transitions
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery<any[]>({
    queryKey: ["jobs"],
    queryFn: () => apiRequest<any[]>("GET", "/jobs"),
    refetchInterval: 3000 // Refetch every 3s to sync new job drafts generated in the background
  });

  const { data: applications = [], isLoading: loadingApps } = useQuery<any[]>({
    queryKey: ["applications"],
    queryFn: () => apiRequest<any[]>("GET", "/applications")
  });

  // Publish current clients & mandates context to AI Copilot
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const activeClient = selectedClientId 
        ? clients.find(c => c.id === selectedClientId)
        : null;
      
      const activeRequirement = expandedReqId
        ? requirements.find(r => r.id === expandedReqId)
        : null;

      const activeRequirementJobs = activeRequirement
        ? jobs.filter(j => j.requirement_id === activeRequirement.id)
        : [];

      const context = {
        page: "clients",
        selected_client: activeClient ? {
          client_id: activeClient.id,
          client_name: activeClient.name
        } : null,
        clients: clients.map(c => ({
          client_id: c.id,
          client_name: c.name
        })),
        requirements: requirements.map(r => ({
          requirement_id: r.id,
          client_id: r.client_id,
          title: r.title,
          status: r.status
        })),
        selected_requirement: activeRequirement ? {
          requirement_id: activeRequirement.id,
          client_id: activeRequirement.client_id,
          title: activeRequirement.title,
          description: activeRequirement.description || "",
          skills: activeRequirement.skills || [],
          experience_min: activeRequirement.experience_min || 0,
          experience_max: activeRequirement.experience_max || 0,
          budget_min: activeRequirement.budget_min || 0,
          budget_max: activeRequirement.budget_max || 0,
          currency: "USD",
          seniority: activeRequirement.seniority || "any",
          location: "Remote",
          employment_type: "Full-time",
          num_posts_requested: activeRequirement.num_posts_requested || 1,
          status: activeRequirement.status
        } : null,
        // Global format
        selected_entity: activeRequirement ? {
          type: "requirement",
          id: activeRequirement.id,
          title: activeRequirement.title
        } : activeClient ? {
          type: "client",
          id: activeClient.id,
          name: activeClient.name
        } : null,
        visible_rows: requirements.filter(r => !selectedClientId || r.client_id === selectedClientId).map(r => ({
          id: r.id,
          title: r.title,
          status: r.status
        })),
        visible_data: {
          total_clients: clients.length,
          total_requirements: requirements.length,
          selected_client_name: activeClient?.name || null
        },
        entities: {
          client_ids: clients.map(c => c.id),
          requirement_ids: requirements.map(r => r.id),
          job_ids: jobs.map(j => j.id)
        }
      };

      window.dispatchEvent(new CustomEvent("copilot-context-update", { detail: context }));
    }
  }, [selectedClientId, expandedReqId, clients, requirements, jobs]);

  const handleExportExcel = (jobId: string, jobTitle: string) => {
    const jobApps = applications.filter(app => app.job_opening_id === jobId);
    
    if (jobApps.length === 0) {
      alert("No applicant responses found to export for this mandate.");
      return;
    }

    const customQuestionKeysMap: Record<string, string> = {};
    
    jobApps.forEach(app => {
      const cand = app.candidates;
      if (cand && cand.parsed_resume_json && Array.isArray(cand.parsed_resume_json.custom_form_responses)) {
        cand.parsed_resume_json.custom_form_responses.forEach((resp: any) => {
          if (resp.field_id && resp.question) {
            customQuestionKeysMap[resp.field_id] = resp.question;
          }
        });
      }
    });

    try {
      const localConfig = localStorage.getItem(`form_config_${jobId}`);
      if (localConfig) {
        const fields = JSON.parse(localConfig);
        fields.forEach((f: any) => {
          if (f.enabled && f.isCustom) {
            customQuestionKeysMap[f.id] = f.label;
          }
        });
      }
    } catch (e) {
      console.error("Failed to read form config from localStorage for export:", e);
    }

    const customFieldIds = Object.keys(customQuestionKeysMap);

    const headers = [
      "Rank / Index",
      "Candidate Name",
      "Email Address",
      "Phone Number",
      "Years of Experience",
      "Education / Degree",
      "Employment Status",
      "Key Skills",
      "Academic Details",
      "Achievements",
      "AI Match Score",
      "Screening Status",
      "Current Stage",
      ...customFieldIds.map(id => customQuestionKeysMap[id])
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      let strVal = "";
      if (Array.isArray(val)) {
        strVal = val.join(", ");
      } else {
        strVal = String(val);
      }
      if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n") || strVal.includes("\r")) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    };

    const csvRows = [headers.map(h => escapeCSV(h)).join(",")];

    jobApps.forEach((app, index) => {
      const cand = app.candidates || {};
      const responsesMap: Record<string, string> = {};
      if (cand.parsed_resume_json && Array.isArray(cand.parsed_resume_json.custom_form_responses)) {
        cand.parsed_resume_json.custom_form_responses.forEach((resp: any) => {
          if (resp.field_id) {
            responsesMap[resp.field_id] = resp.response || "";
          }
        });
      }

      const row = [
        escapeCSV(index + 1),
        escapeCSV(cand.full_name || app.candidate_name || "Unknown"),
        escapeCSV(cand.email || app.candidate_email || ""),
        escapeCSV(cand.phone || app.candidate_phone || ""),
        escapeCSV(cand.experience_years !== undefined ? `${cand.experience_years} Years` : ""),
        escapeCSV(cand.education || ""),
        escapeCSV(cand.working_or_not === true ? "Employed" : cand.working_or_not === false ? "Open to Work" : ""),
        escapeCSV(cand.skills || ""),
        escapeCSV(cand.academic_details || ""),
        escapeCSV(cand.achievements || ""),
        escapeCSV(app.fuzzy_score !== undefined && app.fuzzy_score !== null ? `${app.fuzzy_score}%` : ""),
        escapeCSV(app.screening_status || "pending"),
        escapeCSV(app.stage || "screening"),
        ...customFieldIds.map(id => escapeCSV(responsesMap[id] || ""))
      ];

      csvRows.push(row.join(","));
    });

    const csvContent = "\ufeff" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    const filename = `${jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter requirements for the selected client, with search and status filter
  const searchedAndFilteredReqs = requirements.filter(r => {
    if (r.client_id !== selectedClientId) return false;
    
    if (reqStatusFilter !== "all" && r.status !== reqStatusFilter) return false;
    
    if (reqSearchQuery.trim()) {
      const query = reqSearchQuery.toLowerCase();
      const titleMatch = r.title?.toLowerCase().includes(query) || false;
      const descMatch = r.description?.toLowerCase().includes(query) || false;
      const skillsMatch = r.skills?.some(s => s.toLowerCase().includes(query)) || false;
      return titleMatch || descMatch || skillsMatch;
    }
    
    return true;
  });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const activeClient = clients.find(c => c.id === selectedClientId);

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: (name: string) => apiRequest<Client>("POST", "/clients", { name }),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setSelectedClientId(newClient.id);
      setClientNameInput("");
      setIsClientModalOpen(false);
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiRequest<Client>("PUT", `/clients/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setIsEditClientModalOpen(false);
      setEditingClientId(null);
      setEditClientName("");
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setIsDeleteClientConfirmOpen(false);
      setDeletingClientId(null);
      if (selectedClientId === deletingClientId) {
        setSelectedClientId(null);
      }
    }
  });

  const createReqMutation = useMutation({
    mutationFn: (data: any) => apiRequest<Requirement>("POST", "/requirements", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setIsReqModalOpen(false);
      resetRequirementForm();
    }
  });

  const updateReqMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest<Requirement>("PUT", `/requirements/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setIsReqModalOpen(false);
      setEditingReqId(null);
      resetRequirementForm();
    }
  });

  const deleteReqMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/requirements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      alert("Hiring mandate requirement and associated job openings deleted successfully.");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete requirement.");
    }
  });

  const handleDeleteRequirement = (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this hiring mandate? This will also soft-delete all generated job openings.");
    if (confirmed) {
      deleteReqMutation.mutate(id);
    }
  };

  const resetRequirementForm = () => {
    setReqTitle("");
    setReqDesc("");
    setReqSkills("");
    setReqExpMin(2);
    setReqExpMax(5);
    setReqBudgetMin(8);
    setReqBudgetMax(15);
    setReqSeniority("mid");
    setReqNotes("");
    setReqPosts(1);
    setReqStatus("ready");
  };

  const handleOpenCreateModal = () => {
    setEditingReqId(null);
    resetRequirementForm();
    setIsReqModalOpen(true);
  };

  const handleStartEdit = (r: Requirement) => {
    setEditingReqId(r.id);
    setReqTitle(r.title);
    setReqDesc(r.description || "");
    setReqSkills(r.skills ? r.skills.join(", ") : "");
    setReqExpMin(r.experience_min || 0);
    setReqExpMax(r.experience_max || 30);
    setReqBudgetMin(r.budget_min || 0);
    setReqBudgetMax(r.budget_max || 100);
    setReqSeniority((r.seniority as any) || "mid");
    setReqNotes(r.notes || "");
    setReqPosts(r.num_posts_requested || 1);
    setReqStatus(r.status || "ready");
    setIsReqModalOpen(true);
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    const req = requirements.find(r => r.id === id);
    if (!req) return;
    updateReqMutation.mutate({
      id,
      data: {
        ...req,
        status: newStatus
      }
    });
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientNameInput.trim()) return;
    createClientMutation.mutate(clientNameInput);
  };

  const handleSaveRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    
    // Auto-generate title from the first line/sentence of description
    const derivedTitle = reqTitle.trim() || reqDesc.trim().split(/[.\n]/)[0].substring(0, 50).trim() || `Mandate for ${activeClient?.name || "Client"}`;

    const skillsList = reqSkills
      ? reqSkills.split(",").map(s => s.trim()).filter(s => s.length > 0)
      : [];

    const payload = {
      client_id: selectedClientId,
      title: derivedTitle,
      description: reqDesc,
      skills: skillsList,
      experience_min: reqExpMin,
      experience_max: reqExpMax,
      budget_min: reqBudgetMin,
      budget_max: reqBudgetMax,
      seniority: reqSeniority,
      notes: reqNotes,
      num_posts_requested: reqPosts,
      status: reqStatus
    };

    if (editingReqId) {
      updateReqMutation.mutate({ id: editingReqId, data: payload });
    } else {
      const confirmed = window.confirm("Are you sure you want to create this new requirement? AI will immediately begin generating draft JD posts.");
      if (!confirmed) return;
      createReqMutation.mutate(payload);
    }
  };

  React.useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  React.useEffect(() => {
    if (!isClientModalOpen) {
      createClientMutation.reset();
    }
  }, [isClientModalOpen]);

  React.useEffect(() => {
    if (!isEditClientModalOpen) {
      updateClientMutation.reset();
    }
  }, [isEditClientModalOpen]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
      {/* 1. Client Pane (Left) */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden flex flex-col h-[600px] shadow-sm">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <span className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-neutral-500" />
            Clients
          </span>
          <button
            id="add-client-btn"
            onClick={() => setIsClientModalOpen(true)}
            className="p-1 hover:bg-neutral-200 rounded-sm text-primary transition-colors cursor-pointer border border-neutral-200"
            title="Create Client"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Client Search Bar */}
        <div className="p-2.5 bg-neutral-50/50 border-b border-neutral-150 flex items-center gap-2 text-xs select-none">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search clients..."
              value={clientSearchQuery}
              onChange={(e) => setClientSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 border border-neutral-200 rounded-sm text-neutral-700 bg-neutral-white placeholder:text-neutral-400 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
            {clientSearchQuery && (
              <button
                onClick={() => setClientSearchQuery("")}
                className="absolute right-2.5 top-1.5 text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 text-xs">
          {loadingClients ? (
            <div className="p-4 text-center text-neutral-400 font-mono">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-4 text-center text-neutral-400 font-mono">No clients found.</div>
          ) : (
            filteredClients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={`w-full text-left p-4 flex items-center justify-between transition-colors cursor-pointer group ${
                  selectedClientId === c.id 
                    ? "bg-neutral-50 border-l-2 border-primary" 
                    : "hover:bg-neutral-50/50"
                }`}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="font-semibold text-neutral-800 truncate">{c.name}</p>
                  <p className="text-[10px] text-neutral-400 font-mono">ID: {c.id}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-right font-mono text-[10px] text-neutral-400 mr-1">
                    {c.requirements_count || 0} Req(s)
                  </span>
                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingClientId(c.id);
                      setEditClientName(c.name);
                      setIsEditClientModalOpen(true);
                    }}
                    className="p-1 hover:bg-neutral-200 text-neutral-400 hover:text-primary rounded-sm border border-transparent hover:border-neutral-200 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Rename Client"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingClientId(c.id);
                      setIsDeleteClientConfirmOpen(true);
                    }}
                    className="p-1 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-sm border border-transparent hover:border-red-200 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Delete Client"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Client Requirements Pane (Center/Right) */}
      <div className="md:col-span-2 bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden flex flex-col h-[600px] shadow-sm">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div>
            <span className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">
              {activeClient ? `${activeClient.name} Requirements` : "Select a Client"}
            </span>
            {activeClient && (
              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Active mandate pipelines</p>
            )}
          </div>
          {activeClient && (
            <button
              id="add-requirement-btn"
              onClick={handleOpenCreateModal}
              className="px-2.5 py-1 bg-primary text-neutral-white font-medium text-[10px] tracking-wider uppercase transition-colors rounded-sm cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Requirement
            </button>
          )}
        </div>

        {activeClient && (
          <div id="requirements-search-bar" className="p-3 bg-neutral-50/50 border-b border-neutral-150 flex flex-col sm:flex-row gap-2 items-center justify-between text-xs select-none">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search requirements (title, skills...)"
                value={reqSearchQuery}
                onChange={(e) => setReqSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 border border-neutral-200 rounded-sm text-neutral-700 bg-neutral-white placeholder:text-neutral-400 focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
              {reqSearchQuery && (
                <button
                  onClick={() => setReqSearchQuery("")}
                  className="absolute right-2.5 top-1.5 text-neutral-400 hover:text-neutral-600 font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <div className="flex gap-2 items-center w-full sm:w-auto justify-end">
              <span className="text-[10px] text-neutral-450 uppercase font-mono">Status:</span>
              <select
                value={reqStatusFilter}
                onChange={(e) => setReqStatusFilter(e.target.value)}
                className="px-2 py-1.5 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-700 font-mono text-[10px] focus:ring-1 focus:ring-primary focus:outline-hidden"
              >
                <option value="all">ALL STATUSES</option>
                <option value="draft">DRAFT</option>
                <option value="generating">GENERATING</option>
                <option value="ready">READY</option>
                <option value="archived">ARCHIVED</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingReqs ? (
            <div className="text-center py-12 text-xs text-neutral-400 font-mono">Loading client details...</div>
          ) : !selectedClientId ? (
            <div className="text-center py-12 text-xs text-neutral-400">Select a client from the left pane to view active mandates.</div>
          ) : searchedAndFilteredReqs.length === 0 ? (
            <div className="text-center py-12 text-xs text-neutral-400">No requirements found matching the active criteria.</div>
          ) : (
            searchedAndFilteredReqs.map((r) => (
              <div key={r.id} className="border border-neutral-200 rounded-sm p-4 hover:border-neutral-300 transition-all space-y-3 bg-neutral-white shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-tight font-bold text-sm text-neutral-850">{r.title}</h4>
                    <p className="text-[10px] text-neutral-400 font-mono">ID: {r.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Inline Status Dropdown */}
                    <select
                      value={r.status}
                      onChange={(e) => handleUpdateStatus(r.id, e.target.value)}
                      disabled={updateReqMutation.isPending}
                      className={`text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 bg-neutral-white border rounded-sm transition-all focus:ring-1 focus:ring-primary cursor-pointer focus:outline-hidden ${
                        r.status === 'ready' ? 'text-success border-success/35 bg-success/5 hover:bg-success/10' :
                        r.status === 'generating' ? 'text-primary border-primary/35 bg-primary/5 hover:bg-primary/10' :
                        r.status === 'archived' ? 'text-neutral-500 border-neutral-300 bg-neutral-100 hover:bg-neutral-200' :
                        'text-neutral-600 border-neutral-250 bg-neutral-50 hover:bg-neutral-100'
                      }`}
                    >
                      <option value="draft">Draft</option>
                      <option value="generating">Generating</option>
                      <option value="ready">Ready</option>
                      <option value="archived">Archived</option>
                    </select>

                    {/* Edit button */}
                    <button
                      onClick={() => handleStartEdit(r)}
                      className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 rounded-sm border border-neutral-200 transition-colors cursor-pointer"
                      title="Edit Requirement"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteRequirement(r.id)}
                      className="p-1 hover:bg-red-50 text-neutral-400 hover:text-red-650 rounded-sm border border-neutral-200 hover:border-red-200 transition-colors cursor-pointer"
                      title="Delete Requirement"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-neutral-450 hover:text-red-500" />
                    </button>

                    {/* Chevron Toggle Button */}
                    <button
                      onClick={() => setExpandedReqId(expandedReqId === r.id ? null : r.id)}
                      className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 rounded-sm border border-neutral-200 transition-colors cursor-pointer"
                      title={expandedReqId === r.id ? "Hide Pipeline" : "Show Pipeline"}
                    >
                      {expandedReqId === r.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 leading-relaxed">
                  {r.description || "No description provided."}
                </p>

                {/* Grid stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-2.5 border border-neutral-150 rounded-sm text-[11px] font-mono text-neutral-600">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Experience</span>
                    <span>{r.experience_min || 0} - {r.experience_max || "Any"} Yrs</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Budget (LPA)</span>
                    <span>₹{r.budget_min || 0} - ₹{r.budget_max || "N/A"} LPA</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Seniority</span>
                    <span className="capitalize">{r.seniority || "any"}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-neutral-400 uppercase font-semibold block">JD Options</span>
                    <span>{r.num_posts_requested} requested</span>
                  </div>
                </div>

                {/* Skills badges */}
                <div className="flex flex-wrap gap-1.5">
                  {r.skills.map((skill, idx) => (
                    <span key={idx} className="text-[9px] font-mono font-medium text-neutral-600 bg-neutral-100 border border-neutral-250 px-2 py-0.5 rounded-sm">
                      {skill}
                    </span>
                  ))}
                </div>

                {r.notes && (
                  <div className="text-[10px] text-neutral-400 bg-neutral-50 border-l-2 border-neutral-300 p-2 italic leading-relaxed">
                    Notes: {r.notes}
                  </div>
                )}

                {/* Expandable Pipeline Block */}
                {expandedReqId === r.id && (
                  <div className="mt-4 pt-4 border-t border-neutral-150 space-y-4 select-none">
                    <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Mandate Progress & Pipeline</h5>
                    {loadingJobs || loadingApps ? (
                      <div className="text-center py-6 text-[10px] text-neutral-400 font-mono">Loading pipelines...</div>
                    ) : (
                      (() => {
                        const reqJobs = jobs.filter(j => j.requirement_id === r.id);
                        if (reqJobs.length === 0) {
                          return (
                            <div className="text-center py-6 text-[10px] text-neutral-450 italic bg-neutral-50 border border-neutral-200 rounded-sm">
                              No active job postings generated yet. Update requirement status to "Ready" to generate posts.
                            </div>
                          );
                        }
                        return reqJobs.map((job) => {
                          const jobApps = applications.filter(app => app.job_opening_id === job.id);
                          const disqualifiedCount = jobApps.filter(app => app.stage === 'rejected' || app.stage_status === 'failed').length;
                          return (
                            <div key={job.id} className="space-y-3 p-3 bg-neutral-50/50 border border-neutral-150 rounded-sm">
                              <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 border-b border-neutral-150 pb-1.5">
                                <Link 
                                  href={`/jobs?id=${job.id}`}
                                  className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
                                >
                                  <Activity className="w-3.5 h-3.5 text-primary/70 animate-pulse" />
                                  <span>
                                    Post #{job.post_index || 1}: <span className="group-hover:underline">{job.title}</span>
                                  </span>
                                </Link>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleExportExcel(job.id, job.title)}
                                    className="text-[9.5px] font-mono text-primary hover:underline cursor-pointer flex items-center gap-1 bg-neutral-100 border border-neutral-200/80 px-1.5 py-0.5 rounded-xs font-bold uppercase transition-colors"
                                    title="Export applicant responses to Excel/CSV"
                                  >
                                    <Download className="w-3.5 h-3.5 text-primary" />
                                    <span>Export Sheet</span>
                                  </button>
                                  <span className="text-[10px] text-neutral-400 font-mono uppercase bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded-sm">
                                    {job.status}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Horizontal Pipeline */}
                              <div className="relative flex items-center justify-between py-2 mt-4 select-none">
                                {/* Track Line */}
                                <div className="absolute left-[8%] right-[8%] top-[20px] h-0.5 bg-neutral-200 z-0"></div>
                                
                                {/* Stage Nodes */}
                                {stages.map((stage) => {
                                  const stageApps = jobApps.filter(app => app.stage === stage.id && app.stage_status !== 'failed' && app.stage !== 'rejected');
                                  const count = stageApps.length;
                                  const IconComponent = stage.icon;
                                  const isActive = count > 0;
                                  
                                  return (
                                    <div key={stage.id} className="relative flex flex-col items-center flex-1 z-10 group/stage">
                                      {/* Icon Circle */}
                                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-help ${
                                        isActive 
                                          ? `${stage.color} shadow-sm scale-110 font-bold` 
                                          : 'text-neutral-400 bg-neutral-50 border-neutral-200'
                                      }`}>
                                        <IconComponent className="w-4 h-4" />
                                      </div>
                                      
                                      {/* Label */}
                                      <span className={`text-[9px] mt-1.5 font-medium transition-all ${
                                        isActive ? 'text-neutral-800 font-semibold' : 'text-neutral-450'
                                      }`}>
                                        {stage.label}
                                      </span>
                                      
                                      {/* Count Badge */}
                                      {isActive && (
                                        <span className="absolute -top-1 right-[25%] flex h-4 w-4 items-center justify-center rounded-full bg-primary text-neutral-white font-mono text-[8px] font-bold shadow-xs">
                                          {count}
                                        </span>
                                      )}
                                      
                                      {/* CSS Tooltip */}
                                      <div className="absolute z-30 hidden group-hover/stage:block bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-56 bg-neutral-900 text-neutral-150 p-2.5 rounded-sm shadow-xl border border-neutral-850 text-[10px] font-sans">
                                        <div className="font-semibold text-neutral-200 border-b border-neutral-850 pb-1 mb-1.5 flex justify-between items-center">
                                          <span>{stage.label}</span>
                                          <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded-sm font-mono text-[9px]">
                                            {count} {count === 1 ? 'Candidate' : 'Candidates'}
                                          </span>
                                        </div>
                                        {count === 0 ? (
                                          <div className="text-neutral-500 italic text-center py-1">No active candidates</div>
                                        ) : (
                                          <div className="space-y-1.5">
                                            <div className="text-neutral-450 text-[9px] font-mono">
                                              Candidates list ({count}):
                                            </div>
                                            <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                              {stageApps.slice(0, 4).map(app => (
                                                <li key={app.id} className="flex items-center justify-between gap-1.5">
                                                  <span className="text-neutral-300 font-medium truncate max-w-[120px]">
                                                    {app.candidates?.full_name || "Unknown Candidate"}
                                                  </span>
                                                  <span className={`text-[8px] font-mono uppercase px-1 rounded-xs ${
                                                    app.stage_status === 'in_progress' ? 'bg-amber-950/80 text-amber-400 border border-amber-800/40' :
                                                    app.stage_status === 'passed' ? 'bg-green-950/80 text-green-400 border border-green-800/40' :
                                                    'bg-neutral-850 text-neutral-400 border border-neutral-750/30'
                                                  }`}>
                                                    {app.stage_status || 'pending'}
                                                  </span>
                                                </li>
                                              ))}
                                              {count > 4 && (
                                                <li className="text-[9px] text-neutral-500 italic pt-1 text-center border-t border-neutral-850/50">
                                                  ... and {count - 4} more
                                                </li>
                                              )}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Summary Stats */}
                              <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 pt-2 border-t border-neutral-150 select-none">
                                <div className="flex gap-4">
                                  <span>Total Applicants: <strong className="text-neutral-700">{jobApps.length}</strong></span>
                                  <span>Disqualified: <strong className="text-red-500">{disqualifiedCount}</strong></span>
                                </div>
                                <span className="text-neutral-455">Hover stages for candidate details</span>
                              </div>

                              {/* Candidate Application Link */}
                              <div className="mt-3 pt-2.5 border-t border-neutral-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <span className="text-[9px] text-neutral-400 uppercase font-semibold block font-mono">Candidate Apply Link</span>
                                  <span className="text-[11px] font-mono text-neutral-600 truncate block">
                                    {typeof window !== "undefined" 
                                      ? `${window.location.origin}/apply/${job.id}${r.created_by ? `?recruiter_id=${r.created_by}` : ""}` 
                                      : `/apply/${job.id}${r.created_by ? `?recruiter_id=${r.created_by}` : ""}`
                                    }
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => handleCopyLink(job.id, r.created_by)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-neutral-700 bg-neutral-white hover:bg-neutral-50 border border-neutral-250 rounded-sm shadow-xs transition-colors cursor-pointer"
                                    title="Copy Apply Link"
                                  >
                                    {copiedJobId === job.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-green-600" />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Link</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const activeClient = clients.find(c => c.id === selectedClientId);
                                      const clientName = activeClient ? activeClient.name : "Our Client";
                                      const applyUrl = typeof window !== "undefined"
                                        ? `${window.location.origin}/apply/${job.id}${r.created_by ? `?recruiter_id=${r.created_by}` : ""}`
                                        : `/apply/${job.id}${r.created_by ? `?recruiter_id=${r.created_by}` : ""}`;
                                      const initialContent = generatePostContent(
                                        "professional",
                                        job.title,
                                        clientName,
                                        job.description || "",
                                        job.keywords || [],
                                        applyUrl
                                      );
                                      setLinkedinTone("professional");
                                      setCustomPostContent(initialContent);
                                      setActiveLinkedInJob({
                                        id: job.id,
                                        title: job.title,
                                        clientName: clientName,
                                        description: job.description || "",
                                        keywords: job.keywords || [],
                                        created_by: r.created_by
                                      });
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-neutral-700 bg-neutral-white hover:bg-neutral-50 border border-neutral-250 rounded-sm shadow-xs transition-colors cursor-pointer"
                                    title="Create LinkedIn Post"
                                  >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#0A66C2]">
                                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                    <span>Create Post</span>
                                  </button>
                                  <a
                                    href={`/apply/${job.id}?edit=true${r.created_by ? `&recruiter_id=${r.created_by}` : ""}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-neutral-white bg-primary hover:bg-primary/95 rounded-sm shadow-xs transition-colors cursor-pointer"
                                    title="Open Candidate Application Form"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open Form</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Create Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider">Create Client Profile</h3>
              <p className="text-neutral-400 text-xs">Enter organizational client name to host requirements.</p>
            </div>
            
            <form onSubmit={handleCreateClient} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Stripe, Inc."
                  required
                  value={clientNameInput}
                  onChange={(e) => setClientNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary"
                />
              </div>

              {createClientMutation.isError && (
                <div className="text-red-500 text-[11px] font-mono leading-relaxed bg-red-50 border border-red-200/50 p-2.5 rounded-sm">
                  {createClientMutation.error instanceof Error ? createClientMutation.error.message : "Failed to create client."}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClientMutation.isPending}
                  className="px-4 py-1.5 bg-primary text-neutral-white font-medium hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1"
                >
                  {createClientMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Name Modal */}
      {isEditClientModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider">Rename Client</h3>
              <p className="text-neutral-400 text-xs">Update the organizational client name.</p>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingClientId || !editClientName.trim()) return;
                updateClientMutation.mutate({ id: editingClientId, name: editClientName.trim() });
              }}
              className="space-y-4 text-xs font-sans"
            >
              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Client Name</label>
                <input
                  type="text"
                  required
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary"
                />
              </div>

              {updateClientMutation.isError && (
                <div className="text-red-500 text-[11px] font-mono leading-relaxed bg-red-50 border border-red-200/50 p-2.5 rounded-sm">
                  {updateClientMutation.error instanceof Error ? updateClientMutation.error.message : "Failed to update client."}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditClientModalOpen(false);
                    setEditingClientId(null);
                  }}
                  className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateClientMutation.isPending}
                  className="px-4 py-1.5 bg-primary text-neutral-white font-medium hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1"
                >
                  {updateClientMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Dialog */}
      {isDeleteClientConfirmOpen && (() => {
        const clientToDelete = clients.find(c => c.id === deletingClientId);
        return (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-6 space-y-4 shadow-xl">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-tight font-bold text-sm text-neutral-800 text-center">Delete Client?</h3>
                <p className="text-neutral-500 text-xs text-center leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-neutral-700">{clientToDelete?.name}</span>? 
                  This will soft-delete the client and all associated requirements.
                </p>
              </div>

              <div className="flex justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteClientConfirmOpen(false);
                    setDeletingClientId(null);
                  }}
                  className="px-4 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deletingClientId) deleteClientMutation.mutate(deletingClientId);
                  }}
                  disabled={deleteClientMutation.isPending}
                  className="px-4 py-1.5 bg-red-600 text-neutral-white font-medium hover:bg-red-700 rounded-sm cursor-pointer flex items-center gap-1 text-xs"
                >
                  {deleteClientMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. Create/Edit Requirement Modal */}
      {isReqModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-lg p-6 space-y-4 shadow-xl my-8">
            <div className="space-y-1">
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-primary animate-pulse" />
                {editingReqId ? "Edit Hiring Mandate" : "Add Hiring Mandate Requirement"}
              </h3>
              <p className="text-neutral-400 text-xs">
                {editingReqId ? "Modify requirement parameters to refine existing job openings." : "Input requirement parameters. Machine Intelligence will auto-generate draft JDs."}
              </p>
            </div>
            
            <form onSubmit={handleSaveRequirement} className="space-y-4 text-xs font-sans">
              {/* If editing, add Title field explicitly */}
              {editingReqId && (
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Requirement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Frontend Engineer"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden font-sans"
                  />
                </div>
              )}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Description / Mandate Brief</label>
                  <div className="flex items-center gap-2">
                    <label htmlFor="req-file-upload" className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/95 cursor-pointer font-semibold uppercase tracking-wider">
                      <Upload className="w-3.5 h-3.5" />
                      {isParsingFile ? "Extracting..." : "Upload File"}
                    </label>
                    <input
                      id="req-file-upload"
                      type="file"
                      accept=".txt,.pdf,.docx,.doc"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isParsingFile}
                    />
                  </div>
                </div>
                <textarea
                  placeholder="Paste client requirements outline or basic bullet list, or upload a document to extract text..."
                  required
                  rows={4}
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary font-sans"
                  disabled={isParsingFile}
                />
                {fileError && (
                  <p className="text-[10px] text-error font-mono mt-0.5">{fileError}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Skills Needed (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="React, Next.js, Tailwind, TypeScript"
                  value={reqSkills}
                  onChange={(e) => setReqSkills(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Experience Years (Min / Max)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={reqExpMin}
                      onChange={(e) => setReqExpMin(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={reqExpMax}
                      onChange={(e) => setReqExpMax(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Budget Range LPA (Min / Max)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={reqBudgetMin}
                      onChange={(e) => setReqBudgetMin(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={reqBudgetMax}
                      onChange={(e) => setReqBudgetMax(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Target Seniority</label>
                  <select
                    value={reqSeniority}
                    onChange={(e) => setReqSeniority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-neutral-white text-neutral-800"
                  >
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead / Staff</option>
                    <option value="any">Any / General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Number of JD Options Requested</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={reqPosts}
                    onChange={(e) => setReqPosts(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Internal Recruiter Notes</label>
                  <input
                    type="text"
                    placeholder="Special client preferences..."
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>

                {editingReqId && (
                  <div className="space-y-1">
                    <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Requirement Status</label>
                    <select
                      value={reqStatus}
                      onChange={(e) => setReqStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-sm bg-neutral-white text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                    >
                      <option value="draft">Draft</option>
                      <option value="generating">Generating</option>
                      <option value="ready">Ready</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsReqModalOpen(false);
                    setEditingReqId(null);
                  }}
                  className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReqMutation.isPending || updateReqMutation.isPending}
                  className="px-4 py-1.5 bg-primary text-neutral-white font-medium hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1.5"
                >
                  {(createReqMutation.isPending || updateReqMutation.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingReqId ? "Save Changes" : "Generate Job Openings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. LinkedIn Post Generator Modal */}
      {activeLinkedInJob && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-start border-b border-neutral-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#0A66C2]">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Generate LinkedIn Post
                </h3>
                <p className="text-neutral-400 text-[11px] font-mono">
                  Drafting post for {activeLinkedInJob.title} at {activeLinkedInJob.clientName}
                </p>
              </div>
              <button
                onClick={() => setActiveLinkedInJob(null)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer p-1 rounded-sm hover:bg-neutral-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 p-2.5 rounded-sm border border-neutral-150">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">Post Tone</span>
                  <span className="text-[11px] text-neutral-600 block">Select the vibe of the generated post text.</span>
                </div>
                <select
                  value={linkedinTone}
                  onChange={(e) => {
                    const newTone = e.target.value;
                    setLinkedinTone(newTone);
                    const applyUrl = typeof window !== "undefined"
                      ? `${window.location.origin}/apply/${activeLinkedInJob.id}${activeLinkedInJob.created_by ? `?recruiter_id=${activeLinkedInJob.created_by}` : ""}`
                      : `/apply/${activeLinkedInJob.id}${activeLinkedInJob.created_by ? `?recruiter_id=${activeLinkedInJob.created_by}` : ""}`;
                    const newContent = generatePostContent(
                      newTone,
                      activeLinkedInJob.title,
                      activeLinkedInJob.clientName,
                      activeLinkedInJob.description,
                      activeLinkedInJob.keywords,
                      applyUrl
                    );
                    setCustomPostContent(newContent);
                  }}
                  className="px-2.5 py-1.5 border border-neutral-250 bg-neutral-white rounded-sm text-neutral-700 font-mono text-[10px] focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
                >
                  <option value="professional">💼 Professional</option>
                  <option value="casual">👋 Casual / Modern</option>
                  <option value="exciting">🚀 Exciting / Growth</option>
                  <option value="storytelling">📖 Storytelling / Culture</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">Draft Content</label>
                <textarea
                  value={customPostContent}
                  onChange={(e) => setCustomPostContent(e.target.value)}
                  className="w-full h-64 p-3 font-sans text-xs bg-neutral-white border border-neutral-250 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden resize-none leading-relaxed"
                  placeholder="Drafting post..."
                />
              </div>
            </div>

            {/* LinkedIn integration alerts / status */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              {checkingLinkedinStatus && (
                <div className="flex items-center gap-2 p-2 bg-neutral-50 border border-neutral-200 rounded-sm text-[10px] text-neutral-500 font-mono animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Checking LinkedIn integration status...</span>
                </div>
              )}
              
              {!checkingLinkedinStatus && !linkedinConnected && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-sm text-[10px] text-amber-800 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold block uppercase tracking-wider mb-0.5">LinkedIn Not Connected</span>
                    <span>To post automatically, connect your LinkedIn account under Recruiter settings.</span>
                  </div>
                  <Link
                    href="/profile?tab=integrations"
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-sm font-semibold uppercase tracking-wider shrink-0 transition-colors"
                  >
                    Go to Settings
                  </Link>
                </div>
              )}

              {!checkingLinkedinStatus && linkedinConnected && !linkedinHasCompanyPage && (
                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-sm text-[10px] text-neutral-600 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold block uppercase tracking-wider mb-0.5 text-neutral-800">Posting to Personal Feed</span>
                    <span>Company Page ID is not configured. Posts will be published to your personal LinkedIn feed. Set a Company Page ID under settings to post to your company page instead.</span>
                  </div>
                  <Link
                    href="/profile?tab=integrations"
                    className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-sm font-semibold uppercase tracking-wider shrink-0 transition-colors"
                  >
                    Go to Settings
                  </Link>
                </div>
              )}

              {linkedinShareSuccess && (
                <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-sm text-[10px] text-emerald-800 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{linkedinShareSuccessMessage || "Successfully published job opening post to LinkedIn!"}</span>
                </div>
              )}

              {linkedinShareError && (
                <div className="p-2.5 bg-rose-50 border border-rose-250 rounded-sm text-[10px] text-rose-800">
                  <span className="font-bold block uppercase tracking-wider mb-0.5">Publishing Failed</span>
                  <span>{linkedinShareError}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100">
              <span className="text-[10px] text-neutral-400 font-mono italic">
                Tip: Copy the text, or use "Post to LinkedIn" to share directly to your page.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(customPostContent);
                    setCopiedPost(true);
                    setTimeout(() => setCopiedPost(false), 2000);
                  }}
                  className="px-3.5 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-600 font-medium text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {copiedPost ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                {/* Direct Post Button */}
                <button
                  type="button"
                  disabled={checkingLinkedinStatus || !linkedinConnected || sharingToLinkedin || linkedinShareSuccess}
                  onClick={handlePostToLinkedin}
                  className="px-4 py-1.5 bg-[#0A66C2] hover:bg-[#0A66C2]/90 disabled:opacity-50 text-white font-medium rounded-sm cursor-pointer flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors"
                >
                  {sharingToLinkedin ? (
                    <>
                      <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <span>Post to LinkedIn</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const applyUrl = typeof window !== "undefined"
                      ? `${window.location.origin}/apply/${activeLinkedInJob.id}${activeLinkedInJob.created_by ? `?recruiter_id=${activeLinkedInJob.created_by}` : ""}`
                      : `/apply/${activeLinkedInJob.id}${activeLinkedInJob.created_by ? `?recruiter_id=${activeLinkedInJob.created_by}` : ""}`;
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(applyUrl)}`, "_blank");
                  }}
                  className="px-4 py-1.5 bg-neutral-900 text-neutral-white font-medium hover:bg-neutral-850 rounded-sm cursor-pointer flex items-center gap-1.5 text-xs uppercase tracking-wider transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Share Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
