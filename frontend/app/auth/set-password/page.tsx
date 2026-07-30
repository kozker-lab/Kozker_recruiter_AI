"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ error: '', success: '' });

  useEffect(() => {
    const emailParam = searchParams.get('email') || '';
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ error: '', success: '' });

    if (!email.trim()) {
      setMessage({ error: 'Work email address is required', success: '' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({ error: 'Password must be at least 6 characters long', success: '' });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ error: 'Passwords do not match. Please verify your entries.', success: '' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ error: data.error || 'Failed to set password', success: '' });
      } else {
        setMessage({
          error: '',
          success: 'Password set and authentication confirmed! Redirecting to Recruiter AI Application...'
        });

        if (typeof window !== "undefined") {
          localStorage.setItem("kozker_user_email", email.toLowerCase().trim());
          if (data.token) {
            localStorage.setItem("kozker_sso_token", data.token);
            document.cookie = `kozker_sso_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
          }
          document.cookie = `kozker_user_email=${encodeURIComponent(email.toLowerCase().trim())}; path=/; max-age=86400; SameSite=Lax`;
        }

        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      }
    } catch (err: any) {
      setMessage({ error: err.message || 'Network error', success: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <KeyRound className="w-6 h-6 text-orange-500" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Set Your Account Password</h1>
          <p className="text-xs text-neutral-400 font-mono">
            Kozker Recruiter AI Workspace Authentication
          </p>
        </div>

        {/* Message Notifications */}
        {message.error && (
          <div className="p-3.5 bg-red-950/80 border border-red-800/80 text-red-200 text-xs rounded-lg flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{message.error}</span>
          </div>
        )}

        {message.success && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs rounded-lg flex items-start gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-semibold">{message.success}</span>
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-300 mb-1 font-mono text-[11px] uppercase tracking-wider">
              Work Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. member@company.com"
              required
              className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1 font-mono text-[11px] uppercase tracking-wider">
              New Account Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters..."
                required
                className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-orange-500 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1 font-mono text-[11px] uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password to verify..."
              required
              className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 shadow-lg"
          >
            <span>{loading ? "Activating Account..." : "Confirm Password & Access Recruiter App"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center font-mono text-xs">Loading authentication page...</div>}>
      <SetPasswordForm />
    </Suspense>
  );
}
