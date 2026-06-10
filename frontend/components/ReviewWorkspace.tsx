"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { Application, ScreeningQuestion, InterviewStage } from "../types";
import { 
  FileText, BrainCircuit, MessageSquare, Landmark, Award, 
  ThumbsUp, ThumbsDown, CheckCircle2, AlertTriangle, Play,
  RefreshCw, Edit3, Trash2, Calendar, HelpCircle, Save, Sparkles, Check
} from "lucide-react";

interface ReviewWorkspaceProps {
  applicationId: string;
  onBack: () => void;
}

export default function ReviewWorkspace({ applicationId, onBack }: ReviewWorkspaceProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"analysis" | "questions" | "stages">("analysis");

  // Local state for question editing
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [aiRefineText, setAiRefineText] = useState("");
  const [isRefineOpen, setIsRefineOpen] = useState<string | null>(null);

  // Local state for advance stage form
  const [nextStage, setNextStage] = useState<"screening" | "technical" | "hr" | "final" | "hired" | "rejected">("technical");
  const [stageStatus, setStageStatus] = useState<"pending" | "in_progress" | "passed" | "failed" | "on_hold">("passed");
  const [stageNotes, setStageNotes] = useState("");

  // Queries
  const { data: app, isLoading: loadingApp } = useQuery<Application>({
    queryKey: ["application", applicationId],
    queryFn: () => apiRequest<Application>("GET", `/applications/${applicationId}`)
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery<ScreeningQuestion[]>({
    queryKey: ["questions", applicationId],
    queryFn: () => apiRequest<ScreeningQuestion[]>("GET", `/applications/${applicationId}/questions`),
    enabled: !!applicationId
  });

  const { data: stages = [], isLoading: loadingStages } = useQuery<InterviewStage[]>({
    queryKey: ["stages", applicationId],
    queryFn: () => apiRequest<InterviewStage[]>("GET", `/applications/${applicationId}/stages`),
    enabled: !!applicationId
  });

  // Mutations
  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => 
      apiRequest<ScreeningQuestion>("PATCH", `/questions/${id}`, { question: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", applicationId] });
      setEditingQuestionId(null);
    }
  });

  const aiRefineQuestionMutation = useMutation({
    mutationFn: ({ id, instruction }: { id: string; instruction: string }) => 
      apiRequest<ScreeningQuestion>("POST", `/questions/${id}/ai-edit`, { instruction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", applicationId] });
      setIsRefineOpen(null);
      setAiRefineText("");
    }
  });

  const updateStageMutation = useMutation({
    mutationFn: (data: any) => apiRequest<Application>("PATCH", `/applications/${applicationId}/stage`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["stages", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setStageNotes("");
      alert("Pipeline stage advanced successfully.");
    }
  });

  const acceptApplicationMutation = useMutation({
    mutationFn: () => apiRequest<Application>("PATCH", `/applications/${applicationId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["questions", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    }
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: (reason: string) => apiRequest<Application>("PATCH", `/applications/${applicationId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["stages", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    }
  });

  const handleSaveQuestion = (id: string) => {
    if (!editQuestionText.trim()) return;
    updateQuestionMutation.mutate({ id, text: editQuestionText });
  };

  const handleAiRefine = (id: string) => {
    if (!aiRefineText.trim()) return;
    aiRefineQuestionMutation.mutate({ id, instruction: aiRefineText });
  };

  const handleAdvanceStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStageMutation.mutate({
      stage: nextStage,
      stage_status: stageStatus,
      notes: stageNotes
    });
  };

  if (loadingApp) {
    return <div className="text-center py-12 text-xs text-neutral-400 font-mono">Loading review workspace...</div>;
  }

  if (!app) {
    return <div className="text-center py-12 text-xs text-neutral-400">Application not found.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
      
      {/* 1. Left Side: Document/Resume Viewer */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden flex flex-col h-[650px] shadow-sm">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <span className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-neutral-500" />
            Resume Document View
          </span>
          <span className="font-mono text-[10px] text-neutral-400">
            {app.candidate_email}
          </span>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-neutral-50 text-xs leading-relaxed select-text">
          <div className="bg-neutral-white border border-neutral-150 p-6 rounded-sm min-h-full shadow-xs whitespace-pre-wrap font-mono text-[11px] text-neutral-600">
            {app.candidate_cv || "No resume uploaded. Parsing details manually..."}
          </div>
        </div>
      </div>

      {/* 2. Right Side: Evaluation Workspace panel */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden flex flex-col h-[650px] shadow-sm">
        {/* Workspace Title bar */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-tight font-bold text-sm text-neutral-850">{app.candidate_name}</h3>
            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Exp: {app.candidate_experience} Yrs • Aligned Score</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-100 rounded-sm text-[10px] uppercase font-semibold cursor-pointer"
            >
              Back
            </button>
            {app.screening_status === "pending" ? (
              <>
                <button
                  onClick={() => acceptApplicationMutation.mutate()}
                  className="px-2.5 py-1 bg-success text-neutral-white hover:bg-success/95 rounded-sm text-[10px] uppercase font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Accept Sourcing
                </button>
                <button
                  onClick={() => {
                    const r = prompt("Provide rejection reason:");
                    if (r) rejectApplicationMutation.mutate(r);
                  }}
                  className="px-2.5 py-1 bg-error text-neutral-white hover:bg-error/95 rounded-sm text-[10px] uppercase font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Reject
                </button>
              </>
            ) : (
              <span className={`text-[10px] px-2.5 py-1 border rounded-sm uppercase font-mono font-bold ${
                app.screening_status === "accepted" ? "bg-success/10 border-success/20 text-success" :
                "bg-error/10 border-error/20 text-error"
              }`}>
                {app.screening_status}
              </span>
            )}
          </div>
        </div>

        {/* Tab Menus */}
        <div className="flex border-b border-neutral-200 bg-neutral-50/50">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex-1 py-2 text-center text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeTab === "analysis" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            Match Analysis
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`flex-1 py-2 text-center text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeTab === "questions" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            AI Screening Questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab("stages")}
            className={`flex-1 py-2 text-center text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
              activeTab === "stages" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            Stage Advance ({stages.length})
          </button>
        </div>

        {/* Tab content bodies */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* TAB 1: AI Match Analysis */}
          {activeTab === "analysis" && (
            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-center gap-4 bg-neutral-50 p-4 border border-neutral-200 rounded-sm">
                <div className="text-center space-y-1">
                  <span className="text-[28px] font-tight font-bold text-primary tracking-tight block">
                    {app.match_score || app.fuzzy_score}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold font-mono">Fuzzy Fit</span>
                </div>
                <div className="border-l border-neutral-200 pl-4 flex-1">
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block mb-1 font-mono">LLM Alignment Summary</span>
                  <p className="text-neutral-600 leading-relaxed text-xs">
                    {app.match_reason || "AI evaluation pending. Click Accept Sourcing to compile custom matching analyses."}
                  </p>
                </div>
              </div>

              {/* Strengths & Gaps lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-neutral-200 rounded-sm p-3.5 space-y-2">
                  <span className="text-[9px] uppercase tracking-wider text-success font-bold font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Key Strengths
                  </span>
                  <ul className="space-y-1.5 text-neutral-600 list-disc list-inside">
                    {app.strengths && app.strengths.length > 0 ? (
                      app.strengths.map((st, i) => <li key={i}>{st}</li>)
                    ) : (
                      <li>Strong technical alignment</li>
                    )}
                  </ul>
                </div>

                <div className="border border-neutral-200 rounded-sm p-3.5 space-y-2">
                  <span className="text-[9px] uppercase tracking-wider text-warning font-bold font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Skill Gap Indicators
                  </span>
                  <ul className="space-y-1.5 text-neutral-600 list-disc list-inside">
                    {app.skill_gaps && app.skill_gaps.length > 0 ? (
                      app.skill_gaps.map((sg, i) => <li key={i}>{sg}</li>)
                    ) : (
                      <li>No severe gaps detected</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Screening Questions */}
          {activeTab === "questions" && (
            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono">Interview Screening Prompts</span>
                <span className="text-[10px] text-primary font-mono flex items-center gap-1 animate-pulse">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  PERSISTENT AI VERBOSE
                </span>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">No questions generated. Accept sourcing to auto-generate prompts.</div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div key={q.id} className="border border-neutral-200 bg-neutral-50/30 rounded-sm p-3.5 space-y-2.5 relative">
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-neutral-200 text-neutral-600 rounded-sm font-semibold uppercase">
                          {q.difficulty}
                        </span>
                        {q.modified && (
                          <span className="font-mono text-[8px] text-success flex items-center gap-0.5 uppercase">
                            <Check className="w-2.5 h-2.5" />
                            Edited
                          </span>
                        )}
                      </div>

                      {editingQuestionId === q.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editQuestionText}
                            onChange={(e) => setEditQuestionText(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-1.5 border border-neutral-250 bg-neutral-white rounded-sm text-neutral-800"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingQuestionId(null)}
                              className="px-2 py-1 border border-neutral-200 hover:bg-neutral-100 rounded-sm cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveQuestion(q.id)}
                              className="px-3 py-1 bg-primary text-neutral-white rounded-sm cursor-pointer flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-neutral-700 leading-relaxed font-medium">
                          {q.question}
                        </p>
                      )}

                      {/* AI Edit inline trigger */}
                      {editingQuestionId !== q.id && (
                        <div className="flex gap-2 justify-end font-mono">
                          <button
                            onClick={() => {
                              setEditingQuestionId(q.id);
                              setEditQuestionText(q.question);
                            }}
                            className="text-[9px] text-neutral-500 hover:text-primary flex items-center gap-0.5 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            Manual Edit
                          </button>
                          <button
                            onClick={() => setIsRefineOpen(isRefineOpen === q.id ? null : q.id)}
                            className="text-[9px] text-primary flex items-center gap-0.5 cursor-pointer font-bold"
                          >
                            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                            AI Refine
                          </button>
                        </div>
                      )}

                      {isRefineOpen === q.id && (
                        <div className="border-t border-neutral-200/60 pt-2.5 mt-2.5 space-y-2 font-sans">
                          <div className="flex rounded-sm overflow-hidden border border-neutral-200">
                            <input
                              type="text"
                              placeholder="e.g. Focus more on SSR rendering loop..."
                              value={aiRefineText}
                              onChange={(e) => setAiRefineText(e.target.value)}
                              className="flex-1 px-2 py-1 text-xs text-neutral-800 focus:outline-none"
                            />
                            <button
                              onClick={() => handleAiRefine(q.id)}
                              className="bg-neutral-900 text-neutral-white px-3 py-1 hover:bg-neutral-800 transition-colors font-mono text-[9px] uppercase cursor-pointer"
                            >
                              Refine
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Advance Stages */}
          {activeTab === "stages" && (
            <div className="space-y-6 text-xs font-sans select-none">
              
              {/* Advance pipeline stage form */}
              <form onSubmit={handleAdvanceStageSubmit} className="bg-neutral-50 p-4 border border-neutral-200 rounded-sm space-y-3.5">
                <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono block">Advance Hiring Stage</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-neutral-500 font-semibold block uppercase text-[9px] tracking-wider">Next Step Stage</label>
                    <select
                      value={nextStage}
                      onChange={(e) => setNextStage(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-neutral-800"
                    >
                      <option value="screening">Screening</option>
                      <option value="technical">Technical Interview</option>
                      <option value="hr">HR Round</option>
                      <option value="final">Final Presentation</option>
                      <option value="hired">Confirm Hire</option>
                      <option value="rejected">Mark Rejected / Fail</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 font-semibold block uppercase text-[9px] tracking-wider">Stage Outcome</label>
                    <select
                      value={stageStatus}
                      onChange={(e) => setStageStatus(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-neutral-800"
                    >
                      <option value="passed">Passed (Advance)</option>
                      <option value="failed">Failed (Terminate)</option>
                      <option value="in_progress">In Progress (Scheduling)</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-500 font-semibold block uppercase text-[9px] tracking-wider">Decision Notes & Feedback</label>
                  <textarea
                    placeholder="Enter interview details or reasons for failing stage..."
                    rows={2}
                    value={stageNotes}
                    onChange={(e) => setStageNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateStageMutation.isPending}
                  className="w-full py-2 bg-primary hover:bg-primary/95 text-neutral-white font-medium uppercase font-mono text-[9px] tracking-wider cursor-pointer rounded-sm flex items-center justify-center gap-1"
                >
                  {updateStageMutation.isPending && <RefreshCw className="w-3 animate-spin" />}
                  Advance Stage State
                </button>
              </form>

              {/* History Stages timeline */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono block">Stage Auditing History</span>
                <div className="space-y-2">
                  {stages.map((stg) => (
                    <div key={stg.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-sm bg-neutral-50/20 text-xs font-mono">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-neutral-800 capitalize">{stg.stage_name.replace("_", " ")}</p>
                        <p className="text-[9px] text-neutral-400">{stg.scheduled_at ? new Date(stg.scheduled_at).toLocaleString() : ""}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className={`text-[9px] px-2 py-0.5 border rounded-sm uppercase font-bold ${
                          stg.outcome === "passed" ? "bg-success/10 border-success/20 text-success" :
                          stg.outcome === "failed" ? "bg-error/10 border-error/20 text-error" :
                          "bg-neutral-100 border-neutral-250 text-neutral-500"
                        }`}>
                          {stg.outcome}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
