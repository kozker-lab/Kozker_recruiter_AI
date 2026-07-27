"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Terminal, Building2, UserPlus, Users, Key, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export default function DevProvisioningPage() {
  const [devKey, setDevKey] = useState('');
  const [devToken, setDevToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Organization Form state
  const [orgName, setOrgName] = useState('');
  const [operatingMode, setOperatingMode] = useState('agency');
  const [defaultPortal, setDefaultPortal] = useState('admin');
  const [orgMsg, setOrgMsg] = useState({ error: '', success: '' });

  // User Provisioning Form state
  const [targetOrgId, setTargetOrgId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userMsg, setUserMsg] = useState({ error: '', success: '' });

  const handleDevAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/dev/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dev_admin_key: devKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
      } else {
        setDevToken(data.dev_token);
        fetchDevData(data.dev_token);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDevData = async (token: string) => {
    try {
      const res = await fetch('/api/dev/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setOrganizations(data.organizations || []);
        if (data.organizations?.length > 0 && !targetOrgId) {
          setTargetOrgId(data.organizations[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dev data:', err);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgMsg({ error: '', success: '' });

    try {
      const res = await fetch('/api/dev/organizations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${devToken}`
        },
        body: JSON.stringify({
          name: orgName,
          operating_mode: operatingMode,
          default_landing_portal: defaultPortal
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setOrgMsg({ error: data.error || 'Failed to create organization', success: '' });
      } else {
        setOrgMsg({ error: '', success: `Organization '${orgName}' created successfully!` });
        setOrgName('');
        fetchDevData(devToken);
      }
    } catch (err: any) {
      setOrgMsg({ error: err.message || 'Error creating organization', success: '' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg({ error: '', success: '' });

    try {
      const res = await fetch('/api/dev/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${devToken}`
        },
        body: JSON.stringify({
          organization_id: targetOrgId,
          name: userName,
          email: userEmail,
          password: userPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setUserMsg({ error: data.error || 'Failed to provision user', success: '' });
      } else {
        setUserMsg({ error: '', success: `User '${userName}' (${userEmail}) provisioned successfully!` });
        setUserName('');
        setUserEmail('');
        setUserPassword('');
        fetchDevData(devToken);
      }
    } catch (err: any) {
      setUserMsg({ error: err.message || 'Error provisioning user', success: '' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 p-6 flex flex-col font-sans">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
            K
          </div>
          <div>
            <h1 className="text-xl font-bold font-tight text-stone-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-brand" />
              Developer Provisioning Portal
            </h1>
            <p className="text-xs text-stone-500 font-mono">Method 1 Developer Master Key Authentication (/admin/dev)</p>
          </div>
        </div>

        {devToken && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono rounded-md">
            <ShieldCheck className="w-4 h-4" />
            <span>Master Auth Session Active</span>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="max-w-6xl w-full mx-auto mt-8 flex-1">
        {!devToken ? (
          /* Authentication Screen */
          <div className="max-w-md mx-auto mt-12 bg-white border border-stone-200 rounded-lg p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-stone-900 font-tight">Method 1 Developer Verification</h2>
              <p className="text-xs text-stone-500 leading-relaxed">
                Public user signup is disabled. Enter your 64+ character high-entropy <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700">DEV_ADMIN_KEY</code> to access provisioning controls.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleDevAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5 font-mono">
                  Developer Master Secret Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={devKey}
                    onChange={(e) => setDevKey(e.target.value)}
                    placeholder="Paste 64+ char DEV_ADMIN_KEY..."
                    required
                    className="w-full pl-3 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-mono focus:outline-none focus:border-brand focus:bg-white transition-colors"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-stone-900 hover:bg-black text-white font-mono text-xs uppercase font-bold tracking-wider rounded-md transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? 'Verifying Key...' : 'Authenticate Developer Portal'}
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Provisioning Workspace */
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form 1: Create Organization */}
              <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm border-b border-stone-150 pb-3">
                  <Building2 className="w-4 h-4 text-brand" />
                  <span>1. Establish Tenant Organization</span>
                </div>

                {orgMsg.error && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{orgMsg.error}</span>
                  </div>
                )}
                {orgMsg.success && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{orgMsg.success}</span>
                  </div>
                )}

                <form onSubmit={handleCreateOrg} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Organization Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Kozker Global Executive Search"
                      required
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Operating Mode</label>
                    <select
                      value={operatingMode}
                      onChange={(e) => setOperatingMode(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    >
                      <option value="agency">Recruitment Agency Mode (Multi-Client & Branch Mandates)</option>
                      <option value="internal">Internal Corporate Organization Mode (Single Enterprise)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Default Landing Portal</label>
                    <select
                      value={defaultPortal}
                      onChange={(e) => setDefaultPortal(e.target.value)}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    >
                      <option value="admin">Admin Governance Console (https://admin.kozker.ai)</option>
                      <option value="recruiter">Recruiter AI Application (https://app.kozker.ai)</option>
                      <option value="client">Client Portal Space (https://client.kozker.ai)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-stone-900 hover:bg-black text-white font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors cursor-pointer w-full"
                  >
                    Create Tenant Workspace
                  </button>
                </form>
              </div>

              {/* Form 2: Provision User Credentials */}
              <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm border-b border-stone-150 pb-3">
                  <UserPlus className="w-4 h-4 text-brand" />
                  <span>2. Provision User Credentials</span>
                </div>

                {userMsg.error && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{userMsg.error}</span>
                  </div>
                )}
                {userMsg.success && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{userMsg.success}</span>
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Target Tenant Organization</label>
                    <select
                      value={targetOrgId}
                      onChange={(e) => setTargetOrgId(e.target.value)}
                      required
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    >
                      {organizations.length === 0 ? (
                        <option value="">No organizations available. Create one first.</option>
                      ) : (
                        organizations.map(org => (
                          <option key={org.id} value={org.id}>{org.name} ({org.operating_mode})</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">User Full Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      required
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Work Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="s.jenkins@kozker.com"
                      required
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Initial Password</label>
                    <input
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Initial login password..."
                      required
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!targetOrgId}
                    className="px-4 py-2 bg-brand hover:bg-brand-hover text-white font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors cursor-pointer w-full disabled:opacity-50"
                  >
                    Provision Account Access
                  </button>
                </form>
              </div>
            </div>

            {/* System Directory Table */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <Users className="w-4 h-4 text-brand" />
                  <span>Provisioned Accounts Directory ({users.length})</span>
                </div>
                <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200">
                  Cross-Tenant Overview
                </span>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 font-mono text-[10px] uppercase text-stone-500">
                      <th className="p-3">User Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Operating Mode</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Must Update Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-stone-400 italic">
                          No users provisioned yet. Use the provisioning form above to create user credentials.
                        </td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} className="hover:bg-stone-50">
                          <td className="p-3 font-semibold text-stone-900">{u.name}</td>
                          <td className="p-3 font-mono text-stone-600">{u.email}</td>
                          <td className="p-3 font-medium text-stone-700">{u.organizations?.name || u.organization_id}</td>
                          <td className="p-3">
                            <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded font-semibold text-stone-600">
                              {u.organizations?.operating_mode || 'internal'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono">
                            {u.must_change_password ? (
                              <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                YES (Pending Update)
                              </span>
                            ) : (
                              <span className="text-stone-400 text-[10px]">Updated</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
