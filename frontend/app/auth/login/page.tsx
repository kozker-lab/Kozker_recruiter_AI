"use client";

import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Building2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations");
      const data = await res.json();
      if (data.success && Array.isArray(data.organizations)) {
        setOrganizations(data.organizations);
        if (data.organizations.length > 0 && !selectedOrg) {
          setSelectedOrg(data.organizations[0].id);
        }
      }
    } catch {
      // Ignore background fetch error
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (selectedOrg) {
        localStorage.setItem("kozker_selected_org", selectedOrg);
      }

      // 1. Try Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!authError) {
        window.location.href = "/dashboard";
        return;
      }

      // 2. Fallback to Admin Console SSO Authentication Endpoint
      const adminConsoleUrl = process.env.NEXT_PUBLIC_ADMIN_CONSOLE_URL || "http://localhost:3001";
      try {
        const ssoRes = await fetch(`${adminConsoleUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          body: JSON.stringify({ email: cleanEmail, password, organization_id: selectedOrg || undefined })
        });

        if (ssoRes.ok) {
          const ssoData = await ssoRes.json();
          if (ssoData.token) {
            document.cookie = `kozker_sso_token=${ssoData.token}; path=/; max-age=86400; SameSite=Lax`;
            window.location.href = "/dashboard";
            return;
          }
        } else {
          const errData = await ssoRes.json().catch(() => ({}));
          throw new Error(errData.error || "Invalid email or password");
        }
      } catch (fetchErr: any) {
        if (fetchErr.message && !fetchErr.message.includes("fetch") && !fetchErr.message.includes("NetworkError")) {
          throw fetchErr;
        }
      }

      throw new Error("Invalid email or password. Please verify your credentials or complete password setup via your invitation email.");
    } catch (err: any) {
      const rawMsg = err?.message || "";
      if (rawMsg.includes("NetworkError") || rawMsg.includes("fetch")) {
        setError("Invalid email or password. Please verify your credentials or complete password setup via your invitation email.");
      } else {
        setError(rawMsg || "Failed to log in");
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-2xl font-tight font-semibold text-neutral-white tracking-tight">
          Welcome back
        </h2>
        <p className="text-neutral-400 text-xs">
          Log in to manage requirements & pipelines
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-sm font-mono leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 text-sm">
        {/* Optional Organization Workspace Selector */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Target Organization Workspace</label>
            <span className="text-[10px] text-neutral-500 font-mono font-normal uppercase">(Optional)</span>
          </div>
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-neutral-white transition-all focus:border-primary text-xs font-semibold cursor-pointer appearance-none"
            >
              <option value="" disabled>🏢 Select Target Organization...</option>
              {organizations.map((org: any) => (
                <option key={org.id} value={org.id}>🏢 {org.name}</option>
              ))}
            </select>
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
              className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
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
    </div>
  );
}
