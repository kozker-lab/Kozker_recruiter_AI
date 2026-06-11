"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import ReviewWorkspace from "@/components/ReviewWorkspace";
import { 
  Loader2, Layers, Search, TrendingUp, UserCheck 
} from "lucide-react";

export default function RoundsPage() {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter based on search query (candidate name or job title)
  const filteredApps = applications.filter(app => {
    const candName = app.candidates?.full_name || "";
    const jobTitle = app.job_openings?.title || "";
    const clientName = app.job_openings?.clients?.name || "";
    const query = searchQuery.toLowerCase();
    return (
      candName.toLowerCase().includes(query) ||
      jobTitle.toLowerCase().includes(query) ||
      clientName.toLowerCase().includes(query)
    );
  });

  // Group applications by stage
  const columns = [
    { id: "screening", title: "Screening", color: "border-neutral-300 text-neutral-600 bg-neutral-100/40" },
    { id: "technical", title: "Technical Interview", color: "border-info/30 text-info bg-info/5" },
    { id: "hr", title: "HR Round", color: "border-warning/30 text-warning bg-warning/5" },
    { id: "final", title: "Final Round", color: "border-primary/30 text-primary bg-primary/5" },
    { id: "hired", title: "Hired", color: "border-success/30 text-success bg-success/5" },
    { id: "rejected", title: "Rejected", color: "border-error/30 text-error bg-error/5" },
  ];

  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-lg font-tight font-bold text-neutral-850 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Interview Rounds Monitoring Board
          </h2>
          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Centralized recruiter pipeline command console</p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-neutral-500 bg-neutral-100 px-3 py-1 border border-neutral-250 rounded-sm">
          <TrendingUp className="w-4 h-4 text-success" />
          <span>Active Pipelines: {applications.filter(a => a.stage !== 'hired' && a.stage !== 'rejected').length} candidates</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-neutral-450" />
        <input
          type="text"
          placeholder="Filter boards by candidate name, job title, or client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-neutral-200 bg-neutral-white rounded-sm text-xs focus:ring-1 focus:ring-primary text-neutral-800"
        />
      </div>

      {/* Kanban Board Layout */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-400 font-mono text-xs gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span>Syncing pipeline records...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
          {columns.map((col) => {
            const colApps = filteredApps.filter(app => app.stage === col.id);
            return (
              <div 
                key={col.id} 
                className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden shadow-sm shrink-0 min-h-[500px] flex flex-col"
              >
                {/* Column Header */}
                <div className={`p-3 border-b flex items-center justify-between text-xs font-semibold ${col.color}`}>
                  <span className="truncate">{col.title}</span>
                  <span className="font-mono bg-neutral-white/90 px-1.5 py-0.2 rounded-sm border border-neutral-250 font-bold text-[10px] text-neutral-600">
                    {colApps.length}
                  </span>
                </div>

                {/* Candidate list inside column */}
                <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[500px]">
                  {colApps.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-4 text-[10px] text-neutral-400 italic">
                      Empty stage
                    </div>
                  ) : (
                    colApps.map((app) => (
                      <div 
                        key={app.id} 
                        onClick={() => setSelectedAppId(app.id)}
                        className="bg-neutral-white border border-neutral-150 hover:border-primary/50 p-3 rounded-sm shadow-xs hover:shadow-sm transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-neutral-800 text-xs leading-tight hover:text-primary transition-colors truncate max-w-[100px]">
                            {app.candidates?.full_name || "Unknown"}
                          </p>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-sm border ${
                            app.fuzzy_score >= 80 ? "bg-success/15 border-success/20 text-success" :
                            app.fuzzy_score >= 50 ? "bg-warning/15 border-warning/20 text-warning" :
                            "bg-error/15 border-error/20 text-error"
                          }`}>
                            {app.fuzzy_score}%
                          </span>
                        </div>

                        <div className="space-y-1 font-mono text-[9px] text-neutral-450 leading-tight">
                          <p className="font-semibold text-neutral-650 truncate" title={app.job_openings?.title}>
                            {app.job_openings?.title}
                          </p>
                          <p className="uppercase text-[8px] text-neutral-400 truncate">
                            Client: {app.job_openings?.clients?.name || "Generic"}
                          </p>
                          <p className="text-neutral-400">
                            Exp: {app.candidates?.experience_years} Years
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-1.5 border-t border-neutral-100 text-[9px] font-mono uppercase">
                          <span className={`px-1 rounded-sm border text-[8px] font-semibold ${
                            app.stage_status === "passed" ? "bg-success/10 border-success/20 text-success" :
                            app.stage_status === "failed" ? "bg-error/10 border-error/20 text-error" :
                            app.stage_status === "in_progress" ? "bg-info/10 border-info/20 text-info" :
                            "bg-neutral-100 border-neutral-200 text-neutral-450"
                          }`}>
                            {app.stage_status.replace("_", " ")}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppId(app.id);
                            }}
                            className="text-primary font-bold hover:underline cursor-pointer"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
