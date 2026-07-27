"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Briefcase, User, Terminal, ArrowRight, LayoutGrid, Building2, Lock, CheckCircle2 } from 'lucide-react';

export default function MasterLandingPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setSession(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans flex flex-col justify-between p-6">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-extrabold text-xl shadow-md">
            K
          </div>
          <div>
            <h1 className="text-lg font-bold font-tight text-stone-900 tracking-tight">Kozker Unified Gateway</h1>
            <p className="text-xs text-stone-500 font-mono">Master Enterprise Portal Launcher</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/gateway"
              className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono font-bold uppercase rounded shadow-sm transition-colors flex items-center gap-1.5"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Launch Gateway ({session.name})</span>
            </Link>
          ) : (
            <>
              <Link
                href="/dev"
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-mono font-semibold rounded border border-stone-200 transition-colors flex items-center gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5 text-stone-500" />
                <span>Developer Access</span>
              </Link>
              <Link
                href="/login"
                className="px-4 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-mono font-bold uppercase rounded shadow-sm transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-6xl w-full mx-auto my-12 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 border border-brand/20 text-brand text-xs font-mono font-bold rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Unified Single Sign-On & RBAC Gateway</span>
          </div>
          <h2 className="text-3xl font-extrabold text-stone-900 font-tight tracking-tight sm:text-4xl">
            One Gateway to Access All Kozker Platform Portals
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed font-sans">
            Select a portal below to access governance controls, AI recruitment tools, client mandate management, or developer account provisioning.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Admin Governance Console */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-brand hover:shadow-md transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-stone-900 text-base font-tight group-hover:text-brand transition-colors">
                  Admin Console
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Master role configurator, 3-tier hierarchy tree, approval pipelines engine, members directory, and audit ledger.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-150 flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-400">admin.kozker.ai</span>
              <Link
                href={session ? "/dashboard" : "/login"}
                className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-mono font-bold rounded transition-colors flex items-center gap-1"
              >
                <span>Enter Admin</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Kozker Recruiter AI Application */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-blue-500 hover:shadow-md transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-stone-900 text-base font-tight group-hover:text-blue-600 transition-colors">
                  Recruiter AI App
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  AI candidate matching, job catalog, talent sourcing pool, video screening Q&A forms, and funnel stage progression.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-150 flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-400">app.kozker.ai</span>
              <a
                href="http://localhost:3000"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold rounded transition-colors flex items-center gap-1"
              >
                <span>Launch App</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Card 3: Client Portal Space */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-emerald-500 hover:shadow-md transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-stone-900 text-base font-tight group-hover:text-emerald-600 transition-colors">
                  Client Portal Space
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  External client onboarding space for shared candidate shortlists, client hiring contracts, SOW terms, and mandate uploads.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-150 flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-400">client.kozker.ai</span>
              <span className="px-2.5 py-1 bg-stone-100 text-stone-500 font-mono text-[10px] rounded font-semibold border border-stone-200">
                Tentative Setup
              </span>
            </div>
          </div>

          {/* Card 4: Developer Provisioning Portal */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-amber-500 hover:shadow-md transition-all group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Terminal className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-stone-900 text-base font-tight group-hover:text-amber-600 transition-colors">
                  Developer Portal
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Method 1 authentication using DEV_ADMIN_KEY to provision tenant organizations and generate initial user credentials.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-150 flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-400">admin.kozker.ai/dev</span>
              <Link
                href="/dev"
                className="px-3 py-1.5 bg-stone-800 hover:bg-black text-white text-xs font-mono font-bold rounded transition-colors flex items-center gap-1"
              >
                <span>Dev Portal</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto border-t border-stone-200 pt-6 text-center text-xs font-mono text-stone-400">
        Kozker Recruiter AI Platform • Admin Console & Multi-Tenant Gateway
      </footer>
    </div>
  );
}
