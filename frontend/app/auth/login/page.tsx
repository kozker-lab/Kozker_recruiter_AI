"use client";

import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-2xl font-tight font-semibold text-neutral-white tracking-tight">
          Welcome back
        </h2>
        <p className="text-neutral-400 text-xs">
          Log in to manage requirements & pipelines
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-sm font-mono">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 font-sans text-sm">
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
          <div className="flex justify-between items-center">
            <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
              Forgot?
            </Link>
          </div>
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary hover:bg-primary/95 disabled:opacity-50 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <div className="text-center font-sans text-xs pt-2">
        <Link
          href="/auth/signup"
          className="text-neutral-400 hover:text-primary transition-colors cursor-pointer underline underline-offset-4"
        >
          Need an account? Sign up
        </Link>
      </div>
    </div>
  );
}
