"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forced password update modal state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [sessionToken, setSessionToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Login failed');
      } else {
        setSessionToken(data.token);
        if (data.must_change_password) {
          setMustChangePassword(true);
        } else {
          router.push('/gateway');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (newPassword.length < 8) {
      setPassError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match');
      return;
    }

    setIsUpdatingPass(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setPassError(data.error || 'Failed to update password');
      } else {
        setMustChangePassword(false);
        router.push('/gateway');
      }
    } catch (err: any) {
      setPassError(err.message || 'Network error');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-lg p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-tight text-stone-900">Kozker Gateway Sign In</h1>
          <p className="text-xs text-stone-500">Sign in to access your organization's authorized portals</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="s.jenkins@kozker.com"
              required
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-none focus:border-brand focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-none focus:border-brand focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white font-mono text-xs uppercase font-bold tracking-wider rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Signing In...' : 'Sign In to Gateway'}
          </button>
        </form>

        <div className="pt-4 border-t border-stone-150 text-center">
          <a href="/dev" className="text-xs text-stone-500 hover:text-stone-800 font-mono underline">
            Developer Provisioning Portal (/admin/dev)
          </a>
        </div>
      </div>

      {/* Forced First-Time Password Update Modal */}
      {mustChangePassword && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-md w-full p-6 rounded-lg shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-stone-150 pb-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-md flex items-center justify-center border border-amber-200">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">Update Initial Credentials Required</h3>
                <p className="text-[11px] text-stone-500">First-time login detected. Set your personal password to continue.</p>
              </div>
            </div>

            {passError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">New Personal Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters..."
                  required
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password..."
                  required
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPass}
                className="w-full py-2.5 bg-stone-900 hover:bg-black text-white font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isUpdatingPass ? 'Updating Credentials...' : 'Update Password & Access Gateway'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
