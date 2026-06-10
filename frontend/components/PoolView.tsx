"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { Candidate } from "../types";
import Papa from "papaparse";
import { 
  Users, UserPlus, Upload, ShieldCheck, Search, Plus, 
  ChevronDown, ChevronUp, AlertCircle, Sparkles, Database, FileSpreadsheet 
} from "lucide-react";

export default function PoolView() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);

  // Modal / drawer states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Manual Candidate Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [exp, setExp] = useState(3);
  const [rawText, setRawText] = useState("");

  // CSV upload feedback state
  const [uploadFeedback, setUploadFeedback] = useState<{
    inserted: number;
    skipped: number;
    show: boolean;
  } | null>(null);

  // Queries
  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: ["candidates"],
    queryFn: () => apiRequest<Candidate[]>("GET", "/candidates")
  });

  // Filter based on search query (skills or name)
  const filteredCandidates = candidates.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      setRawText("");
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
      phone,
      skills: skillsList,
      experience_years: exp,
      raw_text: rawText
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

          return {
            full_name: row[fullNameKey] || "",
            email: row[emailKey] || "",
            phone: row[phoneKey] || null,
            skills: row[skillsKey] || "",
            experience_years: Number(row[expKey]) || 0
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
              <p className="text-neutral-400 text-[10px] mt-0.5 font-mono">
                Successfully indexed <span className="text-success font-bold">{uploadFeedback.inserted}</span> new profiles. 
                Skipped <span className="text-warning font-bold">{uploadFeedback.skipped}</span> duplicates based on unique email constraint rules.
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

      {/* Sourced Search input bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-neutral-400" />
        <input
          type="text"
          placeholder="Filter sourcing pool by candidate name, resume skills (e.g. Next.js, Rust)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-neutral-200 bg-neutral-white rounded-sm text-xs focus:ring-1 focus:ring-primary text-neutral-800"
        />
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
        ) : (
          <div className="divide-y divide-neutral-150">
            {filteredCandidates.map((c) => {
              const isExpanded = expandedCandidateId === c.id;
              return (
                <div key={c.id} className="hover:bg-neutral-50/20 transition-colors">
                  {/* Row Summary */}
                  <div 
                    onClick={() => setExpandedCandidateId(isExpanded ? null : c.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-tight font-bold text-sm text-neutral-800">{c.full_name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-neutral-100 border border-neutral-250 font-mono text-neutral-500 rounded-sm">
                          {c.source || "Manual"}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono">{c.email} • {c.phone || "No phone listed"}</p>
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
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                    </div>
                  </div>

                  {/* Expanded Detail drawer panel */}
                  {isExpanded && (
                    <div className="p-4 bg-neutral-50/50 border-t border-neutral-150 space-y-3 font-sans select-none">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold font-mono block">Sourced Pipelines</span>
                          {c.linked_jobs && c.linked_jobs.length > 0 ? (
                            <div className="space-y-1 mt-1 font-mono text-[10px]">
                              {c.linked_jobs.map((lj, idx) => (
                                <div key={idx} className="flex justify-between p-1 bg-neutral-white border border-neutral-200 rounded-sm">
                                  <span className="truncate max-w-[120px] font-semibold">{lj.job_title}</span>
                                  <span className="text-primary font-bold">{lj.fuzzy_score}% ({lj.stage})</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-neutral-400 text-xs">Not linked to active pipelines.</p>
                          )}
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                          <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold font-mono block">Resume Raw Text Context</span>
                          <div className="p-3 bg-neutral-white border border-neutral-200 rounded-sm text-[11px] leading-relaxed max-h-32 overflow-y-auto font-mono text-neutral-600 whitespace-pre-wrap select-text">
                            {c.raw_text || "No parsed summary loaded."}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
