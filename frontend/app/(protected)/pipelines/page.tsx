"use client";

import React, { useState, useEffect } from "react";
import { 
  GitPullRequest, 
  Building2, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Shield, 
  ChevronRight, 
  Filter, 
  Layers, 
  UserCheck, 
  ArrowRight,
  X
} from "lucide-react";

export default function PipelinesPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "pending">("catalog");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>("all");
  
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Pipeline Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState("");
  const [pipelineName, setPipelineName] = useState("");
  const [pipelineCategory, setPipelineCategory] = useState("Hiring & Offers");
  const [pipelineDesc, setPipelineDesc] = useState("");
  const [stages, setStages] = useState<any[]>([
    { stage_title: "Manager Initial Review", required_role_id: "", sla_hours: 24 },
    { stage_title: "Director Final Approval", required_role_id: "", sla_hours: 48 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [selectedOrgFilter]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Organizations & Roles
      const orgRes = await fetch("/api/organizations");
      const orgData = await orgRes.json();
      if (orgData.success) {
        setOrganizations(orgData.organizations || []);
        setRoles(orgData.roles || []);
        if (!targetOrgId && orgData.organizations.length > 0) {
          setTargetOrgId(orgData.organizations[0].id);
        }
      }

      // 2. Fetch Pipelines across organizations
      const pipeRes = await fetch(`/api/pipelines?org_id=${selectedOrgFilter}`);
      const pipeData = await pipeRes.json();
      if (pipeData.success) {
        setPipelines(pipeData.pipelines || []);
      }

      // 3. Fetch Pending Approvals across organizations
      const appRes = await fetch(`/api/approvals/pending?org_id=${selectedOrgFilter}`);
      const appData = await appRes.json();
      if (appData.success) {
        setApprovals(appData.approvals || []);
      }
    } catch (err) {
      console.error("Failed to load pipelines data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrgId || !pipelineName) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: targetOrgId,
          name: pipelineName,
          description: pipelineDesc,
          category: pipelineCategory,
          stages
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setPipelineName("");
        setPipelineDesc("");
        fetchInitialData();
      } else {
        alert(data.error || "Failed to create approval pipeline");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovalAction = async (approvalId: string, action: string) => {
    try {
      const res = await fetch("/api/approvals/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_id: approvalId, action })
      });
      if (res.ok) {
        fetchInitialData();
      }
    } catch (err) {
      console.error("Failed to update approval:", err);
    }
  };

  const addStageRow = () => {
    setStages([
      ...stages,
      { stage_title: `Stage ${stages.length + 1} Review`, required_role_id: "", sla_hours: 24 }
    ]);
  };

  const removeStageRow = (index: number) => {
    if (stages.length <= 1) return;
    setStages(stages.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-md shadow-sm text-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-bold">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-tight font-bold text-neutral-white">Approval Workflows & Multi-Tenant Pipelines</h1>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                Configured SLA approval stages across all your assigned client & tenant organizations
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-neutral-white text-xs font-tight font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Approval Workflow</span>
        </button>
      </div>

      {/* Organization Aggregation & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 p-3.5 rounded-md text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-[11px] font-bold uppercase text-neutral-400">Organization View Filter:</span>
          <select
            value={selectedOrgFilter}
            onChange={(e) => setSelectedOrgFilter(e.target.value)}
            className="p-1.5 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded font-semibold text-xs focus:outline-none focus:border-primary"
          >
            <option value="all">All Assigned Organizations ({organizations.length})</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded border border-neutral-800">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "catalog"
                ? "bg-neutral-800 text-neutral-white shadow-xs"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Workflow Catalog ({pipelines.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "pending"
                ? "bg-neutral-800 text-neutral-white shadow-xs"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending Approvals ({approvals.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: WORKFLOW CATALOG */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-neutral-500 font-mono text-xs animate-pulse">
              Loading multi-tenant approval workflows...
            </div>
          ) : pipelines.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 bg-neutral-900/40 rounded-md space-y-3">
              <GitPullRequest className="w-8 h-8 text-neutral-600 mx-auto" />
              <div className="font-bold text-neutral-300 text-sm">No Approval Pipelines Found</div>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto font-mono">
                Click below to create multi-stage SLA approval workflows for your assigned organizations.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-primary text-neutral-white text-xs font-mono font-bold uppercase rounded inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Workflow</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pipelines.map(pipe => {
                const orgName = pipe.organizations?.name || "Organization";
                const stagesList = pipe.pipeline_stages || [];

                return (
                  <div
                    key={pipe.id}
                    className="p-5 bg-neutral-900 border border-neutral-800 rounded-md hover:border-neutral-700 transition-all space-y-4 shadow-sm"
                  >
                    {/* Header with Organization Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary rounded">
                            Org: {orgName}
                          </span>
                          <span className="font-mono text-[10px] uppercase font-semibold text-neutral-400">
                            {pipe.category}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-neutral-white">{pipe.name}</h3>
                        {pipe.description && (
                          <p className="text-xs text-neutral-400 font-mono line-clamp-2">{pipe.description}</p>
                        )}
                      </div>

                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase shrink-0">
                        {pipe.status || "Active"}
                      </span>
                    </div>

                    {/* Sequential Stages Steps */}
                    <div className="p-3 bg-neutral-950 border border-neutral-850 rounded space-y-2 text-xs">
                      <div className="text-[10px] font-mono font-bold uppercase text-neutral-500 flex items-center justify-between">
                        <span>Sequential SLA Approval Stages</span>
                        <span>{stagesList.length} Steps</span>
                      </div>

                      <div className="space-y-2">
                        {stagesList.map((st: any, idx: number) => (
                          <div key={st.id || idx} className="flex items-center justify-between p-2 bg-neutral-900 rounded border border-neutral-800 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {st.step_number || idx + 1}
                              </span>
                              <span className="font-semibold text-neutral-200">{st.stage_title}</span>
                              {st.roles?.name && (
                                <span
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded text-neutral-900 font-bold"
                                  style={{ backgroundColor: st.roles.color_hex || "#ff6e30" }}
                                >
                                  {st.roles.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-400 shrink-0">
                              <Clock className="w-3 h-3 text-neutral-500" />
                              <span>{st.sla_hours || 24}h SLA</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENDING APPROVALS QUEUE */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-neutral-500 font-mono text-xs animate-pulse">
              Loading pending approval requests...
            </div>
          ) : approvals.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-neutral-800 bg-neutral-900/40 rounded-md space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-bold text-neutral-300 text-sm">No Pending Approvals</div>
              <p className="text-xs text-neutral-500 font-mono">All SLA approval queue items across your organizations have been processed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map(app => {
                const pipeOrg = app.approval_pipelines?.organizations?.name || "Organization";
                const pipeName = app.approval_pipelines?.name || "Workflow";

                return (
                  <div
                    key={app.id}
                    className="p-4 bg-neutral-900 border border-neutral-800 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary rounded">
                          Org: {pipeOrg}
                        </span>
                        <span className="font-mono text-[10px] text-neutral-400 uppercase">
                          {pipeName}
                        </span>
                      </div>
                      <h4 className="font-bold text-neutral-white text-sm">{app.item_title}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 font-mono">
                        <span>Submitted by: <strong className="text-neutral-200">{app.members?.name || "Team Member"}</strong></span>
                        <span>• Current Stage: <strong className="text-amber-400">{app.current_stage_title}</strong></span>
                        <span>• Role Required: <strong className="text-neutral-200">{app.roles?.name || "Authorized Role"}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => handleApprovalAction(app.id, "Approved")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-[11px] rounded flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleApprovalAction(app.id, "Rejected")}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-[11px] rounded flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Approval Pipeline Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 max-w-lg w-full p-6 rounded-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-neutral-200 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-neutral-white text-sm">Create New SLA Approval Workflow</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePipeline} className="space-y-4">
              {/* Target Organization Selector */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-neutral-400 mb-1">
                  Target Organization Instance
                </label>
                <select
                  value={targetOrgId}
                  onChange={(e) => setTargetOrgId(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded text-xs font-semibold focus:outline-none focus:border-primary"
                  required
                >
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              {/* Workflow Name */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-neutral-400 mb-1">Workflow Title</label>
                <input
                  type="text"
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  placeholder="e.g. Senior Recruiter Offer Approval SLA"
                  required
                  className="w-full p-2 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded text-xs focus:outline-none focus:border-primary font-semibold"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-neutral-400 mb-1">Category</label>
                <select
                  value={pipelineCategory}
                  onChange={(e) => setPipelineCategory(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded text-xs font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="Hiring & Offers">Hiring & Offers</option>
                  <option value="Mandates & Job Postings">Mandates & Job Postings</option>
                  <option value="Admin Governance">Admin Governance</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-neutral-400 mb-1">Description</label>
                <textarea
                  value={pipelineDesc}
                  onChange={(e) => setPipelineDesc(e.target.value)}
                  placeholder="Optional details regarding approval SLA rules..."
                  className="w-full p-2 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded text-xs focus:outline-none focus:border-primary"
                  rows={2}
                />
              </div>

              {/* Dynamic Stages Builder */}
              <div className="p-3 bg-neutral-950 border border-neutral-850 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase text-neutral-400">Sequential Approval Stages ({stages.length})</span>
                  <button
                    type="button"
                    onClick={addStageRow}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-primary" /> Add Stage
                  </button>
                </div>

                {stages.map((st, idx) => (
                  <div key={idx} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-neutral-400">Step {idx + 1}</span>
                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStageRow(idx)}
                          className="text-red-400 hover:text-red-300 font-mono text-[10px] cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={st.stage_title}
                        onChange={(e) => {
                          const newSt = [...stages];
                          newSt[idx].stage_title = e.target.value;
                          setStages(newSt);
                        }}
                        placeholder="Stage Title"
                        required
                        className="p-1.5 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded text-xs focus:outline-none focus:border-primary"
                      />

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={st.sla_hours}
                          onChange={(e) => {
                            const newSt = [...stages];
                            newSt[idx].sla_hours = parseInt(e.target.value) || 24;
                            setStages(newSt);
                          }}
                          placeholder="SLA Hours"
                          className="w-20 p-1.5 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded text-xs font-mono focus:outline-none focus:border-primary"
                        />
                        <span className="font-mono text-[10px] text-neutral-500">hours SLA</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 border border-neutral-800 hover:bg-neutral-800 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-neutral-white text-xs font-mono font-bold uppercase tracking-wider rounded cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
