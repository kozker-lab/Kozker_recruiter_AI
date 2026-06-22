import React from "react";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row items-stretch justify-stretch font-sans text-neutral-200">
      {/* Decorative branding column */}
      <div className="hidden md:flex md:w-1/2 bg-neutral-900 border-r border-neutral-800 p-12 flex-col justify-between relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-success/5 rounded-full blur-[90px] pointer-events-none"></div>
        
        <div className="flex items-center gap-2.5 relative z-10">
          <Logo className="w-6 h-6 text-primary" />
          <span className="font-tight font-bold text-lg tracking-wider text-neutral-white">KOZKER RECRUITER AI</span>
        </div>
        
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-tight font-bold text-neutral-white leading-tight">
            Enterprise ATS powered by Machine Intelligence.
          </h1>
          <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
            Accelerate client recruitment, auto-generate job descriptions, match talent using high-fidelity skills alignment, and automate personalized candidate review questions.
          </p>
        </div>

        <div className="relative z-10 border-t border-neutral-800/80 pt-6 flex items-center justify-between text-xs text-neutral-500 font-mono">
          <span>PLATFORM: v1.0.0-PRO</span>
          <span>DESIGN: LINEAR INSPIRATION</span>
        </div>
      </div>

      {/* Form column */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-neutral-950">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
