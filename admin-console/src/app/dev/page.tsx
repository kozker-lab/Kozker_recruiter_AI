"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Terminal, Building2, UserPlus, Users, Key, AlertCircle, CheckCircle2, Lock, Sliders, X, RefreshCw, Send, Radio, UserCheck } from 'lucide-react';

export default function DevProvisioningPage() {
  const [devKey, setDevKey] = useState('');
  const [devToken, setDevToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Unified Provisioning Form state
  const [provisionMode, setProvisionMode] = useState<'new_org' | 'existing_org'>('new_org');
  const [orgName, setOrgName] = useState('');
  const [operatingMode, setOperatingMode] = useState('agency');
  const [defaultPortal, setDefaultPortal] = useState('admin');
  const [targetOrgId, setTargetOrgId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [unifiedMsg, setUnifiedMsg] = useState({ error: '', success: '' });
  const [isLoadingUnified, setIsLoadingUnified] = useState(false);

  // Rolling Updates Broadcast Form state
  const [versionTag, setVersionTag] = useState('v3.2.0');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');
  const [updateCategory, setUpdateCategory] = useState('Feature Release');
  const [updatePriority, setUpdatePriority] = useState('Normal');
  const [updateMsg, setUpdateMsg] = useState({ error: '', success: '' });

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

  const handleUnifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnifiedMsg({ error: '', success: '' });
    setIsLoadingUnified(true);

    try {
      let finalOrgId = targetOrgId;
      let createdOrgName = orgName;

      if (provisionMode === 'new_org') {
        if (!orgName.trim()) {
          setUnifiedMsg({ error: 'Organization name is required', success: '' });
          setIsLoadingUnified(false);
          return;
        }

        // 1. Create Organization first
        const orgRes = await fetch('/api/dev/organizations/create', {
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

        const orgData = await orgRes.json();
        if (!orgRes.ok) {
          setUnifiedMsg({ error: orgData.error || 'Failed to create organization', success: '' });
          setIsLoadingUnified(false);
          return;
        }
        finalOrgId = orgData.organization?.id || orgData.id;
      } else {
        const foundOrg = organizations.find(o => o.id === finalOrgId);
        if (foundOrg) createdOrgName = foundOrg.name;
      }

      if (!finalOrgId) {
        setUnifiedMsg({ error: 'Target organization ID could not be determined', success: '' });
        setIsLoadingUnified(false);
        return;
      }

      // 2. Create Primary Organization Admin Account bound specifically to this Organization
      const userRes = await fetch('/api/dev/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${devToken}`
        },
        body: JSON.stringify({
          organization_id: finalOrgId,
          name: userName,
          email: userEmail,
          password: userPassword
        })
      });

      const userData = await userRes.json();
      if (!userRes.ok) {
        setUnifiedMsg({ error: userData.error || 'Failed to provision admin account', success: '' });
      } else {
        setUnifiedMsg({
          error: '',
          success: provisionMode === 'new_org'
            ? `Organization '${createdOrgName}' established & Primary Admin '${userName}' (${userEmail}) provisioned successfully!`
            : `Primary Admin '${userName}' (${userEmail}) provisioned for organization '${createdOrgName}'!`
        });
        setOrgName('');
        setUserName('');
        setUserEmail('');
        setUserPassword('');
        fetchDevData(devToken);
      }
    } catch (err: any) {
      setUnifiedMsg({ error: err.message || 'Error executing unified setup', success: '' });
    } finally {
      setIsLoadingUnified(false);
    }
  };

  const handleBroadcastUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMsg({ error: '', success: '' });

    try {
      const res = await fetch('/api/dev/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${devToken}`
        },
        body: JSON.stringify({
          version_tag: versionTag,
          title: updateTitle,
          description: updateDescription,
          category: updateCategory,
          priority: updatePriority
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setUpdateMsg({ error: data.error || 'Failed to broadcast update', success: '' });
      } else {
        setUpdateMsg({ error: '', success: `Platform update '${updateTitle}' (${versionTag}) broadcasted successfully!` });
        setUpdateTitle('');
        setUpdateDescription('');
      }
    } catch (err: any) {
      setUpdateMsg({ error: err.message || 'Error broadcasting update', success: '' });
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
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-mono font-bold shadow-sm">
            <Terminal className="w-5 h-5 text-brand" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-stone-900">Developer Provisioning Portal</h1>
              <span className="bg-brand/10 text-brand border border-brand/20 font-mono text-[9px] uppercase px-2 py-0.5 rounded font-bold">
                Level 0 SuperAdmin
              </span>
            </div>
            <p className="text-xs text-stone-500">System Developer Controls: Provision Organization Workspaces & Bind Primary Admins</p>
          </div>
        </div>

        {devToken && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDevData(devToken)}
              className="p-2 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Refresh Tenants & Users"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setDevToken('')}
              className="px-3 py-1.5 text-xs font-mono font-semibold text-stone-600 hover:text-red-700 bg-white border border-stone-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
            >
              Exit Dev Portal
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl w-full mx-auto py-8 flex-1">
        {!devToken ? (
          /* Developer Key Verification Form */
          <div className="max-w-md mx-auto bg-white border border-stone-200 rounded-xl p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-700">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-stone-900">System Developer Access Required</h2>
              <p className="text-xs text-stone-500">Enter the Master Developer Secret Key to provision organizations and assign organization admins.</p>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleDevAuth} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Developer Secret Key</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={devKey}
                    onChange={(e) => setDevKey(e.target.value)}
                    placeholder="Enter DEV_ADMIN_KEY..."
                    required
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-mono focus:outline-none focus:border-brand"
                  />
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Card 1: Unified Form — Establish Organization & Provision Admin */}
              <div className="lg:col-span-2 bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
                  <div className="flex items-center gap-2.5 text-stone-900 font-bold text-sm">
                    <Building2 className="w-4.5 h-4.5 text-brand" />
                    <span>Establish Organization & Provision Admin</span>
                  </div>
                  
                  {/* Unified Provision Mode Selector */}
                  <div className="flex items-center bg-stone-100 p-0.5 rounded-md border border-stone-200 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setProvisionMode('new_org')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-sm transition-all cursor-pointer ${
                        provisionMode === 'new_org' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      New Organization + Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvisionMode('existing_org')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-sm transition-all cursor-pointer ${
                        provisionMode === 'existing_org' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Add Admin to Existing Org
                    </button>
                  </div>
                </div>

                <p className="text-xs text-stone-500">
                  {provisionMode === 'new_org'
                    ? 'Establish a new tenant organization and automatically provision its primary administrator bound strictly to that workspace.'
                    : 'Provision an additional primary administrator bound strictly to a target organization.'}
                </p>

                {unifiedMsg.error && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{unifiedMsg.error}</span>
                  </div>
                )}
                {unifiedMsg.success && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{unifiedMsg.success}</span>
                  </div>
                )}

                <form onSubmit={handleUnifiedSubmit} className="space-y-4 text-xs">
                  {provisionMode === 'new_org' ? (
                    <>
                      {/* Section A: Organization Details */}
                      <div className="p-4 bg-stone-50/70 border border-stone-200 rounded-md space-y-3">
                        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                          <span className="font-bold text-stone-800 uppercase text-[10px] tracking-wider font-mono flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-stone-500" />
                            1. Organization Workspace Details
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-stone-700 mb-1">Organization Name *</label>
                            <input
                              type="text"
                              value={orgName}
                              onChange={(e) => setOrgName(e.target.value)}
                              placeholder="e.g. Kozker Global"
                              required={provisionMode === 'new_org'}
                              className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-stone-700 mb-1">Operating Mode</label>
                            <select
                              value={operatingMode}
                              onChange={(e) => setOperatingMode(e.target.value)}
                              className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                            >
                              <option value="agency">Recruitment Agency Mode</option>
                              <option value="internal">Internal Corporate Mode</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section B: Primary Organization Admin */}
                      <div className="p-4 bg-brand/5 border border-brand/20 rounded-md space-y-3">
                        <div className="flex items-center justify-between border-b border-brand/20 pb-2">
                          <span className="font-bold text-brand uppercase text-[10px] tracking-wider font-mono flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-brand" />
                            2. Primary Admin (Bound to {orgName.trim() || 'New Organization'})
                          </span>
                          <span className="text-[9px] font-mono text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200 font-semibold">
                            Primary Admin Access
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-semibold text-stone-700 mb-1">Admin Full Name *</label>
                            <input
                              type="text"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              placeholder="e.g. Sarah Jenkins"
                              required
                              className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-stone-700 mb-1">Admin Email *</label>
                            <input
                              type="email"
                              value={userEmail}
                              onChange={(e) => setUserEmail(e.target.value)}
                              placeholder="s.jenkins@kozker.com"
                              required
                              className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-stone-700 mb-1">Initial Password *</label>
                            <input
                              type="password"
                              value={userPassword}
                              onChange={(e) => setUserPassword(e.target.value)}
                              placeholder="Initial login password..."
                              required
                              className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Existing Org Admin Provisioning */}
                      <div className="p-4 bg-stone-50/70 border border-stone-200 rounded-md space-y-3">
                        <span className="font-bold text-stone-800 uppercase text-[10px] tracking-wider font-mono block border-b border-stone-200 pb-2">
                          Target Organization
                        </span>
                        <div>
                          <label className="block font-semibold text-stone-700 mb-1">Select Organization *</label>
                          <select
                            value={targetOrgId}
                            onChange={(e) => setTargetOrgId(e.target.value)}
                            required={provisionMode === 'existing_org'}
                            className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                          >
                            {organizations.length === 0 ? (
                              <option value="">No orgs available</option>
                            ) : (
                              organizations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="p-4 bg-brand/5 border border-brand/20 rounded-md space-y-3">
                        <span className="font-bold text-brand uppercase text-[10px] tracking-wider font-mono block border-b border-brand/20 pb-2">
                          Organization Admin Account Credentials
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-semibold text-stone-700 mb-1">Admin Full Name *</label>
                            <input
                              type="text"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              placeholder="e.g. Sarah Jenkins"
                              required
                              className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-stone-700 mb-1">Admin Email *</label>
                            <input
                              type="email"
                              value={userEmail}
                              onChange={(e) => setUserEmail(e.target.value)}
                              placeholder="s.jenkins@kozker.com"
                              required
                              className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-stone-700 mb-1">Initial Password *</label>
                            <input
                              type="password"
                              value={userPassword}
                              onChange={(e) => setUserPassword(e.target.value)}
                              placeholder="Initial login password..."
                              required
                              className="w-full p-2 bg-white border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isLoadingUnified}
                    className="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors cursor-pointer w-full flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-3"
                  >
                    {isLoadingUnified ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>{provisionMode === 'new_org' ? 'Establish Workspace & Provision Admin' : 'Provision Organization Admin'}</span>
                  </button>
                </form>
              </div>

              {/* Card 2: Broadcast Platform Rolling Update */}
              <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm border-b border-stone-200 pb-3">
                  <Radio className="w-4 h-4 text-brand" />
                  <span>2. Broadcast Rolling Update</span>
                </div>

                {updateMsg.error && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{updateMsg.error}</span>
                  </div>
                )}
                {updateMsg.success && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{updateMsg.success}</span>
                  </div>
                )}

                <form onSubmit={handleBroadcastUpdate} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Version Tag</label>
                      <input
                        type="text"
                        value={versionTag}
                        onChange={(e) => setVersionTag(e.target.value)}
                        placeholder="v3.2.0"
                        required
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs font-mono focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Priority</label>
                      <select
                        value={updatePriority}
                        onChange={(e) => setUpdatePriority(e.target.value)}
                        className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Release Title</label>
                    <input
                      type="text"
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      placeholder="e.g. Master Role Quota & SSO Update"
                      required
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Release Notes</label>
                    <textarea
                      value={updateDescription}
                      onChange={(e) => setUpdateDescription(e.target.value)}
                      placeholder="Detailed update notes for admin consoles..."
                      required
                      rows={3}
                      className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-stone-800 hover:bg-black text-white font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors cursor-pointer w-full flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Release</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Provisioned Accounts Directory */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <Users className="w-4 h-4 text-brand" />
                  <span>Provisioned Organization Admin Accounts Directory ({users.length})</span>
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
                  <tbody className="divide-y divide-stone-200">
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
                                  Granted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200">
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
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-lg w-full p-6 rounded-xl shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Developer Governance & Quotas</h3>
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
              </div>

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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
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
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white font-mono text-xs font-bold uppercase rounded shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSavingGov ? 'Updating...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
