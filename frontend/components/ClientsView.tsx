"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { Client, Requirement } from "../types";
import { 
  Building2, Plus, FileText, ChevronRight, CheckCircle2, 
  MapPin, DollarSign, BrainCircuit, Loader2, Award, Upload 
} from "lucide-react";

export default function ClientsView() {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  
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
    queryFn: () => apiRequest<Requirement[]>("GET", "/requirements")
  });

  // Filter requirements for the selected client
  const filteredReqs = requirements.filter(r => r.client_id === selectedClientId);
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

  const createReqMutation = useMutation({
    mutationFn: (data: any) => apiRequest<Requirement>("POST", "/requirements", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setIsReqModalOpen(false);
      // Reset requirement form
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
    }
  });

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientNameInput.trim()) return;
    createClientMutation.mutate(clientNameInput);
  };

  const handleCreateRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    
    // Auto-generate title from the first line/sentence of description
    const derivedTitle = reqDesc.trim().split(/[.\n]/)[0].substring(0, 50).trim() || `Mandate for ${activeClient?.name || "Client"}`;

    const skillsList = reqSkills
      ? reqSkills.split(",").map(s => s.trim()).filter(s => s.length > 0)
      : [];

    createReqMutation.mutate({
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
      num_posts_requested: reqPosts
    });
  };

  // Helper to ensure first client is selected
  React.useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

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

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 text-xs">
          {loadingClients ? (
            <div className="p-4 text-center text-neutral-400 font-mono">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="p-4 text-center text-neutral-400 font-mono">No clients added.</div>
          ) : (
            clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={`w-full text-left p-4 flex items-center justify-between transition-colors cursor-pointer ${
                  selectedClientId === c.id 
                    ? "bg-neutral-50 border-l-2 border-primary" 
                    : "hover:bg-neutral-50/50"
                }`}
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-neutral-800">{c.name}</p>
                  <p className="text-[10px] text-neutral-400 font-mono">ID: {c.id}</p>
                </div>
                <div className="text-right font-mono text-[10px] text-neutral-400">
                  {c.requirements_count || 0} Req(s)
                </div>
              </button>
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
              onClick={() => setIsReqModalOpen(true)}
              className="px-2.5 py-1 bg-primary text-neutral-white font-medium text-[10px] tracking-wider uppercase transition-colors rounded-sm cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Requirement
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingReqs ? (
            <div className="text-center py-12 text-xs text-neutral-400 font-mono">Loading client details...</div>
          ) : !selectedClientId ? (
            <div className="text-center py-12 text-xs text-neutral-400">Select a client from the left pane to view active mandates.</div>
          ) : filteredReqs.length === 0 ? (
            <div className="text-center py-12 text-xs text-neutral-400">No requirements found for this client. Create one to begin.</div>
          ) : (
            filteredReqs.map((r) => (
              <div key={r.id} className="border border-neutral-200 rounded-sm p-4 hover:border-neutral-300 transition-all space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-tight font-bold text-sm text-neutral-850">{r.title}</h4>
                    <p className="text-[10px] text-neutral-400 font-mono">ID: {r.id}</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 bg-success/10 border border-success/20 text-success rounded-sm font-mono uppercase font-semibold">
                    {r.status}
                  </span>
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

      {/* 4. Create Requirement Modal */}
      {isReqModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-lg p-6 space-y-4 shadow-xl my-8">
            <div className="space-y-1">
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-primary animate-pulse" />
                Add Hiring Mandate Requirement
              </h3>
              <p className="text-neutral-400 text-xs">Input requirement parameters. Machine Intelligence will auto-generate draft JDs.</p>
            </div>
            
            <form onSubmit={handleCreateRequirement} className="space-y-4 text-xs font-sans">
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
                    max={3}
                    value={reqPosts}
                    onChange={(e) => setReqPosts(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Internal Recruiter Notes</label>
                <input
                  type="text"
                  placeholder="Special client preferences, timeline urgency etc."
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsReqModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReqMutation.isPending}
                  className="px-4 py-1.5 bg-primary text-neutral-white font-medium hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1.5"
                >
                  {createReqMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Generate Job Openings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
