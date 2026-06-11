"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import ReviewWorkspace from "./ReviewWorkspace";
import { JobOpening, JobOpeningSkill, JobCandidate, Candidate } from "../types";
import { 
  Table, Briefcase, FileSignature, Sparkles, CheckSquare, 
  Play, Check, Edit3, ArrowLeft, RefreshCcw, Save, Trash2, 
  Sliders, UserCheck, AlertTriangle, Layers, UserCircle, ChevronRight, Plus, CheckCircle2, FileText
} from "lucide-react";

// Custom ScatterPlot Component
const ScatterPlot = ({ data }: { data: any[] }) => {
  const width = 500;
  const height = 300;
  const margin = { top: 30, right: 35, bottom: 45, left: 50 };
  
  const yMax = Math.max(10, ...data.map(d => d.experience_years || 0)) + 2;
  
  const xScale = (score: number) => margin.left + (score / 100) * (width - margin.left - margin.right);
  const yScale = (exp: number) => height - margin.bottom - ((exp / yMax) * (height - margin.top - margin.bottom));
  
  const [hoveredCandidate, setHoveredCandidate] = React.useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  // Grid tick markers
  const xTicks = [20, 40, 60, 80, 100];
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((yMax / 5) * i));

  return (
    <div className="relative bg-neutral-900 border border-neutral-850 p-4 rounded-sm">
      <h4 className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-2 text-center">
        Experience vs. Match Score Plot
      </h4>
      <div className="flex justify-center">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-xl text-neutral-400">
          {/* Grid Lines */}
          {xTicks.map(tick => (
            <line
              key={`x-${tick}`}
              x1={xScale(tick)}
              y1={margin.top}
              x2={xScale(tick)}
              y2={height - margin.bottom}
              stroke="#262626"
              strokeDasharray="2,2"
            />
          ))}
          {yTicks.map(tick => (
            <line
              key={`y-${tick}`}
              x1={margin.left}
              y1={yScale(tick)}
              x2={width - margin.right}
              y2={yScale(tick)}
              stroke="#262626"
              strokeDasharray="2,2"
            />
          ))}

          {/* Axes lines */}
          <line
            x1={margin.left}
            y1={height - margin.bottom}
            x2={width - margin.right}
            y2={height - margin.bottom}
            stroke="#404040"
            strokeWidth="1"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={height - margin.bottom}
            stroke="#404040"
            strokeWidth="1"
          />

          {/* Tick Labels */}
          {xTicks.map(tick => (
            <text
              key={`xl-${tick}`}
              x={xScale(tick)}
              y={height - margin.bottom + 16}
              textAnchor="middle"
              className="text-[9px] font-mono fill-neutral-500"
            >
              {tick}%
            </text>
          ))}
          {yTicks.map(tick => (
            <text
              key={`yl-${tick}`}
              x={margin.left - 8}
              y={yScale(tick) + 3}
              textAnchor="end"
              className="text-[9px] font-mono fill-neutral-500"
            >
              {tick}y
            </text>
          ))}

          {/* Axis Titles */}
          <text
            x={margin.left + (width - margin.left - margin.right) / 2}
            y={height - 8}
            textAnchor="middle"
            className="text-[10px] font-mono font-semibold fill-neutral-400"
          >
            Fuzzy Match Score (%)
          </text>
          <text
            transform={`rotate(-90, 15, ${margin.top + (height - margin.top - margin.bottom) / 2})`}
            x={15}
            y={margin.top + (height - margin.top - margin.bottom) / 2}
            textAnchor="middle"
            className="text-[10px] font-mono font-semibold fill-neutral-400"
          >
            Experience (Years)
          </text>

          {/* Points */}
          {data.map((d, index) => {
            const cx = xScale(d.fuzzy_score || 0);
            const cy = yScale(d.experience_years || 0);
            const isHovered = hoveredCandidate?.id === d.id;
            
            const colors = [
              "stroke-primary fill-primary/30",
              "stroke-success fill-success/30",
              "stroke-warning fill-warning/30",
              "stroke-info fill-info/30"
            ];
            const colorClass = colors[index % colors.length];

            return (
              <g
                key={d.id}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  setHoveredCandidate(d);
                  setTooltipPos({
                    x: cx + 10,
                    y: cy - 20
                  });
                }}
                onMouseLeave={() => setHoveredCandidate(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 9 : 6}
                  className={`transition-all duration-150 stroke-2 ${colorClass}`}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 14 : 0}
                  className="fill-transparent stroke-neutral-white/10 stroke-1 pointer-events-none"
                />
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  className="text-[8px] font-mono font-bold fill-neutral-white opacity-85 pointer-events-none"
                >
                  {d.candidate_name?.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* HTML Tooltip overlay */}
      {hoveredCandidate && (
        <div
          className="absolute z-10 p-3 bg-neutral-950/90 backdrop-blur-md border border-neutral-800 rounded-sm text-[10px] text-neutral-205 pointer-events-none shadow-xl max-w-[200px]"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <p className="font-bold text-neutral-white mb-1">{hoveredCandidate.candidate_name}</p>
          <div className="space-y-0.5 font-mono text-[9px] text-neutral-350">
            <p><span className="text-neutral-500">Score:</span> <span className="text-success font-bold">{hoveredCandidate.fuzzy_score}%</span></p>
            <p><span className="text-neutral-500">Exp:</span> <span className="text-neutral-300 font-bold">{hoveredCandidate.experience_years} Years</span></p>
            <p><span className="text-neutral-500">Stage:</span> <span className="text-neutral-400 capitalize">{hoveredCandidate.stage || "screening"}</span></p>
          </div>
          {hoveredCandidate.skills && (
            <div className="flex flex-wrap gap-0.5 mt-2">
              {hoveredCandidate.skills.slice(0, 3).map((s: string, i: number) => (
                <span key={i} className="bg-neutral-800 px-1 py-0.2 rounded-xs text-[8px] border border-neutral-700 text-neutral-400">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const renderFormattedText = (text: string) => {
  return text.split("\n\n").map((para, i) => {
    if (para.startsWith("### ")) {
      return <h3 key={i} className="text-neutral-850 font-bold text-xs uppercase tracking-wider mb-2">{para.replace("### ", "")}</h3>;
    }
    if (para.startsWith("#### ")) {
      return <h4 key={i} className="text-neutral-800 font-bold text-xs uppercase tracking-wider mb-1 mt-3">{para.replace("#### ", "")}</h4>;
    }
    if (para.startsWith("- ")) {
      return (
        <ul key={i} className="list-disc pl-4 space-y-1.5 mb-2">
          {para.split("\n").map((line, j) => (
            <li key={j} className="text-neutral-600 text-xs">
              {line.replace("- ", "")}
            </li>
          ))}
        </ul>
      );
    }
    if (para.includes("\n- ")) {
      return (
        <div key={i} className="mb-2">
          {para.split("\n").map((line, j) => {
            if (line.startsWith("- ")) {
              return <p key={j} className="text-neutral-600 text-xs pl-4 list-item list-disc ml-2 mb-1">{line.replace("- ", "")}</p>;
            }
            return <p key={j} className="text-neutral-700 text-xs leading-relaxed mb-1">{line}</p>;
          })}
        </div>
      );
    }
    return <p key={i} className="text-neutral-700 text-xs leading-relaxed mb-2">{para}</p>;
  });
};

const generateAIComparisonText = (data: any[]) => {
  if (data.length < 2) return "";

  const sortedByScore = [...data].sort((a, b) => (b.fuzzy_score || 0) - (a.fuzzy_score || 0));
  const sortedByExp = [...data].sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));

  const bestScore = sortedByScore[0];
  const bestExp = sortedByExp[0];
  const samePerson = bestScore.id === bestExp.id;

  let analysis = `### Executive Comparison Summary\n\n`;

  if (samePerson) {
    analysis += `**${bestScore.candidate_name}** represents the premier candidate in the selection set, leading in direct score match (**${bestScore.fuzzy_score}%**) and domain tenure (**${bestScore.experience_years} years**).\n\n`;
  } else {
    analysis += `Strategic trade-off identified between score match alignment and tenure:\n`;
    analysis += `- **Alignment Leader**: **${bestScore.candidate_name}** exhibits the highest relevance match at **${bestScore.fuzzy_score}%**.\n`;
    analysis += `- **Tenure Leader**: **${bestExp.candidate_name}** offers the longest experience at **${bestExp.experience_years} years**.\n\n`;
  }

  analysis += `#### Candidate Takeaways:\n`;
  data.forEach(c => {
    analysis += `- **${c.candidate_name}** (${c.fuzzy_score}% Match | ${c.experience_years}y Exp): `;
    if (c.fuzzy_score >= 80) {
      analysis += `Highly suited for direct onboarding. Strengths in **${c.strengths?.slice(0, 2).join(", ") || "core domain"}**. `;
    } else {
      analysis += `Requires mentoring ramp-up. Core gaps in **${c.skill_gaps?.slice(0, 2).join(", ") || "specialized skills"}**. `;
    }
    if (c.achievements) {
      analysis += `Achievement note: ${c.achievements.substring(0, 60)}...`;
    }
    analysis += `\n`;
  });

  return analysis;
};

const sideBySideColumns = [
  { label: "Match Score", render: (c: any) => <span className="font-bold text-success">{c.fuzzy_score}%</span> },
  { label: "Experience", render: (c: any) => <span className="font-mono">{c.experience_years} Years</span> },
  { label: "Employment", render: (c: any) => c.working_or_not === false ? "Open to Work" : "Currently Employed" },
  { label: "Education", render: (c: any) => c.education || "Not specified" },
  { label: "Academic Details", render: (c: any) => <span className="whitespace-pre-line text-neutral-600 leading-normal text-[10px]">{c.academic_details || "Not listed"}</span> },
  { label: "Achievements", render: (c: any) => <span className="whitespace-pre-line text-neutral-600 leading-normal text-[10px]">{c.achievements || "Not listed"}</span> },
  { label: "Core Skills", render: (c: any) => (
      <div className="flex flex-wrap gap-1">
        {c.skills?.map((s: string, idx: number) => (
          <span key={idx} className="bg-neutral-100 px-1 py-0.2 text-[9px] border border-neutral-200 text-neutral-600 rounded-xs">
            {s}
          </span>
        ))}
      </div>
    )
  },
  { label: "Strengths", render: (c: any) => (
      <div className="flex flex-wrap gap-1">
        {c.strengths?.map((s: string, idx: number) => (
          <span key={idx} className="bg-success/10 px-1 py-0.2 text-[9px] border border-success/20 text-success rounded-xs font-mono">
            {s}
          </span>
        ))}
      </div>
    )
  },
  { label: "Skill Gaps", render: (c: any) => (
      <div className="flex flex-wrap gap-1">
        {c.skill_gaps && c.skill_gaps.length > 0 ? (
          c.skill_gaps.map((g: string, idx: number) => (
            <span key={idx} className="bg-error/10 px-1 py-0.2 text-[9px] border border-error/20 text-error rounded-xs font-mono">
              {g}
            </span>
          ))
        ) : (
          <span className="text-success font-semibold text-[9px]">Perfect Alignment</span>
        )}
      </div>
    )
  }
];

interface JobsViewProps {
  initialJobId?: string | null;
  onNavigateToReview: (applicationId: string) => void;
}

const EMPTY_JOBS: JobOpening[] = [];
const EMPTY_SKILLS: JobOpeningSkill[] = [];
const EMPTY_CANDIDATES: JobCandidate[] = [];

export default function JobsView({ initialJobId, onNavigateToReview }: JobsViewProps) {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId || null);
  const [activeTab, setActiveTab] = useState<"jd" | "skills" | "candidates">("jd");

  // State for AI JD Regeneration instruction
  const [regenInstruction, setRegenInstruction] = useState("");
  const [isRegenOpen, setIsRegenOpen] = useState(false);

  // Manual Candidate Form states
  const [isAddCandOpen, setIsAddCandOpen] = useState(false);
  const [selectedCandId, setSelectedCandId] = useState("");

  // Review Workspace inline state
  const [reviewApplicationId, setReviewApplicationId] = useState<string | null>(null);

  // Comparison visualizer state
  const [selectedCandidatesForCompare, setSelectedCandidatesForCompare] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Editor states
  const [jdTitle, setJdTitle] = useState("");
  const [jdDesc, setJdDesc] = useState("");
  const [jdSalary, setJdSalary] = useState("");
  const [jdResp, setJdResp] = useState<string[]>([]);
  const [jdQual, setJdQual] = useState<string[]>([]);
  const [newRespItem, setNewRespItem] = useState("");
  const [newQualItem, setNewQualItem] = useState("");

  // Queries
  const { data: jobs = EMPTY_JOBS, isLoading: loadingJobs } = useQuery<JobOpening[]>({
    queryKey: ["jobs"],
    queryFn: () => apiRequest<JobOpening[]>("GET", "/jobs"),
    refetchInterval: 3000
  });

  const activeJob = jobs.find(j => j.id === selectedJobId);

  const { data: skills = EMPTY_SKILLS, isLoading: loadingSkills } = useQuery<JobOpeningSkill[]>({
    queryKey: ["skills", selectedJobId],
    queryFn: () => apiRequest<JobOpeningSkill[]>("GET", `/jobs/${selectedJobId}/skills`),
    enabled: !!selectedJobId
  });

  const { data: matchedCandidates = EMPTY_CANDIDATES, isLoading: loadingCandidates } = useQuery<JobCandidate[]>({
    queryKey: ["job_candidates", selectedJobId],
    queryFn: () => apiRequest<JobCandidate[]>("GET", `/jobs/${selectedJobId}/candidates`),
    enabled: !!selectedJobId && activeJob?.processing_status === "ready"
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["candidates"],
    queryFn: () => apiRequest<Candidate[]>("GET", "/candidates"),
    enabled: activeTab === "candidates" && !!selectedJobId
  });

  // Local skills weights state for drag-and-drop / adjustment
  const [localSkills, setLocalSkills] = useState<JobOpeningSkill[]>([]);

  useEffect(() => {
    if (skills) {
      setLocalSkills(skills);
    }
  }, [skills]);

  useEffect(() => {
    setSelectedCandidatesForCompare([]);
  }, [selectedJobId, activeTab]);

  // Sync editor fields when active job shifts
  useEffect(() => {
    if (activeJob) {
      setJdTitle(activeJob.title || "");
      setJdDesc(activeJob.description || "");
      setJdSalary(activeJob.salary_range || "");
      setJdResp(activeJob.responsibilities || []);
      setJdQual(activeJob.qualifications || []);
    }
  }, [activeJob]);

  // Mutations
  const updateJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest<JobOpening>("PATCH", `/jobs/${selectedJobId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      alert("Job details saved successfully.");
    }
  });

  const confirmJobMutation = useMutation({
    mutationFn: () => apiRequest<JobOpening>("POST", `/jobs/${selectedJobId}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      scanPublishMutation.mutate();
    }
  });

  const scanPublishMutation = useMutation({
    mutationFn: () => apiRequest<JobOpening>("POST", `/jobs/${selectedJobId}/scan-and-publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["skills", selectedJobId] });
      setActiveTab("skills");
    }
  });

  const saveSkillsMutation = useMutation({
    mutationFn: (updatedSkills: JobOpeningSkill[]) => 
      apiRequest<{ success: boolean }>("PUT", `/jobs/${selectedJobId}/skills`, { skills: updatedSkills }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["skills", selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ["job_candidates", selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setActiveTab("candidates");
    }
  });

  const regenerateMutation = useMutation({
    mutationFn: (instruction: string) => 
      apiRequest<JobOpening>("POST", `/jobs/${selectedJobId}/regenerate`, { instruction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setIsRegenOpen(false);
      setRegenInstruction("");
    }
  });

  const linkCandidateMutation = useMutation({
    mutationFn: (candId: string) => 
      apiRequest<{ success: boolean }>("POST", `/jobs/${selectedJobId}/candidates/${candId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_candidates", selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setIsAddCandOpen(false);
      setSelectedCandId("");
      alert("Candidate linked and ranked successfully.");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to link candidate.");
    }
  });

  const handleSaveJd = (e: React.FormEvent) => {
    e.preventDefault();
    updateJobMutation.mutate({
      title: jdTitle,
      description: jdDesc,
      salary_range: jdSalary,
      responsibilities: jdResp,
      qualifications: jdQual
    });
  };

  const handleSkillWeightChange = (id: string, weight: number) => {
    setLocalSkills(prev => prev.map(s => s.id === id ? { ...s, weight: Math.max(0, Math.min(1, weight)) } : s));
  };

  const handleAddSkill = () => {
    const name = prompt("Enter custom skill name:");
    if (!name || !selectedJobId) return;
    const newSkill: JobOpeningSkill = {
      id: `sk-custom-${Date.now()}`,
      job_opening_id: selectedJobId,
      skill_name: name,
      weight: 0.15,
      skill_order: localSkills.length + 1,
      approved: false,
      created_at: new Date().toISOString()
    };
    setLocalSkills(prev => [...prev, newSkill]);
  };

  const handleRemoveSkill = (id: string) => {
    setLocalSkills(prev => prev.filter(s => s.id !== id));
  };

  if (!selectedJobId) {
    // 1. Notion Style High-Density Table View
    return (
      <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden shadow-sm font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div>
            <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Notion Job Openings Catalog</h3>
            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Full corporate hiring postings index</p>
          </div>
        </div>

        {loadingJobs ? (
          <div className="text-center py-12 text-xs text-neutral-400 font-mono">Loading job database...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-xs text-neutral-400">No job openings created. Go to Clients to generate drafts.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-400 font-mono uppercase text-[9px] tracking-wider">
                  <th className="p-4 font-semibold">Client</th>
                  <th className="p-4 font-semibold">Job Title</th>
                  <th className="p-4 font-semibold">Post Index</th>
                  <th className="p-4 font-semibold">Publish State</th>
                  <th className="p-4 font-semibold">AI Process Queue</th>
                  <th className="p-4 font-semibold">Top Score</th>
                  <th className="p-4 font-semibold">Created At</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-neutral-50/55 transition-colors group">
                    <td className="p-4 font-mono font-medium text-neutral-500 uppercase">
                      <div>{j.client_name || "Generic Client"}</div>
                      <div className="text-[9px] text-neutral-400 lowercase font-normal">Req ID: {j.requirement_id ? j.requirement_id.substring(0, 8) + '...' : '-'}</div>
                    </td>
                    <td className="p-4 font-semibold text-neutral-800">
                      <button 
                        onClick={() => { setSelectedJobId(j.id); setActiveTab("jd"); }}
                        className="hover:text-primary transition-colors cursor-pointer text-left font-tight"
                      >
                        {j.title}
                      </button>
                    </td>
                    <td className="p-4 font-mono text-neutral-400">#{j.post_index}</td>
                    <td className="p-4">
                      <span className={`text-[9px] px-2 py-0.5 rounded-sm border font-semibold uppercase font-mono ${
                        j.status === "published" ? "bg-success/10 border-success/20 text-success" :
                        j.status === "confirmed" ? "bg-info/10 border-info/20 text-info" :
                        "bg-neutral-100 border-neutral-250 text-neutral-400"
                      }`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase font-semibold ${
                        j.processing_status === "ready" ? "text-success" :
                        j.processing_status === "error" ? "text-error" :
                        "text-primary animate-pulse"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          j.processing_status === "ready" ? "bg-success" :
                          j.processing_status === "error" ? "bg-error" :
                          "bg-primary animate-ping"
                        }`}></span>
                        {j.processing_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-neutral-700">
                      {j.top_score && j.top_score > 0 ? `${j.top_score}%` : "-"}
                    </td>
                    <td className="p-4 text-neutral-400 font-mono">
                      {new Date(j.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => { setSelectedJobId(j.id); setActiveTab("jd"); }}
                        className="text-[10px] text-neutral-400 hover:text-primary font-semibold uppercase tracking-wider font-mono flex items-center gap-0.5 ml-auto cursor-pointer"
                      >
                        Open
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Filter candidates that are not already matched to this job opening
  const eligibleCandidates = candidates.filter(
    c => !matchedCandidates.some(jc => jc.candidate_id === c.id)
  );

  // 2. Active Job Workspace View
  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedJobId(null)}
            className="p-1.5 hover:bg-neutral-200 border border-neutral-200 rounded-sm text-neutral-500 cursor-pointer"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-500 uppercase rounded-sm">
                {activeJob?.client_name}
              </span>
              <h2 className="text-lg font-tight font-bold text-neutral-850">{activeJob?.title}</h2>
            </div>
            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Job Opening ID: {activeJob?.id} • Requirement ID: {activeJob?.requirement_id}</p>
          </div>
        </div>

        {/* Action states panel */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {activeJob?.status === "draft" && (
            <button
              id="confirm-job-btn"
              onClick={() => confirmJobMutation.mutate()}
              className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm cursor-pointer flex items-center gap-1.5 text-neutral-600 font-semibold"
            >
              <FileSignature className="w-3.5 h-3.5 text-neutral-500" />
              Confirm JD Draft
            </button>
          )}

          {activeJob?.status === "confirmed" && (
            <button
              id="scan-publish-job-btn"
              onClick={() => scanPublishMutation.mutate()}
              className="px-3 py-1.5 bg-primary text-neutral-white hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wider font-semibold text-[10px]"
            >
              <Play className="w-3.5 h-3.5" />
              Scan & Publish JD
            </button>
          )}

          <button
            onClick={() => setIsRegenOpen(true)}
            className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-500 rounded-sm cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            AI Edit JD
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("jd")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeTab === "jd" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Job Description Editor
        </button>
        <button
          disabled={!skills || skills.length === 0}
          onClick={() => setActiveTab("skills")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all disabled:opacity-40 ${
            activeTab === "skills" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Skills Weights Approval
        </button>
        <button
          disabled={activeJob?.processing_status !== "ready"}
          onClick={() => setActiveTab("candidates")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 cursor-pointer transition-all disabled:opacity-40 ${
            activeTab === "candidates" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Matched Candidate Rankings
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "jd" && (
        <form onSubmit={handleSaveJd} className="bg-neutral-white border border-neutral-200 rounded-sm p-6 space-y-4 shadow-sm font-sans text-xs">
          <div className="space-y-1">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Job Title</label>
            <input
              type="text"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 text-sm font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Salary Range</label>
            <input
              type="text"
              value={jdSalary}
              onChange={(e) => setJdSalary(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Role Description</label>
            <textarea
              rows={4}
              value={jdDesc}
              onChange={(e) => setJdDesc(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 leading-relaxed"
            />
          </div>

          {/* Responsibilities list manager */}
          <div className="space-y-2">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Responsibilities</label>
            <div className="space-y-1.5">
              {jdResp.map((resp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={resp}
                    onChange={(e) => {
                      const updated = [...jdResp];
                      updated[idx] = e.target.value;
                      setJdResp(updated);
                    }}
                    className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                  <button
                    type="button"
                    onClick={() => setJdResp(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 text-neutral-400 hover:text-error border border-neutral-200 rounded-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add responsibility bullet..."
                  value={newRespItem}
                  onChange={(e) => setNewRespItem(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newRespItem.trim()) return;
                    setJdResp(prev => [...prev, newRespItem]);
                    setNewRespItem("");
                  }}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-sm cursor-pointer border border-neutral-200 font-semibold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Qualifications list manager */}
          <div className="space-y-2">
            <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Qualifications</label>
            <div className="space-y-1.5">
              {jdQual.map((qual, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={qual}
                    onChange={(e) => {
                      const updated = [...jdQual];
                      updated[idx] = e.target.value;
                      setJdQual(updated);
                    }}
                    className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                  <button
                    type="button"
                    onClick={() => setJdQual(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 text-neutral-400 hover:text-error border border-neutral-200 rounded-sm cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add qualification bullet..."
                  value={newQualItem}
                  onChange={(e) => setNewQualItem(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newQualItem.trim()) return;
                    setJdQual(prev => [...prev, newQualItem]);
                    setNewQualItem("");
                  }}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-sm cursor-pointer border border-neutral-200 font-semibold"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={updateJobMutation.isPending}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-neutral-white font-medium rounded-sm cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      )}

      {activeTab === "skills" && (
        <div className="bg-neutral-white border border-neutral-200 rounded-sm p-6 space-y-4 shadow-sm text-xs font-sans">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-tight font-bold text-sm text-neutral-850 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" />
                Skills Weights Tuning
              </h3>
              <button
                onClick={handleAddSkill}
                className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-600 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Skill Parameter
              </button>
            </div>
            <p className="text-neutral-400 text-xs">Define matching weight priorities. Combined weights must scale to compute index scores.</p>
          </div>

          <div className="space-y-3 pt-3">
            {localSkills.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-4 bg-neutral-50 p-3 border border-neutral-200 rounded-sm">
                <div className="w-6 font-mono text-neutral-400 text-center font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1 font-semibold text-neutral-800">
                  {s.skill_name}
                </div>
                
                {/* Weight slider */}
                <div className="flex items-center gap-2.5 max-w-sm w-full font-mono">
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={s.weight}
                    onChange={(e) => handleSkillWeightChange(s.id, Number(e.target.value))}
                    className="flex-1 accent-primary h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-12 text-right font-bold text-neutral-700">
                    {(s.weight * 100).toFixed(0)}%
                  </span>
                </div>

                <button
                  onClick={() => handleRemoveSkill(s.id)}
                  className="p-1 text-neutral-400 hover:text-error rounded-sm border border-neutral-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100 mt-6">
            <button
              id="approve-rank-candidates-btn"
              onClick={() => saveSkillsMutation.mutate(localSkills)}
              disabled={saveSkillsMutation.isPending}
              className="px-4 py-2 bg-success hover:bg-success/95 text-neutral-white font-medium rounded-sm cursor-pointer flex items-center gap-1.5 uppercase tracking-wider font-semibold text-[10px]"
            >
              {saveSkillsMutation.isPending ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
              Approve and Rank Candidates
            </button>
          </div>
        </div>
      )}

      {activeTab === "candidates" && (
        reviewApplicationId ? (
          <ReviewWorkspace 
            applicationId={reviewApplicationId} 
            onBack={() => setReviewApplicationId(null)} 
          />
        ) : (
          <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden shadow-sm text-xs font-sans">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Matched Candidate Index</h3>
                {selectedCandidatesForCompare.length > 0 && (
                  <p className="text-[9px] text-neutral-400 font-mono mt-0.5">
                    {selectedCandidatesForCompare.length} candidates selected for comparison
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={selectedCandidatesForCompare.length < 2}
                  onClick={() => setIsCompareOpen(true)}
                  className={`px-2.5 py-1.5 rounded-sm font-semibold flex items-center gap-1.5 cursor-pointer text-[10px] uppercase transition-all duration-150 ${
                    selectedCandidatesForCompare.length >= 2
                      ? "bg-primary text-neutral-white hover:bg-primary/95"
                      : "bg-neutral-100 border border-neutral-200 text-neutral-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Compare Candidates ({selectedCandidatesForCompare.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCandOpen(true)}
                  className="px-2.5 py-1.5 border border-neutral-200 bg-neutral-white hover:bg-neutral-100 rounded-sm text-neutral-600 font-semibold flex items-center gap-1 cursor-pointer font-sans text-[10px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Candidate
                </button>
                <span className="text-[10px] text-success font-semibold flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  FUZZY ALIGNED DATA
                </span>
              </div>
            </div>

            {loadingCandidates ? (
              <div className="text-center py-12 text-xs text-neutral-400 font-mono">Scanning index and compiling ranks...</div>
            ) : matchedCandidates.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-400">No candidates matched. Go to Skills weights to trigger matching scan.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-400 font-mono uppercase text-[9px] tracking-wider">
                      <th className="p-4 font-semibold w-10">
                        <input
                          type="checkbox"
                          checked={matchedCandidates.length > 0 && selectedCandidatesForCompare.length === matchedCandidates.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidatesForCompare(matchedCandidates.map(jc => jc.id));
                            } else {
                              setSelectedCandidatesForCompare([]);
                            }
                          }}
                          className="rounded-xs accent-primary cursor-pointer w-3.5 h-3.5"
                        />
                      </th>
                      <th className="p-4 font-semibold">Rank</th>
                      <th className="p-4 font-semibold">Candidate Name</th>
                      <th className="p-4 font-semibold">Experience</th>
                      <th className="p-4 font-semibold">Accuracy Score</th>
                      <th className="p-4 font-semibold">Key Strengths</th>
                      <th className="p-4 font-semibold">Skill Gaps</th>
                      <th className="p-4 font-semibold">Current Pipeline Stage</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150">
                    {matchedCandidates.map((jc) => (
                      <tr key={jc.id} className={`hover:bg-neutral-50/50 transition-colors ${selectedCandidatesForCompare.includes(jc.id) ? "bg-primary/5 hover:bg-primary/5" : ""}`}>
                        <td className="p-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedCandidatesForCompare.includes(jc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCandidatesForCompare(prev => [...prev, jc.id]);
                              } else {
                                setSelectedCandidatesForCompare(prev => prev.filter(id => id !== jc.id));
                              }
                            }}
                            className="rounded-xs accent-primary cursor-pointer w-3.5 h-3.5"
                          />
                        </td>
                        <td className="p-4 font-mono font-bold text-neutral-400">#{jc.rank_order}</td>
                        <td className="p-4 font-semibold text-neutral-800">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {jc.application_id ? (
                              <button
                                onClick={() => setReviewApplicationId(jc.application_id!)}
                                className="hover:text-primary transition-colors cursor-pointer flex items-center gap-2 text-left font-semibold"
                              >
                                <UserCircle className="w-5 h-5 text-neutral-400" />
                                {jc.candidate_name}
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 font-semibold">
                                <UserCircle className="w-5 h-5 text-neutral-400" />
                                {jc.candidate_name}
                              </div>
                            )}
                            {(() => {
                              const c = candidates.find(item => item.id === jc.candidate_id);
                              return c?.resume_url ? (
                                <a
                                  href={c.resume_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`PDF Resume: ${c.resume_url}`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-sm text-red-700 transition-colors text-[9px] font-mono font-semibold"
                                >
                                  <FileText className="w-3 h-3 text-red-500" />
                                  PDF
                                </a>
                              ) : null;
                            })()}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-neutral-500">{jc.experience_years} Years</td>
                        <td className="p-4 font-mono font-bold text-sm">
                          {jc.application_id ? (
                            <button
                              onClick={() => setReviewApplicationId(jc.application_id!)}
                              className={`hover:underline font-bold cursor-pointer px-2 py-0.5 rounded-sm text-[11px] ${
                                jc.fuzzy_score >= 80 ? "bg-success/10 text-success border border-success/20" :
                                jc.fuzzy_score >= 50 ? "bg-warning/10 text-warning border border-warning/20" :
                                "bg-error/10 text-error border border-error/20"
                              }`}
                            >
                              {jc.fuzzy_score}%
                            </button>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-sm text-[11px] ${
                              jc.fuzzy_score >= 80 ? "bg-success/10 text-success border border-success/20" :
                              jc.fuzzy_score >= 50 ? "bg-warning/10 text-warning border border-warning/20" :
                              "bg-error/10 text-error border border-error/20"
                            }`}>
                              {jc.fuzzy_score}%
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {jc.strengths && jc.strengths.length > 0 ? (
                              jc.strengths.slice(0, 3).map((str, i) => (
                                <span key={i} className="text-[8px] font-mono px-1 py-0.2 bg-success/15 text-success rounded-sm border border-success/20">
                                  {str}
                                </span>
                              ))
                            ) : (
                              <span className="text-[8px] font-mono text-neutral-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {jc.skill_gaps && jc.skill_gaps.length > 0 ? (
                              jc.skill_gaps.slice(0, 3).map((gap, i) => (
                                <span key={i} className="text-[8px] font-mono px-1 py-0.2 bg-error/15 text-error rounded-sm border border-error/20">
                                  {gap}
                                </span>
                              ))
                            ) : (
                              <span className="text-[8px] font-mono text-success italic font-bold">Perfect Align</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 uppercase font-mono text-[9px]">
                          <span className={`px-1.5 py-0.5 rounded-sm border ${
                            jc.stage === "rejected" ? "bg-error/10 border-error/20 text-error" :
                            jc.stage === "hired" ? "bg-success/10 border-success/20 text-success" :
                            "bg-neutral-150 border-neutral-250 text-neutral-500"
                          }`}>
                            {jc.stage || "screening"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {jc.application_id && (
                            <button
                              onClick={() => setReviewApplicationId(jc.application_id!)}
                              className="text-[10px] text-primary hover:underline font-semibold uppercase font-mono cursor-pointer flex items-center gap-0.5 ml-auto"
                            >
                              Review Workspace
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}

      {/* AI Edit JD Dialog */}
      {isRegenOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                AI Edit JD Prompter
              </h3>
              <p className="text-neutral-400 text-xs">Enter refinement command. LLM agent will rebuild responsibilities and summary.</p>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!regenInstruction.trim()) return;
                regenerateMutation.mutate(regenInstruction);
              }}
              className="space-y-4 text-xs font-sans"
            >
              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Refinement Command</label>
                <input
                  type="text"
                  placeholder="e.g. Add 3 years of Kubernetes experience"
                  required
                  value={regenInstruction}
                  onChange={(e) => setRegenInstruction(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 placeholder:text-neutral-400 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegenOpen(false)}
                  className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regenerateMutation.isPending}
                  className="px-4 py-1.5 bg-primary text-neutral-white font-medium hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1.5"
                >
                  {regenerateMutation.isPending ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Regenerate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Candidate Dialog */}
      {isAddCandOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <UserCheck className="w-4 h-4 text-primary" />
                Link Candidate from Pool
              </h3>
              <p className="text-neutral-400 text-xs">Link an existing candidate from the sourcing pool to this job opening. AI will calculate a match score based on approved skills.</p>
            </div>
            
            {eligibleCandidates.length === 0 ? (
              <div className="space-y-4">
                <p className="text-neutral-500 text-xs italic">No eligible candidates available to link. All candidates are already matched or pipeline is empty.</p>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCandOpen(false)}
                    className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer text-xs uppercase font-mono font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedCandId) return;
                  linkCandidateMutation.mutate(selectedCandId);
                }}
                className="space-y-4 text-xs font-sans"
              >
                <div className="space-y-1.5">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Select Candidate</label>
                  <select
                    value={selectedCandId}
                    onChange={(e) => setSelectedCandId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-850 focus:outline-none"
                  >
                    <option value="">-- Choose Candidate --</option>
                    {eligibleCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.experience_years} Yrs Exp - {c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddCandOpen(false);
                      setSelectedCandId("");
                    }}
                    className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={linkCandidateMutation.isPending || !selectedCandId}
                    className="px-4 py-1.5 bg-primary text-neutral-white font-medium hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1.5"
                  >
                    {linkCandidateMutation.isPending ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : null}
                    Link Candidate
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Candidate Comparison Modal */}
      {isCompareOpen && (
        <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-5xl p-6 space-y-6 shadow-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div>
                <h3 className="font-tight font-bold text-sm text-neutral-850 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  Candidate Comparison Visualizer
                </h3>
                <p className="text-neutral-450 text-[10px] mt-0.5 font-mono">
                  Side-by-side competency comparison and experiential mapping for {activeJob?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="px-2.5 py-1 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 font-mono text-[10px] font-semibold cursor-pointer"
              >
                Close Visualizer
              </button>
            </div>

            {/* Layout Grid: Scatter plot + AI summary */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Custom SVG Scatter Plot (7 cols) */}
              <div className="md:col-span-7">
                {(() => {
                  const comparisonData = selectedCandidatesForCompare.map(id => {
                    const jc = matchedCandidates.find(item => item.id === id);
                    const c = candidates.find(item => item.id === jc?.candidate_id);
                    return {
                      ...jc,
                      academic_details: c?.academic_details,
                      achievements: c?.achievements,
                      education: c?.education,
                      working_or_not: c?.working_or_not
                    };
                  });
                  return <ScatterPlot data={comparisonData} />;
                })()}
              </div>

              {/* Right Column: AI Comparative Summary (5 cols) */}
              <div className="md:col-span-5 bg-neutral-50 border border-neutral-200 p-4 rounded-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="font-tight font-bold text-[10px] uppercase tracking-wider text-neutral-800">AI Comparative Insights</span>
                  </div>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {(() => {
                      const comparisonData = selectedCandidatesForCompare.map(id => {
                        const jc = matchedCandidates.find(item => item.id === id);
                        const c = candidates.find(item => item.id === jc?.candidate_id);
                        return {
                          ...jc,
                          academic_details: c?.academic_details,
                          achievements: c?.achievements,
                          education: c?.education,
                          working_or_not: c?.working_or_not
                        };
                      });
                      return renderFormattedText(generateAIComparisonText(comparisonData));
                    })()}
                  </div>
                </div>
                <div className="text-[9px] font-mono text-neutral-400 border-t border-neutral-200/50 pt-2 mt-4">
                  Note: Evaluation values are derived using semantic match parameters.
                </div>
              </div>
            </div>

            {/* Side-by-Side Table Comparison */}
            <div className="border border-neutral-200 rounded-sm overflow-hidden bg-neutral-white shadow-xs">
              <div className="p-3 border-b border-neutral-200 bg-neutral-50 flex items-center gap-2">
                <span className="font-tight font-bold text-[10px] uppercase tracking-wider text-neutral-800">Detail Comparison Grid</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-400 font-mono uppercase text-[9px] tracking-wider">
                      <th className="p-3 font-semibold w-32 border-r border-neutral-200">Attribute</th>
                      {selectedCandidatesForCompare.map(id => {
                        const jc = matchedCandidates.find(item => item.id === id);
                        return (
                          <th key={id} className="p-3 font-semibold min-w-[160px] border-r border-neutral-200 last:border-r-0">
                            {jc?.candidate_name}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {sideBySideColumns.map((col, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/30">
                        <td className="p-3 font-semibold text-neutral-500 uppercase tracking-wider text-[9px] font-mono border-r border-neutral-200 bg-neutral-50/30">
                          {col.label}
                        </td>
                        {selectedCandidatesForCompare.map(id => {
                          const jc = matchedCandidates.find(item => item.id === id);
                          const c = candidates.find(item => item.id === jc?.candidate_id);
                          const fullCand = {
                            ...jc,
                            academic_details: c?.academic_details,
                            achievements: c?.achievements,
                            education: c?.education,
                            working_or_not: c?.working_or_not
                          };
                          return (
                            <td key={id} className="p-3 border-r border-neutral-200 last:border-r-0 text-neutral-750 font-sans text-xs">
                              {col.render(fullCand)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-white font-medium rounded-sm cursor-pointer text-xs uppercase font-mono font-semibold"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
