"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiRequest, apiUploadFile } from "@/lib/api";
import { parseResumeTextHeuristically } from "@/components/PoolView";
import { 
  Upload, Briefcase, GraduationCap, Trophy, Code, 
  CheckCircle, AlertCircle, Calendar, DollarSign, 
  MapPin, Loader2, ArrowLeft, Building2, Sparkles, Check
} from "lucide-react";

export default function PublicApplyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params?.jobId as string;
  const recruiterId = searchParams ? searchParams.get("recruiter_id") : null;

  // Job opening state
  const [job, setJob] = useState<any>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [errorJob, setErrorJob] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [exp, setExp] = useState(0);
  const [education, setEducation] = useState("");
  const [workingOrNot, setWorkingOrNot] = useState(true);
  const [rawText, setRawText] = useState("");
  const [academicDetails, setAcademicDetails] = useState("");
  const [achievements, setAchievements] = useState("");
  const [summary, setSummary] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  
  // File parsing states
  const [resumeFileName, setResumeFileName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);

  // Form submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Consent state
  const [consent, setConsent] = useState(false);

  // Fetch job details on load
  useEffect(() => {
    if (!jobId) return;
    
    const fetchJobDetails = async () => {
      try {
        setLoadingJob(true);
        setErrorJob(null);
        const result = await apiRequest<any>("GET", `/jobs/${jobId}`);
        setJob(result);
      } catch (err: any) {
        console.error("Error fetching job details:", err);
        setErrorJob(err.message || "Failed to load job details. The job opening may not exist or has been archived.");
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJobDetails();
  }, [jobId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFileName(file.name);
    setResumeUrl(`/resumes/${file.name}`);
    setIsExtracting(true);
    setParseNotice(null);
    
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
        if (parsed.experience_years !== undefined) setExp(parsed.experience_years);
        if (parsed.education) setEducation(parsed.education);
        if (parsed.academicDetails) setAcademicDetails(parsed.academicDetails);
        if (parsed.achievements) setAchievements(parsed.achievements);
        if (parsed.summary) setSummary(parsed.summary);

        setParseNotice("Resume parsed successfully! Please review and update any details below.");
      } else {
        throw new Error("No text content could be extracted from this resume.");
      }
    } catch (err: any) {
      console.error("Resume extraction failed:", err);
      setParseNotice("We couldn't parse your resume automatically. Please enter your details manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setSubmitError("Please consent to the processing of your application.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Format skills
    const skillsList = skills
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      full_name: name,
      email: email,
      phone: phone || null,
      skills: skillsList,
      experience_years: exp,
      resume_url: resumeUrl || null,
      raw_text: rawText || null,
      education: education || null,
      working_or_not: workingOrNot,
      academic_details: academicDetails || null,
      achievements: achievements || null,
      source: "manual",
      summary: summary || null,
      job_id: jobId,
      uploaded_by: recruiterId || job?.created_by || null
    };

    try {
      await apiRequest("POST", "/candidates", payload);
      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Failed to submit candidate profile:", err);
      setSubmitError(err.message || "Failed to submit your application. Please check your inputs and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans p-6 select-none">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-neutral-500 font-mono text-xs uppercase tracking-wider animate-pulse">
            Retrieving Mandate Posting Parameters...
          </p>
        </div>
      </div>
    );
  }

  if (errorJob || !job) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-neutral-white border border-neutral-200 rounded-sm p-6 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-error mx-auto" />
          <div className="space-y-1.5">
            <h3 className="font-tight font-bold text-base text-neutral-800 uppercase tracking-wider">
              Posting Unavailable
            </h3>
            <p className="text-neutral-400 text-xs leading-relaxed">
              {errorJob || "The requested job opening details could not be retrieved. It may have been closed or deleted."}
            </p>
          </div>
          <button
            onClick={() => router.refresh()}
            className="w-full py-2 bg-primary text-neutral-white font-medium text-xs rounded-sm hover:bg-primary/95 transition-colors cursor-pointer uppercase tracking-wider"
          >
            Retry Loading Page
          </button>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-neutral-white border border-neutral-200 rounded-sm p-8 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 bg-success/10 border border-success/20 text-success rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-tight font-bold text-lg text-neutral-800 uppercase tracking-wider">
              Application Submitted!
            </h3>
            <p className="text-neutral-500 text-xs leading-relaxed">
              Thank you for applying, <strong className="text-neutral-700">{name}</strong>. Your profile details have been securely logged in our recruitment engine.
            </p>
            <div className="bg-neutral-50 border border-neutral-150 p-3 rounded-sm font-mono text-[11px] text-left text-neutral-600 space-y-1 mt-2">
              <div><span className="text-neutral-400 font-semibold uppercase block text-[9px]">Applied For</span> {job.title}</div>
              {job.client_name && (
                <div><span className="text-neutral-400 font-semibold uppercase block text-[9px] mt-1">Client Org</span> {job.client_name}</div>
              )}
            </div>
            <p className="text-neutral-450 text-[10px] italic pt-1.5">
              Our automated matching pipeline and screening agents will evaluate your credentials shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-sans flex flex-col">
      {/* Premium Header */}
      <header className="bg-neutral-white border-b border-neutral-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary text-neutral-white font-bold flex items-center justify-center rounded-sm text-sm">
            K
          </div>
          <div>
            <h1 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">
              Kozker Recruiter AI
            </h1>
            <p className="text-[9px] text-neutral-400 font-mono uppercase">Talent Application Portal</p>
          </div>
        </div>
        <div className="text-[10px] font-mono text-neutral-400 bg-neutral-50 px-2 py-0.5 border border-neutral-150 rounded-sm">
          Active Mandate #{job.post_index || 1}
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Job Description & Details */}
        <section className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm p-5 space-y-4 shadow-xs">
            <div className="space-y-1.5">
              <span className="px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-sm">
                Active Opening
              </span>
              <h2 className="font-tight font-bold text-base text-neutral-800 leading-tight">
                {job.title}
              </h2>
              {job.client_name && (
                <div className="flex items-center gap-1 text-xs text-neutral-550 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{job.client_name}</span>
                </div>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3 border border-neutral-150 rounded-sm text-[11px] font-mono text-neutral-600">
              {job.salary_range && (
                <div className="space-y-0.5">
                  <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Salary Range</span>
                  <span className="flex items-center gap-0.5">{job.salary_range}</span>
                </div>
              )}
              {job.keywords && job.keywords.length > 0 && (
                <div className="space-y-0.5">
                  <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Key Tags</span>
                  <span className="truncate block" title={job.keywords.join(", ")}>{job.keywords.slice(0, 2).join(", ")}</span>
                </div>
              )}
            </div>

            {/* Job Description Block */}
            {job.description && (
              <div className="space-y-1.5 border-t border-neutral-150 pt-3">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                  Role Overview
                </h4>
                <p className="text-xs text-neutral-650 leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </div>
            )}

            {/* Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <div className="space-y-2 border-t border-neutral-150 pt-3">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                  Key Responsibilities
                </h4>
                <ul className="list-disc pl-4 text-xs text-neutral-650 space-y-1.5">
                  {job.responsibilities.map((resp: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{resp}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Qualifications */}
            {job.qualifications && job.qualifications.length > 0 && (
              <div className="space-y-2 border-t border-neutral-150 pt-3">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                  Preferred Qualifications
                </h4>
                <ul className="list-disc pl-4 text-xs text-neutral-650 space-y-1.5">
                  {job.qualifications.map((qual: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{qual}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Application Form */}
        <section className="lg:col-span-7 space-y-4">
          <div className="bg-neutral-white border border-neutral-200 rounded-sm p-6 shadow-xs">
            <div className="border-b border-neutral-200 pb-4 mb-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-tight font-bold text-sm text-neutral-800 uppercase tracking-wider">
                  Apply for this position
                </h3>
                <p className="text-neutral-400 text-xs">
                  Fill out the details below to apply. Uploading a resume auto-fills the form.
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-primary/70 animate-pulse" />
            </div>

            {/* Resume File Upload Widget */}
            <div className="mb-5 bg-neutral-50 p-4 border border-dashed border-neutral-250 hover:border-primary/50 hover:bg-primary/5 rounded-sm transition-all text-xs">
              <div className="flex flex-col items-center justify-center text-center space-y-2 py-2">
                <div className="w-9 h-9 bg-neutral-white border border-neutral-200 rounded-full flex items-center justify-center shadow-xs">
                  <Upload className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-neutral-700">Upload your Resume / CV</p>
                  <p className="text-[10px] text-neutral-400 font-mono">PDF, DOCX, or TXT (Max 5MB)</p>
                </div>
                
                <label className="mt-1 px-3 py-1.5 border border-neutral-300 hover:border-primary bg-neutral-white text-neutral-700 font-semibold rounded-sm cursor-pointer shadow-xs transition-colors inline-flex items-center gap-1.5">
                  Choose File
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Extraction Progress Indicator */}
              {isExtracting && (
                <div className="mt-3 p-2 bg-primary/5 border border-primary/20 rounded-sm flex items-center justify-center gap-2 text-primary font-semibold font-mono text-[10px] animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Heuristically parsing resume profile parameters...</span>
                </div>
              )}

              {/* File Info & Heuristics Notice */}
              {!isExtracting && resumeFileName && (
                <div className="mt-3 p-2.5 bg-success/5 border border-success/20 rounded-sm flex items-center justify-between text-success font-semibold font-mono text-[10px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="truncate">{resumeFileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResumeFileName("");
                      setResumeUrl("");
                      setParseNotice(null);
                    }}
                    className="text-error font-bold underline hover:text-error/80 cursor-pointer shrink-0 ml-2"
                  >
                    Reset File
                  </button>
                </div>
              )}

              {/* Parse Notice */}
              {parseNotice && (
                <div className="mt-3 p-2.5 bg-neutral-100 border border-neutral-200 rounded-sm text-[10.5px] leading-relaxed text-neutral-600 italic">
                  {parseNotice}
                </div>
              )}
            </div>

            {/* Main Fields Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              
              {/* Row 1: Full Name */}
              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rohan Sharma"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Row 2: Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Email Address *</label>
                  <input
                    type="email"
                    placeholder="rohan@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 3: Skills & Exp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold flex items-center gap-1">
                    <Code className="w-3.5 h-3.5 text-neutral-400" />
                    Skills (Comma Separated) *
                  </label>
                  <input
                    type="text"
                    placeholder="React, Redux, Node.js"
                    required
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={exp}
                    onChange={(e) => setExp(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Row 4: Education & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-neutral-400" />
                    Education / Degree
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech in CS"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Employment Status</label>
                  <select
                    value={workingOrNot ? "true" : "false"}
                    onChange={(e) => setWorkingOrNot(e.target.value === "true")}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 bg-neutral-white focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="true">Employed (Working)</option>
                    <option value="false">Open to Work (Not Working)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Academic Details */}
              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Academic Details</label>
                <textarea
                  placeholder="e.g. CGPA: 9.2, Major: Computer Science, Senior Project details..."
                  rows={2}
                  value={academicDetails}
                  onChange={(e) => setAcademicDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Row 6: Achievements */}
              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-neutral-400" />
                  Achievements
                </label>
                <textarea
                  placeholder="e.g. Winner of Smart India Hackathon, Certified AWS Architect..."
                  rows={2}
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Row 7: Executive Summary */}
              <div className="space-y-1">
                <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Executive Summary</label>
                <textarea
                  placeholder="e.g. Experienced developer specializing in..."
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-neutral-800 focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Hidden/Parsed rawText stored under candidates table */}
              {rawText && (
                <div className="space-y-1">
                  <label className="text-neutral-400 uppercase tracking-wider block font-semibold">Resume Raw Text Profile Outline</label>
                  <textarea
                    readOnly
                    rows={3}
                    value={rawText}
                    className="w-full px-3 py-2 border border-neutral-150 bg-neutral-50 rounded-sm text-neutral-500 font-mono text-[10px] select-all cursor-text focus:outline-hidden"
                  />
                </div>
              )}

              {/* Consent Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2 text-[11px] text-neutral-500 leading-normal cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    required
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 rounded-sm border-neutral-350 accent-primary text-primary focus:ring-primary cursor-pointer"
                  />
                  <span>
                    I consent to having my profile processed, structured, and matched against job requirement parameters using machine intelligence algorithms. *
                  </span>
                </label>
              </div>

              {/* Error Notice */}
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200/50 rounded-sm text-error font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-150 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-primary hover:bg-primary/95 text-neutral-white font-medium rounded-sm shadow-xs hover:shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Premium Footer */}
      <footer className="bg-neutral-white border-t border-neutral-200 py-6 px-6 text-center text-[10px] font-mono text-neutral-400">
        <p>© 2026 Kozker Recruiter AI. All applicant data is governed by tenant confidentiality guidelines.</p>
        <p className="mt-1">Powered by Advanced Agentic Matching System</p>
      </footer>
    </div>
  );
}
