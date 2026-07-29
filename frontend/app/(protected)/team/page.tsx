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
  UserCheck
} from "lucide-react";

export default function TeamOperationsPage() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    total_recruiters: 0,
    active_jobs: 0,
    pending_reviews: 0,
    delayed_actions: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecruiter, setSelectedRecruiter] = useState<any | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageSentMsg, setMessageSentMsg] = useState("");

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (data.success) {
        setTeamMembers(data.team || []);
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error("Failed to load team operations data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText || !selectedRecruiter) return;
    setMessageSentMsg(`Query sent to ${selectedRecruiter.name}!`);
    setTimeout(() => {
      setMessageText("");
      setMessageSentMsg("");
    }, 2500);
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-neutral-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-tight font-bold text-neutral-white">Team Operations & Recruiter Workload</h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              Supervise reporting recruiters, monitor pipeline delays, and track team performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Manager Monitoring Scope</span>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-md space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
            <span>Reporting Recruiters</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-neutral-white">{summary.total_recruiters}</div>
          <p className="text-[10px] text-neutral-500 font-mono">Active in your team</p>
        </div>

        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-md space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
            <span>Active Team Jobs</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-white">{summary.active_jobs}</div>
          <p className="text-[10px] text-neutral-500 font-mono">Under active sourcing</p>
        </div>

        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-md space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
            <span>Candidates Awaiting Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-white">{summary.pending_reviews}</div>
          <p className="text-[10px] text-neutral-500 font-mono">Backlog in screening stages</p>
        </div>

        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-md space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
            <span>Delayed Actions</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-white">{summary.delayed_actions}</div>
          <p className="text-[10px] text-neutral-500 font-mono">Exceeding SLA turnaround</p>
        </div>
      </div>

      {/* Recruiter Workload Breakdown Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-md overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="font-bold text-neutral-white text-sm">Recruiter Workload & Performance Table</h3>
          <span className="font-mono text-[10px] text-neutral-400 uppercase">Live Supervision Data</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-neutral-500 font-mono text-xs animate-pulse">
            Loading team workload metrics...
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 font-mono text-xs">
            No recruiters currently reporting under your supervision.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 font-mono uppercase text-[10px] border-b border-neutral-800">
                <tr>
                  <th className="p-3.5">Recruiter</th>
                  <th className="p-3.5">Role / Status</th>
                  <th className="p-3.5">Active Jobs</th>
                  <th className="p-3.5">Pending Reviews</th>
                  <th className="p-3.5">Delayed Actions</th>
                  <th className="p-3.5">Avg Turnaround</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                {teamMembers.map(member => (
                  <tr key={member.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/30">
                          {member.avatar_initials || member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-neutral-white">{member.name}</div>
                          <div className="text-[10px] font-mono text-neutral-400">{member.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {member.is_primary_admin ? "Primary Admin" : "Recruiter"}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-neutral-200">
                      {member.active_jobs_count} Jobs
                    </td>

                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                        {member.pending_reviews_count} Reviews
                      </span>
                    </td>

                    <td className="p-3.5 font-mono">
                      {member.delayed_actions_count > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                          {member.delayed_actions_count} Overdue
                        </span>
                      ) : (
                        <span className="text-neutral-500">0</span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono text-neutral-400">
                      {member.avg_review_days} days
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedRecruiter(member)}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-[11px] font-bold rounded inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        <span>Query / Audit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recruiter Audit & Contextual Query Modal */}
      {selectedRecruiter && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 max-w-lg w-full p-6 rounded-md shadow-2xl space-y-4 text-neutral-200 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-neutral-white text-sm">Recruiter Summary: {selectedRecruiter.name}</h3>
                  <p className="text-[10px] font-mono text-neutral-400">{selectedRecruiter.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRecruiter(null)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] p-3 bg-neutral-950 border border-neutral-850 rounded">
              <div>
                <span className="text-neutral-500">Active Jobs:</span>
                <span className="font-bold text-neutral-200 ml-1.5">{selectedRecruiter.active_jobs_count}</span>
              </div>
              <div>
                <span className="text-neutral-500">Backlog Reviews:</span>
                <span className="font-bold text-amber-400 ml-1.5">{selectedRecruiter.pending_reviews_count}</span>
              </div>
              <div>
                <span className="text-neutral-500">Delayed Actions:</span>
                <span className="font-bold text-red-400 ml-1.5">{selectedRecruiter.delayed_actions_count}</span>
              </div>
              <div>
                <span className="text-neutral-500">Avg Turnaround:</span>
                <span className="font-bold text-neutral-200 ml-1.5">{selectedRecruiter.avg_review_days} days</span>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3 pt-2">
              <label className="block font-mono text-[10px] font-bold uppercase text-neutral-400">
                Send Contextual Manager Query to Recruiter
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="e.g. Please confirm why candidates in Technical Review have not moved in 3 days..."
                required
                rows={3}
                className="w-full p-2.5 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded text-xs focus:outline-none focus:border-primary font-sans"
              />

              {messageSentMsg && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] rounded text-center">
                  {messageSentMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedRecruiter(null)}
                  className="px-3.5 py-2 border border-neutral-800 hover:bg-neutral-800 rounded text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-neutral-white text-xs font-mono font-bold uppercase tracking-wider rounded cursor-pointer"
                >
                  Send Manager Query
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
