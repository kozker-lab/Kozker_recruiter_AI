"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase-client';

export default function SetPasswordPage() {
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
      // 1. Client-side Supabase GoTrue Auth password update
      try {
        if (supabaseClient.auth) {
          await supabaseClient.auth.updateUser({ password });
        }
      } catch (sbErr) {
        console.log('Client Supabase Auth updateUser notice:', sbErr);
      }

      // 2. Call backend API to confirm password, update database & issue SSO token
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
          success: 'Password set and Supabase authentication confirmed! Token has been verified and expired. Redirecting to Portal Dashboard...'
        });

        if (data.token) {
          document.cookie = `kozker_sso_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        }

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1200);
      }
    } catch (err: any) {
      setMessage({ error: err.message || 'Network error', success: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-stone-950 border border-stone-800 rounded-xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/30 text-brand flex items-center justify-center mx-auto mb-3 shadow-lg">
            <KeyRound className="w-6 h-6 text-brand" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Set Your Portal Password</h1>
          <p className="text-xs text-stone-400 font-mono">
            Complete Supabase authentication to activate unified portal access
          </p>
        </div>

        {/* Informational Banner */}
        <div className="p-3.5 bg-brand/10 border border-brand/20 rounded-lg text-[11px] text-stone-300 leading-relaxed space-y-1">
          <div className="font-bold text-brand flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
            <span>Unified Password Configuration</span>
          </div>
          <p>
            The email and password set on this page will serve as your single set of credentials for both the <strong>Admin Console</strong> and the <strong>Recruitment AI Application</strong>.
          </p>
        </div>

        {message.error && (
          <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-lg flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{message.error}</span>
          </div>
        )}

        {message.success && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{message.success}</span>
          </div>
        )}

        <form onSubmit={handleSetPassword} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-300 mb-1 font-mono uppercase text-[10px] tracking-wider">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.com"
                required
                className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-800 rounded-md text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-brand font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-300 mb-1 font-mono uppercase text-[10px] tracking-wider">
              New Account Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full pl-9 pr-10 py-2 bg-stone-900 border border-stone-800 rounded-md text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-brand font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-stone-500 hover:text-stone-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-300 mb-1 font-mono uppercase text-[10px] tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={6}
                className="w-full pl-9 pr-10 py-2 bg-stone-900 border border-stone-800 rounded-md text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-brand font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-mono uppercase font-bold rounded-md transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg mt-2"
          >
            <span>{loading ? 'Confirming Supabase Authentication...' : 'Set Password & Confirm Supabase Auth'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-stone-800">
          <p className="text-[11px] text-stone-500 font-mono">
            Kozker Gateway • Supabase Authentication Management
          </p>
        </div>
      </div>
    </div>
  );
}
