"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-tight font-semibold text-neutral-white tracking-tight">
            Check your email
          </h2>
          <p className="text-neutral-400 text-sm">
            We've sent a password reset link to <span className="text-neutral-200 font-medium">{email}</span>
          </p>
        </div>
        <div className="pt-4">
          <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors text-sm underline underline-offset-4 flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-2xl font-tight font-semibold text-neutral-white tracking-tight">
          Reset password
        </h2>
        <p className="text-neutral-400 text-xs">
          Enter your email to receive a reset link
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-sm font-mono">
          {error}
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4 font-sans text-sm">
        <div className="space-y-1.5">
          <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            <input
              type="email"
              placeholder="recruiter@kozker.ai"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all focus:border-primary text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary hover:bg-primary/95 disabled:opacity-50 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <div className="text-center font-sans text-xs pt-2">
        <Link
          href="/auth/login"
          className="text-neutral-400 hover:text-primary transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>
      </div>
    </div>
  );
}
