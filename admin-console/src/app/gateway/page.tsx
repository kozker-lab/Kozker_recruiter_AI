"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Briefcase, ExternalLink, Building2, User, LogOut, LayoutGrid, Lock } from 'lucide-react';

export default function GatewayPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [urls, setUrls] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          router.replace('/login');
        } else {
          setUserData(data.user);
          setUrls(data.urls || {});
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center font-mono text-xs text-stone-500">
        Authenticating session & loading gateway tiles...
      </div>
    );
  }

  const permissions = userData?.permissions || {};

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 p-6 flex flex-col font-sans">
      {/* Top Header */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
            K
          </div>
          <div>
            <h1 className="text-xl font-bold font-tight text-stone-900 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-brand" />
              Kozker Application Gateway Hub
            </h1>
            <p className="text-xs text-stone-500 font-mono">Unified SSO & Multi-Tenant Portal Launcher</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-bold text-stone-900">{userData?.name}</div>
            <div className="text-[10px] text-stone-500 font-mono">{userData?.organization_name}</div>
          </div>
          <button
            onClick={() => {
              document.cookie = 'kozker_sso_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              router.push('/login');
            }}
            className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-5xl w-full mx-auto mt-10 space-y-8 flex-1">
        {/* User Session Summary Banner */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 font-bold font-mono text-sm">
              {userData?.name?.slice(0, 2)?.toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900">{userData?.name}</div>
              <div className="text-xs text-stone-500 font-mono">{userData?.email}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-md border border-stone-200 flex items-center gap-1 font-semibold">
              <Building2 className="w-3.5 h-3.5 text-stone-500" />
              {userData?.organization_name}
            </span>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200 font-semibold uppercase text-[10px]">
              Mode: {userData?.operating_mode || 'internal'}
            </span>
            {permissions.administrator && (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 font-semibold uppercase text-[10px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Master Admin
              </span>
            )}
          </div>
        </div>

        {/* Portal Launch Tiles */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono uppercase font-bold text-stone-400 tracking-wider">
            Authorized Application Portals
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tile 1: Kozker Admin Console */}
            <div
              onClick={() => {
                if (permissions.administrator || permissions.audit_logs) {
                  router.push('/dashboard');
                }
              }}
              className={`bg-white border rounded-lg p-6 shadow-sm flex flex-col justify-between transition-all duration-200 ${
                permissions.administrator || permissions.audit_logs
                  ? 'border-stone-200 hover:border-brand hover:shadow-md cursor-pointer group'
                  : 'border-stone-200 opacity-60 bg-stone-50 cursor-not-allowed'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-brand/10 text-brand rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  {permissions.administrator || permissions.audit_logs ? (
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-brand transition-colors" />
                  ) : (
                    <Lock className="w-4 h-4 text-stone-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-stone-900 text-sm font-tight group-hover:text-brand transition-colors">
                    Kozker Admin Console
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Master role configurator, 3-tier hierarchy tree, approval pipelines engine, members directory, and system audit ledger.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-stone-150 flex items-center justify-between text-[11px] font-mono">
                <span className="text-stone-400">https://admin.kozker.ai</span>
                <span className={`font-semibold ${permissions.administrator ? 'text-emerald-600' : 'text-stone-400'}`}>
                  {permissions.administrator ? 'Full Access' : 'Restricted'}
                </span>
              </div>
            </div>

            {/* Tile 2: Kozker Recruiter AI Application */}
            <div
              onClick={() => {
                if (permissions.access_recruitment) {
                  const targetUrl = urls.recruiter_app || 'https://app.kozker.ai';
                  window.location.href = targetUrl;
                }
              }}
              className={`bg-white border rounded-lg p-6 shadow-sm flex flex-col justify-between transition-all duration-200 ${
                permissions.access_recruitment
                  ? 'border-stone-200 hover:border-blue-500 hover:shadow-md cursor-pointer group'
                  : 'border-stone-200 opacity-60 bg-stone-50 cursor-not-allowed'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  {permissions.access_recruitment ? (
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-blue-600 transition-colors" />
                  ) : (
                    <Lock className="w-4 h-4 text-stone-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-stone-900 text-sm font-tight group-hover:text-blue-600 transition-colors">
                    Kozker Recruiter AI App
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Direct access to candidate pools, job catalogue, AI talent sourcing pool, video screening Q&A forms, and funnel stage progression.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-stone-150 flex items-center justify-between text-[11px] font-mono">
                <span className="text-stone-400">https://app.kozker.ai</span>
                <span className={`font-semibold ${permissions.access_recruitment ? 'text-emerald-600' : 'text-stone-400'}`}>
                  {permissions.access_recruitment ? 'Authorized' : 'Restricted'}
                </span>
              </div>
            </div>

            {/* Tile 3: Client Portal Space */}
            <div
              onClick={() => {
                if (permissions.access_client) {
                  const targetUrl = urls.client_portal || 'https://client.kozker.ai';
                  window.location.href = targetUrl;
                }
              }}
              className={`bg-white border rounded-lg p-6 shadow-sm flex flex-col justify-between transition-all duration-200 ${
                permissions.access_client
                  ? 'border-stone-200 hover:border-emerald-500 hover:shadow-md cursor-pointer group'
                  : 'border-stone-200 opacity-60 bg-stone-50 cursor-not-allowed'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  {permissions.access_client ? (
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-emerald-600 transition-colors" />
                  ) : (
                    <Lock className="w-4 h-4 text-stone-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-stone-900 text-sm font-tight group-hover:text-emerald-600 transition-colors">
                    Client Portal Space
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    External client onboarding space for shared candidate shortlists, client hiring contracts, SOW terms, and direct mandate uploads.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-stone-150 flex items-center justify-between text-[11px] font-mono">
                <span className="text-stone-400">https://client.kozker.ai</span>
                <span className={`font-semibold ${permissions.access_client ? 'text-emerald-600' : 'text-stone-400'}`}>
                  {permissions.access_client ? 'Authorized' : 'Tentative Setup'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
