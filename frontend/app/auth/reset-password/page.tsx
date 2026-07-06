"use client";

import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Listen for auth state change (Supabase parses hash asynchronously)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setHasSession(true);
      } else {
        setHasSession(false);
      }
      setCheckingSession(false);
    });

    // Direct session check on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      }
      setCheckingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Next.js client component - if we wanted to verify token from URL we could,
  // but Supabase handles the token hash automatically in the URL fragment.

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length > 7) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const handleUpdate = async (e: React.FormEvent) => {
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-500 py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-neutral-400 text-xs">Verifying reset token...</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-500 py-4">
        <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-sm font-mono">
          Reset session missing or expired. Please request a new password reset link.
        </div>
        <Link 
          href="/auth/forgot-password"
          className="text-primary hover:underline text-xs block font-medium"
        >
          Go to Forgot Password
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-tight font-semibold text-neutral-white tracking-tight">
            Password updated
          </h2>
          <p className="text-neutral-400 text-sm">
            Your password has been successfully reset. Redirecting to login...
          </p>
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
          Create new password
        </h2>
        <p className="text-neutral-400 text-xs">
          Enter your new password below
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-sm font-mono">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-4 font-sans text-sm">
        <div className="space-y-1.5">
          <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">New Password</label>
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
          <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Confirm New Password</label>
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
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
