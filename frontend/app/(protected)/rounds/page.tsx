"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import ReviewWorkspace from "@/components/ReviewWorkspace";
import { 
  Loader2, Layers, Search, TrendingUp, ChevronRight
} from "lucide-react";

export default function RoundsPage() {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters State
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedRequirement, setSelectedRequirement] = useState("all");
  const [selectedJob, setSelectedJob] = useState("all");
  const [selectedRound, setSelectedRound] = useState("all");
  const [selectedTopN, setSelectedTopN] = useState("all");

  // Queries
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["clients"],
    queryFn: () => apiRequest<any[]>("GET", "/clients")
  });

  const { data: requirements = [] } = useQuery<any[]>({
    queryKey: ["requirements"],
    queryFn: () => apiRequest<any[]>("GET", "/requirements")
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["jobs"],
    queryFn: () => apiRequest<any[]>("GET", "/jobs")
  });

  const { data: applications = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["all_applications"],
    queryFn: () => apiRequest<any[]>("GET", "/applications"),
    refetchInterval: 3000
  });

  if (selectedAppId) {
    return (
      <ReviewWorkspace 
        applicationId={selectedAppId} 
        onBack={() => {
          setSelectedAppId(null);
          refetch();
        }} 
      />
    );
  }

  // Helper to determine the status and color theme for a specific round column for an application
  const getRoundStatus = (app: any, roundName: string): { label: string; style: string } => {
    const roundsOrder = ["screening", "technical", "hr", "final"];
    const currentRoundIdx = roundsOrder.indexOf(app.stage);
    const targetRoundIdx = roundsOrder.indexOf(roundName);

    // If candidate has a rejected/failed state in their profile
    if (app.screening_status === "rejected" || app.stage === "rejected") {
      if (roundName === "screening") {
        return { label: "Rejected", style: "bg-error/15 border-error/25 text-error font-medium" };
      }
      return { label: "Blocked", style: "bg-neutral-100 border-neutral-250 text-neutral-400 opacity-60" };
    }

    if (app.stage === "hired") {
      return { label: "Passed", style: "bg-success/15 border-success/25 text-success font-semibold" };
    }

    if (targetRoundIdx < currentRoundIdx) {
      // Past round is assumed passed
      return { label: "Passed", style: "bg-success/15 border-success/25 text-success font-medium" };
    } else if (targetRoundIdx === currentRoundIdx) {
      // Current active round status
      if (app.stage_status === "passed") {
        return { label: "Passed", style: "bg-success/15 border-success/25 text-success font-medium" };
      } else if (app.stage_status === "failed") {
        return { label: "Failed", style: "bg-error/15 border-error/25 text-error font-semibold" };
      } else if (app.stage_status === "in_progress") {
        return { label: "In Progress", style: "bg-info/15 border-info/25 text-info animate-pulse font-medium" };
      } else if (app.stage_status === "on_hold") {
        return { label: "On Hold", style: "bg-warning/15 border-warning/25 text-warning font-medium" };
      } else {
        return { label: "Scheduled", style: "bg-neutral-100 border-neutral-250 text-neutral-500 font-medium" };
      }
    } else {
      // Future round
      return { label: "Pending", style: "bg-neutral-50 border-neutral-150 text-neutral-400" };
    }
  };

  // 1. Text Search Filter
  let filteredApps = applications.filter(app => {
    const candName = app.candidates?.full_name || "";
    const jobTitle = app.job_openings?.title || "";
    const clientName = app.job_openings?.clients?.name || app.client_name || "";
    const query = searchQuery.toLowerCase();
    return (
      candName.toLowerCase().includes(query) ||
      jobTitle.toLowerCase().includes(query) ||
      clientName.toLowerCase().includes(query)
    );
  });

  // 2. Client Filter
  if (selectedClient !== "all") {
    filteredApps = filteredApps.filter(app => 
      app.job_openings?.client_id === selectedClient || 
      app.job_openings?.client_name === selectedClient
    );
  }

  // 3. Requirement Filter
  if (selectedRequirement !== "all") {
    filteredApps = filteredApps.filter(app => 
      app.job_openings?.requirement_id === selectedRequirement
    );
  }

  // 4. Job Opening Filter
  if (selectedJob !== "all") {
    filteredApps = filteredApps.filter(app => 
      app.job_opening_id === selectedJob
    );
  }

  // 5. Round/Stage Filter
  if (selectedRound !== "all") {
    filteredApps = filteredApps.filter(app => 
      app.stage === selectedRound
    );
  }

  // 6. Sort by score
  filteredApps.sort((a, b) => (b.fuzzy_score || 0) - (a.fuzzy_score || 0));

  // 7. Top N limit
  if (selectedTopN !== "all") {
    const limit = parseInt(selectedTopN, 10);
    filteredApps = filteredApps.slice(0, limit);
  }

  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-lg font-tight font-bold text-neutral-850 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Interview Rounds Monitoring Board
          </h2>
          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Horizontal pipeline matrix tracking dashboard</p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-neutral-500 bg-neutral-100 px-3 py-1 border border-neutral-250 rounded-sm">
          <TrendingUp className="w-4 h-4 text-success animate-pulse" />
          <span>Active Pipelines: {applications.filter(a => a.stage !== 'hired' && a.stage !== 'rejected').length} candidates</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-neutral-450" />
        <input
          type="text"
          placeholder="Filter pipeline candidates by name, job, or client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-neutral-200 bg-neutral-white rounded-sm text-xs focus:ring-1 focus:ring-primary text-neutral-800 focus:outline-none"
        />
      </div>

      {/* Dropdown Filters Toolbar */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 text-xs text-neutral-600">
        {/* Client dropdown */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider font-semibold font-mono text-neutral-400 block">Client</label>
          <select
            value={selectedClient}
            onChange={(e) => {
              setSelectedClient(e.target.value);
              setSelectedRequirement("all");
              setSelectedJob("all");
            }}
            className="w-full px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-neutral-800 focus:outline-none"
          >
            <option value="all">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Requirement dropdown */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider font-semibold font-mono text-neutral-400 block">Requirement</label>
          <select
            value={selectedRequirement}
            onChange={(e) => {
              setSelectedRequirement(e.target.value);
              setSelectedJob("all");
            }}
            className="w-full px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-neutral-800 focus:outline-none"
          >
            <option value="all">All Requirements</option>
            {requirements
              .filter(r => selectedClient === "all" || r.client_id === selectedClient)
              .map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
          </select>
        </div>

        {/* Job Opening dropdown */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider font-semibold font-mono text-neutral-400 block">Job Opening</label>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-neutral-800 focus:outline-none"
          >
            <option value="all">All Job Openings</option>
            {jobs
              .filter(j => selectedRequirement === "all" || j.requirement_id === selectedRequirement)
              .map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
          </select>
        </div>

        {/* Round Filter */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider font-semibold font-mono text-neutral-400 block">Active Round</label>
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-neutral-800 focus:outline-none"
          >
            <option value="all">All Rounds</option>
            <option value="screening">Screening</option>
            <option value="technical">Technical Interview</option>
            <option value="hr">HR Round</option>
            <option value="final">Final Round</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Top N Filter */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider font-semibold font-mono text-neutral-400 block">Top Candidates</label>
          <select
            value={selectedTopN}
            onChange={(e) => setSelectedTopN(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-neutral-800 focus:outline-none"
          >
            <option value="all">All Candidates</option>
            <option value="5">Top 5 Fuzzy Fit</option>
            <option value="10">Top 10 Fuzzy Fit</option>
            <option value="20">Top 20 Fuzzy Fit</option>
            <option value="50">Top 50 Fuzzy Fit</option>
          </select>
        </div>
      </div>

      {/* Pipeline Grid Board Layout */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-400 font-mono text-xs gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span>Syncing pipeline records...</span>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-neutral-white border border-neutral-200 rounded-sm p-12 text-center text-xs text-neutral-400">
          No candidates found matching the selected filters.
        </div>
      ) : (
        <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-400 font-mono uppercase text-[9px] tracking-wider">
                  <th className="p-4 font-semibold">Candidate</th>
                  <th className="p-4 font-semibold">Client & Job Opening</th>
                  <th className="p-4 font-semibold text-center">Screening</th>
                  <th className="p-4 font-semibold text-center">Technical</th>
                  <th className="p-4 font-semibold text-center">HR Round</th>
                  <th className="p-4 font-semibold text-center">Final Round</th>
                  <th className="p-4 font-semibold">Match</th>
                  <th className="p-4 font-semibold">Decision Notes</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-neutral-50/50 transition-colors">
                    {/* Candidate Details */}
                    <td className="p-4">
                      <div className="font-semibold text-neutral-800 text-xs">{app.candidates?.full_name || "Unknown Candidate"}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{app.candidates?.email}</div>
                      <div className="text-[9px] text-neutral-400 font-mono">Exp: {app.candidates?.experience_years ?? 0} years</div>
                    </td>

                    {/* Job Details */}
                    <td className="p-4">
                      <div className="font-mono text-[9px] text-neutral-400 uppercase font-semibold">{app.job_openings?.client_name || app.client_name || "Generic"}</div>
                      <div className="font-medium text-neutral-700 mt-0.5 truncate max-w-[150px]" title={app.job_openings?.title}>
                        {app.job_openings?.title}
                      </div>
                    </td>

                    {/* Screening Stage */}
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-sm border text-[9px] font-mono font-semibold uppercase min-w-[95px] text-center ${getRoundStatus(app, "screening").style}`}>
                        {getRoundStatus(app, "screening").label}
                      </span>
                    </td>

                    {/* Technical Stage */}
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-sm border text-[9px] font-mono font-semibold uppercase min-w-[95px] text-center ${getRoundStatus(app, "technical").style}`}>
                        {getRoundStatus(app, "technical").label}
                      </span>
                    </td>

                    {/* HR Stage */}
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-sm border text-[9px] font-mono font-semibold uppercase min-w-[95px] text-center ${getRoundStatus(app, "hr").style}`}>
                        {getRoundStatus(app, "hr").label}
                      </span>
                    </td>

                    {/* Final Stage */}
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-sm border text-[9px] font-mono font-semibold uppercase min-w-[95px] text-center ${getRoundStatus(app, "final").style}`}>
                        {getRoundStatus(app, "final").label}
                      </span>
                    </td>

                    {/* Match Score */}
                    <td className="p-4 font-mono font-bold text-neutral-800">
                      <span className={`px-2 py-0.5 rounded-sm border ${
                        app.fuzzy_score >= 80 ? "bg-success/10 border-success/20 text-success" :
                        app.fuzzy_score >= 50 ? "bg-warning/10 border-warning/20 text-warning" :
                        "bg-error/10 border-error/20 text-error"
                      }`}>
                        {app.fuzzy_score}%
                      </span>
                    </td>

                    {/* Decision Notes */}
                    <td className="p-4 text-neutral-500 font-normal max-w-[150px] truncate" title={app.stage_notes || ""}>
                      {app.stage_notes || "-"}
                    </td>

                    {/* Review Workspace Link */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedAppId(app.id)}
                        className="text-[10px] text-primary hover:underline font-semibold uppercase font-mono cursor-pointer flex items-center gap-0.5 ml-auto"
                      >
                        Review
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
