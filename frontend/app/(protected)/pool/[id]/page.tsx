"use client";

import React, { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiRequest, API_BASE_URL, apiUploadFile } from "@/lib/api";
import { Candidate } from "@/types";
import { parseResumeTextHeuristically } from "@/components/PoolView";
import { 
  ArrowLeft, User, Mail, Phone, Calendar, Briefcase, 
  GraduationCap, Trophy, FileText, CheckCircle2, AlertCircle, Bookmark,
  Sparkles, Edit2, RefreshCcw, Trash2, Upload
} from "lucide-react";

interface CandidateApplicationHistory {
  id: string;
  candidate_id: string;
  job_opening_id: string;
  fuzzy_score: number;
  match_reason: string;
  strengths: string[];
  skill_gaps: string[];
  screening_status: string;
  stage: string;
  stage_status: string;
  stage_notes: string | null;
  created_at: string;
  job_title: string;
  client_name: string;
}

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editSummary, setEditSummary] = useState("");
  const [isReuploading, setIsReuploading] = useState(false);

  const handleReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReuploading(true);
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

      if (text && candidate) {
        const parsed = parseResumeTextHeuristically(text);
        const skillsList = parsed.skills ? parsed.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
        await apiRequest("PUT", `/candidates/${candidate.id}`, {
          raw_text: text,
          summary: parsed.summary,
          full_name: parsed.name || candidate.full_name,
          email: parsed.email || candidate.email,
          phone: parsed.phone || candidate.phone,
          skills: skillsList.length > 0 ? skillsList : candidate.skills,
          experience_years: parsed.experience_years || candidate.experience_years,
          education: parsed.education || candidate.education,
          academic_details: parsed.academicDetails || candidate.academic_details,
          achievements: parsed.achievements || candidate.achievements,
          resume_url: `/resumes/${file.name}`
        });
        queryClient.invalidateQueries({ queryKey: ["candidates"] });
        queryClient.invalidateQueries({ queryKey: ["candidate", candidate.id] });
        alert("Resume re-uploaded and candidate details extracted successfully!");
      } else {
        throw new Error("No text content could be extracted from this resume.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to parse/re-upload resume: " + (err.message || err));
    } finally {
      setIsReuploading(false);
    }
  };

  // Queries
  const { data: candidate, isLoading: loadingCandidate, error: candidateError } = useQuery<Candidate>({
    queryKey: ["candidate", id],
    queryFn: () => apiRequest<Candidate>("GET", `/candidates/${id}`)
  });

  const saveMutation = useMutation({
    mutationFn: (updatedSummary: string) => {
      return apiRequest("PUT", `/candidates/${id}`, {
        summary: updatedSummary
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", id] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setIsEditing(false);
    }
  });

  const handleEdit = () => {
    setEditSummary(candidate?.parsed_resume_json?.summary || "");
    setIsEditing(true);
  };

  const handleSave = () => {
    saveMutation.mutate(editSummary);
  };

  const { data: history = [], isLoading: loadingHistory } = useQuery<CandidateApplicationHistory[]>({
    queryKey: ["candidate_history", id],
    queryFn: () => apiRequest<CandidateApplicationHistory[]>("GET", `/candidates/${id}/applications`)
  });

  if (loadingCandidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3 font-mono text-xs text-neutral-400">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p>Loading candidate credentials ledger...</p>
      </div>
    );
  }

  if (candidateError || !candidate) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-neutral-white border border-neutral-200 p-6 rounded-sm text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-error mx-auto" />
        <h3 className="font-tight font-extrabold text-sm uppercase text-neutral-800 tracking-wider">Candidate Ledger Load Failed</h3>
        <p className="text-neutral-400 text-xs font-sans">The candidate with ID "{id}" was not resolved in ATS databases.</p>
        <button
          onClick={() => router.push("/pool")}
          className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-250 text-neutral-600 rounded-sm text-xs font-semibold cursor-pointer uppercase font-mono"
        >
          Return to Pool Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-5xl mx-auto w-full select-none">
      
      {/* Navigation Header */}
      <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
        <button
          onClick={() => router.push("/pool")}
          className="p-1.5 hover:bg-neutral-100 border border-neutral-200 rounded-sm text-neutral-500 cursor-pointer"
          title="Back to Sourcing Pool"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-tight font-bold text-neutral-850">Candidate Executive Summary</h2>
          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Profile ID: {candidate.id}</p>
        </div>
      </div>

      {/* Main Profile Card Header */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary flex items-center justify-center rounded-sm font-tight font-bold text-lg uppercase shadow-xs">
              {candidate.full_name.split(" ").map(w => w[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-tight font-extrabold text-neutral-850 tracking-tight">{candidate.full_name}</h1>
                <span className="text-[9px] px-1.5 py-0.2 bg-neutral-100 border border-neutral-250 font-mono text-neutral-500 rounded-sm uppercase font-bold">
                  {candidate.source || "Manual"}
                </span>
                {candidate.working_or_not === false ? (
                  <span className="text-[9px] px-1.5 py-0.2 bg-warning/10 border border-warning/30 font-mono text-warning rounded-sm font-bold uppercase">
                    Open to Work
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.2 bg-success/10 border border-success/30 font-mono text-success rounded-sm font-bold uppercase">
                    Employed
                  </span>
                )}
              </div>
              <p className="text-neutral-450 text-xs mt-0.5 font-semibold font-sans">{candidate.current_company ? `Current Company: ${candidate.current_company}` : "No current employer listed"}</p>
            </div>
          </div>

          {/* Details list */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs text-neutral-500 font-mono">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-neutral-400" />
              <span>{candidate.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-neutral-400" />
              <span>{candidate.phone || "No phone listed"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span>Added {new Date(candidate.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Right side metric stats */}
        <div className="flex md:flex-col justify-between items-end gap-2 text-right border-t md:border-t-0 border-neutral-150 pt-4 md:pt-0">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block">Years Experience</span>
            <span className="font-mono font-extrabold text-2xl text-neutral-800">{candidate.experience_years ?? 0} Yrs</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block">Active Pipelines</span>
            <span className="font-mono font-extrabold text-lg text-primary">{history.length} Jobs</span>
          </div>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-150 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-primary animate-pulse" />
            <h3 className="font-tight font-extrabold text-sm uppercase tracking-wider text-neutral-800">Executive Summary</h3>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-xs border border-neutral-200 hover:bg-neutral-50 rounded-sm cursor-pointer font-medium font-sans text-neutral-550"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-3 py-1 text-xs bg-primary text-neutral-white font-medium hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1.5"
              >
                {saveMutation.isPending && <RefreshCcw className="w-3 h-3 animate-spin" />}
                Save Summary
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              {isReuploading ? (
                <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                  <RefreshCcw className="w-3 h-3 animate-spin" />
                  Re-uploading...
                </span>
              ) : (
                <>
                  <label className="px-2.5 py-1 text-xs border border-neutral-250 bg-neutral-white hover:bg-neutral-50 text-neutral-600 rounded-sm cursor-pointer font-semibold flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3 h-3 text-neutral-400" />
                    Re-upload Resume
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx"
                      onChange={handleReupload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleEdit}
                    className="px-2.5 py-1 text-xs border border-neutral-250 bg-neutral-white hover:bg-neutral-50 text-neutral-600 rounded-sm cursor-pointer font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-neutral-400" />
                    Edit Summary
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <textarea
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            rows={4}
            className="w-full p-3 border border-neutral-250 rounded-sm text-xs text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-none bg-neutral-50/50"
            placeholder="Write candidate's executive summary..."
          />
        ) : (
          <p className="text-neutral-600 text-xs leading-relaxed whitespace-pre-wrap">
            {candidate.parsed_resume_json?.summary || "No executive summary available for this candidate. Click 'Edit Summary' to write one."}
          </p>
        )}
      </div>

      {/* Skills list */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm p-4 shadow-sm space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-extrabold font-mono block">Indexed Professional Skills</span>
        <div className="flex flex-wrap gap-1.5">
          {candidate.skills && candidate.skills.length > 0 ? (
            candidate.skills.map((sk, idx) => (
              <span key={idx} className="text-xs bg-neutral-50 hover:bg-neutral-100 text-neutral-700 px-2.5 py-0.5 border border-neutral-250 rounded-sm font-medium font-sans">
                {sk}
              </span>
            ))
          ) : (
            <span className="text-xs font-mono text-neutral-400 italic">No professional skills cataloged.</span>
          )}
        </div>
      </div>

      {/* Main Grid: Info Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Education Panel */}
        <div className="bg-neutral-white border border-neutral-200 rounded-sm p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-neutral-150 pb-2">
            <GraduationCap className="w-4.5 h-4.5 text-primary" />
            <h3 className="font-tight font-extrabold text-sm uppercase tracking-wider text-neutral-800">Academic Credentials</h3>
          </div>
          <div className="space-y-3 font-sans text-xs">
            <div className="bg-neutral-50 p-3 rounded-sm border border-neutral-200">
              <span className="text-[9px] uppercase text-neutral-450 block font-bold font-mono">PRIMARY DEGREE</span>
              <p className="font-semibold text-neutral-700 mt-0.5 text-sm">{candidate.education || "No primary degree listed"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase text-neutral-450 block font-bold font-mono">ACADEMIC BACKGROUND</span>
              <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">
                {candidate.academic_details || "No additional academic credentials recorded."}
              </p>
            </div>
          </div>
        </div>

        {/* Achievements Panel */}
        <div className="bg-neutral-white border border-neutral-200 rounded-sm p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-neutral-150 pb-2">
            <Trophy className="w-4.5 h-4.5 text-warning" />
            <h3 className="font-tight font-extrabold text-sm uppercase tracking-wider text-neutral-800">Achievements & Accolades</h3>
          </div>
          <div className="space-y-3 font-sans text-xs">
            <div className="space-y-1">
              <span className="text-[9px] uppercase text-neutral-450 block font-bold font-mono">HONORS & EXPERIENCE WIN-LOGS</span>
              <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">
                {candidate.achievements || "No achievements or honors cataloged in talent profile."}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Candidate Pipeline History (Requirement 4) */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm shadow-sm overflow-hidden text-xs">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-neutral-450" />
            <span className="font-tight font-extrabold text-xs uppercase tracking-wider text-neutral-800">Unified Job Applications & History</span>
          </div>
          <span className="text-[10px] text-neutral-450 font-mono font-bold">TOTAL LINKED ENTRIES: {history.length}</span>
        </div>

        {loadingHistory ? (
          <div className="text-center py-8 text-neutral-400 font-mono">Gathering job application history logs...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-neutral-400 italic">No job application records matched to this candidate profile.</div>
        ) : (
          <div className="divide-y divide-neutral-150">
            {history.map((app) => (
              <div key={app.id} className="p-4 space-y-3 hover:bg-neutral-50/20 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-500 uppercase rounded-sm font-bold">
                        {app.client_name}
                      </span>
                      <h4 className="font-bold text-neutral-800 text-sm">{app.job_title}</h4>
                    </div>
                    <p className="text-[10px] text-neutral-400 font-mono">Application ID: {app.id} • Applied {new Date(app.created_at).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[9px] text-neutral-400 block font-mono">MATCH ACCURACY</span>
                      <span className={`font-mono font-extrabold px-2 py-0.5 rounded-sm border text-[11px] ${
                        app.fuzzy_score >= 80 ? "bg-success/10 text-success border-success/20" :
                        app.fuzzy_score >= 50 ? "bg-warning/10 text-warning border-warning/20" :
                        "bg-error/10 text-error border-error/20"
                      }`}>
                        {app.fuzzy_score}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-neutral-400 block font-mono">PIPELINE STAGE</span>
                      <span className={`px-2 py-0.5 rounded-sm border text-[9px] font-mono font-bold uppercase ${
                        app.stage === "rejected" ? "bg-error/10 border-error/20 text-error" :
                        app.stage === "hired" ? "bg-success/10 border-success/20 text-success" :
                        "bg-neutral-150 border-neutral-250 text-neutral-500"
                      }`}>
                        {app.stage} ({app.stage_status})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 bg-neutral-50/50 p-2.5 border border-neutral-200/50 rounded-sm">
                  <div className="sm:col-span-2 space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold font-mono block">Matching Reason</span>
                    <p className="text-neutral-600 text-[11px] leading-relaxed">{app.match_reason}</p>
                  </div>
                  <div className="space-y-1.5 font-mono text-[9px]">
                    <div>
                      <span className="text-success font-bold block uppercase tracking-wider">Strengths</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {app.strengths && app.strengths.length > 0 ? (
                          app.strengths.map((s, i) => (
                            <span key={i} className="px-1.5 py-0.2 bg-success/10 text-success border border-success/20 rounded-sm">{s}</span>
                          ))
                        ) : (
                          <span className="text-neutral-450 italic">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-error font-bold block uppercase tracking-wider">Skill Gaps</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {app.skill_gaps && app.skill_gaps.length > 0 ? (
                          app.skill_gaps.map((g, i) => (
                            <span key={i} className="px-1.5 py-0.2 bg-error/10 text-error border border-error/20 rounded-sm">{g}</span>
                          ))
                        ) : (
                          <span className="text-success italic font-bold">Perfect Fit</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {app.stage_notes && (
                  <div className="text-[11px] text-neutral-500 italic bg-warning/5 p-2 rounded-sm border border-warning/10 flex gap-1.5 items-start">
                    <Bookmark className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                    <p><strong>Reviewer Stage Notes:</strong> "{app.stage_notes}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume Raw Text Preview */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-150 pb-2">
          <FileText className="w-4.5 h-4.5 text-neutral-450" />
          <h3 className="font-tight font-extrabold text-sm uppercase tracking-wider text-neutral-800">Resume Source Text Segment</h3>
        </div>
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm text-[11px] leading-relaxed max-h-96 overflow-y-auto font-mono text-neutral-600 whitespace-pre-wrap select-text">
          {candidate.raw_text || "No resume source text extracted."}
        </div>
      </div>

    </div>
  );
}
