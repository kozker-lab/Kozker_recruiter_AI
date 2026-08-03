"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, Plus, CheckCircle2, XCircle, Clock, Filter, Search, Layers, 
  UserCheck, AlertTriangle, ArrowRight, RefreshCw, FileText, Check, Edit3, 
  Trash2, Eye, HelpCircle, ChevronRight, MessageSquare 
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface StageApprover {
  role_id?: string;
  member_id?: string;
  member_name?: string;
  role_name?: string;
  has_approved?: boolean;
}

interface Stage {
  id?: string;
  stage_name: string;
  require_all_approvers: boolean;
  status?: string;
  approvers: StageApprover[];
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  is_template: boolean;
  entity_type: string;
  entity_id?: string;
  custom_content?: any;
  current_stage_index: number;
  status: "draft" | "pending" | "approved" | "rejected";
  created_at: string;
  created_by_name?: string;
  created_by_role?: string;
  stages?: Stage[];
  rejection_checklist?: any;
}

const STANDARD_REJECTION_REASONS = [
  "Salary / Compensation Exceeds Budget",
  "Vague Job Description & Scope Requirements",
  "Missing Compliance or Legal Disclosures",
  "Candidate Qualifications / Experience Mismatch",
  "Incorrect Client or Department Classification"
];

export default function ApprovalsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "active" | "templates" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // System Roles & Members for Builder
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);

  // Modal States
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  // Rejection Form State
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [highlightedField, setHighlightedField] = useState("job_title");
  const [fieldRevisionNote, setFieldRevisionNote] = useState("");
  const [highlightedFieldsList, setHighlightedFieldsList] = useState<any[]>([]);
  const [rejectionFeedback, setRejectionFeedback] = useState("");

  // Builder Form State
  const [builderName, setBuilderName] = useState("");
  const [builderDesc, setBuilderDesc] = useState("");
  const [builderEntityType, setBuilderEntityType] = useState<"mandate" | "application" | "custom">("mandate");
  const [builderIsTemplate, setBuilderIsTemplate] = useState(false);
  const [builderContentText, setBuilderContentText] = useState("");
  const [builderStages, setBuilderStages] = useState<Stage[]>([
    { stage_name: "Initial Hiring Manager Review", require_all_approvers: false, approvers: [] }
  ]);
  const [stageSelectedRole, setStageSelectedRole] = useState<Record<number, string>>({});
  const [stageSelectedMember, setStageSelectedMember] = useState<Record<number, string>>({});

  const isMemberInRole = (m: any, roleId: string) => {
    if (!roleId) return true;
    if (m.role?.id === roleId) return true;
    if (m.role_id === roleId) return true;
    if (m.member_roles && Array.isArray(m.member_roles)) {
      return m.member_roles.some((mr: any) => mr.role_id === roleId || mr.roles?.id === roleId);
    }
    return false;
  };

  useEffect(() => {
    fetchPipelines();
    fetchRolesAndMembers();
  }, []);

  const fetchPipelines = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Pipeline[]>("GET", "/approvals/pipelines");
      setPipelines(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load approval pipelines");
    } finally {
      setLoading(false);
    }
  };

  const fetchRolesAndMembers = async () => {
    try {
      const rData = await apiRequest<any[]>("GET", "/roles");
      const mData = await apiRequest<any[]>("GET", "/members");
      setAvailableRoles(Array.isArray(rData) ? rData : []);
      setAvailableMembers(Array.isArray(mData) ? mData : []);
    } catch (err) {
      console.warn("Failed to fetch roles and members for approval builder", err);
    }
  };

  const handleDeletePipeline = async (id: string) => {
    if (!confirm("Are you sure you want to delete this approval pipeline? This action cannot be undone.")) {
      return;
    }
    try {
      await apiRequest("DELETE", `/approvals/pipelines/${id}`);
      if (selectedPipeline?.id === id) {
        setSelectedPipeline(null);
      }
      await fetchPipelines();
    } catch (err: any) {
      alert("Failed to delete pipeline: " + (err.message || err));
    }
  };

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderName.trim()) return;

    try {
      const res = await apiRequest<any>("POST", "/approvals/pipelines", {
        name: builderName,
        description: builderDesc,
        is_template: builderIsTemplate,
        entity_type: builderEntityType,
        custom_content: { raw_text: builderContentText },
        stages: builderStages
      });

      // Dispatch Nodemailer email alerts to Stage 1 approvers
      if (res?.next_stage_approver_emails && Array.isArray(res.next_stage_approver_emails)) {
        for (const recipientEmail of res.next_stage_approver_emails) {
          try {
            await fetch("/api/approvals/email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: recipientEmail,
                pipelineName: builderName,
                stageName: res.next_stage_name || "Stage 1",
                submitterName: "Team Member",
                contentPreview: builderContentText?.substring(0, 150)
              })
            });
          } catch (mailErr) {
            console.warn("Failed to dispatch email to", recipientEmail, mailErr);
          }
        }
      }

      setIsBuilderOpen(false);
      resetBuilderForm();
      fetchPipelines();
    } catch (err: any) {
      alert(`Failed to create pipeline: ${err.message}`);
    }
  };

  const handleApproveStage = async (pipelineId: string) => {
    try {
      const res = await apiRequest<any>("POST", `/approvals/pipelines/${pipelineId}/approve`, {
        notes: approvalNotes
      });

      // Dispatch Nodemailer notifications to next stage approvers
      if (res?.next_stage_approver_emails && Array.isArray(res.next_stage_approver_emails)) {
        for (const recipientEmail of res.next_stage_approver_emails) {
          try {
            await fetch("/api/approvals/email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: recipientEmail,
                pipelineName: selectedPipeline?.name || "Approval Workflow",
                stageName: res.next_stage_name || "Next Stage",
                submitterName: "Recruiter Member",
                contentPreview: selectedPipeline?.custom_content?.raw_text?.substring(0, 150)
              })
            });
          } catch (mailErr) {
            console.warn("Failed to dispatch email to", recipientEmail, mailErr);
          }
        }
      }

      setSelectedPipeline(null);
      setApprovalNotes("");
      fetchPipelines();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleRejectStage = async () => {
    if (!selectedPipeline) return;

    const allReasons = [...selectedReasons];
    if (customReason.trim()) allReasons.push(customReason.trim());

    try {
      const res = await apiRequest<any>("POST", `/approvals/pipelines/${selectedPipeline.id}/reject`, {
        reasons: allReasons,
        highlighted_fields: highlightedFieldsList,
        feedback_notes: rejectionFeedback
      });

      // Dispatch Nodemailer notification to creator
      const recipientEmail = res?.creator_email || selectedPipeline.created_by_name;
      if (recipientEmail && recipientEmail.includes("@")) {
        try {
          await fetch("/api/approvals/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: recipientEmail,
              pipelineName: selectedPipeline.name,
              stageName: "Stage 1 Draft",
              rejectionChecklist: { reasons: allReasons },
              feedbackNotes: rejectionFeedback
            })
          });
        } catch (mailErr) {
          console.warn("Failed to dispatch rejection email to", recipientEmail, mailErr);
        }
      }

      setIsRejectModalOpen(false);
      setSelectedPipeline(null);
      resetRejectionForm();
      fetchPipelines();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  const resetBuilderForm = () => {
    setBuilderName("");
    setBuilderDesc("");
    setBuilderEntityType("mandate");
    setBuilderIsTemplate(false);
    setBuilderContentText("");
    setBuilderStages([{ stage_name: "Initial Hiring Manager Review", require_all_approvers: false, approvers: [] }]);
  };

  const resetRejectionForm = () => {
    setSelectedReasons([]);
    setCustomReason("");
    setHighlightedField("job_title");
    setFieldRevisionNote("");
    setHighlightedFieldsList([]);
    setRejectionFeedback("");
  };

  const filteredPipelines = pipelines.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "pending") return p.status === "pending";
    if (activeTab === "active") return p.status === "pending" && !p.is_template;
    if (activeTab === "templates") return p.is_template;
    if (activeTab === "approved") return p.status === "approved";
    if (activeTab === "rejected") return p.status === "rejected" || p.status === "draft";
    return true;
  });

  return (
    <div className="space-y-6 text-neutral-800 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-neutral-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary animate-pulse" />
            Approval Operations Command Center
          </h1>
          <p className="text-neutral-500 text-xs mt-1">
            Design multi-stage approval workflows, assign role-first approvers, and manage pending content approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBuilderOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs uppercase tracking-wider font-bold rounded-sm shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Approval Pipeline
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-100 p-1.5 rounded border border-neutral-200 text-xs">
        <div className="flex items-center gap-1">
          {[
            { id: "pending", label: "Pending My Approval" },
            { id: "active", label: "Active Pipelines" },
            { id: "templates", label: "Templates" },
            { id: "approved", label: "Completed / Approved" },
            { id: "rejected", label: "Rejected / Drafts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-neutral-900 shadow-xs border border-neutral-250 font-bold"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search pipelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-white border border-neutral-250 rounded text-xs focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Pipelines List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-neutral-500 text-xs bg-white rounded border border-neutral-200">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Loading approval workflows...
          </div>
        ) : filteredPipelines.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-xs bg-white rounded border border-neutral-200 space-y-2">
            <Layers className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="font-bold text-neutral-700">No pipelines found</p>
            <p className="text-neutral-400">There are no workflows matching the selected tab.</p>
          </div>
        ) : (
          filteredPipelines.map((p) => {
            const activeStage = p.stages?.[p.current_stage_index] || p.stages?.[0];
            return (
              <div key={p.id} className="bg-white border border-neutral-200 rounded p-4 shadow-xs space-y-4 hover:border-neutral-300 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-neutral-150 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-neutral-900">{p.name}</h3>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-neutral-100 border border-neutral-250 text-neutral-600 rounded">
                        {p.entity_type}
                      </span>
                      {p.is_template && (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded font-semibold">
                          Template
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-500 text-xs mt-0.5">{p.description || "No description."}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {p.status === "approved" && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {p.status === "pending" && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-pulse" /> Stage {p.current_stage_index + 1} Pending
                      </span>
                    )}
                    {(p.status === "rejected" || p.status === "draft") && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-300 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> {p.status}
                      </span>
                    )}

                    <button
                      onClick={() => setSelectedPipeline(p)}
                      className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 text-xs font-semibold rounded uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View / Process
                    </button>
                    <button
                      onClick={() => handleDeletePipeline(p.id)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                      title="Delete approval pipeline"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                {/* Visual Pipeline Stepper */}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  {p.stages?.map((stg, sIdx) => {
                    const isCurrent = sIdx === p.current_stage_index && p.status === "pending";
                    const isPassed = sIdx < p.current_stage_index || p.status === "approved";
                    return (
                      <React.Fragment key={sIdx}>
                        <div
                          className={`px-3 py-1.5 rounded border flex items-center gap-2 text-xs ${
                            isCurrent
                              ? "bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-xs"
                              : isPassed
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-medium"
                              : "bg-neutral-50 border-neutral-200 text-neutral-500"
                          }`}
                        >
                          <span>Stage {sIdx + 1}: {stg.stage_name}</span>
                          {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {isCurrent && <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />}
                        </div>
                        {sIdx < (p.stages?.length || 0) - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inspect & Action Modal */}
      {selectedPipeline && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-neutral-200 rounded-sm w-full max-w-2xl p-6 space-y-4 shadow-xl text-neutral-800 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-base text-neutral-900">{selectedPipeline.name}</h3>
                <p className="text-xs text-neutral-500">{selectedPipeline.description || "No description provided."}</p>
              </div>
              <button
                onClick={() => setSelectedPipeline(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Full Pipeline Stages & Assigned Approvers Breakdown */}
            <div className="space-y-2 border-b border-neutral-200 pb-3">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-500 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Full Pipeline Stages & Assigned Approvers
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  Created by: <strong>{selectedPipeline.created_by_name}</strong> ({selectedPipeline.created_by_role})
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedPipeline.stages?.map((stg, sIdx) => {
                  const isCurrent = sIdx === selectedPipeline.current_stage_index && selectedPipeline.status === "pending";
                  const isPassed = sIdx < selectedPipeline.current_stage_index || selectedPipeline.status === "approved";
                  return (
                    <div
                      key={sIdx}
                      className={`p-2.5 rounded border text-xs space-y-2 transition-colors ${
                        isCurrent
                          ? "bg-amber-50/90 border-amber-300 ring-1 ring-amber-400 text-neutral-900"
                          : isPassed
                          ? "bg-emerald-50/70 border-emerald-200 text-neutral-900"
                          : "bg-neutral-50 border-neutral-200 text-neutral-600"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isPassed ? "bg-emerald-600 text-white" : isCurrent ? "bg-amber-600 text-white" : "bg-neutral-300 text-neutral-700"
                          }`}>
                            {sIdx + 1}
                          </span>
                          <span className="font-bold text-neutral-900">{stg.stage_name}</span>
                          {stg.require_all_approvers && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded font-mono font-semibold">
                              Consensus (N-of-N)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold">
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-950 rounded flex items-center gap-1 border border-amber-300">
                              <Clock className="w-3 h-3 animate-pulse text-amber-800" /> Active Approval Stage
                            </span>
                          )}
                          {isPassed && (
                            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-950 rounded flex items-center gap-1 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Approved
                            </span>
                          )}
                          {!isCurrent && !isPassed && (
                            <span className="px-2 py-0.5 bg-neutral-200 text-neutral-600 rounded">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Approvers managing this stage */}
                      <div className="pl-7 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Assigned Approvers:</span>
                        {stg.approvers && stg.approvers.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {stg.approvers.map((appr, aIdx) => (
                              <div key={aIdx} className="p-1.5 bg-white border border-neutral-250 rounded text-[11px] flex justify-between items-center shadow-2xs">
                                <div>
                                  <span className="font-bold text-neutral-900 block">{appr.member_name || "All Members"}</span>
                                  <span className="text-neutral-500 text-[10px]">Role: <strong>{appr.role_name || "Any Role"}</strong></span>
                                </div>
                                {appr.has_approved ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Approved
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">
                                    Pending
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400 italic">No specific approvers assigned (Open Access)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content Preview */}
            <div className="bg-neutral-50 p-3 border border-neutral-200 rounded text-xs space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-500">Content / Mandate Preview</span>
              <p className="text-neutral-800 font-mono text-[11px] whitespace-pre-wrap">
                {selectedPipeline.custom_content?.raw_text || "No attached text content."}
              </p>
            </div>

            {/* Rejection Checklist Notes if rejected */}
            {selectedPipeline.rejection_checklist && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded space-y-2 text-xs">
                <h4 className="font-bold text-rose-900 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Rejection Reasons & Revision Feedback
                </h4>
                {selectedPipeline.rejection_checklist.reasons?.length > 0 && (
                  <ul className="list-disc list-inside text-rose-800 text-[11px]">
                    {selectedPipeline.rejection_checklist.reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}
                {selectedPipeline.rejection_checklist.feedback_notes && (
                  <p className="text-rose-900 text-[11px]">
                    <span className="font-semibold">Notes:</span> {selectedPipeline.rejection_checklist.feedback_notes}
                  </p>
                )}
              </div>
            )}

            {/* Approval Action Form */}
            {selectedPipeline.status === "pending" && (
              <div className="space-y-3 pt-2 border-t border-neutral-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800">Stage Action</h4>
                <textarea
                  placeholder="Optional approval or feedback notes..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-primary"
                  rows={2}
                />

                <div className="flex justify-between items-center text-xs pt-2">
                  <button
                    onClick={() => handleDeletePipeline(selectedPipeline.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold uppercase tracking-wider rounded text-[10px] cursor-pointer flex items-center gap-1 border border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Pipeline
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsRejectModalOpen(true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-wider rounded text-[10px] cursor-pointer"
                    >
                      Reject & Request Changes
                    </button>
                    <button
                      onClick={() => handleApproveStage(selectedPipeline.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider rounded text-[10px] cursor-pointer"
                    >
                      Approve Active Stage
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Structured Rejection Modal */}
      {isRejectModalOpen && selectedPipeline && (
        <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-neutral-200 rounded-sm w-full max-w-lg p-6 space-y-4 shadow-xl text-neutral-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Structured Rejection & Revision Checklist
            </h3>

            {/* Checklist of Reasons */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-neutral-700">Select Rejection Reasons:</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {STANDARD_REJECTION_REASONS.map((reason) => (
                  <label key={reason} className="flex items-center gap-2 p-1.5 bg-neutral-50 border border-neutral-200 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedReasons.includes(reason)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedReasons([...selectedReasons, reason]);
                        else setSelectedReasons(selectedReasons.filter((r) => r !== reason));
                      }}
                      className="accent-rose-600"
                    />
                    <span className="text-neutral-800 text-[11px]">{reason}</span>
                  </label>
                ))}
              </div>

              <input
                type="text"
                placeholder="Or type custom rejection reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Highlight Content Section */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-neutral-700">Highlight Specific Content Section to Modify:</label>
              <div className="flex gap-2">
                <select
                  value={highlightedField}
                  onChange={(e) => setHighlightedField(e.target.value)}
                  className="bg-neutral-50 border border-neutral-300 rounded p-1.5 text-xs"
                >
                  <option value="job_title">Job Title</option>
                  <option value="compensation">Compensation / Budget</option>
                  <option value="skills_required">Required Skills</option>
                  <option value="compliance">Compliance Terms</option>
                </select>
                <input
                  type="text"
                  placeholder="Revision request note for this field..."
                  value={fieldRevisionNote}
                  onChange={(e) => setFieldRevisionNote(e.target.value)}
                  className="flex-1 p-1.5 border border-neutral-300 rounded text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (fieldRevisionNote.trim()) {
                      setHighlightedFieldsList([...highlightedFieldsList, { field: highlightedField, note: fieldRevisionNote.trim() }]);
                      setFieldRevisionNote("");
                    }
                  }}
                  className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 rounded font-semibold text-[10px] uppercase cursor-pointer"
                >
                  Add
                </button>
              </div>

              {highlightedFieldsList.length > 0 && (
                <div className="space-y-1">
                  {highlightedFieldsList.map((hf, hIdx) => (
                    <div key={hIdx} className="p-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] flex justify-between items-center">
                      <span><strong>{hf.field}:</strong> {hf.note}</span>
                      <button onClick={() => setHighlightedFieldsList(highlightedFieldsList.filter((_, i) => i !== hIdx))} className="text-rose-600 font-bold cursor-pointer">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Feedback Notes */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-neutral-700">General Feedback Notes:</label>
              <textarea
                placeholder="Overall instructions for revising Stage 1 Draft..."
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                className="w-full p-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-rose-500"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-600 uppercase font-semibold text-[10px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectStage}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase rounded text-[10px]"
              >
                Confirm Rejection & Revert to Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-neutral-200 rounded-sm w-full max-w-xl p-6 space-y-4 shadow-xl text-neutral-800 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-primary" /> Create Approval Pipeline / Template
            </h3>

            <form onSubmit={handleCreatePipeline} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Pipeline Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer JD Approval"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Description:</label>
                <input
                  type="text"
                  placeholder="Brief workflow purpose..."
                  value={builderDesc}
                  onChange={(e) => setBuilderDesc(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Content Type:</label>
                  <select
                    value={builderEntityType}
                    onChange={(e) => setBuilderEntityType(e.target.value as any)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded text-xs"
                  >
                    <option value="mandate">Job Description / Mandate</option>
                    <option value="application">Candidate Application / Offer</option>
                    <option value="custom">Custom Form / Document</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Pipeline Mode:</label>
                  <label className="flex items-center gap-2 p-2 bg-neutral-50 border border-neutral-300 rounded cursor-pointer mt-0.5">
                    <input
                      type="checkbox"
                      checked={builderIsTemplate}
                      onChange={(e) => setBuilderIsTemplate(e.target.checked)}
                      className="accent-primary"
                    />
                    <span className="font-semibold text-neutral-800 text-[11px]">Save as Reusable Template</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Target Content / Mandate Text Snapshot:</label>
                <textarea
                  placeholder="Paste or type content to be approved..."
                  value={builderContentText}
                  onChange={(e) => setBuilderContentText(e.target.value)}
                  className="w-full p-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-primary"
                  rows={3}
                />
              </div>

              {/* Configure Stages */}
              <div className="space-y-3 border-t border-neutral-200 pt-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-800">Sequential Stages Configuration</h4>
                  <button
                    type="button"
                    onClick={() => setBuilderStages([...builderStages, { stage_name: `Stage ${builderStages.length + 1}`, require_all_approvers: false, approvers: [] }])}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded text-[10px] font-bold uppercase cursor-pointer"
                  >
                    + Add Stage
                  </button>
                </div>

                {builderStages.map((stg, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50 border border-neutral-250 rounded space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-neutral-800 text-[11px]">Stage {idx + 1}</span>
                      {builderStages.length > 1 && (
                        <button type="button" onClick={() => setBuilderStages(builderStages.filter((_, i) => i !== idx))} className="text-rose-600 font-bold text-[10px] cursor-pointer">Remove Stage</button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Stage Name (e.g. Legal Review)"
                      value={stg.stage_name}
                      onChange={(e) => {
                        const updated = [...builderStages];
                        updated[idx].stage_name = e.target.value;
                        setBuilderStages(updated);
                      }}
                      className="w-full p-1.5 bg-white border border-neutral-300 rounded text-xs"
                    />

                    <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={stg.require_all_approvers}
                        onChange={(e) => {
                          const updated = [...builderStages];
                          updated[idx].require_all_approvers = e.target.checked;
                          setBuilderStages(updated);
                        }}
                        className="accent-primary"
                      />
                      <span>Require All Approvers (Consensus N-of-N)</span>
                    </label>

                    {/* Approver Selection: Role -> Member */}
                    <div className="space-y-1.5 pt-1">
                      <label className="font-bold text-[10px] uppercase text-neutral-500">Select Approver (Role ➔ Member):</label>
                      <div className="flex gap-2">
                        <select
                          value={stageSelectedRole[idx] || ""}
                          onChange={(e) => {
                            const selectedR = e.target.value;
                            setStageSelectedRole({ ...stageSelectedRole, [idx]: selectedR });
                            setStageSelectedMember({ ...stageSelectedMember, [idx]: "" });
                          }}
                          className="bg-white text-neutral-900 border border-neutral-300 rounded p-1 text-[11px] flex-1 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="" className="text-neutral-900 bg-white">Choose Role...</option>
                          {availableRoles.map((r: any) => (
                            <option key={r.id} value={r.id} className="text-neutral-900 bg-white font-medium">
                              {r.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={stageSelectedMember[idx] || ""}
                          onChange={(e) => setStageSelectedMember({ ...stageSelectedMember, [idx]: e.target.value })}
                          className="bg-white text-neutral-900 border border-neutral-300 rounded p-1 text-[11px] flex-1 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="" className="text-neutral-900 bg-white">
                            {stageSelectedRole[idx] ? "All Members in Role" : "Choose Member..."}
                          </option>
                          {availableMembers
                            .filter((m: any) => isMemberInRole(m, stageSelectedRole[idx] || ""))
                            .map((m: any) => (
                              <option key={m.id} value={m.id} className="text-neutral-900 bg-white font-medium">
                                {m.name || m.email} ({m.role_name || "Member"})
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            const rVal = stageSelectedRole[idx] || "";
                            const mVal = stageSelectedMember[idx] || "";
                            const rObj = availableRoles.find((r: any) => r.id === rVal);
                            const mObj = availableMembers.find((m: any) => m.id === mVal);

                            if (rVal || mVal) {
                              const updated = [...builderStages];
                              updated[idx].approvers.push({
                                role_id: rVal || undefined,
                                member_id: mVal || undefined,
                                role_name: rObj?.name,
                                member_name: mObj?.name || mObj?.email
                              });
                              setBuilderStages(updated);
                              setStageSelectedRole({ ...stageSelectedRole, [idx]: "" });
                              setStageSelectedMember({ ...stageSelectedMember, [idx]: "" });
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase cursor-pointer"
                        >
                          Add
                        </button>
                      </div>

                      {stg.approvers.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {stg.approvers.map((appr, aIdx) => (
                            <div key={aIdx} className="p-1 bg-white border border-neutral-200 rounded text-[10px] flex justify-between items-center">
                              <span><strong>Role:</strong> {appr.role_name || "All"} | <strong>Member:</strong> {appr.member_name || "All in Role"}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...builderStages];
                                  updated[idx].approvers = updated[idx].approvers.filter((_, i) => i !== aIdx);
                                  setBuilderStages(updated);
                                }}
                                className="text-rose-600 font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-600 uppercase font-semibold text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-white font-bold uppercase tracking-wider rounded text-[10px]"
                >
                  Create & Launch Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
