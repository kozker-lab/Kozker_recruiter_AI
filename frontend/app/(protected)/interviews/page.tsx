"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  Star, 
  Send, 
  Lock, 
  X, 
  Briefcase
} from "lucide-react";

export default function InterviewWorkspacePage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);

  // Scorecard Form State
  const [recommendation, setRecommendation] = useState<string>("Hire");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState("");

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/interviews");
      const data = await res.json();
      if (data.success) {
        setInterviews(data.interviews || []);
      }
    } catch (err) {
      console.error("Failed to load interviews:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenScorecard = (intv: any) => {
    setSelectedInterview(intv);
    const initialRatings: Record<string, number> = {};
    (intv.evaluation_areas || ["Technical Competency", "Communication", "Problem Solving"]).forEach((area: string) => {
      initialRatings[area] = 4;
    });
    setRatings(initialRatings);
    setNotes("");
    setSubmittedMsg("");
  };

  const handleSubmitScorecard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: selectedInterview.id,
          recommendation,
          ratings,
          notes
        })
      });

      if (res.ok) {
        setSubmittedMsg("Scorecard submitted & locked successfully!");
        setTimeout(() => {
          setSelectedInterview(null);
          fetchInterviews();
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-neutral-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-tight font-bold text-neutral-white">Distraction-Free Interview Workspace</h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              Review assigned candidate kits, conduct interviews, and submit scorecards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded">
          <Lock className="w-3.5 h-3.5" />
          <span>Restricted Interview Scope</span>
        </div>
      </div>

      {/* Interviews Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-500 font-mono text-xs animate-pulse">
          Loading assigned interviews...
        </div>
      ) : interviews.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-neutral-800 bg-neutral-900/40 rounded-md space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <div className="font-bold text-neutral-300 text-sm">No Pending Interviews</div>
          <p className="text-xs text-neutral-500 font-mono">You have completed all assigned candidate interview evaluations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interviews.map(intv => (
            <div
              key={intv.id}
              className="p-5 bg-neutral-900 border border-neutral-800 rounded-md hover:border-neutral-700 transition-all space-y-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] uppercase font-bold text-primary flex items-center gap-1.5 mb-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{intv.job_title}</span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-white">{intv.candidate_name}</h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">{intv.round_name}</p>
                </div>

                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase shrink-0">
                  {intv.status || "Scheduled"}
                </span>
              </div>

              {intv.experience && (
                <div className="p-3 bg-neutral-950 border border-neutral-850 rounded text-xs space-y-1">
                  <div className="font-mono text-[10px] text-neutral-500 uppercase font-bold">Approved Candidate Summary</div>
                  <p className="text-neutral-300">{intv.experience}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>45 Minutes</span>
                </div>

                <button
                  onClick={() => handleOpenScorecard(intv)}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-neutral-white font-mono font-bold text-xs uppercase tracking-wider rounded inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Open Evaluation Scorecard</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scorecard Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 max-w-lg w-full p-6 rounded-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-neutral-200 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-neutral-white text-sm">Interview Scorecard: {selectedInterview.candidate_name}</h3>
                <p className="text-[10px] font-mono text-neutral-400">{selectedInterview.job_title} • {selectedInterview.round_name}</p>
              </div>
              <button onClick={() => setSelectedInterview(null)} className="text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitScorecard} className="space-y-4">
              {/* Recommendation Decision Select */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-neutral-400 mb-1">
                  Overall Recommendation Decision
                </label>
                <select
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 text-neutral-white font-bold rounded text-xs focus:outline-none focus:border-primary"
                >
                  <option value="Strong Hire">Strong Hire</option>
                  <option value="Hire">Hire</option>
                  <option value="No Hire">No Hire</option>
                  <option value="Strong No Hire">Strong No Hire</option>
                </select>
              </div>

              {/* Evaluation Criteria Ratings */}
              <div className="p-3 bg-neutral-950 border border-neutral-850 rounded space-y-2.5">
                <div className="font-mono text-[10px] uppercase font-bold text-neutral-400">Evaluation Ratings (1 to 5)</div>
                {Object.keys(ratings).map((area) => (
                  <div key={area} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-300">{area}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatings({ ...ratings, [area]: star })}
                          className={`w-6 h-6 rounded font-mono text-[10px] font-bold transition-colors cursor-pointer ${
                            ratings[area] >= star ? "bg-primary text-neutral-white" : "bg-neutral-800 text-neutral-500"
                          }`}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Interview Notes */}
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-neutral-400 mb-1">
                  Detailed Technical & Behavioral Feedback Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record key technical strengths, areas of concern, and system design observations..."
                  required
                  rows={4}
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 text-neutral-200 rounded text-xs focus:outline-none focus:border-primary font-sans"
                />
              </div>

              {submittedMsg && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] rounded text-center font-bold">
                  {submittedMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedInterview(null)}
                  className="px-3.5 py-2 border border-neutral-800 hover:bg-neutral-800 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-neutral-white text-xs font-mono font-bold uppercase tracking-wider rounded cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Submitting..." : "Submit & Lock Scorecard"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
