"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import ReviewWorkspace from "@/components/ReviewWorkspace";
import { 
  Loader2, Layers, Search, ChevronRight,
  Folder, FolderOpen, List, Table, Building2, ChevronDown, User, Users,
  Settings, Plus, Trash2, X, ArrowUp, ArrowDown
} from "lucide-react";

export default function RoundsPage() {
  const queryClient = useQueryClient();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // View toggle & expanded node states
  const [viewMode, setViewMode] = useState<"tree" | "accordion" | "table">("tree");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: prev[nodeKey] === false ? true : false
    }));
  };

  // Filters State
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedRequirement, setSelectedRequirement] = useState("all");
  const [selectedJob, setSelectedJob] = useState("all");
  const [selectedRound, setSelectedRound] = useState("all");
  const [selectedTopN, setSelectedTopN] = useState("all");

  // Stage management state
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [stageManageJobId, setStageManageJobId] = useState<string>("all");
  const [customStagesList, setCustomStagesList] = useState<string[]>([]);

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

  // Automatically sync custom stages list when selection changes
  React.useEffect(() => {
    if (stageManageJobId && stageManageJobId !== "all") {
      const job = jobs.find(j => j.id === stageManageJobId);
      if (job) {
        setCustomStagesList(job.custom_stages || ['technical', 'hr', 'final']);
      }
    } else {
      setCustomStagesList([]);
    }
  }, [stageManageJobId, jobs]);

  const updateJobStagesMutation = useMutation({
    mutationFn: (newStages: string[]) => 
      apiRequest<any>("PATCH", `/jobs/${stageManageJobId}`, {
        custom_stages: newStages
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["all_applications"] });
      alert("Job interview stages updated successfully.");
      setIsStageModalOpen(false);
    },
    onError: (err: any) => {
      alert("Failed to update job stages: " + err.message);
    }
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

  const getJobStages = (job: any): string[] => {
    if (job?.custom_stages && job.custom_stages.length > 0) {
      return ["screening", ...job.custom_stages];
    }
    return ["screening", "technical", "hr", "final"];
  };

  // Helper to determine the status and color theme for a specific round column for an application
  const getRoundStatus = (app: any, roundName: string, job: any): { label: string; style: string } => {
    const roundsOrder = getJobStages(job);
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

    if (targetRoundIdx < currentRoundIdx && targetRoundIdx !== -1) {
      // Past round is assumed passed
      return { label: "Passed", style: "bg-success/15 border-success/25 text-success font-medium" };
    } else if (targetRoundIdx === currentRoundIdx && targetRoundIdx !== -1) {
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

  const RenderProgressStepper = ({ app, job }: { app: any; job: any }) => {
    const stages = getJobStages(job);
    const currentIdx = stages.indexOf(app.stage);
    const isRejected = app.stage === "rejected" || app.screening_status === "rejected";
    const isHired = app.stage === "hired";

    return (
      <div className="flex items-center gap-1 py-1">
        {stages.map((stg, idx) => {
          let dotStyle = "bg-neutral-100 border-neutral-300 text-neutral-400";
          
          if (isHired) {
            dotStyle = "bg-success border-success text-neutral-white";
          } else if (isRejected) {
            if (idx < currentIdx || (app.screening_status === "rejected" && idx === 0)) {
              dotStyle = "bg-success border-success text-neutral-white";
            } else if (idx === currentIdx || (app.screening_status === "rejected" && idx === 0)) {
              dotStyle = "bg-error border-error text-neutral-white";
            }
          } else {
            if (idx < currentIdx) {
              dotStyle = "bg-success border-success text-neutral-white";
            } else if (idx === currentIdx) {
              if (app.stage_status === "passed") {
                dotStyle = "bg-success border-success text-neutral-white";
              } else if (app.stage_status === "failed") {
                dotStyle = "bg-error border-error text-neutral-white";
              } else if (app.stage_status === "in_progress") {
                dotStyle = "bg-info border-info animate-pulse text-neutral-white font-semibold";
              } else if (app.stage_status === "on_hold") {
                dotStyle = "bg-warning border-warning text-neutral-white";
              } else {
                dotStyle = "bg-neutral-500 border-neutral-600 text-neutral-white";
              }
            }
          }

          return (
            <div key={stg} className="flex items-center group relative">
              <span
                className={`w-4.5 h-4.5 rounded-full border text-[9px] flex items-center justify-center font-mono ${dotStyle}`}
                title={stg}
              >
                {idx + 1}
              </span>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover:block bg-neutral-900 text-neutral-white text-[9px] px-2 py-0.5 rounded-xs whitespace-nowrap font-mono z-10 shadow-md">
                {stg.replace("_", " ")}
              </div>
              
              {idx < stages.length - 1 && (
                <span className={`w-3.5 h-0.5 ml-1 ${idx < currentIdx ? "bg-success" : "bg-neutral-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
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

  // Group applications hierarchically by Client -> Job Opening
  const groupedApps = React.useMemo(() => {
    const clientsMap: Record<string, {
      client_name: string;
      jobs: Record<string, {
        job_title: string;
        job_opening: any;
        applications: any[];
      }>;
    }> = {};

    filteredApps.forEach(app => {
      const clientName = app.job_openings?.client_name || app.client_name || "Unassigned Clients";
      const jobTitle = app.job_openings?.title || "General Application";
      const jobId = app.job_opening_id || "unassigned-job";

      if (!clientsMap[clientName]) {
        clientsMap[clientName] = {
          client_name: clientName,
          jobs: {}
        };
      }

      if (!clientsMap[clientName].jobs[jobId]) {
        clientsMap[clientName].jobs[jobId] = {
          job_title: jobTitle,
          job_opening: app.job_openings,
          applications: []
        };
      }

      clientsMap[clientName].jobs[jobId].applications.push(app);
    });

    return clientsMap;
  }, [filteredApps]);

  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none animate-fade-in">
      {/* Page Header */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-tight font-bold text-neutral-850 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Stages Monitoring Board
          </h2>
          <div className="flex items-center gap-2.5 mt-0.5">
            <p className="text-[10px] text-neutral-400 font-mono">Horizontal pipeline matrix and candidate stage tracking</p>
            <span className="text-[9px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.2 border border-neutral-200 rounded-sm font-semibold">
              Active Pipelines: {applications.filter(a => a.stage !== 'hired' && a.stage !== 'rejected').length}
            </span>
          </div>
        </div>

        {/* Actions & View Toggle Group */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => {
              if (jobs.length > 0) {
                setStageManageJobId(jobs[0].id);
              }
              setIsStageModalOpen(true);
            }}
            className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-neutral-white rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Configure Interview Stages"
          >
            <Settings className="w-3.5 h-3.5" />
            Stage Management
          </button>

          <div className="flex items-center border border-neutral-200 rounded-sm overflow-hidden p-0.5 bg-neutral-50">
            <button
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "tree"
                  ? "bg-neutral-900 text-neutral-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
              title="File System View"
            >
              <Folder className="w-3.5 h-3.5" />
              File System
            </button>
            <button
              onClick={() => setViewMode("accordion")}
              className={`px-3 py-1.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "accordion"
                  ? "bg-neutral-900 text-neutral-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
              title="Accordion View"
            >
              <List className="w-3.5 h-3.5" />
              Accordion
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-neutral-900 text-neutral-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
              Flat Table
            </button>
          </div>
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

        {/* Stage Filter */}
        <div className="space-y-1">
          <label className="text-[9px] uppercase tracking-wider font-semibold font-mono text-neutral-400 block">Active Stage</label>
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-neutral-800 focus:outline-none"
          >
            <option value="all">All Stages</option>
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

      {/* Main Content Layout */}
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
        <div className="space-y-4">
          {/* File Tree System View */}
          {viewMode === "tree" && (
            <div className="bg-neutral-white border border-neutral-200 rounded-sm shadow-sm p-4 space-y-2 select-none animate-fade-in">
              {Object.entries(groupedApps).map(([clientName, clientData]) => {
                const clientKey = `client:${clientName}`;
                const isClientExpanded = expandedNodes[clientKey] !== false;

                return (
                  <div key={clientName} className="space-y-1">
                    {/* Client Level Folder */}
                    <div
                      onClick={() => toggleNode(clientKey)}
                      className="flex items-center justify-between p-2.5 hover:bg-neutral-50 rounded-sm cursor-pointer transition-colors border border-neutral-100 bg-neutral-50/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-neutral-400" />
                        {isClientExpanded ? (
                          <FolderOpen className="w-4 h-4 text-primary/70" />
                        ) : (
                          <Folder className="w-4 h-4 text-primary/70" />
                        )}
                        <span className="font-semibold text-neutral-850 text-xs uppercase tracking-tight">
                          {clientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-neutral-400 px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded-xs">
                          {Object.keys(clientData.jobs).length} Active Job(s)
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-neutral-450 transition-transform ${
                            isClientExpanded ? "" : "-rotate-90"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Job Level Subfolders */}
                    {isClientExpanded && (
                      <div className="pl-6 border-l border-neutral-150 ml-4.5 space-y-1 mt-1">
                        {Object.entries(clientData.jobs).map(([jobId, jobData]) => {
                          const jobKey = `job:${clientName}:${jobId}`;
                          const isJobExpanded = expandedNodes[jobKey] !== false;

                          return (
                            <div key={jobId} className="space-y-1">
                              <div
                                onClick={() => toggleNode(jobKey)}
                                className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-sm cursor-pointer transition-colors border border-neutral-100/50 bg-neutral-50/10"
                              >
                                <div className="flex items-center gap-2">
                                  {isJobExpanded ? (
                                    <FolderOpen className="w-3.5 h-3.5 text-neutral-450" />
                                  ) : (
                                    <Folder className="w-3.5 h-3.5 text-neutral-450" />
                                  )}
                                  <span className="font-medium text-neutral-800 text-xs">
                                    {jobData.job_title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-mono text-neutral-450 px-1.5 py-0.2 bg-neutral-100 border border-neutral-200 rounded-xs">
                                    {jobData.applications.length} Candidate(s)
                                  </span>
                                  <ChevronDown
                                    className={`w-3 h-3 text-neutral-400 transition-transform ${
                                      isJobExpanded ? "" : "-rotate-90"
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Candidate Files */}
                              {isJobExpanded && (
                                <div className="pl-6 border-l border-neutral-150 ml-3.5 space-y-1 mt-1">
                                  <div className="bg-neutral-white border border-neutral-200/65 rounded-sm overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-neutral-50/50 border-b border-neutral-250 text-neutral-400 font-mono uppercase text-[8px] tracking-wider">
                                          <th className="p-3 font-semibold">Candidate</th>
                                          {getJobStages(jobData.job_opening).map((stg) => (
                                            <th key={stg} className="p-3 font-semibold text-center capitalize">{stg.replace("_", " ")}</th>
                                          ))}
                                          <th className="p-3 font-semibold">Match</th>
                                          <th className="p-3 font-semibold">Notes</th>
                                          <th className="p-3"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-neutral-150">
                                        {jobData.applications.map((app) => (
                                          <tr key={app.id} className="hover:bg-neutral-50/40 transition-colors">
                                            <td className="p-3">
                                              <div className="font-semibold text-neutral-800 text-xs flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-neutral-400" />
                                                {app.candidates?.full_name || "Unknown"}
                                              </div>
                                              <div className="text-[9px] text-neutral-400 font-mono ml-5">{app.candidates?.email}</div>
                                            </td>
                                            {getJobStages(jobData.job_opening).map((stg) => (
                                              <td key={stg} className="p-3 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded-sm border text-[8px] font-mono font-semibold uppercase min-w-[85px] text-center ${getRoundStatus(app, stg, jobData.job_opening).style}`}>
                                                  {getRoundStatus(app, stg, jobData.job_opening).label}
                                                </span>
                                              </td>
                                            ))}
                                            <td className="p-3 font-mono font-bold text-neutral-800">
                                              <span className={`px-1.5 py-0.2 rounded-xs border text-[9px] ${
                                                app.fuzzy_score >= 80 ? "bg-success/10 border-success/20 text-success" :
                                                app.fuzzy_score >= 50 ? "bg-warning/10 border-warning/20 text-warning" :
                                                "bg-error/10 border-error/20 text-error"
                                              }`}>
                                                {app.fuzzy_score}%
                                              </span>
                                            </td>
                                            <td className="p-3 text-neutral-500 max-w-[120px] truncate" title={app.stage_notes || ""}>
                                              {app.stage_notes || "-"}
                                            </td>
                                            <td className="p-3 text-right">
                                              <button
                                                onClick={() => setSelectedAppId(app.id)}
                                                className="text-[9px] text-primary hover:underline font-semibold uppercase font-mono cursor-pointer flex items-center gap-0.5 ml-auto"
                                              >
                                                Review
                                                <ChevronRight className="w-3 h-3" />
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
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Accordion View */}
          {viewMode === "accordion" && (
            <div className="space-y-3 animate-fade-in">
              {Object.entries(groupedApps).map(([clientName, clientData]) => {
                const clientKey = `accordion:client:${clientName}`;
                const isClientExpanded = expandedNodes[clientKey] !== false;

                return (
                  <div
                    key={clientName}
                    className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden shadow-xs"
                  >
                    <div
                      onClick={() => toggleNode(clientKey)}
                      className="p-4 bg-neutral-50 flex items-center justify-between cursor-pointer border-b border-neutral-150"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-neutral-405" />
                        <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">
                          {clientName}
                        </h3>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 transition-transform ${
                          isClientExpanded ? "" : "-rotate-90"
                        }`}
                      />
                    </div>

                    {isClientExpanded && (
                      <div className="p-4 space-y-4 bg-neutral-50/10">
                        {Object.entries(clientData.jobs).map(([jobId, jobData]) => (
                          <div key={jobId} className="space-y-2">
                            <h4 className="font-bold text-xs text-neutral-800 flex items-center gap-1.5 border-b border-neutral-100 pb-2">
                              <span className="w-1.5 h-1.5 bg-primary rounded-xs"></span>
                              {jobData.job_title}
                            </h4>
                            
                            <div className="overflow-x-auto border border-neutral-200/80 rounded-sm">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-neutral-50/50 border-b border-neutral-250 text-neutral-400 font-mono uppercase text-[8px] tracking-wider">
                                    <th className="p-3 font-semibold">Candidate</th>
                                    {getJobStages(jobData.job_opening).map((stg) => (
                                      <th key={stg} className="p-3 font-semibold text-center capitalize">{stg.replace("_", " ")}</th>
                                    ))}
                                    <th className="p-3 font-semibold">Match</th>
                                    <th className="p-3"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-150 bg-neutral-white">
                                  {jobData.applications.map((app) => (
                                    <tr key={app.id} className="hover:bg-neutral-50/30 transition-colors">
                                      <td className="p-3">
                                        <div className="font-semibold text-neutral-800 text-xs flex items-center gap-1.5">
                                          <User className="w-3.5 h-3.5 text-neutral-400" />
                                          {app.candidates?.full_name || "Unknown"}
                                        </div>
                                        <div className="text-[9px] text-neutral-400 font-mono ml-5">{app.candidates?.email}</div>
                                      </td>
                                      {getJobStages(jobData.job_opening).map((stg) => (
                                        <td key={stg} className="p-3 text-center">
                                          <span className={`inline-block px-2 py-0.5 rounded-sm border text-[8px] font-mono font-semibold uppercase min-w-[85px] text-center ${getRoundStatus(app, stg, jobData.job_opening).style}`}>
                                            {getRoundStatus(app, stg, jobData.job_opening).label}
                                          </span>
                                        </td>
                                      ))}
                                      <td className="p-3 font-mono font-bold text-neutral-800">
                                        <span className={`px-1.5 py-0.2 rounded-xs border text-[9px] ${
                                          app.fuzzy_score >= 80 ? "bg-success/10 border-success/20 text-success" :
                                          app.fuzzy_score >= 50 ? "bg-warning/10 border-warning/20 text-warning" :
                                          "bg-error/10 border-error/20 text-error"
                                        }`}>
                                          {app.fuzzy_score}%
                                        </span>
                                      </td>
                                      <td className="p-3 text-right">
                                        <button
                                          onClick={() => setSelectedAppId(app.id)}
                                          className="text-[9px] text-primary hover:underline font-semibold uppercase font-mono cursor-pointer flex items-center gap-0.5 ml-auto"
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
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Flat Table View */}
          {viewMode === "table" && (
            <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden shadow-sm animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-400 font-mono uppercase text-[9px] tracking-wider">
                      <th className="p-4 font-semibold">Candidate</th>
                      <th className="p-4 font-semibold">Client & Job Opening</th>
                      <th className="p-4 font-semibold text-center">Active Stage</th>
                      <th className="p-4 font-semibold">Progress Timeline</th>
                      <th className="p-4 font-semibold">Match</th>
                      <th className="p-4 font-semibold">Decision Notes</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150">
                    {filteredApps.map((app) => {
                      const activeStageName = app.stage === "hired" ? "Hired" : app.stage === "rejected" ? "Rejected" : app.stage.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                      const statusInfo = getRoundStatus(app, app.stage, app.job_openings);
                      
                      return (
                        <tr key={app.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-neutral-800 text-xs">{app.candidates?.full_name || "Unknown Candidate"}</div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{app.candidates?.email}</div>
                            <div className="text-[9px] text-neutral-400 font-mono">Exp: {app.candidates?.experience_years ?? 0} years</div>
                          </td>
                          <td className="p-4">
                            <div className="font-mono text-[9px] text-neutral-400 uppercase font-semibold">{app.job_openings?.client_name || app.client_name || "Generic"}</div>
                            <div className="font-medium text-neutral-700 mt-0.5 truncate max-w-[150px]" title={app.job_openings?.title}>
                              {app.job_openings?.title}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-sm border text-[9px] font-mono font-semibold uppercase min-w-[95px] text-center ${statusInfo.style}`}>
                              {activeStageName}
                            </span>
                          </td>
                          <td className="p-4">
                            <RenderProgressStepper app={app} job={app.job_openings} />
                          </td>
                          <td className="p-4 font-mono font-bold text-neutral-800">
                          <span className={`px-2 py-0.5 rounded-sm border ${
                            app.fuzzy_score >= 80 ? "bg-success/10 border-success/20 text-success" :
                            app.fuzzy_score >= 50 ? "bg-warning/10 border-warning/20 text-warning" :
                            "bg-error/10 border-error/20 text-error"
                          }`}>
                            {app.fuzzy_score}%
                          </span>
                        </td>
                        <td className="p-4 text-neutral-500 font-normal max-w-[150px] truncate" title={app.stage_notes || ""}>
                          {app.stage_notes || "-"}
                        </td>
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
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage Management Modal */}
      {isStageModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-md p-6 space-y-4 shadow-xl text-neutral-700 select-none">
            <div className="flex items-center justify-between border-b border-neutral-150 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-850">
                  Stage Management
                </h3>
              </div>
              <button
                onClick={() => setIsStageModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Job selector */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-semibold font-mono text-neutral-400 block">Select Job Opening</label>
                <select
                  value={stageManageJobId}
                  onChange={(e) => setStageManageJobId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-neutral-white border border-neutral-200 rounded-sm text-xs text-neutral-800 focus:outline-none"
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.client_name || "Generic"} - {j.title}</option>
                  ))}
                </select>
              </div>

              {/* Pipeline sequence list */}
              <div className="space-y-3 pt-2">
                <span className="text-[9px] uppercase font-bold text-neutral-400 font-mono block">Configure Stage Order</span>
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {/* Locked Screening stage */}
                  <div className="flex items-center gap-2 opacity-65 bg-neutral-50/50 p-1.5 border border-neutral-150 rounded-xs">
                    <span className="text-[10px] font-mono text-neutral-400 font-bold min-w-[50px]">Stage 1:</span>
                    <input
                      type="text"
                      value="Screening"
                      disabled
                      className="flex-1 px-3 py-1.5 bg-neutral-100 border border-neutral-200 rounded-sm text-xs text-neutral-500 font-semibold"
                    />
                    <span className="text-[8px] font-mono font-bold text-neutral-400 uppercase tracking-tight px-1.5">Mandatory</span>
                  </div>

                  {/* Editable subsequent stages */}
                  {customStagesList.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2 p-1.5 border border-neutral-150 bg-neutral-50/10 rounded-xs">
                      <span className="text-[10px] font-mono text-neutral-400 font-bold min-w-[50px]">Stage {index + 2}:</span>
                      <input
                        type="text"
                        value={stage}
                        onChange={(e) => {
                          const updated = [...customStagesList];
                          updated[index] = e.target.value;
                          setCustomStagesList(updated);
                        }}
                        className="flex-1 px-3 py-1.5 bg-neutral-white border border-neutral-200 rounded-sm text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Enter round name..."
                      />
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            const updated = [...customStagesList];
                            const temp = updated[index];
                            updated[index] = updated[index - 1];
                            updated[index - 1] = temp;
                            setCustomStagesList(updated);
                          }}
                          className="p-1 hover:bg-neutral-100 rounded-xs disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3 text-neutral-500" />
                        </button>
                        <button
                          type="button"
                          disabled={index === customStagesList.length - 1}
                          onClick={() => {
                            const updated = [...customStagesList];
                            const temp = updated[index];
                            updated[index] = updated[index + 1];
                            updated[index + 1] = temp;
                            setCustomStagesList(updated);
                          }}
                          className="p-1 hover:bg-neutral-100 rounded-xs disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3 text-neutral-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = customStagesList.filter((_, i) => i !== index);
                            setCustomStagesList(updated);
                          }}
                          className="p-1 hover:bg-error/10 text-error rounded-xs cursor-pointer"
                          title="Delete Stage"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCustomStagesList([...customStagesList, "New Interview Stage"])}
                  className="w-full py-1.5 border border-dashed border-neutral-300 hover:border-primary hover:text-primary transition-colors text-[9px] uppercase font-semibold font-mono tracking-wider text-neutral-500 rounded-sm flex items-center justify-center gap-1 cursor-pointer bg-neutral-50/50 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Stage
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-150 mt-3">
              <button
                type="button"
                onClick={() => setIsStageModalOpen(false)}
                className="px-3.5 py-1.5 border border-neutral-200 text-neutral-500 hover:bg-neutral-50 font-semibold font-mono uppercase text-[9px] tracking-wider rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateJobStagesMutation.isPending}
                onClick={() => updateJobStagesMutation.mutate(customStagesList)}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-neutral-white font-semibold font-mono uppercase text-[9px] tracking-wider rounded-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                {updateJobStagesMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
