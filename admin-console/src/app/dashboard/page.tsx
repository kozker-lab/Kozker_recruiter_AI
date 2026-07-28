"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, GitPullRequest, Users, History, Terminal, ChevronDown,
  Plus, Check, X, Building2, Briefcase, ExternalLink, Lock, Settings,
  Clock, AlertCircle, CheckCircle2, Sliders, ChevronRight, Layers, ArrowUpRight,
  Radio, RefreshCw, Mail, UserPlus, Send, Tag, Info, LayoutGrid, Award, Search, UserCheck, Shield, Trash2
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'roles' | 'pipelines' | 'members' | 'updates' | 'audit'>('roles');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [urls, setUrls] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Data states
  const [roles, setRoles] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [rollingUpdates, setRollingUpdates] = useState<any[]>([]);

  // Selected Role for Permission Matrix Editing
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<any>({});
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleSaveMsg, setRoleSaveMsg] = useState({ error: '', success: '' });

  // New Role Modal
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState('position');
  const [newRoleParentId, setNewRoleParentId] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#ff6e30');

  // New Pipeline Modal
  const [isNewPipelineOpen, setIsNewPipelineOpen] = useState(false);
  const [pipelineName, setPipelineName] = useState('');
  const [pipelineCategory, setPipelineCategory] = useState('Hiring & Offers');
  const [pipelineDesc, setPipelineDesc] = useState('');

  // Email Invitation Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteMsg, setInviteMsg] = useState({ error: '', success: '' });
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Member Role Assignment Modal
  const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<any>(null);
  const [selectedRoleForMember, setSelectedRoleForMember] = useState<string>('');
  const [assignRoleMsg, setAssignRoleMsg] = useState({ error: '', success: '' });
  const [isSavingMemberRole, setIsSavingMemberRole] = useState(false);

  // Member Removal Modal
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [removeMemberMsg, setRemoveMemberMsg] = useState({ error: '', success: '' });
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Dropdown States
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          router.replace('/login');
        } else {
          setCurrentUser(data.user);
          setUrls(data.urls || {});
          fetchAllData();
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const fetchAllData = async () => {
    try {
      const [rRes, pRes, aRes, mRes, lRes, uRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/pipelines'),
        fetch('/api/approvals/pending'),
        fetch('/api/members'),
        fetch('/api/audit-logs'),
        fetch('/api/updates'),
      ]);

      const rData = await rRes.json();
      const pData = await pRes.json();
      const aData = await aRes.json();
      const mData = await mRes.json();
      const lData = await lRes.json();
      const uData = await uRes.json();

      if (rData.roles) {
        setRoles(rData.roles);
        if (rData.roles.length > 0 && !selectedRole) {
          setSelectedRole(rData.roles[0]);
          const permObj = Array.isArray(rData.roles[0].role_permissions)
            ? rData.roles[0].role_permissions[0]
            : rData.roles[0].role_permissions;
          setRolePermissions(permObj || {});
        }
        if (rData.roles.length > 0 && !inviteRoleId) {
          setInviteRoleId(rData.roles[0].id);
        }
      }
      if (pData.pipelines) setPipelines(pData.pipelines);
      if (aData.approvals) setApprovals(aData.approvals);
      if (mData.members) setMembers(mData.members);
      if (lData.audit_logs) setAuditLogs(lData.audit_logs);
      if (uData.updates) setRollingUpdates(uData.updates);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const isPrimaryAdmin = currentUser?.is_primary_admin || currentUser?.permissions?.administrator || false;

  const handleSelectRole = (r: any) => {
    setSelectedRole(r);
    setRoleSaveMsg({ error: '', success: '' });
    const permObj = Array.isArray(r.role_permissions) ? r.role_permissions[0] : r.role_permissions;
    setRolePermissions(permObj || {});
  };

  const handlePermissionToggle = (key: string) => {
    if (!isPrimaryAdmin) return;
    setRolePermissions((prev: any) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || !isPrimaryAdmin) return;
    setIsSavingRole(true);
    setRoleSaveMsg({ error: '', success: '' });

    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: rolePermissions })
      });

      const data = await res.json();
      if (!res.ok) {
        setRoleSaveMsg({ error: data.error || 'Failed to update permissions', success: '' });
      } else {
        setRoleSaveMsg({ error: '', success: `Permissions for '${selectedRole.name}' saved successfully!` });
        fetchAllData();
      }
    } catch (err: any) {
      setRoleSaveMsg({ error: err.message || 'Network error', success: '' });
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleApplyTemplate = async (templateKey: string) => {
    if (!selectedRole || !isPrimaryAdmin) return;
    setIsTemplateDropdownOpen(false);
    setIsSavingRole(true);
    setRoleSaveMsg({ error: '', success: '' });

    try {
      const res = await fetch(`/api/roles/${selectedRole.id}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_key: templateKey, template: templateKey })
      });

      const data = await res.json();
      if (res.ok && data.permissions) {
        setRolePermissions(data.permissions);
        setRoleSaveMsg({ error: '', success: `Applied template authorizations to '${selectedRole.name}'` });
        fetchAllData();
      } else {
        setRoleSaveMsg({ error: data.error || 'Failed to apply template', success: '' });
      }
    } catch (err: any) {
      setRoleSaveMsg({ error: err.message || 'Error applying template', success: '' });
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPrimaryAdmin) return;

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName,
          level: newRoleLevel,
          parent_id: newRoleParentId || null,
          color_hex: newRoleColor
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsNewRoleOpen(false);
        setNewRoleName('');
        fetchAllData();
      } else {
        alert(data.error || 'Failed to create role');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingInvite(true);
    setInviteMsg({ error: '', success: '' });

    try {
      const res = await fetch('/api/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role_id: inviteRoleId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteMsg({ error: data.error || 'Failed to send invitation', success: '' });
      } else {
        setInviteMsg({ error: '', success: data.message || `Invitation sent to ${inviteEmail}` });
        setInviteName('');
        setInviteEmail('');
        fetchAllData();
        setTimeout(() => setIsInviteModalOpen(false), 2000);
      }
    } catch (err: any) {
      setInviteMsg({ error: err.message || 'Network error', success: '' });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleOpenAssignRoleModal = (m: any) => {
    setTargetMember(m);
    setAssignRoleMsg({ error: '', success: '' });
    const currentRoles = (m.member_roles || []).map((mr: any) => mr.role_id);
    setSelectedRoleForMember(currentRoles[0] || (roles[0]?.id || ''));
    setIsAssignRoleModalOpen(true);
  };

  const handleSaveMemberRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMember || !selectedRoleForMember) return;
    setIsSavingMemberRole(true);
    setAssignRoleMsg({ error: '', success: '' });

    try {
      const res = await fetch(`/api/dev/users/${targetMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: selectedRoleForMember,
          administrator: true,
          access_recruitment: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAssignRoleMsg({ error: data.error || 'Failed to assign role', success: '' });
      } else {
        setAssignRoleMsg({ error: '', success: `Role assigned to ${targetMember.name} successfully!` });
        fetchAllData();
        setTimeout(() => setIsAssignRoleModalOpen(false), 1200);
      }
    } catch (err: any) {
      setAssignRoleMsg({ error: err.message || 'Network error', success: '' });
    } finally {
      setIsSavingMemberRole(false);
    }
  };

  const handleOpenRemoveMemberModal = (m: any) => {
    setMemberToRemove(m);
    setRemoveMemberMsg({ error: '', success: '' });
    setIsRemoveMemberModalOpen(true);
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemovingMember(true);
    setRemoveMemberMsg({ error: '', success: '' });

    try {
      const res = await fetch(`/api/members/${memberToRemove.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        setRemoveMemberMsg({ error: data.error || 'Failed to remove member', success: '' });
      } else {
        setRemoveMemberMsg({ error: '', success: data.message || `Member ${memberToRemove.name} removed successfully.` });
        fetchAllData();
        setTimeout(() => setIsRemoveMemberModalOpen(false), 1400);
      }
    } catch (err: any) {
      setRemoveMemberMsg({ error: err.message || 'Network error', success: '' });
    } finally {
      setIsRemovingMember(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center font-mono text-xs text-stone-500">
        Loading Kozker Master Admin Console...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex font-sans">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col justify-between shrink-0">
        <div>
          {/* Header Brand */}
          <div className="p-4 border-b border-stone-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-brand text-white flex items-center justify-center font-extrabold text-base shadow-sm">
              K
            </div>
            <div>
              <div className="font-bold text-stone-900 text-sm tracking-tight">Kozker Admin</div>
              <div className="text-[10px] text-stone-500 font-mono">Governance & RBAC Console</div>
            </div>
          </div>

          {/* Project Switcher Pill */}
          <div className="p-3 relative border-b border-stone-200 bg-stone-50">
            <div
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="p-2 bg-white border border-stone-200 rounded cursor-pointer flex items-center justify-between hover:border-brand transition-colors"
            >
              <div className="min-w-0 pr-2">
                <div className="text-[9px] font-mono uppercase text-stone-400 font-bold tracking-wider">Active Workspace</div>
                <div className="text-xs font-bold text-stone-900 truncate">{currentUser?.organization_name}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            </div>

            {isProjectDropdownOpen && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-stone-200 rounded shadow-lg z-50 py-1 text-xs divide-y divide-stone-150">
                <div className="p-2.5 bg-stone-100 font-bold text-brand flex items-center justify-between">
                  <span>Kozker Admin Console</span>
                  <Check className="w-3.5 h-3.5 text-brand" />
                </div>
                <div
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    window.location.href = urls.recruiter_app || 'https://app.kozker.ai';
                  }}
                  className="p-2.5 hover:bg-stone-50 cursor-pointer flex items-center justify-between text-stone-700 font-medium"
                >
                  <span>Kozker Recruiter AI App</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <div
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    window.location.href = urls.client_portal || 'https://client.kozker.ai';
                  }}
                  className="p-2.5 hover:bg-stone-50 cursor-pointer flex items-center justify-between text-stone-700 font-medium"
                >
                  <span>Client Portal Space</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Nav Items */}
          <nav className="p-3 space-y-1 text-xs">
            <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 my-2">
              Governance Engine
            </div>

            <button
              onClick={() => setActiveTab('roles')}
              className={`w-full px-3 py-2 rounded text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'roles' ? 'bg-brand/10 text-brand font-bold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Master Roles & RBAC</span>
            </button>

            <button
              onClick={() => setActiveTab('pipelines')}
              className={`w-full px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'pipelines' ? 'bg-brand/10 text-brand font-bold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <GitPullRequest className="w-4 h-4" />
                <span>Approval Pipelines</span>
              </div>
              {approvals.length > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full font-mono text-[9px] font-bold">
                  {approvals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`w-full px-3 py-2 rounded text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'members' ? 'bg-brand/10 text-brand font-bold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Members Directory</span>
            </button>

            <button
              onClick={() => setActiveTab('updates')}
              className={`w-full px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'updates' ? 'bg-brand/10 text-brand font-bold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-brand" />
                <span>Rolling Updates</span>
              </div>
              {rollingUpdates.length > 0 && (
                <span className="px-1.5 py-0.5 bg-brand text-white rounded-full font-mono text-[9px] font-bold">
                  {rollingUpdates.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full px-3 py-2 rounded text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'audit' ? 'bg-brand/10 text-brand font-bold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span>System Audit Ledger</span>
            </button>
          </nav>
        </div>

        {/* Footer User Profile */}
        <div className="p-3 border-t border-stone-200 flex items-center justify-between bg-stone-50 text-xs">
          <div className="min-w-0">
            <div className="font-bold text-stone-900 truncate">{currentUser?.name}</div>
            <div className="text-[10px] text-stone-500 font-mono truncate">{currentUser?.email}</div>
          </div>
          <button
            onClick={() => {
              document.cookie = 'kozker_sso_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              router.push('/login');
            }}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer"
            title="Sign Out"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* TAB 1: MASTER ROLES & RBAC PERMISSION MATRIX */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              {!isPrimaryAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2 font-mono">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Role hierarchy and permissions matrix are read-only. Role creation and permission modifications are restricted to the Primary Organization Administrator.</span>
                </div>
              )}

              {/* Roles Header */}
              <div className="flex items-center justify-between bg-white p-4 border border-stone-200 rounded-lg shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-stone-900">Organization Role Tree & RBAC Matrix</h2>
                  <p className="text-xs text-stone-500 font-mono">Configure custom role hierarchy levels and granular panel permissions</p>
                </div>

                {isPrimaryAdmin && (
                  <button
                    onClick={() => setIsNewRoleOpen(true)}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-black text-white text-xs font-mono font-bold uppercase rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Role</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 1 Column: Role Hierarchy Tree */}
                <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm space-y-3">
                  <div className="text-xs font-mono uppercase font-bold text-stone-400 tracking-wider">
                    Role Hierarchy Tree ({roles.length})
                  </div>

                  <div className="space-y-1.5">
                    {roles.map(r => {
                      const isSelected = selectedRole?.id === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => handleSelectRole(r)}
                          className={`p-3 rounded border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-stone-900 text-white border-stone-900 shadow-sm font-semibold'
                              : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: r.color_hex || '#ff6e30' }}
                            />
                            <span className="truncate">{r.name}</span>
                          </div>
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                            isSelected ? 'bg-stone-800 text-stone-300' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {r.level || 'ORG'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right 2 Columns: Granular Permissions Matrix Editor */}
                <div className="lg:col-span-2 bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-6">
                  {selectedRole ? (
                    <>
                      {/* Selected Role Header & Template Presets */}
                      <div className="flex items-center justify-between border-b border-stone-150 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: selectedRole.color_hex || '#ff6e30' }}
                            />
                            <h3 className="text-base font-bold text-stone-900">{selectedRole.name}</h3>
                            <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 bg-stone-100 border border-stone-200 rounded text-stone-600">
                              {selectedRole.level || 'ORG'} Level
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 font-mono mt-1">Configure sub-section visibilities and action rights</p>
                        </div>

                        {isPrimaryAdmin && (
                          <div className="relative">
                            <button
                              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                              className="px-3 py-1.5 border border-stone-200 hover:bg-stone-50 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Apply Template</span>
                              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                            </button>

                            {isTemplateDropdownOpen && (
                              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-stone-200 rounded shadow-lg z-50 py-1 text-xs divide-y divide-stone-100">
                                <div onClick={() => handleApplyTemplate('org-director')} className="p-2.5 hover:bg-stone-50 cursor-pointer">
                                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-brand" /> Organization Director
                                  </div>
                                  <div className="text-[10px] text-stone-500">Full administrative & panel authorizations</div>
                                </div>
                                <div onClick={() => handleApplyTemplate('branch-manager')} className="p-2.5 hover:bg-stone-50 cursor-pointer">
                                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                    <GitPullRequest className="w-3.5 h-3.5 text-blue-600" /> Branch Manager
                                  </div>
                                  <div className="text-[10px] text-stone-500">Recruitment & pipeline management</div>
                                </div>
                                <div onClick={() => handleApplyTemplate('senior-recruiter')} className="p-2.5 hover:bg-stone-50 cursor-pointer">
                                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Senior Recruiter
                                  </div>
                                  <div className="text-[10px] text-stone-500">Full candidate & job controls</div>
                                </div>
                                <div onClick={() => handleApplyTemplate('sourcing-specialist')} className="p-2.5 hover:bg-stone-50 cursor-pointer">
                                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                    <Search className="w-3.5 h-3.5 text-cyan-600" /> Sourcing Specialist
                                  </div>
                                  <div className="text-[10px] text-stone-500 font-mono">Talent pool & resume search</div>
                                </div>
                                <div onClick={() => handleApplyTemplate('hiring-panel')} className="p-2.5 hover:bg-stone-50 cursor-pointer">
                                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-amber-600" /> Technical Interviewer
                                  </div>
                                  <div className="text-[10px] text-stone-500 font-mono">Q&A screening & interviews</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Presets Chips Bar */}
                      {isPrimaryAdmin && (
                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-stone-400">
                            <span>Quick Role Template Presets</span>
                            <span className="text-brand font-semibold lowercase">click chip to apply authorizations</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('org-director')}
                              className="px-2.5 py-1 bg-white border border-stone-200 hover:border-brand rounded-full font-medium text-stone-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Shield className="w-3 h-3 text-brand" /> Org Director
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('branch-manager')}
                              className="px-2.5 py-1 bg-white border border-stone-200 hover:border-blue-500 rounded-full font-medium text-stone-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <GitPullRequest className="w-3 h-3 text-blue-600" /> Branch Manager
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('senior-recruiter')}
                              className="px-2.5 py-1 bg-white border border-stone-200 hover:border-emerald-500 rounded-full font-medium text-stone-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <UserCheck className="w-3 h-3 text-emerald-600" /> Senior Recruiter
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('sourcing-specialist')}
                              className="px-2.5 py-1 bg-white border border-stone-200 hover:border-cyan-500 rounded-full font-medium text-stone-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Search className="w-3 h-3 text-cyan-600" /> Sourcing Specialist
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('hiring-panel')}
                              className="px-2.5 py-1 bg-white border border-stone-200 hover:border-amber-500 rounded-full font-medium text-stone-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Award className="w-3 h-3 text-amber-600" /> Technical Interviewer
                            </button>
                          </div>
                        </div>
                      )}

                      {roleSaveMsg.error && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{roleSaveMsg.error}</span>
                        </div>
                      )}
                      {roleSaveMsg.success && (
                        <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{roleSaveMsg.success}</span>
                        </div>
                      )}

                      {/* Permissions Matrix Categories */}
                      <div className="space-y-6 text-xs">
                        {/* Category 1: Administration Rights */}
                        <div className="space-y-3 p-3 bg-stone-50 border border-stone-200 rounded-lg">
                          <div className="font-mono text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                            1. Administration Rights
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded cursor-pointer">
                              <span className="font-semibold text-stone-800">Master Administrator</span>
                              <input
                                type="checkbox"
                                checked={!!rolePermissions.administrator}
                                disabled={!isPrimaryAdmin}
                                onChange={() => handlePermissionToggle('administrator')}
                                className="accent-brand w-4 h-4 cursor-pointer"
                              />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded cursor-pointer">
                              <span className="font-semibold text-stone-800">View Audit Logs</span>
                              <input
                                type="checkbox"
                                checked={!!rolePermissions.audit_logs}
                                disabled={!isPrimaryAdmin}
                                onChange={() => handlePermissionToggle('audit_logs')}
                                className="accent-brand w-4 h-4 cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Category 2: Recruiter Panel Access & Sub-Sections */}
                        <div className="space-y-3 p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                            <div className="font-mono text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                              2. Recruiter Panel Sub-Section Visibilities
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded border border-emerald-200 shadow-2xs">
                              <span className="font-bold text-emerald-800 text-xs">Access Recruiter App</span>
                              <input
                                type="checkbox"
                                checked={!!rolePermissions.access_recruitment}
                                disabled={!isPrimaryAdmin}
                                onChange={() => handlePermissionToggle('access_recruitment')}
                                className="accent-emerald-600 w-4 h-4 cursor-pointer"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {[
                              { key: 'recruiter_dashboard', label: 'Recruiter Dashboard' },
                              { key: 'recruiter_mandates', label: 'Mandates & Accounts' },
                              { key: 'recruiter_jobs', label: 'Job Catalog & Specs' },
                              { key: 'recruiter_sourcing', label: 'Talent Sourcing Pool' },
                              { key: 'recruiter_reports', label: 'Recruiter Reports' },
                              { key: 'recruiter_qna', label: 'Video Q&A Screening' },
                              { key: 'recruiter_resumes', label: 'Candidate Resumes' },
                              { key: 'recruiter_stage_move', label: 'Funnel Stage Move' },
                            ].map(sub => (
                              <label key={sub.key} className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded cursor-pointer">
                                <span className="font-medium text-stone-800">{sub.label}</span>
                                <input
                                  type="checkbox"
                                  checked={!!rolePermissions[sub.key]}
                                  disabled={!isPrimaryAdmin || !rolePermissions.access_recruitment}
                                  onChange={() => handlePermissionToggle(sub.key)}
                                  className="accent-brand w-4 h-4 cursor-pointer"
                                />
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Category 3: Granular Recruiter Actions */}
                        <div className="space-y-3 p-3 bg-stone-50 border border-stone-200 rounded-lg">
                          <div className="font-mono text-[10px] font-bold uppercase text-stone-500 tracking-wider">
                            3. Granular Recruiter Action Rights
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded cursor-pointer">
                              <span className="font-semibold text-stone-800">Manage Job Vacancies</span>
                              <input
                                type="checkbox"
                                checked={!!rolePermissions.manage_jobs}
                                disabled={!isPrimaryAdmin}
                                onChange={() => handlePermissionToggle('manage_jobs')}
                                className="accent-brand w-4 h-4 cursor-pointer"
                              />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded cursor-pointer">
                              <span className="font-semibold text-stone-800">View Candidate Resumes</span>
                              <input
                                type="checkbox"
                                checked={!!rolePermissions.view_resumes}
                                disabled={!isPrimaryAdmin}
                                onChange={() => handlePermissionToggle('view_resumes')}
                                className="accent-brand w-4 h-4 cursor-pointer"
                              />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded cursor-pointer">
                              <span className="font-semibold text-stone-800">Edit Applicant Status</span>
                              <input
                                type="checkbox"
                                checked={!!rolePermissions.edit_status}
                                disabled={!isPrimaryAdmin}
                                onChange={() => handlePermissionToggle('edit_status')}
                                className="accent-brand w-4 h-4 cursor-pointer"
                              />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded cursor-pointer">
                              <span className="font-semibold text-stone-800">Schedule Interviews</span>
                              <input
                                type="checkbox"
                                checked={!!rolePermissions.schedule_interviews}
                                disabled={!isPrimaryAdmin}
                                onChange={() => handlePermissionToggle('schedule_interviews')}
                                className="accent-brand w-4 h-4 cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {isPrimaryAdmin && (
                        <div className="flex items-center justify-end pt-4 border-t border-stone-150">
                          <button
                            onClick={handleSavePermissions}
                            disabled={isSavingRole}
                            className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-mono uppercase font-bold rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isSavingRole ? 'Saving Permissions...' : 'Save Matrix Permissions'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-stone-400 italic">Select a role from the tree to view permissions.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPROVAL PIPELINES */}
          {activeTab === 'pipelines' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white p-4 border border-stone-200 rounded-lg shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-stone-900">Multi-Stage Approval Workflows</h2>
                  <p className="text-xs text-stone-500 font-mono">Configure SLA hours and sequential approval steps across categories</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pipelines.map(p => (
                  <div key={p.id} className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-amber-50 text-brand flex items-center justify-center font-bold">
                          <GitPullRequest className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-stone-900 text-sm">{p.name}</div>
                          <div className="text-[10px] text-stone-500 font-mono">{p.category}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono text-[9px] uppercase font-bold rounded border border-emerald-200">
                        {p.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-mono uppercase font-bold text-stone-400 tracking-wider">Approval Stages</div>
                      {(p.pipeline_stages || []).map((st: any) => (
                        <div key={st.id} className="p-2.5 bg-stone-50 border border-stone-150 rounded flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold">
                              {st.step_number}
                            </span>
                            <span className="font-bold text-stone-800 font-sans">{st.stage_title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-stone-500 text-[11px] font-mono">
                            <span>SLA: {st.sla_hours}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MEMBERS DIRECTORY */}
          {activeTab === 'members' && (
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                <div>
                  <h2 className="text-base font-bold text-stone-900">Organization Members Directory ({members.length})</h2>
                  <p className="text-xs text-stone-500 font-mono">Invite organization members via email and assign master roles</p>
                </div>

                <button
                  onClick={() => {
                    setInviteMsg({ error: '', success: '' });
                    setIsInviteModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-black text-white text-xs font-mono font-bold uppercase rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Invite Member via Email</span>
                </button>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 font-mono text-[10px] uppercase text-stone-500">
                      <th className="p-3">Member Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Assigned Master Roles</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {members.map(m => {
                      const rolesList = (m.member_roles || []).map((mr: any) => mr.roles).filter(Boolean);
                      return (
                        <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                          <td className="p-3 font-semibold text-stone-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 font-bold font-mono text-[10px]">
                              {m.avatar_initials || m.name?.slice(0, 2)?.toUpperCase()}
                            </div>
                            <span>{m.name}</span>
                          </td>
                          <td className="p-3 font-mono text-stone-600">{m.email}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {rolesList.length === 0 ? (
                                <span className="text-amber-600 font-mono text-[10px] italic">Pending Role Assignment</span>
                              ) : (
                                rolesList.map((r: any) => (
                                  <span
                                    key={r.id}
                                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white shadow-2xs"
                                    style={{ backgroundColor: r.color_hex || '#ff6e30' }}
                                  >
                                    {r.name}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              {m.status || 'active'}
                            </span>
                          </td>
                          <td className="p-3 text-right flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAssignRoleModal(m)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-mono font-semibold rounded border border-stone-200 transition-colors cursor-pointer"
                            >
                              Assign Roles
                            </button>
                            <button
                              onClick={() => handleOpenRemoveMemberModal(m)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 transition-colors cursor-pointer"
                              title="Remove member from organization"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PLATFORM ROLLING UPDATES FEED */}
          {activeTab === 'updates' && (
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <Radio className="w-4 h-4 text-brand" />
                  <span>Platform Rolling Updates Broadcast Feed ({rollingUpdates.length})</span>
                </div>
                <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2.5 py-1 rounded border border-amber-200 font-bold">
                  Broadcasted directly from Developer Provisioning Panel
                </span>
              </div>

              <div className="space-y-4">
                {rollingUpdates.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 italic">No platform updates broadcasted yet.</div>
                ) : (
                  rollingUpdates.map(u => (
                    <div key={u.id} className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-stone-900 text-white font-mono text-[10px] font-bold rounded">
                            {u.version_tag}
                          </span>
                          <h3 className="font-bold text-stone-900 text-sm">{u.title}</h3>
                          <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded border ${
                            u.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                            u.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {u.category} • {u.priority}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-stone-400">
                          {new Date(u.published_at).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed font-mono text-[11px] whitespace-pre-wrap">
                        {u.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM AUDIT LEDGER */}
          {activeTab === 'audit' && (
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <History className="w-4 h-4 text-brand" />
                  <span>System Governance Audit Ledger ({auditLogs.length})</span>
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 font-mono text-[10px] uppercase text-stone-500">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Action Description</th>
                      <th className="p-3">Target</th>
                      <th className="p-3 text-right">Event Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150 font-mono text-[11px]">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-stone-50">
                        <td className="p-3 text-stone-500">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-3 font-semibold text-stone-900">{log.actor_name || 'System'}</td>
                        <td className="p-3 text-stone-700">{log.action_description}</td>
                        <td className="p-3 text-stone-600">{log.target_name}</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${
                            log.action_type === 'create' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            log.action_type === 'danger' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-stone-100 text-stone-700 border-stone-200'
                          }`}>
                            {log.action_type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal 1: New Master Role Modal */}
      {isNewRoleOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-md w-full p-6 rounded-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
              <h3 className="font-bold text-stone-900 text-sm">Create New Master Role Profile</h3>
              <button onClick={() => setIsNewRoleOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Role Title</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Branch Talent Director"
                  required
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Hierarchy Level</label>
                <select
                  value={newRoleLevel}
                  onChange={(e) => setNewRoleLevel(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                >
                  <option value="organization">Organization Level</option>
                  <option value="branch">Branch Level</option>
                  <option value="position">Position Level</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Parent Role (Optional)</label>
                <select
                  value={newRoleParentId}
                  onChange={(e) => setNewRoleParentId(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                >
                  <option value="">(None - Standalone Root Role)</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Role Color Indicator</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    className="w-8 h-8 rounded border border-stone-200 cursor-pointer"
                  />
                  <span className="font-mono text-stone-600">{newRoleColor}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => setIsNewRoleOpen(false)}
                  className="px-3.5 py-2 border border-stone-200 hover:bg-stone-100 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono uppercase font-bold rounded transition-colors cursor-pointer"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Email Member Invitation Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-md w-full p-6 rounded-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-stone-900 text-sm">Invite Organization Member via Email</h3>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteMsg.error && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{inviteMsg.error}</span>
              </div>
            )}
            {inviteMsg.success && (
              <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{inviteMsg.success}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Member Full Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Work Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="alex.rivera@kozker.com"
                  required
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Assign Initial Master Role</label>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.level})</option>
                  ))}
                </select>
              </div>

              {/* Authentication Setup Process Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Authentication Setup Process</span>
                </div>
                <p>
                  Member addition initiated. Authentication setup will take about a minute. Once completed, a confirmation email with credentials to access the Admin Console will be sent to the user.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-2 border border-stone-200 hover:bg-stone-100 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono uppercase font-bold rounded transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingInvite ? 'Sending Email...' : 'Send Invitation Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Member Role Assignment Modal */}
      {isAssignRoleModalOpen && targetMember && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-md w-full p-6 rounded-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-stone-900 text-sm">Assign Master Role for {targetMember.name}</h3>
              </div>
              <button onClick={() => setIsAssignRoleModalOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignRoleMsg.error && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{assignRoleMsg.error}</span>
              </div>
            )}
            {assignRoleMsg.success && (
              <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{assignRoleMsg.success}</span>
              </div>
            )}

            <form onSubmit={handleSaveMemberRole} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Select Role Profile</label>
                <select
                  value={selectedRoleForMember}
                  onChange={(e) => setSelectedRoleForMember(e.target.value)}
                  required
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.level})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => setIsAssignRoleModalOpen(false)}
                  className="px-3.5 py-2 border border-stone-200 hover:bg-stone-100 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMemberRole}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono uppercase font-bold rounded transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingMemberRole ? 'Saving Role...' : 'Save Role Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Remove Member Confirmation Modal */}
      {isRemoveMemberModalOpen && memberToRemove && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-md w-full p-6 rounded-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
              <div className="flex items-center gap-2 text-red-700">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-stone-900 text-sm">Remove Organization Member</h3>
              </div>
              <button onClick={() => setIsRemoveMemberModalOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {removeMemberMsg.error && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{removeMemberMsg.error}</span>
              </div>
            )}
            {removeMemberMsg.success && (
              <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{removeMemberMsg.success}</span>
              </div>
            )}

            <div className="space-y-2 text-xs text-stone-600">
              <p>
                Are you sure you want to remove <strong className="text-stone-900">{memberToRemove.name}</strong> (<span className="font-mono text-stone-700">{memberToRemove.email}</span>) from the organization?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-900 text-[11px] leading-relaxed">
                ⚠️ <strong>Warning:</strong> This action will permanently revoke their assigned roles, portal access, and organization permissions.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-150">
              <button
                type="button"
                onClick={() => setIsRemoveMemberModalOpen(false)}
                className="px-3.5 py-2 border border-stone-200 hover:bg-stone-100 rounded text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={isRemovingMember}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-mono uppercase font-bold rounded transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isRemovingMember ? 'Removing Member...' : 'Confirm Remove Member'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
