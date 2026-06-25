"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, API_BASE_URL, apiUploadFile } from "../lib/api";
import { Candidate } from "../types";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { 
  Users, UserPlus, Upload, ShieldCheck, Search, Plus, 
  ChevronDown, ChevronUp, ChevronRight, Edit2, RefreshCcw, AlertCircle, Sparkles, Database, FileSpreadsheet,
  Filter, FileText, CheckCircle2, Mail, Layers, GraduationCap, Trophy, Trash2, Briefcase
} from "lucide-react";

function mergeDuplicateCandidates(list: Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const c of list) {
    if (!c.email || !c.full_name) continue;
    const key = `${c.full_name.toLowerCase().trim()}|${c.email.toLowerCase().trim()}|${c.job_id || "general"}`;
    if (!map.has(key)) {
      map.set(key, { ...c, skills: [...(c.skills || [])] });
    } else {
      const existing = map.get(key)!;
      if (!existing.phone && c.phone) {
        existing.phone = c.phone;
      }
      const mergedSkills: string[] = [];
      const seen = new Set<string>();
      for (const s of [...(existing.skills || []), ...(c.skills || [])]) {
        const lower = s.toLowerCase().trim();
        if (lower && !seen.has(lower)) {
          seen.add(lower);
          mergedSkills.push(s);
        }
      }
      existing.skills = mergedSkills;
      existing.experience_years = Math.max(existing.experience_years || 0, c.experience_years || 0);
      if (!existing.education && c.education) {
        existing.education = c.education;
      }
      if (!existing.academic_details && c.academic_details) {
        existing.academic_details = c.academic_details;
      }
      if (!existing.achievements && c.achievements) {
        existing.achievements = c.achievements;
      }
      if (!existing.resume_url && c.resume_url) {
        existing.resume_url = c.resume_url;
      }
      if (c.raw_text && existing.raw_text && !existing.raw_text.includes(c.raw_text)) {
        existing.raw_text = `${existing.raw_text}\n\n[Merged Profile Info]:\n${c.raw_text}`;
      } else if (c.raw_text && !existing.raw_text) {
        existing.raw_text = c.raw_text;
      }
      if (c.linked_jobs && existing.linked_jobs) {
        const jobIds = new Set(existing.linked_jobs.map(j => j.job_id));
        for (const job of c.linked_jobs) {
          if (!jobIds.has(job.job_id)) {
            existing.linked_jobs.push(job);
          }
        }
      } else if (c.linked_jobs) {
        existing.linked_jobs = [...c.linked_jobs];
      }
    }
  }
  return Array.from(map.values());
}

export function parseResumeTextHeuristically(text: string) {
  // 1. Clean up text
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  
  // 2. Extract Name
  let name = "";
  for (const line of lines.slice(0, 5)) {
    if (
      !line.includes("@") &&
      !line.match(/\+?\d/) &&
      !line.toLowerCase().includes("resume") &&
      !line.toLowerCase().includes("cv") &&
      line.length > 2 &&
      line.length < 35
    ) {
      name = line;
      break;
    }
  }

  // 3. Extract Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "";

  // 4. Extract Phone
  const phoneMatch = text.match(/(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : "";

  // 5. Extract Skills
  const commonSkills = [
    "React", "Next.js", "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind", 
    "Node.js", "Express", "Python", "FastAPI", "Django", "Rust", "Go", "Golang", 
    "Java", "C++", "SQL", "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "AWS", 
    "Git", "Redux", "GraphQL", "Webpack", "Vite"
  ];
  const foundSkills = commonSkills.filter(s => {
    const esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = (s.match(/^\w/) ? "\\b" : "") + esc + (s.match(/\w$/) ? "\\b" : "");
    const regex = new RegExp(pattern, "i");
    return regex.test(text);
  });
  const skillsString = foundSkills.join(", ");

  // 6. Extract Experience
  const expMatch = text.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i) || text.match(/experience:\s*(\d+)/i);
  const exp = expMatch ? parseInt(expMatch[1]) : 3;

  // 7. Extract Education
  let education = "";
  const eduKeywords = ["Bachelor", "Master", "PhD", "B.Tech", "M.Tech", "B.Sc", "M.Sc", "B.E", "M.E", "MBA", "B.A", "M.A"];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("education") || lower.includes("degree") || lower.includes("university") || lower.includes("college")) {
      for (const kw of eduKeywords) {
        if (new RegExp(`\\b${kw}\\b`, "i").test(line)) {
          education = line;
          break;
        }
      }
    }
    if (education) break;
  }
  if (!education) {
    const simpleEduMatch = text.match(/(bachelor|master|phd|b\.tech|m\.tech|b\.sc|m\.sc|b\.e|m\.e|mba)[^\n,.]{0,50}/i);
    education = simpleEduMatch ? simpleEduMatch[0] : "";
  }

  // 8. Extract Academic Details
  let academicDetails = "";
  const gpaMatch = text.match(/(?:gpa|cgpa|marks|percentage):\s*([a-zA-Z0-9./%]+)/i);
  const univMatch = text.match(/[A-Z][a-zA-Z0-9\s,.]{5,50} (?:University|Institute|IIT|College)/);
  if (education) academicDetails += `Degree/Major: ${education}\n`;
  if (univMatch) academicDetails += `Institution: ${univMatch[0]}\n`;
  if (gpaMatch) academicDetails += `Grade: ${gpaMatch[1]}`;

  // 9. Extract Achievements
  let achievements = "";
  const achievementLines: string[] = [];
  let recordingAchievements = false;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("achievement") || lower.includes("award") || lower.includes("honor") || lower.includes("certification")) {
      recordingAchievements = true;
      continue;
    }
    if (recordingAchievements) {
      if (line.match(/^[A-Z\s]{4,}/) || lower.includes("experience") || lower.includes("education") || lower.includes("skills")) {
        break;
      }
      achievementLines.push(line);
      if (achievementLines.length >= 4) break;
    }
  }
  if (achievementLines.length > 0) {
    achievements = achievementLines.join("\n");
  } else {
    const matchingLines = lines.filter(l => 
      l.toLowerCase().includes("won ") || 
      l.toLowerCase().includes("award") || 
      l.toLowerCase().includes("winner") || 
      l.toLowerCase().includes("certified") || 
      l.toLowerCase().includes("first place")
    );
    achievements = matchingLines.slice(0, 3).join("\n");
  }

  // 10. Extract Summary
  let summary = "";
  const summaryMatch = text.match(/(?:summary|profile|about me|objective):\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\n[A-Z\s]{4,}\n)/i);
  if (summaryMatch && summaryMatch[1].trim().length > 10) {
    summary = summaryMatch[1].trim();
  } else {
    const contentLines = lines.filter(l => 
      l.length > 40 && 
      !l.includes("@") && 
      !l.toLowerCase().includes("university") && 
      !l.toLowerCase().includes("college")
    );
    summary = contentLines.slice(0, 2).join(" ");
  }

  return {
    name,
    email,
    phone,
    skills: skillsString,
    experience_years: exp,
    education,
    academicDetails,
    achievements,
    summary
  };
}

function CandidateRow({ 
  c, 
  router, 
  isExpanded, 
  onToggleExpand,
  jobs = [],
  hideJobIndicator = false
}: { 
  c: Candidate; 
  router: ReturnType<typeof useRouter>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  jobs?: any[];
  hideJobIndicator?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editSummary, setEditSummary] = useState(c.parsed_resume_json?.summary || "");
  const [isReuploading, setIsReuploading] = useState(false);
  const queryClient = useQueryClient();

  const updateSummaryMutation = useMutation({
    mutationFn: (updatedSummary: string) => {
      return apiRequest("PUT", `/candidates/${c.id}`, {
        summary: updatedSummary
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate", c.id] });
      setIsEditing(false);
    }
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/candidates/${c.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete candidate.");
    }
  });

  const handleReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReuploading(true);
    try {
      let text = "";
      if (file.type === "text/plain") {
        const reader = new FileReader();
        text = await new Promise<string>((resolve) => {
          reader.onload = (evt) => resolve(evt.target?.result as string || "");
          reader.readAsText(file);
        });
      } else {
        const result = await apiUploadFile("/requirements/parse-file", file);
        text = result.text || "";
      }

      if (text) {
        const parsed = parseResumeTextHeuristically(text);
        const skillsList = parsed.skills ? parsed.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
        await apiRequest("PUT", `/candidates/${c.id}`, {
          raw_text: text,
          summary: parsed.summary,
          full_name: parsed.name || c.full_name,
          email: parsed.email || c.email,
          phone: parsed.phone || c.phone,
          skills: skillsList.length > 0 ? skillsList : c.skills,
          experience_years: parsed.experience_years || c.experience_years,
          education: parsed.education || c.education,
          academic_details: parsed.academicDetails || c.academic_details,
          achievements: parsed.achievements || c.achievements,
          resume_url: `/resumes/${file.name}`
        });
        queryClient.invalidateQueries({ queryKey: ["candidates"] });
        queryClient.invalidateQueries({ queryKey: ["candidate", c.id] });
        alert("Resume re-uploaded and candidate details extracted successfully!");
      } else {
        throw new Error("No text content could be extracted from this resume.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to parse/re-upload resume: " + (err.message || err));
    } finally {
      setIsReuploading(false);
    }
  };

  return (
    <div className="hover:bg-neutral-50/20 transition-colors border-b border-neutral-150">
      <div 
        onClick={() => router.push(`/pool/${c.id}`)}
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            title={isExpanded ? "Collapse Details" : "Expand Details"}
            className="p-1 hover:bg-neutral-100 border border-neutral-200 rounded-sm text-neutral-450 cursor-pointer flex items-center justify-center"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-tight font-bold text-sm text-neutral-850 hover:text-primary transition-colors">{c.full_name}</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-neutral-100 border border-neutral-250 font-mono text-neutral-500 rounded-sm">
                {c.source || "Manual"}
              </span>
              {c.working_or_not === false ? (
                <span className="text-[9px] px-1.5 py-0.2 bg-warning/10 border border-warning/30 font-mono text-warning rounded-sm font-semibold">
                  Open to Work
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 bg-success/10 border border-success/30 font-mono text-success rounded-sm font-semibold">
                  Employed
                </span>
              )}
              {c.resume_url && (
                <a
                  href={c.resume_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={`PDF Resume: ${c.resume_url}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-sm text-red-700 transition-colors text-[9px] font-mono font-semibold"
                >
                  <FileText className="w-3 h-3 text-red-500" />
                  PDF CV
                </a>
              )}
            </div>
            <p className="text-[10px] text-neutral-400 font-mono">{c.email} • {c.phone || "No phone listed"}</p>
            {c.job_id && !hideJobIndicator && (() => {
              const matchedJob = jobs.find(j => j.id === c.job_id);
              if (!matchedJob) return null;
              return (
                <p className="text-[10px] text-primary/90 font-mono flex items-center gap-1 mt-0.5 select-text" onClick={(e) => e.stopPropagation()}>
                  <Briefcase className="w-3 h-3 text-primary/60 shrink-0" />
                  <span>Applied for: <span className="font-semibold">{matchedJob.title}</span> ({matchedJob.client_name})</span>
                </p>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-[10px] text-neutral-500">
          <div>
            <span className="text-neutral-400 mr-1.5">EXP:</span>
            <span className="font-bold text-neutral-700">{c.experience_years} Years</span>
          </div>
          <div className="flex flex-wrap gap-1 max-w-xs justify-end">
            {c.skills.slice(0, 4).map((sk, idx) => (
              <span key={idx} className="text-[8px] bg-neutral-100 text-neutral-600 px-1 py-0.2 border border-neutral-200 rounded-sm">
                {sk}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="px-6 pb-4 pt-2 border-t border-neutral-150 bg-neutral-50/20 space-y-4"
        >
          {/* Summary section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-150 pb-1">
              <span className="text-[9px] uppercase tracking-wider text-neutral-450 font-bold font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                Candidate Executive Summary
              </span>
              {isEditing ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-0.5 text-[9px] border border-neutral-200 hover:bg-neutral-50 rounded-sm cursor-pointer font-medium text-neutral-550"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateSummaryMutation.mutate(editSummary)}
                    disabled={updateSummaryMutation.isPending}
                    className="px-2.5 py-0.5 text-[9px] bg-primary text-neutral-white hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    {updateSummaryMutation.isPending && <RefreshCcw className="w-2.5 h-2.5 animate-spin" />}
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5 items-center">
                  {isReuploading ? (
                    <span className="text-[9px] text-neutral-400 font-mono flex items-center gap-1">
                      <RefreshCcw className="w-2.5 h-2.5 animate-spin" />
                      Re-uploading...
                    </span>
                  ) : (
                    <>
                      <label className="px-2 py-0.5 text-[9px] border border-neutral-250 bg-neutral-white hover:bg-neutral-50 text-neutral-600 rounded-sm cursor-pointer font-semibold flex items-center gap-1 transition-colors">
                        <Upload className="w-2.5 h-2.5 text-neutral-400" />
                        Re-upload Resume
                        <input
                          type="file"
                          accept=".pdf,.txt,.docx"
                          onChange={handleReupload}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={() => {
                          setEditSummary(c.parsed_resume_json?.summary || "");
                          setIsEditing(true);
                        }}
                        className="px-2 py-0.5 text-[9px] border border-neutral-255 bg-neutral-white hover:bg-neutral-50 text-neutral-600 rounded-sm cursor-pointer font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-2.5 h-2.5 text-neutral-400" />
                        Edit Summary
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={3}
                className="w-full p-2.5 border border-neutral-200 bg-neutral-white rounded-sm text-xs text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="Write candidate executive summary..."
              />
            ) : (
              <p className="text-neutral-600 text-xs leading-relaxed whitespace-pre-wrap">
                {c.parsed_resume_json?.summary || "No executive summary available for this candidate. Click Edit Summary to add one."}
              </p>
            )}
          </div>

          {/* Academic & Achievements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-150 text-xs">
            {/* Academic Credentials */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider text-neutral-450 font-bold font-mono flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                Academic Credentials
              </span>
              <div className="bg-neutral-50/50 p-2.5 border border-neutral-200/50 rounded-sm space-y-1">
                {c.education && (
                  <p className="font-semibold text-neutral-850">{c.education}</p>
                )}
                <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap text-[11px]">
                  {c.academic_details || "No additional academic credentials recorded."}
                </p>
              </div>
            </div>

            {/* Achievements & Accolades */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider text-neutral-450 font-bold font-mono flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-warning" />
                Achievements & Accolades
              </span>
              <div className="bg-neutral-50/50 p-2.5 border border-neutral-200/50 rounded-sm">
                <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap text-[11px]">
                  {c.achievements || "No achievements or honors cataloged in talent profile."}
                </p>
              </div>
            </div>
          </div>

          {/* Remove Candidate footer action */}
          <div className="flex justify-end pt-2 border-t border-neutral-150">
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to remove candidate ${c.full_name}?`)) {
                  deleteCandidateMutation.mutate();
                }
              }}
              disabled={deleteCandidateMutation.isPending}
              className="px-2.5 py-1 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50/50 border border-red-200 hover:border-red-300 rounded-sm font-semibold flex items-center gap-1 transition-all cursor-pointer bg-neutral-white"
            >
              {deleteCandidateMutation.isPending ? (
                <RefreshCcw className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              Remove Candidate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PoolView() {
  const queryClient = useQueryClient();
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEducation, setSelectedEducation] = useState("All");
  const [selectedWorkingStatus, setSelectedWorkingStatus] = useState("All");
  const [experienceRange, setExperienceRange] = useState("All");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [groupByEmailDomain, setGroupByEmailDomain] = useState(false);
  const [groupByJob, setGroupByJob] = useState(true);
  const [collapsedJobSections, setCollapsedJobSections] = useState<Record<string, boolean>>({});

  // Manual Candidate Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [exp, setExp] = useState(3);
  const [education, setEducation] = useState("");
  const [workingOrNot, setWorkingOrNot] = useState(true);
  const [rawText, setRawText] = useState("");
  const [academicDetails, setAcademicDetails] = useState("");
  const [achievements, setAchievements] = useState("");
  const [summary, setSummary] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");

  // CSV upload feedback state
  const [uploadFeedback, setUploadFeedback] = useState<{
    inserted: number;
    skipped: number;
    show: boolean;
  } | null>(null);

  // Queries
  const { data: rawCandidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: ["candidates"],
    queryFn: () => apiRequest<Candidate[]>("GET", "/candidates"),
    refetchInterval: 3000 // Refetch every 3s to capture background resume downloads and details parsing
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["jobs"],
    queryFn: () => apiRequest<any[]>("GET", "/jobs")
  });

  const candidates = useMemo(() => {
    return mergeDuplicateCandidates(rawCandidates);
  }, [rawCandidates]);

  const router = useRouter();

  // Persistent search query state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);

  // Modal / drawer states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Filter count computation
  const activeFilterCount = 
    (selectedEducation !== "All" ? 1 : 0) +
    (selectedWorkingStatus !== "All" ? 1 : 0) +
    (experienceRange !== "All" ? 1 : 0) +
    (skillsFilter.trim() !== "" ? 1 : 0) +
    (emailFilter.trim() !== "" ? 1 : 0) +
    (groupByEmailDomain ? 1 : 0);

  // Filter based on search query, education, working status, experience, and skills
  const filteredCandidates = candidates.filter(c => {
    // 1. Name/skills search query
    const matchesSearch = searchQuery
      ? (c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
      : true;

    // 2. Education filter
    let matchesEducation = true;
    if (selectedEducation !== "All") {
      const candidateEducation = (c.education || "").toLowerCase();
      if (selectedEducation === "Bachelor's") {
        matchesEducation = candidateEducation.includes("bachelor") || candidateEducation.includes("b.tech") || candidateEducation.includes("b.sc") || candidateEducation.includes("b.e");
      } else if (selectedEducation === "Master's") {
        matchesEducation = candidateEducation.includes("master") || candidateEducation.includes("m.tech") || candidateEducation.includes("m.sc") || candidateEducation.includes("m.e") || candidateEducation.includes("mba");
      } else if (selectedEducation === "PhD") {
        matchesEducation = candidateEducation.includes("phd") || candidateEducation.includes("ph.d") || candidateEducation.includes("doctor");
      } else {
        matchesEducation = candidateEducation.includes(selectedEducation.toLowerCase());
      }
    }

    // 3. Working status
    let matchesWorkingStatus = true;
    if (selectedWorkingStatus !== "All") {
      const isWorking = c.working_or_not !== false;
      if (selectedWorkingStatus === "Employed") {
        matchesWorkingStatus = isWorking;
      } else if (selectedWorkingStatus === "Open to Work") {
        matchesWorkingStatus = !isWorking;
      }
    }

    // 4. Experience range
    let matchesExperience = true;
    if (experienceRange !== "All") {
      const years = c.experience_years || 0;
      if (experienceRange === "0-2 years") {
        matchesExperience = years >= 0 && years <= 2;
      } else if (experienceRange === "3-5 years") {
        matchesExperience = years >= 3 && years <= 5;
      } else if (experienceRange === "6-8 years") {
        matchesExperience = years >= 6 && years <= 8;
      } else if (experienceRange === "9+ years") {
        matchesExperience = years >= 9;
      }
    }

    // 5. Skills tag-filtering (must have all specified skill queries)
    let matchesSkillsFilter = true;
    if (skillsFilter.trim()) {
      const searchSkills = skillsFilter.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      const candSkills = c.skills.map(s => s.toLowerCase());
      matchesSkillsFilter = searchSkills.every(reqSkill => 
        candSkills.some(candSkill => candSkill.includes(reqSkill))
      );
    }

    // 6. Email filter
    let matchesEmail = true;
    if (emailFilter.trim()) {
      matchesEmail = (c.email || "").toLowerCase().includes(emailFilter.trim().toLowerCase());
    }

    return matchesSearch && matchesEducation && matchesWorkingStatus && matchesExperience && matchesSkillsFilter && matchesEmail;
  });

  // Publish current pool state context to AI Copilot
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const activeCandidate = expandedCandidateId 
        ? candidates.find(c => c.id === expandedCandidateId)
        : null;
      
      const context = {
        page: "pool",
        total_candidates_listed: filteredCandidates.length,
        search_query: searchQuery,
        filters: {
          education: selectedEducation,
          working_status: selectedWorkingStatus,
          experience_range: experienceRange,
          skills_filter: skillsFilter,
          email_filter: emailFilter
        },
        candidates_on_screen: filteredCandidates.slice(0, 15).map(c => ({
          id: c.id,
          name: c.full_name,
          email: c.email,
          skills: c.skills,
          experience_years: c.experience_years,
          education: c.education,
          working_status: c.working_or_not !== false ? "Employed" : "Open to Work",
          active_linked_jobs: c.linked_jobs?.map(lj => lj.job_title) || []
        })),
        active_candidate_details: activeCandidate ? {
          id: activeCandidate.id,
          name: activeCandidate.full_name,
          email: activeCandidate.email,
          phone: activeCandidate.phone,
          skills: activeCandidate.skills,
          experience_years: activeCandidate.experience_years,
          education: activeCandidate.education,
          academic_details: activeCandidate.academic_details,
          achievements: activeCandidate.achievements,
          summary: activeCandidate.parsed_resume_json?.summary,
          resume_url: activeCandidate.resume_url,
          working_status: activeCandidate.working_or_not !== false ? "Employed" : "Open to Work",
          linked_jobs: activeCandidate.linked_jobs
        } : null
      };

      window.dispatchEvent(new CustomEvent("copilot-context-update", { detail: context }));
    }
  }, [filteredCandidates, expandedCandidateId, searchQuery, selectedEducation, selectedWorkingStatus, experienceRange, skillsFilter, emailFilter, candidates]);

  // Mutations
  const addCandidateMutation = useMutation({
    mutationFn: (data: any) => apiRequest<Candidate>("POST", "/candidates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setIsAddOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setSkills("");
      setExp(3);
      setEducation("");
      setWorkingOrNot(true);
      setRawText("");
      setAcademicDetails("");
      setAchievements("");
      setSummary("");
      setResumeUrl("");
      setResumeFileName("");
    },
    onError: (err: any) => {
      alert(err.message || "Failed to add candidate. Duplicate email?");
    }
  });

  const uploadCsvMutation = useMutation({
    mutationFn: (items: any[]) => apiRequest<{ inserted: number; skipped: number }>(
      "POST", 
      "/candidates/upload/csv", 
      { items }
    ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["activity_log"] });
      setUploadFeedback({
        inserted: res.inserted,
        skipped: res.skipped,
        show: true
      });
      setIsUploadOpen(false);
    }
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const skillsList = skills ? skills.split(",").map(s => s.trim()).filter(s => s.length > 0) : [];
    addCandidateMutation.mutate({
      full_name: name,
      email,
      phone: phone || null,
      skills: skillsList,
      experience_years: exp,
      education: education || null,
      working_or_not: workingOrNot,
      raw_text: rawText,
      academic_details: academicDetails || null,
      achievements: achievements || null,
      resume_url: resumeUrl || null,
      summary: summary || null
    });
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Map parsed header keys defensively (case-insensitive checks)
        const mappedItems = results.data.map((row: any) => {
          const findKey = (candidates: string[]) => 
            Object.keys(row).find(k => candidates.includes(k.toLowerCase().trim())) || "";
          
          const fullNameKey = findKey(["fullname", "full name", "name"]);
          const emailKey = findKey(["email", "email address", "mail"]);
          const phoneKey = findKey(["phone", "phone number", "mobile"]);
          const skillsKey = findKey(["skills", "skillsets", "tags"]);
          const expKey = findKey(["experience", "experience years", "exp", "years"]);
          const eduKey = findKey(["education", "degree", "university", "college"]);
          const workingKey = findKey(["working", "working_or_not", "working status", "employed", "current status", "is_employed"]);
          const academicDetailsKey = findKey(["academic_details", "academic details", "academic", "academics", "educational details"]);
          const achievementsKey = findKey(["achievements", "achievement", "awards", "career achievements"]);
          const resumeUrlKey = findKey(["resume_url", "resume url", "pdf_url", "pdf url", "resume", "cv", "link"]);

          return {
            full_name: row[fullNameKey] || "",
            email: row[emailKey] || "",
            phone: row[phoneKey] || null,
            skills: row[skillsKey] || "",
            experience_years: Number(row[expKey]) || 0,
            education: row[eduKey] || "",
            working_or_not: row[workingKey] !== undefined 
              ? (row[workingKey] === true || 
                 String(row[workingKey]).toLowerCase().trim() === "true" || 
                 String(row[workingKey]).toLowerCase().trim() === "yes" || 
                 String(row[workingKey]).toLowerCase().trim() === "working" || 
                 String(row[workingKey]).toLowerCase().trim() === "employed")
              : true,
            academic_details: row[academicDetailsKey] || null,
            achievements: row[achievementsKey] || null,
            resume_url: row[resumeUrlKey] || null
          };
        });

        uploadCsvMutation.mutate(mappedItems);
      }
    });
  };

  return (
    <div className="space-y-6 font-sans text-neutral-700 max-w-7xl mx-auto w-full select-none">
      
      {/* CSV de-duplication banner feedback */}
      {uploadFeedback?.show && (
        <div className="bg-neutral-900 border border-success/30 p-4 rounded-sm flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-sm">
              <ShieldCheck className="w-4 h-4 text-success animate-pulse" />
            </div>
            <div>
              <p className="font-tight font-semibold text-neutral-white">Bulk Sourcing Stream Parsed</p>
              <p className="text-neutral-450 text-[10px] mt-0.5 font-mono">
                Successfully indexed <span className="text-success font-bold">{uploadFeedback.inserted}</span> new profiles. 
                Skipped <span className="text-warning font-bold">{uploadFeedback.skipped}</span> duplicates based on unique email constraint rules.
              </p>
              <p className="text-neutral-400 text-[9.5px] mt-1 font-sans flex items-center gap-1.5 border-t border-neutral-800 pt-1.5">
                <FileText className="w-3.5 h-3.5 text-red-400" />
                Any PDF URLs parsed from CSV columns are now fully accessible via candidate rows.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setUploadFeedback(null)}
            className="text-[9px] font-mono text-neutral-400 hover:text-neutral-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sourcing catalog headers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-lg font-tight font-bold text-neutral-850">Global Candidate Sourcing Pool</h2>
          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Deduplicated candidate talent profiles index</p>
        </div>

        <div className="flex gap-2 text-xs font-mono">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm cursor-pointer flex items-center gap-1.5 text-neutral-600 font-semibold"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            Bulk Import CSV
          </button>
          <button
            id="add-candidate-btn"
            onClick={() => setIsAddOpen(true)}
            className="px-3 py-1.5 bg-primary text-neutral-white hover:bg-primary/95 rounded-sm cursor-pointer flex items-center gap-1.5 uppercase font-semibold text-[10px]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Candidate
          </button>
        </div>
      </div>

      {/* Sourced Search input bar & Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter sourcing pool by candidate name, resume skills (e.g. Next.js, Rust)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 bg-neutral-white rounded-sm text-xs focus:ring-1 focus:ring-primary text-neutral-800"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-sm text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showFilters || activeFilterCount > 0
                ? "bg-primary/5 border-primary/30 text-primary"
                : "bg-neutral-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-neutral-white rounded-full px-1.5 py-0.2 text-[9px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-sm space-y-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {/* Education Filter */}
              <div className="space-y-1">
                <label className="text-neutral-500 uppercase tracking-wider block font-bold text-[9px] font-mono">Education</label>
                <select
                  value={selectedEducation}
                  onChange={(e) => setSelectedEducation(e.target.value)}
                  className="w-full p-2 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-800 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="All">All Education</option>
                  <option value="Bachelor's">Bachelor's Degree</option>
                  <option value="Master's">Master's Degree</option>
                  <option value="PhD">PhD / Doctorate</option>
                </select>
              </div>

              {/* Employment Status Filter */}
              <div className="space-y-1">
                <label className="text-neutral-500 uppercase tracking-wider block font-bold text-[9px] font-mono">Employment</label>
                <select
                  value={selectedWorkingStatus}
                  onChange={(e) => setSelectedWorkingStatus(e.target.value)}
                  className="w-full p-2 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-800 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Employed">Employed (Working)</option>
                  <option value="Open to Work">Open to Work</option>
                </select>
              </div>

              {/* Experience Years Filter */}
              <div className="space-y-1">
                <label className="text-neutral-500 uppercase tracking-wider block font-bold text-[9px] font-mono">Experience</label>
                <select
                  value={experienceRange}
                  onChange={(e) => setExperienceRange(e.target.value)}
                  className="w-full p-2 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-800 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="All">All Experience</option>
                  <option value="0-2 years">Entry-level (0-2 years)</option>
                  <option value="3-5 years">Mid-level (3-5 years)</option>
                  <option value="6-8 years">Senior (6-8 years)</option>
                  <option value="9+ years">Lead / Principal (9+ years)</option>
                </select>
              </div>

              {/* Skills Filter */}
              <div className="space-y-1">
                <label className="text-neutral-500 uppercase tracking-wider block font-bold text-[9px] font-mono">Skills (comma-sep)</label>
                <input
                  type="text"
                  placeholder="React, TypeScript..."
                  value={skillsFilter}
                  onChange={(e) => setSkillsFilter(e.target.value)}
                  className="w-full p-2 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-800 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Email & Grouping filter row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {/* Email Search */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-neutral-500 uppercase tracking-wider block font-bold text-[9px] font-mono">Email</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Filter by email or domain (e.g. @gmail.com)..."
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    className="w-full pl-8 pr-3 p-2 border border-neutral-200 bg-neutral-white rounded-sm text-neutral-800 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Group by Email Domain toggle */}
              <div className="space-y-1">
                <label className="text-neutral-500 uppercase tracking-wider block font-bold text-[9px] font-mono">Group by Domain</label>
                <button
                  type="button"
                  onClick={() => {
                    setGroupByEmailDomain(!groupByEmailDomain);
                    if (!groupByEmailDomain) {
                      setGroupByJob(false);
                    }
                  }}
                  className={`w-full p-2 border rounded-sm text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    groupByEmailDomain
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-neutral-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {groupByEmailDomain ? "Grouped by Email Domain" : "Group by Email Domain"}
                </button>
              </div>

              {/* Group by Job Opening toggle */}
              <div className="space-y-1">
                <label className="text-neutral-500 uppercase tracking-wider block font-bold text-[9px] font-mono">Group by Job Opening</label>
                <button
                  type="button"
                  onClick={() => {
                    setGroupByJob(!groupByJob);
                    if (!groupByJob) {
                      setGroupByEmailDomain(false);
                    }
                  }}
                  className={`w-full p-2 border rounded-sm text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    groupByJob
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-neutral-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  {groupByJob ? "Grouped by Job Opening" : "Group by Job Opening"}
                </button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex justify-end pt-1 border-t border-neutral-200/50">
                <button
                  onClick={() => {
                    setSelectedEducation("All");
                    setSelectedWorkingStatus("All");
                    setExperienceRange("All");
                    setSkillsFilter("");
                    setEmailFilter("");
                    setGroupByEmailDomain(false);
                    setGroupByJob(false);
                  }}
                  className="px-3 py-1 text-primary border border-primary/25 bg-primary/5 hover:bg-primary/10 rounded-sm cursor-pointer text-[10px] font-mono font-semibold"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sourcing data pool table */}
      <div className="bg-neutral-white border border-neutral-200 rounded-sm overflow-hidden shadow-sm text-xs font-sans">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center gap-2">
          <Database className="w-4 h-4 text-neutral-400" />
          <span className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">Sourcing Talent Index ({filteredCandidates.length})</span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-xs text-neutral-400 font-mono">Quering deduplicated talent database...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-12 text-xs text-neutral-400">No candidates found in sourcing query filters.</div>
        ) : groupByEmailDomain ? (
          /* Grouped-by-email-domain view */
          (() => {
            const domainGroups: Record<string, Candidate[]> = {};
            for (const c of filteredCandidates) {
              const domain = (c.email || "").split("@")[1]?.toLowerCase() || "unknown";
              if (!domainGroups[domain]) domainGroups[domain] = [];
              domainGroups[domain].push(c);
            }
            const sortedDomains = Object.keys(domainGroups).sort((a, b) => domainGroups[b].length - domainGroups[a].length);
            return (
              <div>
                {sortedDomains.map(domain => (
                  <div key={domain}>
                    {/* Domain group header */}
                    <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2 sticky top-0 z-10">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      <span className="font-mono font-bold text-[11px] text-primary">@{domain}</span>
                      <span className="text-[9px] bg-primary/10 text-primary font-mono font-semibold px-1.5 py-0.5 rounded-full border border-primary/20">
                        {domainGroups[domain].length} candidate{domainGroups[domain].length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="divide-y divide-neutral-150">
                      {domainGroups[domain].map((c) => (
                        <CandidateRow 
                          key={c.id} 
                          c={c} 
                          router={router} 
                          isExpanded={expandedCandidateId === c.id}
                          onToggleExpand={() => setExpandedCandidateId(expandedCandidateId === c.id ? null : c.id)}
                          jobs={jobs}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : groupByJob ? (
          /* Grouped-by-job-opening filetree view */
          (() => {
            const jobGroups: Record<string, Candidate[]> = {};
            for (const c of filteredCandidates) {
              const jobId = c.job_id || "general";
              if (!jobGroups[jobId]) jobGroups[jobId] = [];
              jobGroups[jobId].push(c);
            }
            
            // Sort job groups: jobs first, general pool last
            const sortedJobIds = Object.keys(jobGroups).sort((a, b) => {
              if (a === "general") return 1;
              if (b === "general") return -1;
              return jobGroups[b].length - jobGroups[a].length;
            });
            
            return (
              <div>
                {sortedJobIds.map(jobId => {
                  const groupCandidates = jobGroups[jobId];
                  const isCollapsed = collapsedJobSections[jobId] !== undefined
                    ? collapsedJobSections[jobId]
                    : (jobId === "general");
                  
                  let sectionTitle = "General Talent Pool (No Job Opening)";
                  if (jobId !== "general") {
                    const matchedJob = jobs.find(j => j.id === jobId);
                    if (matchedJob) {
                      sectionTitle = `Job Posting: ${matchedJob.title} (${matchedJob.client_name || "Generic Client"})`;
                    } else {
                      sectionTitle = `Job Posting: Unknown Opening (${jobId})`;
                    }
                  }
                  
                  const toggleJobSection = (id: string) => {
                    setCollapsedJobSections(prev => ({
                      ...prev,
                      [id]: !prev[id]
                    }));
                  };
                  
                  return (
                    <div key={jobId} className="border-b border-neutral-200 last:border-b-0">
                      {/* Job group header */}
                      <div 
                        onClick={() => toggleJobSection(jobId)}
                        className="px-4 py-2.5 bg-neutral-50/85 hover:bg-neutral-100/90 border-b border-neutral-200 flex items-center justify-between sticky top-0 z-10 cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {jobId === "general" ? (
                            <Users className="w-3.5 h-3.5 text-neutral-500" />
                          ) : (
                            <Briefcase className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span className="font-mono font-bold text-[11px] text-neutral-800">
                            {sectionTitle}
                          </span>
                          <span className="text-[9px] bg-primary/10 text-primary font-mono font-semibold px-1.5 py-0.5 rounded-full border border-primary/20">
                            {groupCandidates.length} candidate{groupCandidates.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div>
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Candidates listed as a filetree outline when expanded */}
                      {!isCollapsed && (
                        <div className="pl-4 ml-6 my-2 space-y-1">
                          {groupCandidates.map((c, idx) => {
                            const isLast = idx === groupCandidates.length - 1;
                            return (
                              <div key={c.id} className="relative">
                                {/* Vertical line segment */}
                                <div className={`absolute left-[-16px] top-0 w-[1px] border-l border-dashed border-neutral-250 ${
                                  isLast ? "h-[26px]" : "h-full"
                                }`}></div>
                                {/* Horizontal connector line */}
                                <div className="absolute left-[-16px] top-[26px] w-[16px] h-[1px] border-t border-dashed border-neutral-250"></div>
                                <CandidateRow 
                                  c={c} 
                                  router={router} 
                                  isExpanded={expandedCandidateId === c.id}
                                  onToggleExpand={() => setExpandedCandidateId(expandedCandidateId === c.id ? null : c.id)}
                                  jobs={jobs}
                                  hideJobIndicator={groupByJob}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          <div className="divide-y divide-neutral-150">
            {filteredCandidates.map((c) => (
              <CandidateRow 
                key={c.id} 
                c={c} 
                router={router} 
                isExpanded={expandedCandidateId === c.id}
                onToggleExpand={() => setExpandedCandidateId(expandedCandidateId === c.id ? null : c.id)}
                jobs={jobs}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Candidate Manual Form Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-md p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="space-y-1">
              <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider">Add Sourced Candidate</h3>
              <p className="text-neutral-400 text-xs">Create unique talent profile in ATS storage catalog.</p>
            </div>
            
            <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rohan Sharma"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Email Address</label>
                  <input
                    type="email"
                    placeholder="rohan@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Skills (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="React, Redux, Node.js"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Experience Years</label>
                  <input
                    type="number"
                    min={0}
                    value={exp}
                    onChange={(e) => setExp(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Education</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech in CS"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Employment Status</label>
                  <select
                    value={workingOrNot ? "true" : "false"}
                    onChange={(e) => setWorkingOrNot(e.target.value === "true")}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 bg-neutral-white"
                  >
                    <option value="true">Employed (Working)</option>
                    <option value="false">Open to Work (Not Working)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Resume Raw Text</label>
                <textarea
                  placeholder="Paste candidate text outline or highlight headers..."
                  rows={3}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Academic Details</label>
                <textarea
                  placeholder="e.g. CGPA: 9.2, Major: Computer Science, Senior Project:..."
                  rows={2}
                  value={academicDetails}
                  onChange={(e) => setAcademicDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Achievements</label>
                <textarea
                  placeholder="e.g. Winner of Smart India Hackathon, Certified AWS Architect..."
                  rows={2}
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Executive Summary</label>
                <textarea
                  placeholder="e.g. Experienced UI Developer specializing in Next.js transitions and performance optimization..."
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Upload Resume File Section */}
              <div className="space-y-1 bg-neutral-50 p-3 border border-neutral-200 rounded-sm">
                <label className="text-neutral-500 uppercase tracking-wider block font-bold text-[9px] font-mono mb-1">
                  Upload Resume (PDF / DOCX / TXT)
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 border border-neutral-250 bg-neutral-white hover:bg-neutral-50 text-neutral-600 rounded-sm cursor-pointer font-semibold flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-neutral-400" />
                    Select File
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setResumeFileName(file.name);
                        setResumeUrl(`/resumes/${file.name}`);
                        setIsExtracting(true);
                        
                        try {
                          let text = "";
                          if (file.type === "text/plain") {
                            const reader = new FileReader();
                            text = await new Promise<string>((resolve) => {
                              reader.onload = (evt) => resolve(evt.target?.result as string || "");
                              reader.readAsText(file);
                            });
                          } else {
                            const result = await apiUploadFile("/requirements/parse-file", file);
                            text = result.text || "";
                          }

                          if (text) {
                            setRawText(text);
                            const parsed = parseResumeTextHeuristically(text);
                            if (parsed.name) setName(parsed.name);
                            if (parsed.email) setEmail(parsed.email);
                            if (parsed.phone) setPhone(parsed.phone);
                            if (parsed.skills) setSkills(parsed.skills);
                            if (parsed.experience_years) setExp(parsed.experience_years);
                            if (parsed.education) setEducation(parsed.education);
                            if (parsed.academicDetails) setAcademicDetails(parsed.academicDetails);
                            if (parsed.achievements) setAchievements(parsed.achievements);
                            if (parsed.summary) setSummary(parsed.summary);
                          } else {
                            throw new Error("No text content could be extracted from this resume.");
                          }
                        } catch (err: any) {
                          console.error("Resume extraction failed:", err);
                          alert("Failed to parse resume file: " + (err.message || err));
                        } finally {
                          setIsExtracting(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {isExtracting ? (
                    <div className="flex items-center gap-1.5 text-primary font-semibold font-mono text-[10px] animate-pulse">
                      <RefreshCcw className="w-3.5 h-3.5 animate-spin text-primary" />
                      Extracting resume details...
                    </div>
                  ) : resumeFileName ? (
                    <div className="flex items-center gap-1.5 text-success font-semibold font-mono text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {resumeFileName}
                      <button
                        type="button"
                        onClick={() => {
                          setResumeFileName("");
                          setResumeUrl("");
                        }}
                        className="text-error hover:text-error/80 cursor-pointer ml-1.5 font-bold underline"
                      >
                        Reset
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-neutral-400 font-mono">No document selected</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCandidateMutation.isPending}
                  className="px-4 py-1.5 bg-primary text-neutral-white font-medium hover:bg-primary/95 rounded-sm cursor-pointer"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import CSV Dialog */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="space-y-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider">Bulk CSV Sourcing Stream</h3>
                <p className="text-neutral-400 text-xs">Upload CSV containing headers: Name, Email, Skills, Exp.</p>
              </div>
            </div>
            
            <div className="border-2 border-dashed border-neutral-200 rounded-sm p-6 text-center space-y-3 bg-neutral-50/50">
              <Upload className="w-8 h-8 text-neutral-450 mx-auto" />
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFile}
                className="hidden"
                id="csv-file-uploader"
              />
              <label 
                htmlFor="csv-file-uploader"
                className="px-4 py-2 border border-neutral-250 bg-neutral-white text-neutral-600 rounded-sm text-xs font-semibold cursor-pointer hover:bg-neutral-50 inline-block"
              >
                Choose Sourcing CSV File
              </label>
              <p className="text-[10px] text-neutral-400">File parsing is executed locally. Unique constraint validation runs in transaction streams.</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
