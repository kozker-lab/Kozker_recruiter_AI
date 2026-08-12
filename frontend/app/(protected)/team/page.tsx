"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Briefcase, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Search, 
  Filter, 
  ChevronRight, 
  MessageSquare, 
  ShieldCheck, 
  X,
  UserCheck,
  Building2,
  CheckCircle2,
  FileCheck
} from "lucide-react";

export default function TeamOperationsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    total_recruiters: 0,
    active_jobs: 0,
    pending_reviews: 0,
    delayed_actions: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecruiter, setSelectedRecruiter] = useState<any | null>(null);
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>("all");
  const [managersList, setManagersList] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [messageSentMsg, setMessageSentMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialContext();
  }, []);

  const fetchInitialContext = async () => {
    try {
      const meRes = await fetch("/api/user/me");
      const meData = await meRes.json();
      if (meData.authenticated && meData.user) {
        setCurrentUser(meData.user);
        const isGlobalAdmin = meData.user.is_primary_admin === true;
        if (!isGlobalAdmin) {
          setSelectedManagerFilter(meData.user.id);
          fetchTeamData(meData.user.id);
        } else {
          fetchTeamData("all");
        }
      } else {
        fetchTeamData("all");
      }
    } catch {
      fetchTeamData("all");
    }
  };

  const fetchTeamData = async (mgrId: string = selectedManagerFilter) => {
    setIsLoading(true);
    try {
      let url = "/api/team";
      if (mgrId && mgrId !== "all") {
        url += `?manager_id=${mgrId}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTeamMembers(data.team || []);
        setSummary(data.summary || {});

        // Populate managers list for filter dropdown if viewing all
        if (mgrId === "all") {
          const mgrs = (data.team || []).filter((m: any) =>
            m.is_primary_admin || (Array.isArray(m.member_roles) && m.member_roles.some((mr: any) => mr.roles?.name?.toLowerCase().includes("manager")))
          );
          setManagersList(mgrs);
        }
      }
    } catch (err) {
      console.error("Failed to load team operations data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText || !selectedRecruiter) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/team/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiter_id: selectedRecruiter.id,
          recruiter_name: selectedRecruiter.name,
          sender_id: currentUser?.id,
          sender_name: currentUser?.name || "Branch Manager",
          message: messageText
        })
      });

      if (res.ok) {
        setMessageSentMsg(`Query sent to ${selectedRecruiter.name}! Notification dispatched.`);
        setTimeout(() => {
          setMessageText("");
          setMessageSentMsg("");
          setSelectedRecruiter(null);
        }, 1800);
      } else {
        setMessageSentMsg("Failed to dispatch query.");
      }
    } catch {
      setMessageSentMsg("Network error dispatching query.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGlobalAdmin = currentUser?.is_primary_admin === true;

  return (
    <div className="space-y-6 pb-12 font-sans text-neutral-800">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-white border border-neutral-200 p-5 rounded-sm shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-tight font-bold text-neutral-800 tracking-tight">Team Operations & Recruiter Workload</h1>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Supervise reporting recruiters, monitor pipeline delays, and track team performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-neutral-600">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Supervision Scope:</span>
            {!isGlobalAdmin && (
              <span className="font-bold text-neutral-800 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-xs text-[10px]">
                {currentUser?.name || "Branch Manager"} ({teamMembers.length} Reporting)
              </span>
            )}
          </div>

          {isGlobalAdmin && (
            <select
              value={selectedManagerFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedManagerFilter(val);
                fetchTeamData(val);
              }}
              className="p-1.5 bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-sm font-mono text-xs focus:outline-none focus:border-primary"
            >
              <option value="all">All Organization Recruiters</option>
              {managersList.map((m: any) => (
                <option key={m.id} value={m.id}>
                  Manager: {m.name} ({m.email})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-neutral-white border border-neutral-200 p-5 rounded-sm hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/30 group-hover:bg-primary transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Reporting Recruiters</span>
            <div className="p-2 bg-neutral-50 border border-neutral-150 rounded-sm group-hover:bg-primary/5 transition-colors">
              <Users className="w-4 h-4 text-neutral-500 group-hover:text-primary transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-tight font-bold text-neutral-800 tracking-tight">{summary.total_recruiters}</h4>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">Active in your team</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-neutral-white border border-neutral-200 p-5 rounded-sm hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30 group-hover:bg-blue-500 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Team Jobs</span>
            <div className="p-2 bg-neutral-50 border border-neutral-150 rounded-sm group-hover:bg-blue-500/5 transition-colors">
              <Briefcase className="w-4 h-4 text-neutral-500 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-tight font-bold text-neutral-800 tracking-tight">{summary.active_jobs}</h4>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">Under active sourcing</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-neutral-white border border-neutral-200 p-5 rounded-sm hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/30 group-hover:bg-amber-500 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Candidates Awaiting Review</span>
            <div className="p-2 bg-neutral-50 border border-neutral-150 rounded-sm group-hover:bg-amber-500/5 transition-colors">
              <FileCheck className="w-4 h-4 text-neutral-500 group-hover:text-amber-500 transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-tight font-bold text-neutral-800 tracking-tight">{summary.pending_reviews}</h4>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">Backlog in screening stages</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-neutral-white border border-neutral-200 p-5 rounded-sm hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/30 group-hover:bg-rose-500 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Delayed Actions</span>
            <div className="p-2 bg-neutral-50 border border-neutral-150 rounded-sm group-hover:bg-rose-500/5 transition-colors">
              <AlertTriangle className="w-4 h-4 text-neutral-500 group-hover:text-rose-500 transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-tight font-bold text-neutral-800 tracking-tight">{summary.delayed_actions}</h4>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">Exceeding SLA turnaround</p>
          </div>
        </div>
      </div>

      {/* Recruiter Workload Breakdown Table */}
      <div className="border border-neutral-200 bg-neutral-white rounded-sm overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Recruiter Workload & Performance Table</h3>
          <span className="font-mono text-[9px] px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded-sm text-neutral-500 uppercase tracking-wider">Live Supervision Data</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-neutral-400 font-mono text-xs animate-pulse">
            Loading team workload metrics...
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 font-mono text-xs">
            No recruiters currently reporting under your supervision.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-mono uppercase text-[9px] border-b border-neutral-200">
                <tr>
                  <th className="p-3.5">Recruiter</th>
                  <th className="p-3.5">Assigned Roles / Branch</th>
                  <th className="p-3.5">Active Jobs</th>
                  <th className="p-3.5">Pending Reviews</th>
                  <th className="p-3.5">Delayed Actions</th>
                  <th className="p-3.5">Avg Turnaround</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 text-neutral-700">
                {teamMembers.map(member => {
                  const roles = (member.member_roles || []).map((mr: any) => mr.roles).filter(Boolean);

                  return (
                    <tr key={member.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center border border-primary/20 shrink-0">
                            {member.avatar_initials || member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-800 text-xs">{member.name}</div>
                            <div className="text-[10px] font-mono text-neutral-400">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-[10px]">
                        <div className="flex flex-wrap gap-1.5">
                          {roles.length > 0 ? (
                            roles.map((r: any) => (
                              <span key={r.id} className="px-2 py-0.5 rounded-sm bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono text-[10px] font-medium">
                                {r.name} [{r.branch_name || 'Main Branch'}]
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 rounded-sm bg-neutral-100 text-neutral-400 border border-neutral-200 text-[10px]">
                              Recruiter
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-neutral-800 text-xs">
                        {member.active_jobs_count} Jobs
                      </td>

                      <td className="p-3.5 font-mono">
                        <span className="px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[10px] font-bold">
                          {member.pending_reviews_count} Reviews
                        </span>
                      </td>

                      <td className="p-3.5 font-mono">
                        {member.delayed_actions_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[10px] font-bold">
                            {member.delayed_actions_count} Overdue
                          </span>
                        ) : (
                          <span className="text-neutral-400">0</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-neutral-500">
                        {member.avg_review_days} days
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedRecruiter(member)}
                          className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-mono text-[10px] font-bold rounded-sm border border-neutral-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                          <span>Query / Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recruiter Audit & Contextual Query Modal */}
      {selectedRecruiter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-white border border-neutral-200 max-w-lg w-full p-6 rounded-sm shadow-xl space-y-4 text-xs text-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-neutral-800 text-sm">Recruiter Supervision Summary: {selectedRecruiter.name}</h3>
                  <p className="text-[10px] font-mono text-neutral-400">{selectedRecruiter.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRecruiter(null)} className="text-neutral-400 hover:text-neutral-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] p-3 bg-neutral-50 border border-neutral-200 rounded-sm">
              <div>
                <span className="text-neutral-500">Active Jobs:</span>
                <span className="font-bold text-neutral-800 ml-1.5">{selectedRecruiter.active_jobs_count}</span>
              </div>
              <div>
                <span className="text-neutral-500">Backlog Reviews:</span>
                <span className="font-bold text-amber-600 ml-1.5">{selectedRecruiter.pending_reviews_count}</span>
              </div>
              <div>
                <span className="text-neutral-500">Delayed Actions:</span>
                <span className="font-bold text-rose-600 ml-1.5">{selectedRecruiter.delayed_actions_count}</span>
              </div>
              <div>
                <span className="text-neutral-500">Avg Turnaround:</span>
                <span className="font-bold text-neutral-800 ml-1.5">{selectedRecruiter.avg_review_days} days</span>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3 pt-2">
              <label className="block font-mono text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
                Send Direct Manager Query to Recruiter
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="e.g. Please confirm why candidates in Technical Review have not moved in 3 days..."
                required
                rows={3}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-sm text-xs focus:outline-none focus:border-primary font-sans placeholder:text-neutral-400"
              />

              {messageSentMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] rounded-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{messageSentMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setSelectedRecruiter(null)}
                  className="px-3.5 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-xs font-semibold cursor-pointer text-neutral-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-sm cursor-pointer transition-colors shadow-sm"
                >
                  {isSubmitting ? "Dispatching..." : "Send Manager Query"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


