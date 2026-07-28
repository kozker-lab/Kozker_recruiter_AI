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
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<any>(null); // null = Organization-Wide Root
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [rollingUpdates, setRollingUpdates] = useState<any[]>([]);

  // Branch Modal states
  const [isNewBranchOpen, setIsNewBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchLocation, setNewBranchLocation] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // Selected Role for Permission Matrix Editing
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<any>({});
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleSaveMsg, setRoleSaveMsg] = useState({ error: '', success: '' });

  // New / Edit Role Modal
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState('position');
  const [newRoleParentId, setNewRoleParentId] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#ff6e30');
  const [newRoleScopeType, setNewRoleScopeType] = useState('organization');
  const [newRoleBranchName, setNewRoleBranchName] = useState('Main Branch');
  const [newRolePermissions, setNewRolePermissions] = useState<any>({
    administrator: false,
    audit_logs: false,
    access_recruitment: true,
    recruiter_dashboard: true,
    recruiter_mandates: true,
    recruiter_jobs: true,
    recruiter_sourcing: true,
    recruiter_reports: true,
    recruiter_qna: true,
    recruiter_resumes: true,
    recruiter_stage_move: true,
    manage_jobs: true,
    view_resumes: true,
    edit_status: true,
    schedule_interviews: true
  });

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
  const [selectedRolesForMember, setSelectedRolesForMember] = useState<string[]>([]);
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
      const [rRes, pRes, aRes, mRes, lRes, uRes, bRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/pipelines'),
        fetch('/api/approvals/pending'),
        fetch('/api/members'),
        fetch('/api/audit-logs'),
        fetch('/api/updates'),
        fetch('/api/branches')
      ]);

      const rData = await rRes.json();
      const pData = await pRes.json();
      const aData = await aRes.json();
      const mData = await mRes.json();
      const lData = await lRes.json();
      const uData = await uRes.json();
      const bData = await bRes.json();

      if (bData.branches) {
        setBranches(bData.branches);
      }

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
        body: JSON.stringify({
          permissions: rolePermissions,
          scope_type: selectedRole.scope_type || 'organization',
          branch_name: selectedRole.branch_name || 'Main Branch'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setRoleSaveMsg({ error: data.error || 'Failed to update permissions', success: '' });
      } else {
        setRoleSaveMsg({ error: '', success: `Permissions & Scope for '${selectedRole.name}' saved successfully!` });
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

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPrimaryAdmin || !newBranchName.trim()) return;
    setIsCreatingBranch(true);

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBranchName.trim(),
          code: newBranchCode.trim() || newBranchName.trim().slice(0, 4).toUpperCase(),
          location: newBranchLocation.trim() || 'Main Location'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsNewBranchOpen(false);
        setNewBranchName('');
        setNewBranchCode('');
        setNewBranchLocation('');
        fetchAllData();
      } else {
        alert(data.error || 'Failed to create branch');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleOpenAddRoleModal = (branchObj?: any) => {
    setEditingRoleId(null);
    setNewRoleName('');
    setNewRoleLevel(branchObj ? 'branch' : 'position');
    setNewRoleScopeType(branchObj ? 'branch' : 'organization');
    setNewRoleBranchName(branchObj ? branchObj.name : 'Main Branch');
    setNewRoleColor('#ff6e30');
    setNewRolePermissions({
      administrator: false,
      audit_logs: false,
      access_recruitment: true,
      recruiter_dashboard: true,
      recruiter_mandates: true,
      recruiter_jobs: true,
      recruiter_sourcing: true,
      recruiter_reports: true,
      recruiter_qna: true,
      recruiter_resumes: true,
      recruiter_stage_move: true,
      manage_jobs: true,
      view_resumes: true,
      edit_status: true,
      schedule_interviews: true
    });
    setIsNewRoleOpen(true);
  };

  const handleOpenEditRoleModal = (r: any) => {
    setEditingRoleId(r.id);
    setNewRoleName(r.name);
    setNewRoleLevel(r.level || 'position');
    setNewRoleScopeType(r.scope_type || 'organization');
    setNewRoleBranchName(r.branch_name || 'Main Branch');
    setNewRoleColor(r.color_hex || '#ff6e30');
    const permObj = Array.isArray(r.role_permissions) ? r.role_permissions[0] : r.role_permissions;
    setNewRolePermissions(permObj ? { ...permObj } : {
      administrator: false,
      audit_logs: false,
      access_recruitment: true,
      recruiter_dashboard: true,
      recruiter_jobs: true,
      recruiter_resumes: true,
      manage_jobs: true,
      view_resumes: true,
      edit_status: true,
      schedule_interviews: true
    });
    setIsNewRoleOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPrimaryAdmin) return;

    try {
      if (editingRoleId) {
        // PUT update existing role & permissions
        const res = await fetch(`/api/roles/${editingRoleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newRoleName,
            level: newRoleLevel,
            color_hex: newRoleColor,
            scope_type: newRoleScopeType,
            branch_name: newRoleBranchName,
            permissions: newRolePermissions
          })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to update role');
        } else {
          setIsNewRoleOpen(false);
          fetchAllData();
        }
      } else {
        // POST create new role & permissions
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newRoleName,
            level: newRoleLevel,
            parent_id: newRoleParentId || null,
            color_hex: newRoleColor,
            scope_type: newRoleScopeType,
            branch_name: newRoleBranchName,
            permissions: newRolePermissions
          })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to create role');
        } else {
          setIsNewRoleOpen(false);
          fetchAllData();
        }
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
    const currentRoles = (m.member_roles || []).map((mr: any) => mr.role_id).filter(Boolean);
    setSelectedRolesForMember(currentRoles);
    setIsAssignRoleModalOpen(true);
  };

  const handleSaveMemberRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMember) return;
    setIsSavingMemberRole(true);
    setAssignRoleMsg({ error: '', success: '' });

    try {
      const res = await fetch(`/api/members/${targetMember.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_ids: selectedRolesForMember
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAssignRoleMsg({ error: data.error || 'Failed to assign roles', success: '' });
      } else {
        setAssignRoleMsg({ error: '', success: `Roles updated for ${targetMember.name}! Executive email notification dispatched.` });
        fetchAllData();
        setTimeout(() => setIsAssignRoleModalOpen(false), 1400);
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
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-brand" />
                    <span>Organization Branch Catalog & Master Role Matrix</span>
                  </h2>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">Manage organizational branch locations and configure role authorizations per branch</p>
                </div>

                {isPrimaryAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsNewBranchOpen(true)}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-mono font-bold uppercase rounded border border-stone-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-stone-600" />
                      <span>Add Branch</span>
                    </button>

                    <button
                      onClick={() => {
                        setNewRoleScopeType(selectedBranch ? 'branch' : 'organization');
                        setNewRoleBranchName(selectedBranch ? selectedBranch.name : 'Main Branch');
                        setIsNewRoleOpen(true);
                      }}
                      className="px-3.5 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono font-bold uppercase rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span>Add Role {selectedBranch ? `for ${selectedBranch.name}` : ''}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 1 Column: Branch Navigation */}
                <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-150 pb-2">
                    <div className="text-xs font-mono uppercase font-bold text-stone-700 tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-brand" />
                      <span>Branch Catalog ({branches.length + 1})</span>
                    </div>
                    {isPrimaryAdmin && (
                      <button
                        onClick={() => setIsNewBranchOpen(true)}
                        className="px-2 py-1 bg-stone-900 hover:bg-black text-white text-[10px] font-mono font-bold uppercase rounded flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Branch</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Root Item: Organization-Wide / All */}
                    <div
                      onClick={() => setSelectedBranch(null)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-1 ${
                        selectedBranch === null
                          ? 'bg-stone-900 text-white border-stone-900 shadow-sm font-semibold'
                          : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <span>🌐</span> All Branches & Global
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          selectedBranch === null ? 'bg-stone-800 text-amber-300' : 'bg-stone-200 text-stone-700'
                        }`}>
                          {roles.length} roles
                        </span>
                      </div>
                      <div className={`text-[10px] font-mono ${selectedBranch === null ? 'text-stone-300' : 'text-stone-500'}`}>
                        Root Organization Scope
                      </div>
                    </div>

                    {/* Custom Branch List */}
                    {branches.map(b => {
                      const isSelected = selectedBranch?.id === b.id;
                      const branchRolesCount = roles.filter(r => r.branch_name === b.name || r.branch_id === b.id).length;

                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBranch(b)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-1 ${
                            isSelected
                              ? 'bg-stone-900 text-white border-stone-900 shadow-sm font-semibold'
                              : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5 truncate">
                              <span>🏢</span> {b.name}
                            </span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              isSelected ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {branchRolesCount} roles
                            </span>
                          </div>
                          <div className={`text-[10px] font-mono flex items-center justify-between ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                            <span>{b.location || 'Branch Hub'}</span>
                            <span className="uppercase font-bold">[{b.code || 'MAIN'}]</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right 2 Columns: Branch Role Catalog Cards Grid */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-stone-150 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-brand" />
                          <h3 className="text-base font-bold text-stone-900">
                            {selectedBranch ? `Roles for ${selectedBranch.name}` : 'All Master Roles Catalog'}
                          </h3>
                        </div>
                        <p className="text-xs text-stone-500 font-mono mt-1">
                          {selectedBranch
                            ? `Active roles and access permissions assigned specifically to ${selectedBranch.name} (${selectedBranch.location || 'Branch'})`
                            : 'Master roles defined across all organizational branches'}
                        </p>
                      </div>

                      {isPrimaryAdmin && (
                        <button
                          onClick={() => handleOpenAddRoleModal(selectedBranch)}
                          className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono uppercase font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Role {selectedBranch ? `for ${selectedBranch.name}` : ''}</span>
                        </button>
                      )}
                    </div>

                    {/* Branch Roles Cards Grid */}
                    {roles.filter(r => !selectedBranch || r.branch_name === selectedBranch.name || r.branch_id === selectedBranch.id).length === 0 ? (
                      <div className="p-12 text-center border-2 border-dashed border-stone-200 rounded-xl space-y-3">
                        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="font-bold text-stone-800 text-sm">No Roles Created for {selectedBranch?.name || 'this Branch'}</div>
                        <p className="text-xs text-stone-500 max-w-sm mx-auto font-mono">
                          Click below to add customized role profiles with granular authorizations for this branch.
                        </p>
                        {isPrimaryAdmin && (
                          <button
                            onClick={() => handleOpenAddRoleModal(selectedBranch)}
                            className="px-4 py-2 bg-brand text-white text-xs font-mono font-bold uppercase rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add First Role for {selectedBranch?.name || 'Branch'}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles
                          .filter(r => !selectedBranch || r.branch_name === selectedBranch.name || r.branch_id === selectedBranch.id)
                          .map(r => {
                            const memberCount = r.assigned_members_count || 0;
                            const scopeLabel = (r.scope_type || 'organization').toUpperCase();
                            const branchLabel = r.branch_name || 'Main Branch';
                            const permObj = Array.isArray(r.role_permissions) ? r.role_permissions[0] : r.role_permissions;

                            return (
                              <div
                                key={r.id}
                                className="p-4 rounded-xl border border-stone-200 bg-white hover:border-brand/40 hover:shadow-md transition-all space-y-3.5"
                              >
                                {/* Role Title & Member Count Badge */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                                      style={{ backgroundColor: r.color_hex || '#ff6e30' }}
                                    />
                                    <h4 className="font-bold text-stone-900 text-sm truncate">{r.name}</h4>
                                  </div>

                                  {/* Small Member Count Badge */}
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1 shrink-0">
                                    <Users className="w-3 h-3 text-brand shrink-0" />
                                    <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                                  </span>
                                </div>

                                {/* Authorizations Summary Tags */}
                                <div className="p-2.5 bg-stone-50 rounded-lg space-y-1.5 text-[11px]">
                                  <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-stone-400">
                                    <span>Authorizations Summary</span>
                                    <span>[{scopeLabel}]</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                                    {permObj?.administrator && (
                                      <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded font-bold">Admin</span>
                                    )}
                                    {permObj?.recruiter_dashboard !== false && (
                                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">Dashboard</span>
                                    )}
                                    {permObj?.manage_jobs !== false && (
                                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Jobs</span>
                                    )}
                                    {permObj?.view_resumes !== false && (
                                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded">Resumes</span>
                                    )}
                                    {permObj?.schedule_interviews !== false && (
                                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">Interviews</span>
                                    )}
                                  </div>
                                </div>

                                {/* Bottom Bar: Scope Tag & Edit Action */}
                                <div className="flex items-center justify-between pt-2 border-t border-stone-150">
                                  <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border ${
                                    r.scope_type === 'branch' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                    [{scopeLabel}: {branchLabel}]
                                  </span>

                                  {isPrimaryAdmin && (
                                    <button
                                      onClick={() => handleOpenEditRoleModal(r)}
                                      className="px-3 py-1 bg-stone-900 hover:bg-black text-white text-[11px] font-mono font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      <span>Edit Role & Matrix</span>
                                      <Sliders className="w-3 h-3 text-brand" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
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
                                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-stone-100 text-stone-700 border border-stone-200">
                                  Default Member (View-Only Pipeline & Admin)
                                </span>
                              ) : (
                                rolesList.map((r: any) => (
                                  <span
                                    key={r.id}
                                    className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-white shadow-2xs flex items-center gap-1"
                                    style={{ backgroundColor: r.color_hex || '#ff6e30' }}
                                  >
                                    <span>{r.name}</span>
                                    <span className="opacity-80 text-[8px] uppercase">
                                      [{r.scope_type === 'branch' ? r.branch_name : r.scope_type === 'multi_branch' ? 'MULTI' : 'ORG'}]
                                    </span>
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

      {/* Modal 0: New Branch Modal */}
      {isNewBranchOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-md w-full p-6 rounded-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-stone-900 text-sm">Add New Organizational Branch</h3>
              </div>
              <button onClick={() => setIsNewBranchOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Kakkanad Tech Hub, HQ London"
                  required
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Branch Code</label>
                  <input
                    type="text"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value)}
                    placeholder="e.g. KAK, LON"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Location Context</label>
                  <input
                    type="text"
                    value={newBranchLocation}
                    onChange={(e) => setNewBranchLocation(e.target.value)}
                    placeholder="e.g. Kochi, London UK"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => setIsNewBranchOpen(false)}
                  className="px-3.5 py-2 border border-stone-200 hover:bg-stone-100 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBranch}
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono uppercase font-bold rounded transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCreatingBranch ? 'Creating Branch...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: New / Edit Master Role Modal */}
      {isNewRoleOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-xl w-full p-6 rounded-xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-stone-900 text-sm">
                  {editingRoleId ? `Edit Role & Permissions: ${newRoleName}` : `Create New Role for ${newRoleBranchName || 'Branch'}`}
                </h3>
              </div>
              <button onClick={() => setIsNewRoleOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              {/* Predefined Role Presets Quick Bar */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1.5">
                <div className="text-[10px] font-mono uppercase font-bold text-stone-500">
                  Quick Role Presets (Customizable Name)
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewRoleName('Branch Manager');
                      setNewRoleLevel('branch');
                      setNewRoleScopeType('branch');
                    }}
                    className="px-2.5 py-1 bg-white border border-stone-200 hover:border-blue-500 rounded-full text-[11px] font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
                  >
                    <GitPullRequest className="w-3 h-3 text-blue-600" /> Manager
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewRoleName('Senior Recruiter');
                      setNewRoleLevel('position');
                      setNewRoleScopeType('branch');
                    }}
                    className="px-2.5 py-1 bg-white border border-stone-200 hover:border-emerald-500 rounded-full text-[11px] font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
                  >
                    <UserCheck className="w-3 h-3 text-emerald-600" /> Recruiter
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewRoleName('Sourcing Specialist');
                      setNewRoleLevel('position');
                      setNewRoleScopeType('branch');
                    }}
                    className="px-2.5 py-1 bg-white border border-stone-200 hover:border-cyan-500 rounded-full text-[11px] font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3 h-3 text-cyan-600" /> Sourcing Specialist
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewRoleName('Technical Interviewer');
                      setNewRoleLevel('position');
                      setNewRoleScopeType('branch');
                    }}
                    className="px-2.5 py-1 bg-white border border-stone-200 hover:border-amber-500 rounded-full text-[11px] font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Award className="w-3 h-3 text-amber-600" /> Technical Interviewer
                  </button>
                </div>
              </div>

              {/* Role Title */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Role Title / Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Kakkanad Recruitment Manager"
                  required
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand font-semibold"
                />
              </div>

              {/* Read-only Organization Name & Branch Context */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-stone-500 mb-1">
                    Organization
                  </label>
                  <div className="font-bold text-stone-900 font-mono text-xs truncate">
                    {currentUser?.organization_name || 'Big Corpo'}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-stone-500 mb-1">
                    Branch Assignment
                  </label>
                  <select
                    value={newRoleBranchName}
                    onChange={(e) => setNewRoleBranchName(e.target.value)}
                    className="w-full p-1.5 bg-white border border-stone-200 rounded text-xs font-semibold focus:outline-none focus:border-brand"
                  >
                    <option value="Main Branch">Main Branch (Global)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name} ({b.location || 'Branch'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scope Type & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Scope Type</label>
                  <select
                    value={newRoleScopeType}
                    onChange={(e) => setNewRoleScopeType(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand font-semibold"
                  >
                    <option value="organization">Organization-Wide [ORG]</option>
                    <option value="branch">Branch-Specific [BRANCH]</option>
                    <option value="multi_branch">Multi-Branch [MULTI-BRANCH]</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Role Color Tag</label>
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
              </div>

              {/* Granular Permission Matrix inside Pop-up Modal */}
              <div className="space-y-3 pt-3 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-brand" />
                    <span>Role Authorizations & Permission Matrix</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">Toggle rights</span>
                </div>

                {/* 1. Administration Rights */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase text-stone-500">1. Administration Rights</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="p-2 bg-white border border-stone-200 rounded flex items-center justify-between cursor-pointer">
                      <span className="font-semibold text-stone-800">Master Administrator</span>
                      <input
                        type="checkbox"
                        checked={newRolePermissions.administrator || false}
                        onChange={(e) => setNewRolePermissions({ ...newRolePermissions, administrator: e.target.checked })}
                        className="accent-brand w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="p-2 bg-white border border-stone-200 rounded flex items-center justify-between cursor-pointer">
                      <span className="font-semibold text-stone-800">View Audit Logs</span>
                      <input
                        type="checkbox"
                        checked={newRolePermissions.audit_logs || false}
                        onChange={(e) => setNewRolePermissions({ ...newRolePermissions, audit_logs: e.target.checked })}
                        className="accent-brand w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Recruiter Panel Visibilities */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono font-bold uppercase text-emerald-800">2. Recruiter Panel Sub-Section Visibilities</div>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 cursor-pointer">
                      <span>Access Recruiter App</span>
                      <input
                        type="checkbox"
                        checked={newRolePermissions.access_recruitment !== false}
                        onChange={(e) => setNewRolePermissions({ ...newRolePermissions, access_recruitment: e.target.checked })}
                        className="accent-emerald-600 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'recruiter_dashboard', label: 'Recruiter Dashboard' },
                      { key: 'recruiter_mandates', label: 'Mandates & Accounts' },
                      { key: 'recruiter_jobs', label: 'Job Catalog & Specs' },
                      { key: 'recruiter_sourcing', label: 'Talent Sourcing Pool' },
                      { key: 'recruiter_reports', label: 'Recruiter Reports' },
                      { key: 'recruiter_qna', label: 'Video Q&A Screening' },
                      { key: 'recruiter_resumes', label: 'Candidate Resumes' },
                      { key: 'recruiter_stage_move', label: 'Funnel Stage Move' },
                    ].map(item => (
                      <label key={item.key} className="p-2 bg-white border border-stone-200 rounded flex items-center justify-between cursor-pointer">
                        <span className="font-medium text-stone-800">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={newRolePermissions[item.key] !== false}
                          onChange={(e) => setNewRolePermissions({ ...newRolePermissions, [item.key]: e.target.checked })}
                          className="accent-emerald-600 w-4 h-4 cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Granular Recruiter Action Rights */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase text-stone-500">3. Granular Recruiter Action Rights</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'manage_jobs', label: 'Manage Job Vacancies' },
                      { key: 'view_resumes', label: 'View Candidate Resumes' },
                      { key: 'edit_status', label: 'Edit Applicant Status' },
                      { key: 'schedule_interviews', label: 'Schedule Interviews' },
                    ].map(item => (
                      <label key={item.key} className="p-2 bg-white border border-stone-200 rounded flex items-center justify-between cursor-pointer">
                        <span className="font-medium text-stone-800">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={newRolePermissions[item.key] !== false}
                          onChange={(e) => setNewRolePermissions({ ...newRolePermissions, [item.key]: e.target.checked })}
                          className="accent-brand w-4 h-4 cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => setIsNewRoleOpen(false)}
                  className="px-3.5 py-2 border border-stone-200 hover:bg-stone-100 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono uppercase font-bold rounded transition-colors cursor-pointer font-semibold"
                >
                  {editingRoleId ? 'Save Changes' : 'Create Branch Role'}
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-stone-700 font-mono uppercase text-[10px] tracking-wider">
                    Select Active Roles & Scope Tags
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">Multiple allowed</span>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg max-h-56 overflow-y-auto space-y-2">
                  {roles.map(r => {
                    const isChecked = selectedRolesForMember.includes(r.id);
                    const scopeLabel = (r.scope_type || 'organization').toUpperCase();
                    const branchLabel = r.branch_name || 'Main Branch';
                    const tagBg = r.scope_type === 'branch' ? 'bg-blue-100 text-blue-800' : r.scope_type === 'multi_branch' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800';

                    return (
                      <label
                        key={r.id}
                        className={`p-2.5 bg-white border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                          isChecked ? 'border-brand ring-1 ring-brand/30 shadow-2xs' : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRolesForMember([...selectedRolesForMember, r.id]);
                              } else {
                                setSelectedRolesForMember(selectedRolesForMember.filter(id => id !== r.id));
                              }
                            }}
                            className="accent-brand w-4 h-4 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-stone-900 truncate">{r.name}</div>
                            <div className="text-[10px] text-stone-500 font-mono">Branch Context: {branchLabel}</div>
                          </div>
                        </div>

                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${tagBg}`}>
                          [{scopeLabel}: {branchLabel}]
                        </span>
                      </label>
                    );
                  })}
                </div>

                {selectedRolesForMember.length === 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded font-mono">
                    💡 <strong>Default Member Mode:</strong> Unassigned members retain the Default Member role (View-Only Pipeline & Admin Panel access).
                  </div>
                )}
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
                  className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono uppercase font-bold rounded transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSavingMemberRole ? 'Saving & Sending Email...' : 'Save & Send Executive Notification Email'}</span>
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
