"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Terminal, Building2, UserPlus, Users, Key, AlertCircle, CheckCircle2, Lock, Sliders, X, Settings, ShieldAlert, Check } from 'lucide-react';

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

  // Governance Modal state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editAdminAccess, setEditAdminAccess] = useState(true);
  const [editRecruiterAccess, setEditRecruiterAccess] = useState(true);
  const [editMaxMembers, setEditMaxMembers] = useState<string>('10');
  const [editMaxRoles, setEditMaxRoles] = useState<string>('5');
  const [editCanPipelines, setEditCanPipelines] = useState(true);
  const [editCanAudit, setEditCanAudit] = useState(true);
  const [editUserStatus, setEditUserStatus] = useState('active');
  const [saveGovMsg, setSaveGovMsg] = useState({ error: '', success: '' });
  const [isSavingGov, setIsSavingGov] = useState(false);

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

  const handleOpenUserModal = (u: any) => {
    setSelectedUser(u);
    setSaveGovMsg({ error: '', success: '' });

    const rolesList = (u.member_roles || []).map((mr: any) => mr.roles).filter(Boolean);
    let isAdmin = true;
    let isRecruiter = true;
    if (rolesList.length > 0 && rolesList[0]?.role_permissions) {
      const perms = Array.isArray(rolesList[0].role_permissions) 
        ? rolesList[0].role_permissions[0] 
        : rolesList[0].role_permissions;
      if (perms) {
        isAdmin = perms.administrator !== false;
        isRecruiter = perms.access_recruitment !== false;
      }
    }

    const org = u.organizations || {};
    setEditAdminAccess(isAdmin);
    setEditRecruiterAccess(isRecruiter);
    setEditMaxMembers(org.max_members_limit !== undefined && org.max_members_limit !== null ? String(org.max_members_limit) : 'unlimited');
    setEditMaxRoles(org.max_roles_limit !== undefined && org.max_roles_limit !== null ? String(org.max_roles_limit) : 'unlimited');
    setEditCanPipelines(org.can_manage_pipelines !== false);
    setEditCanAudit(org.can_view_audit_logs !== false);
    setEditUserStatus(u.status || 'active');
  };

  const handleSaveGovernance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSavingGov(true);
    setSaveGovMsg({ error: '', success: '' });

    try {
      const res = await fetch(`/api/dev/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${devToken}`
        },
        body: JSON.stringify({
          status: editUserStatus,
          administrator: editAdminAccess,
          access_recruitment: editRecruiterAccess,
          max_members_limit: editMaxMembers === 'unlimited' ? null : Number(editMaxMembers),
          max_roles_limit: editMaxRoles === 'unlimited' ? null : Number(editMaxRoles),
          can_manage_pipelines: editCanPipelines,
          can_view_audit_logs: editCanAudit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveGovMsg({ error: data.error || 'Failed to update governance settings', success: '' });
      } else {
        setSaveGovMsg({ error: '', success: 'Account & Tenant Governance settings updated!' });
        fetchDevData(devToken);
        setTimeout(() => setSelectedUser(null), 1200);
      }
    } catch (err: any) {
      setSaveGovMsg({ error: err.message || 'Error updating settings', success: '' });
    } finally {
      setIsSavingGov(false);
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
              Developer Provisioning & Governance Portal
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
                Public user signup is disabled. Enter your 64+ character cryptographic <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700">DEV_ADMIN_KEY</code> to access provisioning controls.
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

            {/* Provisioned Accounts Directory */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <Users className="w-4 h-4 text-brand" />
                  <span>Provisioned Accounts Directory ({users.length})</span>
                </div>
                <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2.5 py-1 rounded border border-amber-200 font-bold">
                  Click any account row to configure Admin Access & Quotas
                </span>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 font-mono text-[10px] uppercase text-stone-500">
                      <th className="p-3">User Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Admin Portal Access</th>
                      <th className="p-3">Quotas (Members / Roles)</th>
                      <th className="p-3 text-right">Account Status</th>
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
                      users.map(u => {
                        const rolesList = (u.member_roles || []).map((mr: any) => mr.roles).filter(Boolean);
                        let isAdmin = true;
                        if (rolesList.length > 0 && rolesList[0]?.role_permissions) {
                          const perms = Array.isArray(rolesList[0].role_permissions) 
                            ? rolesList[0].role_permissions[0] 
                            : rolesList[0].role_permissions;
                          if (perms) isAdmin = perms.administrator !== false;
                        }

                        const org = u.organizations || {};
                        const memLimitStr = org.max_members_limit !== undefined && org.max_members_limit !== null ? org.max_members_limit : '∞';
                        const roleLimitStr = org.max_roles_limit !== undefined && org.max_roles_limit !== null ? org.max_roles_limit : '∞';

                        return (
                          <tr
                            key={u.id}
                            onClick={() => handleOpenUserModal(u)}
                            className="hover:bg-stone-100/80 cursor-pointer transition-colors group"
                          >
                            <td className="p-3 font-semibold text-stone-900 group-hover:text-brand flex items-center gap-2">
                              <span>{u.name}</span>
                              <Sliders className="w-3.5 h-3.5 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </td>
                            <td className="p-3 font-mono text-stone-600">{u.email}</td>
                            <td className="p-3 font-medium text-stone-700">{org.name || u.organization_id}</td>
                            <td className="p-3">
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Granted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200">
                                  <X className="w-3 h-3 text-red-600" />
                                  Restricted
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-[11px] text-stone-600">
                              <span className="font-semibold">{memLimitStr}</span> Members / <span className="font-semibold">{roleLimitStr}</span> Roles
                            </td>
                            <td className="p-3 text-right">
                              <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${
                                u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {u.status || 'active'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Developer Governance & Quota Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-lg w-full p-6 rounded-xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm font-tight">Developer Governance & Quotas</h3>
                  <p className="text-[11px] text-stone-500 font-mono">{selectedUser.name} ({selectedUser.email})</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveGovMsg.error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveGovMsg.error}</span>
              </div>
            )}
            {saveGovMsg.success && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-md border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveGovMsg.success}</span>
              </div>
            )}

            <form onSubmit={handleSaveGovernance} className="space-y-4 text-xs">
              {/* Section 1: Admin Console Access Permission */}
              <div className="space-y-2 p-3 bg-stone-50 border border-stone-200 rounded-lg">
                <div className="font-mono text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                  1. Admin Console Portal Access
                </div>
                <label className="flex items-center justify-between cursor-pointer pt-1">
                  <span className="font-semibold text-stone-800">Grant Admin Portal Access (/dashboard)</span>
                  <input
                    type="checkbox"
                    checked={editAdminAccess}
                    onChange={(e) => setEditAdminAccess(e.target.checked)}
                    className="accent-brand w-4 h-4 cursor-pointer"
                  />
                </label>
                <p className="text-[11px] text-stone-500">
                  If disabled, this account cannot access the Admin Console dashboard or governance engine.
                </p>
              </div>

              {/* Section 2: Tenant Quota Limits */}
              <div className="space-y-3 p-3 bg-stone-50 border border-stone-200 rounded-lg">
                <div className="font-mono text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                  2. Tenant Quotas & Resource Limits
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Max Members Limit</label>
                    <select
                      value={editMaxMembers}
                      onChange={(e) => setEditMaxMembers(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    >
                      <option value="5">5 Members Max</option>
                      <option value="10">10 Members Max</option>
                      <option value="25">25 Members Max</option>
                      <option value="50">50 Members Max</option>
                      <option value="unlimited">Unlimited Members</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Max Master Roles Limit</label>
                    <select
                      value={editMaxRoles}
                      onChange={(e) => setEditMaxRoles(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    >
                      <option value="3">3 Roles Max</option>
                      <option value="5">5 Roles Max</option>
                      <option value="10">10 Roles Max</option>
                      <option value="unlimited">Unlimited Roles</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Feature Flag Rights */}
              <div className="space-y-2 p-3 bg-stone-50 border border-stone-200 rounded-lg">
                <div className="font-mono text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                  3. Admin Feature Flag Rights
                </div>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-semibold text-stone-800">Can Configure Approval Workflows</span>
                    <input
                      type="checkbox"
                      checked={editCanPipelines}
                      onChange={(e) => setEditCanPipelines(e.target.checked)}
                      className="accent-brand w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-semibold text-stone-800">Can View System Audit Ledger</span>
                    <input
                      type="checkbox"
                      checked={editCanAudit}
                      onChange={(e) => setEditCanAudit(e.target.checked)}
                      className="accent-brand w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Section 4: Account Status */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Account Status</label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                >
                  <option value="active">Active (Access Enabled)</option>
                  <option value="disabled">Suspended / Disabled</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3.5 py-2 border border-stone-200 hover:bg-stone-100 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingGov}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white font-mono text-xs font-bold uppercase rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingGov ? 'Updating Settings...' : 'Save Developer Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
