"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, Users, MessageSquare, ArrowRight } from "lucide-react";
import { useUpdateProfile, useProfile } from "@/lib/hooks/useAuth";
import { Logo } from "@/components/Logo";

export default function WelcomePage() {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const { data: profile } = useProfile();

  const handleStartTour = () => {
    localStorage.setItem("show_kozker_tutorial", "true");
    localStorage.setItem("kozker_tutorial_step", "0");
    localStorage.removeItem("kozker_tutorial_skipped");
    localStorage.removeItem("kozker_tutorial_completed");
    router.push("/dashboard");
  };

  const handleSkipTour = async () => {
    localStorage.setItem("kozker_tutorial_skipped", "true");
    localStorage.setItem("kozker_tutorial_step", "0");
    localStorage.removeItem("show_kozker_tutorial");
    localStorage.removeItem("kozker_tutorial_completed");
    try {
      const cleanAvatar = profile?.avatar_url ? profile.avatar_url.split("#")[0] : "";
      await updateProfile.mutateAsync({
        avatar_url: `${cleanAvatar}#tour_skipped`
      });
    } catch (e) {
      console.error("Failed to update profile tutorial status on skip", e);
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 font-sans text-neutral-800 selection:bg-primary/20">
      <div className="w-full max-w-2xl bg-neutral-white border border-neutral-200 shadow-xl rounded-sm overflow-hidden flex flex-col md:flex-row items-stretch">
        
        {/* Left Side: Brand Visuals (Sleek Dark Accent) */}
        <div className="bg-neutral-950 p-8 text-neutral-200 flex flex-col justify-between md:w-5/12 border-b md:border-b-0 md:border-r border-neutral-800">
          <div className="space-y-4">
            <div className="w-10 h-10 shadow-[0_0_15px_rgba(255,110,48,0.3)]">
              <Logo className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="space-y-1">
              <h2 className="font-tight font-extrabold text-lg uppercase tracking-wider text-neutral-white">
                Kozker <span className="text-primary block font-light text-xs lowercase">recruiter ai</span>
              </h2>
            </div>
            <p className="text-neutral-450 text-[11px] leading-relaxed">
              Your autonomous AI recruiting agent that parses mandates, generates job specs, scores candidates, and drafts personalized screening scripts in real-time.
            </p>
          </div>
          
          <div className="pt-6 border-t border-neutral-900 text-[10px] text-neutral-500 font-mono">
            OPERATIONS PLATFORM V3.0
          </div>
        </div>

        {/* Right Side: Welcome Options */}
        <div className="p-8 flex-1 flex flex-col justify-between space-y-6 bg-neutral-550/20">
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary font-mono px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider">
                Setup Complete
              </span>
              <h1 className="text-xl font-tight font-extrabold text-neutral-850 uppercase tracking-tight pt-1">
                Welcome to your Command Center
              </h1>
              <p className="text-neutral-450 text-xs">
                To help you get acclimated with the workspace, we recommend taking a 1-minute interactive walkthrough.
              </p>
            </div>

            {/* Quick Feature Previews */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <div className="flex gap-2.5 items-start">
                <div className="p-1.5 bg-neutral-100 rounded-sm text-neutral-500 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">Clients & Mandates</h4>
                  <p className="text-[10px] text-neutral-400 leading-tight">Extract requirements from uploads.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="p-1.5 bg-neutral-100 rounded-sm text-neutral-500 mt-0.5">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">Job Catalog</h4>
                  <p className="text-[10px] text-neutral-400 leading-tight">Tune AI drafts and weights.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="p-1.5 bg-neutral-100 rounded-sm text-neutral-500 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">Sourcing Pool</h4>
                  <p className="text-[10px] text-neutral-400 leading-tight">Deduplicate & fuzzy rank talent.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="p-1.5 bg-neutral-100 rounded-sm text-neutral-500 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">AI Copilot</h4>
                  <p className="text-[10px] text-neutral-400 leading-tight">Audit candidates anywhere.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-100 text-xs">
            <button
              onClick={handleSkipTour}
              className="flex-1 py-2 border border-neutral-250 hover:bg-neutral-50 text-neutral-600 rounded-sm cursor-pointer font-bold text-center uppercase tracking-wider text-[10px]"
            >
              Explore on my own
            </button>
            <button
              onClick={handleStartTour}
              className="flex-1 py-2 bg-primary hover:bg-primary/95 text-neutral-white rounded-sm cursor-pointer font-bold flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px]"
            >
              Start Walkthrough
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
