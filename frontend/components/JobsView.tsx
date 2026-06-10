"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { JobOpening, JobOpeningSkill, JobCandidate } from "../types";
import { 
  Table, Briefcase, FileSignature, Sparkles, CheckSquare, 
  Play, Check, Edit3, ArrowLeft, RefreshCcw, Save, Trash2, 
  Sliders, UserCheck, AlertTriangle, Layers, UserCircle, ChevronRight, Plus, CheckCircle2
} from "lucide-react";

interface JobsViewProps {
  initialJobId?: string | null;
  onNavigateToReview: (applicationId: string) => void;
}

const EMPTY_JOBS: JobOpening[] = [];
const EMPTY_SKILLS: JobOpeningSkill[] = [];
const EMPTY_CANDIDATES: JobCandidate[] = [];

export default function JobsView({ initialJobId, onNavigateToReview }: JobsViewProps) {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId || null);
  const [activeTab, setActiveTab] = useState<"jd" | "skills" | "candidates">("jd");

  // State for AI JD Regeneration instruction
  const [regenInstruction, setRegenInstruction] = useState("");
  const [isRegenOpen, setIsRegenOpen] = useState(false);

  // Editor states
  const [jdTitle, setJdTitle] = useState("");
  const [jdDesc, setJdDesc] = useState("");
  const [jdSalary, setJdSalary] = useState("");
  const [jdResp, setJdResp] = useState<string[]>([]);
  const [jdQual, setJdQual] = useState<string[]>([]);
  const [newRespItem, setNewRespItem] = useState("");
  const [newQualItem, setNewQualItem] = useState("");

  // Queries
  const { data: jobs = EMPTY_JOBS, isLoading: loadingJobs } = useQuery<JobOpening[]>({
    queryKey: ["jobs"],
    queryFn: () => apiRequest<JobOpening[]>("GET", "/jobs"),
    refetchInterval: 3000
  });

  const activeJob = jobs.find(j => j.id === selectedJobId);

  const { data: skills = EMPTY_SKILLS, isLoading: loadingSkills } = useQuery<JobOpeningSkill[]>({
    queryKey: ["skills", selectedJobId],
    queryFn: () => apiRequest<JobOpeningSkill[]>("GET", `/jobs/${selectedJobId}/skills`),
    enabled: !!selectedJobId
  });

  const { data: matchedCandidates = EMPTY_CANDIDATES, isLoading: loadingCandidates } = useQuery<JobCandidate[]>({
    queryKey: ["job_candidates", selectedJobId],
    queryFn: () => apiRequest<JobCandidate[]>("GET", `/jobs/${selectedJobId}/candidates`),
    enabled: !!selectedJobId && activeJob?.processing_status === "ready"
  });

  // Local skills weights state for drag-and-drop / adjustment
  const [localSkills, setLocalSkills] = useState<JobOpeningSkill[]>([]);

  useEffect(() => {
    if (skills) {
      setLocalSkills(skills);
    }
  }, [skills]);

  // Sync editor fields when active job shifts
  useEffect(() => {
    if (activeJob) {
      setJdTitle(activeJob.title || "");
      setJdDesc(activeJob.description || "");
      setJdSalary(activeJob.salary_range || "");
      setJdResp(activeJob.responsibilities || []);
      setJdQual(activeJob.qualifications || []);
      
      // Auto toggle tabs based on processing status
      if (activeJob.processing_status === "skill_approval") {
        setActiveTab("skills");
      } else if (activeJob.processing_status === "ready") {
        setActiveTab("candidates");
      } else {
        setActiveTab("jd");
      }
    }
  }, [activeJob]);

  // Mutations
  const updateJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest<JobOpening>("PATCH", `/jobs/${selectedJobId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      alert("Job details saved successfully.");
    }
  });

  const confirmJobMutation = useMutation({
    mutationFn: () => apiRequest<JobOpening>("POST", `/jobs/${selectedJobId}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  });

  const scanPublishMutation = useMutation({
    mutationFn: () => apiRequest<JobOpening>("POST", `/jobs/${selectedJobId}/scan-and-publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["skills", selectedJobId] });
      setActiveTab("skills");
    }
  });

  const saveSkillsMutation = useMutation({
    mutationFn: (updatedSkills: JobOpeningSkill[]) => 
      apiRequest<{ success: boolean }>("PUT", `/jobs/${selectedJobId}/skills`, { skills: updatedSkills }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["skills", selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ["job_candidates", selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setActiveTab("candidates");
    }
  });

  const regenerateMutation = useMutation({
    mutationFn: (instruction: string) => 
      apiRequest<JobOpening>("POST", `/jobs/${selectedJobId}/regenerate`, { instruction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setIsRegenOpen(false);
      setRegenInstruction("");
    }
  });

  const handleSaveJd = (e: React.FormEvent) => {
    e.preventDefault();
    updateJobMutation.mutate({
      title: jdTitle,
      description: jdDesc,
      salary_range: jdSalary,
      responsibilities: jdResp,
      qualifications: jdQual
    });
  };

  const handleSkillWeightChange = (id: string, weight: number) => {
    setLocalSkills(prev => prev.map(s => s.id === id ? { ...s, weight: Math.max(0, Math.min(1, weight)) } : s));
  };

  const handleAddSkill = () => {
    const name = prompt("Enter custom skill name:");
    if (!name || !selectedJobId) return;
    const newSkill: JobOpeningSkill = {
      id: `sk-custom-${Date.now()}`,
      job_opening_id: selectedJobId,
      skill_name: name,
      weight: 0.15,
      skill_order: localSkills.length + 1,
      approved: false,
      created_at: new Date().toISOString()
    };
    setLocalSkills(prev => [...prev, newSkill]);
  };

  const handleRemoveSkill = (id: string) => {
    setLocalSkills(prev => prev.filter(s => s.id !== id));
  };

  if (!selectedJobId) {
    // 1. Notion Style High-Density Table View
    return (
      <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden shadow-sm font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div>
            <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Notion Job Openings Catalog</h3>
            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Full corporate hiring postings index</p>
          </div>
        </div>

        {loadingJobs ? (
          <div className="text-center py-12 text-xs text-neutral-400 font-mono">Loading job database...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-xs text-neutral-400">No job openings created. Go to Clients to generate drafts.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-400 font-mono uppercase text-[9px] tracking-wider">
                  <th className="p-4 font-semibold">Client</th>
                  <th className="p-4 font-semibold">Job Title</th>
                  <th className="p-4 font-semibold">Post Index</th>
                  <th className="p-4 font-semibold">Publish State</th>
                  <th className="p-4 font-semibold">AI Process Queue</th>
                  <th className="p-4 font-semibold">Top Score</th>
                  <th className="p-4 font-semibold">Created At</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-neutral-50/55 transition-colors group">
                    <td className="p-4 font-mono font-medium text-neutral-500 uppercase">{j.client_name}</td>
                    <td className="p-4 font-semibold text-neutral-800">
                      <button 
                        onClick={() => setSelectedJobId(j.id)}
                        className="hover:text-primary transition-colors cursor-pointer text-left font-tight"
                      >
                        {j.title}
                      </button>
                    </td>
                    <td className="p-4 font-mono text-neutral-400">#{j.post_index}</td>
                    <td className="p-4">
                      <span className={`text-[9px] px-2 py-0.5 rounded-sm border font-semibold uppercase font-mono ${
                        j.status === "published" ? "bg-success/10 border-success/20 text-success" :
                        j.status === "confirmed" ? "bg-info/10 border-info/20 text-info" :
                        "bg-neutral-100 border-neutral-250 text-neutral-400"
                      }`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase font-semibold ${
                        j.processing_status === "ready" ? "text-success" :
                        j.processing_status === "error" ? "text-error" :
                        "text-primary animate-pulse"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          j.processing_status === "ready" ? "bg-success" :
                          j.processing_status === "error" ? "bg-error" :
                          "bg-primary animate-ping"
                        }`}></span>
                        {j.processing_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-neutral-700">
                      {j.top_score && j.top_score > 0 ? `${j.top_score}%` : "-"}
                    </td>
                    <td className="p-4 text-neutral-400 font-mono">
                      {new Date(j.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedJobId(j.id)}
                        className="text-[10px] text-neutral-400 hover:text-primary font-semibold uppercase tracking-wider font-mono flex items-center gap-0.5 ml-auto cursor-pointer"
                      >
                        Open
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 2. Active Job Workspace View
  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedJobId(null)}
            className="p-1.5 hover:bg-neutral-200 border border-neutral-200 rounded-sm text-neutral-500 cursor-pointer"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-500 uppercase rounded-sm">
                {activeJob?.client_name}
              </span>
              <h2 className="text-lg font-tight font-bold text-neutral-850">{activeJob?.title}</h2>
            </div>
            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Job opening ID: {activeJob?.id}</p>
          </div>
        </div>

        {/* Action states panel */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {activeJob?.status === "draft" && (
            <button
              onClick={() => confirmJobMutation.mutate()}
              className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm cursor-pointer flex items-center gap-1.5 text-neutral-600 font-semibold"
            >
              <FileSignature className="w-3.5 h-3.5 text-neutral-500" />
              Confirm JD Draft
            </button>
          )}

          {activeJob?.status === "confirmed" && (
            <button
              onClick={() => scanPublishMutation.mutate()}
              className="px-3 py-1.5 bg-primary text-neutral-white hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wider font-semibold text-[10px]"
            >
              <Play className="w-3.5 h-3.5" />
              Scan & Publish JD
            </button>
          )}

          <button
            onClick={() => setIsRegenOpen(true)}
            className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-500 rounded-sm cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            AI Edit JD
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("jd")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeTab === "jd" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Job Description Editor
        </button>
        <button
          disabled={!skills || skills.length === 0}
          onClick={() => setActiveTab("skills")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all disabled:opacity-40 ${
            activeTab === "skills" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Skills Weights Approval
        </button>
        <button
          disabled={activeJob?.processing_status !== "ready"}
          onClick={() => setActiveTab("candidates")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all disabled:opacity-40 ${
            activeTab === "candidates" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Matched Candidate Rankings
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "jd" && (
        <form onSubmit={handleSaveJd} className="bg-neutral-white border border-neutral-200 rounded-sm p-6 space-y-4 shadow-sm font-sans text-xs">
          <div className="space-y-1">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Job Title</label>
            <input
              type="text"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 text-sm font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Salary Range</label>
            <input
              type="text"
              value={jdSalary}
              onChange={(e) => setJdSalary(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Role Description</label>
            <textarea
              rows={4}
              value={jdDesc}
              onChange={(e) => setJdDesc(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 leading-relaxed"
            />
          </div>

          {/* Responsibilities list manager */}
          <div className="space-y-2">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Responsibilities</label>
            <div className="space-y-1.5">
              {jdResp.map((resp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={resp}
                    onChange={(e) => {
                      const updated = [...jdResp];
                      updated[idx] = e.target.value;
                      setJdResp(updated);
                    }}
                    className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                  <button
                    type="button"
                    onClick={() => setJdResp(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 text-neutral-400 hover:text-error border border-neutral-200 rounded-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add responsibility bullet..."
                  value={newRespItem}
                  onChange={(e) => setNewRespItem(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newRespItem.trim()) return;
                    setJdResp(prev => [...prev, newRespItem]);
                    setNewRespItem("");
                  }}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-sm cursor-pointer border border-neutral-200 font-semibold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Qualifications list manager */}
          <div className="space-y-2">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Qualifications</label>
            <div className="space-y-1.5">
              {jdQual.map((qual, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={qual}
                    onChange={(e) => {
                      const updated = [...jdQual];
                      updated[idx] = e.target.value;
                      setJdQual(updated);
                    }}
                    className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                  <button
                    type="button"
                    onClick={() => setJdQual(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 text-neutral-400 hover:text-error border border-neutral-200 rounded-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add qualification bullet..."
                  value={newQualItem}
                  onChange={(e) => setNewQualItem(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newQualItem.trim()) return;
                    setJdQual(prev => [...prev, newQualItem]);
                    setNewQualItem("");
                  }}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-sm cursor-pointer border border-neutral-200 font-semibold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={updateJobMutation.isPending}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-neutral-white font-medium rounded-sm cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      )}

      {activeTab === "skills" && (
        <div className="bg-neutral-white border border-neutral-200 rounded-sm p-6 space-y-4 shadow-sm text-xs font-sans">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-tight font-bold text-sm text-neutral-850 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" />
                Skills Weights Tuning
              </h3>
              <button
                onClick={handleAddSkill}
                className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-600 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Skill Parameter
              </button>
            </div>
            <p className="text-neutral-400 text-xs">Define matching weight priorities. Combined weights must scale to compute index scores.</p>
          </div>

          <div className="space-y-3 pt-3">
            {localSkills.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-4 bg-neutral-50 p-3 border border-neutral-200 rounded-sm">
                <div className="w-6 font-mono text-neutral-400 text-center font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1 font-semibold text-neutral-800">
                  {s.skill_name}
                </div>
                
                {/* Weight slider */}
                <div className="flex items-center gap-2.5 max-w-sm w-full font-mono">
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={s.weight}
                    onChange={(e) => handleSkillWeightChange(s.id, Number(e.target.value))}
                    className="flex-1 accent-primary h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-12 text-right font-bold text-neutral-700">
                    {(s.weight * 100).toFixed(0)}%
                  </span>
                </div>

                <button
                  onClick={() => handleRemoveSkill(s.id)}
                  className="p-1 text-neutral-400 hover:text-error rounded-sm border border-neutral-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100 mt-6">
            <button
              onClick={() => saveSkillsMutation.mutate(localSkills)}
              disabled={saveSkillsMutation.isPending}
              className="px-4 py-2 bg-success hover:bg-success/95 text-neutral-white font-medium rounded-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wider font-semibold text-[10px]"
            >
              {saveSkillsMutation.isPending ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
              Approve and Rank Candidates
            </button>
          </div>
        </div>
      )}

      {activeTab === "candidates" && (
        <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden shadow-sm text-xs font-sans">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Matched Candidate Index</h3>
            <span className="text-[10px] text-success font-semibold flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              FUZZY ALIGNED DATA
            </span>
          </div>

          {loadingCandidates ? (
            <div className="text-center py-12 text-xs text-neutral-400 font-mono">Scanning index and compiling ranks...</div>
          ) : matchedCandidates.length === 0 ? (
            <div className="text-center py-12 text-xs text-neutral-400">No candidates matched. Go to Skills weights to trigger matching scan.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-400 font-mono uppercase text-[9px] tracking-wider">
                    <th className="p-4 font-semibold">Rank</th>
                    <th className="p-4 font-semibold">Candidate Name</th>
                    <th className="p-4 font-semibold">Experience</th>
                    <th className="p-4 font-semibold">Fuzzy Match Score</th>
                    <th className="p-4 font-semibold">Matched Skills</th>
                    <th className="p-4 font-semibold">Current Pipeline Stage</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150">
                  {matchedCandidates.map((jc) => (
                    <tr key={jc.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-neutral-400">#{jc.rank_order}</td>
                      <td className="p-4 font-semibold text-neutral-800 flex items-center gap-2">
                        <UserCircle className="w-5 h-5 text-neutral-400" />
                        {jc.candidate_name}
                      </td>
                      <td className="p-4 font-mono text-neutral-500">{jc.experience_years} Years</td>
                      <td className="p-4 font-mono font-bold text-primary text-sm">
                        {jc.fuzzy_score}%
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {jc.skills?.slice(0, 3).map((sk, i) => (
                            <span key={i} className="text-[8px] font-mono px-1 py-0.2 bg-neutral-100 text-neutral-500 rounded-sm border border-neutral-200">
                              {sk}
                            </span>
                          ))}
                          {jc.skills && jc.skills.length > 3 && (
                            <span className="text-[8px] text-neutral-400 font-mono">+{jc.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 uppercase font-mono text-[9px]">
                        <span className={`px-1.5 py-0.5 rounded-sm border ${
                          jc.stage === "rejected" ? "bg-error/10 border-error/20 text-error" :
                          jc.stage === "hired" ? "bg-success/10 border-success/20 text-success" :
                          "bg-neutral-150 border-neutral-250 text-neutral-500"
                        }`}>
                          {jc.stage || "screening"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {jc.application_id && (
                          <button
                            onClick={() => onNavigateToReview(jc.application_id!)}
                            className="text-[10px] text-primary hover:underline font-semibold uppercase font-mono cursor-pointer flex items-center gap-0.5 ml-auto"
                          >
                            Review Workspace
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AI Edit JD Dialog */}
      {isRegenOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                AI Edit JD Prompter
              </h3>
              <p className="text-neutral-400 text-xs">Enter refinement command. LLM agent will rebuild responsibilities and summary.</p>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!regenInstruction.trim()) return;
                regenerateMutation.mutate(regenInstruction);
              }}
              className="space-y-4 text-xs font-sans"
            >
              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Refinement Command</label>
                <input
                  type="text"
                  placeholder="e.g. Add 3 years of Kubernetes experience"
                  required
                  value={regenInstruction}
                  onChange={(e) => setRegenInstruction(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegenOpen(false)}
                  className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regenerateMutation.isPending}
                  className="px-4 py-1.5 bg-primary text-neutral-white font-medium hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1.5"
                >
                  {regenerateMutation.isPending ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Regenerate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
