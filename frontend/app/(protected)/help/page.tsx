"use client";

import React, { useState } from "react";
import { 
  HelpCircle, BookOpen, Sparkles, Sliders, Users, 
  Layers, ChevronDown, ChevronUp, Play, ArrowRight, LifeBuoy
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does AI candidate matching work?",
    answer: "When you click 'Scan and Publish' on a confirmed job, the system extracts key skills from the job description and requirement. You can customize the weights of these skills. Our AI (Claude API) then matches candidate CVs against these weighted skills to compute a fuzzy score (0-100%) and ranks them accordingly."
  },
  {
    question: "Where do candidate queries come from and how do I resolve them?",
    answer: "On the candidate-facing job apply page, applicants can toggle to the 'Queries & Support' tab to submit questions. You can view all queries for a job by opening the job in the Job Catalog, selecting the 'Candidate Queries' tab, and clicking 'Resolve' once you review them."
  },
  {
    question: "Can I manually add job openings?",
    answer: "Yes! In the Job Catalog workspace, scroll to the bottom of the Notion-style table and click the '+' button to add an opening manually. You can fill out details, save, and manually publish them."
  },
  {
    question: "How do interview stages work?",
    answer: "Candidates move through a sequence of stages: Screening → Technical → HR → Final. You can update their stage and status on their detail card. If a candidate fails a round, you must record a rejection reason in the stage notes, which is stored and referenced if the candidate reappears in the system later."
  },
  {
    question: "How do I import candidates in bulk?",
    answer: "Go to the Sourcing Pool page and click 'Bulk Import CSV'. You can upload a CSV table containing candidate names, emails, phones, skills, and experience details. Duplicate emails will be skipped automatically."
  }
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleRestartTour = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("kozker_tutorial_completed");
      localStorage.removeItem("kozker_tutorial_skipped");
      localStorage.setItem("show_kozker_tutorial", "true");
      localStorage.setItem("kozker_tutorial_step", "0");
      sessionStorage.removeItem("kozker_welcome_redirected");
      window.location.href = "/welcome";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-12 select-none">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950 to-indigo-950 border border-neutral-800 p-8 rounded-sm text-neutral-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md">
        <div className="space-y-2">
          <span className="px-2.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-900/40 border border-emerald-800 rounded-sm">
            Kozker Support
          </span>
          <h1 className="font-tight font-black text-2xl tracking-tight leading-none uppercase">
            Operations Help Desk
          </h1>
          <p className="text-neutral-400 text-xs max-w-md">
            Learn how to manage hiring mandates, optimize AI matching parameters, and review candidate applications.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestartTour}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Restart Tutorial Tour
        </button>
      </div>

      {/* Grid of Core Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card 1: Mandates & Job Drafts */}
        <div className="bg-white border border-neutral-200 p-5 rounded-sm shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <div className="w-8 h-8 rounded-sm bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">
              Hiring Mandates & Job Drafts
            </h3>
          </div>
          <p className="text-neutral-500 text-[11.5px] leading-relaxed">
            Create requirements linked to client names. The AI automatically drafts structured job openings. You can review, edit, or regenerate these drafts using natural language instructions.
          </p>
        </div>

        {/* Card 2: AI Matching & Ranks */}
        <div className="bg-white border border-neutral-200 p-5 rounded-sm shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <div className="w-8 h-8 rounded-sm bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">
              AI Matching & Scoring
            </h3>
          </div>
          <p className="text-neutral-500 text-[11.5px] leading-relaxed">
            Before scanning CVs, the AI extracts skills. Customize their weights in the editable pop-up. Once approved, the scanning agent ranks candidates by calculating fuzzy semantic similarity scores.
          </p>
        </div>

        {/* Card 3: Sourcing Pool & Imports */}
        <div className="bg-white border border-neutral-200 p-5 rounded-sm shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <div className="w-8 h-8 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">
              Sourcing & Uploads
            </h3>
          </div>
          <p className="text-neutral-500 text-[11.5px] leading-relaxed">
            Upload candidate resumes inside a job (linked automatically) or directly into the general pool. Supported formats include PDF, DOCX, and bulk CSV tables. System flags and skips duplicates.
          </p>
        </div>

        {/* Card 4: Screening & Stages */}
        <div className="bg-white border border-neutral-200 p-5 rounded-sm shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
            <div className="w-8 h-8 rounded-sm bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-neutral-800">
              Screening & Pipeline Stages
            </h3>
          </div>
          <p className="text-neutral-500 text-[11.5px] leading-relaxed">
            Once accepted, the system generates 8-10 personalized screening questions. Move applicants from Screening to Technical, HR, and Final stages, recording stage outcomes and logs.
          </p>
        </div>

      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white border border-neutral-200 rounded-sm shadow-xs p-6 space-y-4">
        <h2 className="font-tight font-black text-sm uppercase tracking-wider text-neutral-800 flex items-center gap-2 pb-3 border-b border-neutral-100">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          Frequently Asked Questions
        </h2>

        <div className="divide-y divide-neutral-100">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center text-left text-neutral-800 hover:text-primary transition-colors cursor-pointer text-xs font-semibold"
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
                {isOpen && (
                  <p className="text-neutral-500 text-[11.5px] leading-relaxed animate-fadeIn">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Support Box */}
      <div className="border border-dashed border-neutral-350 rounded-sm p-6 text-center space-y-3 bg-neutral-50/50">
        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200 mx-auto text-neutral-500">
          <LifeBuoy className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-tight font-bold text-xs text-neutral-800 uppercase tracking-wider">Need Technical Assistance?</h4>
          <p className="text-neutral-500 text-[11px] max-w-sm mx-auto leading-relaxed">
            For advanced queries, workflow troubleshooting, or system feedback, please consult our engineering logs or contact the administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
