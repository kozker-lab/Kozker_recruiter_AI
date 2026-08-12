"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircle2, XCircle, Clock, Shield, Filter, Search, Eye, ChevronRight, 
  AlertTriangle, RefreshCw, FileText, UserCheck, Layers, ExternalLink 
} from "lucide-react";

interface Pipeline {
  id: string;
  name: string;
  description: string;
  entity_type: string;
  current_stage_index: number;
  status: "draft" | "pending" | "approved" | "rejected";
  created_at: string;
  created_by_name?: string;
  created_by_role?: string;
  stages?: any[];
  access?: any[];
  rejection_checklist?: any;
}

export default function AdminApprovalsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);

  useEffect(() => {
    fetchAdminApprovals();
  }, []);

  const fetchAdminApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/approvals/admin/all");
      if (!res.ok) {
        throw new Error(`Failed to fetch approvals: ${res.statusText}`);
      }
      const data = await res.json();
      setPipelines(data.pipelines || data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load organization approvals");
    } finally {
      setLoading(false);
    }
  };

  const filteredPipelines = pipelines.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.created_by_name && p.created_by_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.created_by_role && p.created_by_role.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans p-6">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-stone-300 pb-4">
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Agency Approvals Oversight Dashboard
            </h1>
            <p className="text-stone-500 text-xs mt-1">
              Monitor, audit, and track pending approval pipelines across all roles within your organization.
            </p>
          </div>
          <button
            onClick={fetchAdminApprovals}
            className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 rounded text-xs font-semibold text-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by pipeline name, creator or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-stone-400" />
            <span className="text-xs text-stone-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-stone-50 border border-stone-300 rounded px-2 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected / Draft</option>
            </select>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-3 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Pipelines Table */}
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-stone-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              Loading agency approval workflows...
            </div>
          ) : filteredPipelines.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs space-y-2">
              <Layers className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-semibold text-stone-700">No approval pipelines found</p>
              <p className="text-stone-400">There are no active or pending approval workflows for the selected filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Pipeline Name & Type</th>
                  <th className="p-3.5">Creator & Role</th>
                  <th className="p-3.5">Active Stage</th>
                  <th className="p-3.5">Assigned Approvers</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredPipelines.map((p) => {
                  const activeStage = p.stages?.[p.current_stage_index] || p.stages?.[0];
                  return (
                    <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3.5 font-medium text-stone-900">
                        <div className="space-y-0.5">
                          <p className="font-bold text-stone-900">{p.name}</p>
                          <span className="inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded border border-stone-200">
                            {p.entity_type}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-stone-700">
                        <p className="font-semibold">{p.created_by_name || "Organization Member"}</p>
                        <p className="text-[10px] text-emerald-700 font-mono font-medium">{p.created_by_role || "Role Member"}</p>
                      </td>
                      <td className="p-3.5 text-stone-700">
                        {activeStage ? (
                          <div>
                            <p className="font-medium">{activeStage.stage_name || `Stage ${p.current_stage_index + 1}`}</p>
                            <span className="text-[10px] text-stone-400">
                              {activeStage.require_all_approvers ? "Consensus (N-of-N)" : "First to Approve (1-of-N)"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-stone-700">
                        <div className="space-y-1">
                          {activeStage?.approvers?.map((appr: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                              <UserCheck className="w-3 h-3 text-stone-400" />
                              <span>{appr.member_name || appr.role_name || "Assigned Approver"}</span>
                            </div>
                          )) || <span className="text-stone-400">No approvers</span>}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {p.status === "approved" && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold text-[10px] uppercase inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {p.status === "pending" && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-[10px] uppercase inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-pulse" /> Pending
                          </span>
                        )}
                        {(p.status === "rejected" || p.status === "draft") && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded font-semibold text-[10px] uppercase inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> {p.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedPipeline(p)}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded text-stone-700 font-medium text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedPipeline && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-300 rounded-lg max-w-2xl w-full p-6 space-y-4 shadow-xl text-stone-800 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900">{selectedPipeline.name}</h3>
                <p className="text-xs text-stone-500">{selectedPipeline.description || "No description provided."}</p>
              </div>
              <button
                onClick={() => setSelectedPipeline(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stages Stepper */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-stone-700 uppercase tracking-wider">Approval Stages Progression</h4>
              <div className="space-y-2">
                {selectedPipeline.stages?.map((stg: any, idx: number) => (
                  <div key={stg.id || idx} className={`p-3 rounded border text-xs flex items-center justify-between ${idx === selectedPipeline.current_stage_index ? "bg-amber-50 border-amber-300" : "bg-stone-50 border-stone-200"}`}>
                    <div>
                      <p className="font-bold text-stone-800">Stage {idx + 1}: {stg.stage_name}</p>
                      <p className="text-[10px] text-stone-500">
                        {stg.require_all_approvers ? "Consensus required (N-of-N)" : "First to approve (1-of-N)"}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white border border-stone-200">
                      {stg.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rejection Checklist & Highlights if available */}
            {selectedPipeline.rejection_checklist && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded space-y-2 text-xs">
                <h4 className="font-bold text-rose-900 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Rejection Checklist & Requested Changes
                </h4>
                {selectedPipeline.rejection_checklist.reasons?.length > 0 && (
                  <div>
                    <p className="font-medium text-rose-800 text-[11px]">Rejection Reasons:</p>
                    <ul className="list-disc list-inside text-rose-700 text-[11px] pl-1">
                      {selectedPipeline.rejection_checklist.reasons.map((r: string, rIdx: number) => (
                        <li key={rIdx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedPipeline.rejection_checklist.feedback_notes && (
                  <p className="text-rose-800 text-[11px]">
                    <span className="font-semibold">Feedback Notes:</span> {selectedPipeline.rejection_checklist.feedback_notes}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPipeline(null)}
                className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 rounded text-xs font-semibold text-stone-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
