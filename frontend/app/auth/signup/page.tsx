"use client";

import React, { useState } from "react";
import { UserCircle2, Mail, Lock, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length > 7) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (getPasswordStrength() < 3) {
      setError("Password is too weak. Please use uppercase, numbers, and symbols.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (authError) throw authError;

      // Handle cases where email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("This email is already registered.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to register");
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
            We've sent a confirmation link to <span className="text-neutral-200 font-medium">{email}</span>
          </p>
        </div>
        <div className="pt-4">
          <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors text-sm underline underline-offset-4">
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  const strength = getPasswordStrength();
  const strengthColors = ["bg-neutral-800", "bg-error", "bg-warning", "bg-primary", "bg-success"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-2xl font-tight font-semibold text-neutral-white tracking-tight">
          Create recruiter account
        </h2>
        <p className="text-neutral-400 text-xs">
          Begin high-efficiency talent acquisition
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-sm font-mono flex items-start gap-2">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4 font-sans text-sm">
        <div className="space-y-1.5">
          <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Full Name</label>
          <div className="relative">
            <UserCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Alex Mercer"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all focus:border-primary text-xs"
            />
          </div>
        </div>

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

        <div className="space-y-1.5">
          <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all focus:border-primary text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColors[strength] : 'bg-neutral-800'}`} 
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all focus:border-primary text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary hover:bg-primary/95 disabled:opacity-50 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer mt-4"
        >
          {loading ? "Creating Account..." : "Register Recruiter"}
        </button>
      </form>

      <div className="text-center font-sans text-xs pt-2">
        <Link
          href="/auth/login"
          className="text-neutral-400 hover:text-primary transition-colors cursor-pointer underline underline-offset-4"
        >
          Already registered? Log in
        </Link>
      </div>
    </div>
  );
}
