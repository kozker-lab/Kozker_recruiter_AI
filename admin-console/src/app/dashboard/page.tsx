"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, GitPullRequest, Users, History, Terminal, ChevronDown,
  Plus, Check, X, Building2, Briefcase, ExternalLink, Lock, Settings,
  Clock, AlertCircle, CheckCircle2, Sliders, ChevronRight, Layers, ArrowUpRight
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'roles' | 'pipelines' | 'members' | 'audit'>('roles');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [urls, setUrls] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Data states
  const [roles, setRoles] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Selected Role for Permission Matrix Editing
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<any>({});
  const [isSavingRole, setIsSavingRole] = useState(false);

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
      const [rRes, pRes, aRes, mRes, lRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/pipelines'),
        fetch('/api/approvals/pending'),
        fetch('/api/members'),
        fetch('/api/audit-logs'),
      ]);

      const rData = await rRes.json();
      const pData = await pRes.json();
      const aData = await aRes.json();
      const mData = await mRes.json();
      const lData = await lRes.json();

      if (rData.roles) {
        setRoles(rData.roles);
        if (rData.roles.length > 0 && !selectedRole) {
          setSelectedRole(rData.roles[0]);
          setRolePermissions(rData.roles[0].role_permissions?.[0] || rData.roles[0].role_permissions || {});
        }
      }
      if (pData.pipelines) setPipelines(pData.pipelines);
      if (aData.approvals) setApprovals(aData.approvals);
      if (mData.members) setMembers(mData.members);
      if (lData.audit_logs) setAuditLogs(lData.audit_logs);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleSelectRole = (r: any) => {
    setSelectedRole(r);
    const permObj = Array.isArray(r.role_permissions) ? r.role_permissions[0] : r.role_permissions;
    setRolePermissions(permObj || {});
  };

  const handleTogglePermission = (key: string) => {
    setRolePermissions((prev: any) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSavingRole(true);
    try {
      await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: rolePermissions }),
      });
      fetchAllData();
    } catch (err) {
      console.error('Save permissions failed:', err);
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleApplyTemplate = async (templateKey: string) => {
    if (!selectedRole) return;
    setIsTemplateDropdownOpen(false);
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_key: templateKey }),
      });
      const data = await res.json();
      if (data.success) {
        setRolePermissions(data.permissions);
        fetchAllData();
      }
    } catch (err) {
      console.error('Apply template failed:', err);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (res.ok) {
        setIsNewRoleOpen(false);
        setNewRoleName('');
        fetchAllData();
      }
    } catch (err) {
      console.error('Create role failed:', err);
    }
  };

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pipelineName,
          category: pipelineCategory,
          description: pipelineDesc,
          stages: [
            { stage_title: 'Initial Review', required_role_id: roles[0]?.id, sla_hours: 24 },
            { stage_title: 'Executive Approval', required_role_id: roles[0]?.id, sla_hours: 48 },
          ]
        })
      });
      if (res.ok) {
        setIsNewPipelineOpen(false);
        setPipelineName('');
        setPipelineDesc('');
        fetchAllData();
      }
    } catch (err) {
      console.error('Create pipeline failed:', err);
    }
  };

  const handleProcessApproval = async (approvalId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error('Process approval failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center font-mono text-xs text-stone-500">
        Loading Kozker Admin Console...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-stone-50 text-stone-800 font-sans select-none overflow-hidden w-full">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shrink-0 z-20">
        {/* Org Header */}
        <div className="h-16 px-5 border-b border-stone-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-brand flex items-center justify-center text-white font-extrabold text-sm shadow-xs font-tight">
            K
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm text-stone-900 truncate font-tight">
              {currentUser?.organization_name || 'Kozker Organization'}
            </h2>
            <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider">
              {currentUser?.operating_mode || 'internal'} Mode
            </p>
          </div>
        </div>

        {/* Project Switcher Pill Dropdown */}
        <div className="p-3 border-b border-stone-200 relative">
          <button
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="w-full p-2 bg-stone-100 hover:bg-stone-200/70 border border-stone-200 rounded text-xs font-semibold text-stone-700 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand" />
              <span>Admin Console</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {isProjectDropdownOpen && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-stone-200 rounded-md shadow-lg z-50 py-1 text-xs divide-y divide-stone-150">
              <div
                onClick={() => {
                  setIsProjectDropdownOpen(false);
                  router.push('/dashboard');
                }}
                className="p-2.5 hover:bg-stone-50 cursor-pointer flex items-center justify-between font-semibold text-brand"
              >
                <span>Kozker Admin Console</span>
                <Check className="w-3.5 h-3.5" />
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
              <div
                onClick={() => {
                  setIsProjectDropdownOpen(false);
                  router.push('/dev');
                }}
                className="p-2.5 hover:bg-stone-50 cursor-pointer flex items-center justify-between text-stone-600 font-mono text-[11px]"
              >
                <span>Developer Access (/dev)</span>
                <Terminal className="w-3.5 h-3.5 text-stone-400" />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 mb-2">
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
              onClick={() => setActiveTab('audit')}
              className={`w-full px-3 py-2 rounded text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'audit' ? 'bg-brand/10 text-brand font-bold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span>System Audit Ledger</span>
            </button>
          </div>
        </nav>

        {/* Footer User Info */}
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
            className="p-1.5 text-stone-400 hover:text-stone-800 cursor-pointer"
            title="Sign Out"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Header */}
        <header className="h-16 bg-white border-b border-stone-200 px-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-bold text-stone-900 font-tight">
              {activeTab === 'roles' && 'Master Roles Hierarchy & Permissions Configurator'}
              {activeTab === 'pipelines' && 'Multi-Stage Approval Pipelines Engine'}
              {activeTab === 'members' && 'Organization Members Directory & Roles'}
              {activeTab === 'audit' && 'System Governance Audit Ledger'}
            </h1>
            <p className="text-[11px] text-stone-500 font-mono">
              Tenant ID: {currentUser?.organization_id}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'roles' && (
              <>
                {/* Template Selector Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 text-stone-500" />
                    <span>Apply Template</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isTemplateDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-56 bg-white border border-stone-200 rounded-md shadow-lg z-50 py-1 text-xs">
                      <div className="px-3 py-1 font-mono text-[10px] text-stone-400 uppercase font-bold border-b border-stone-150">
                        Pre-Configured Templates
                      </div>
                      <button onClick={() => handleApplyTemplate('org-director')} className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700 font-medium">Organization Director (All Access)</button>
                      <button onClick={() => handleApplyTemplate('branch-manager')} className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700 font-medium">Branch Manager</button>
                      <button onClick={() => handleApplyTemplate('senior-recruiter')} className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700 font-medium">Senior Recruiter</button>
                      <button onClick={() => handleApplyTemplate('sourcing-specialist')} className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700 font-medium">Sourcing Specialist</button>
                      <button onClick={() => handleApplyTemplate('hiring-panel')} className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700 font-medium">Hiring Panel Member</button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsNewRoleOpen(true)}
                  className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Master Role</span>
                </button>
              </>
            )}

            {activeTab === 'pipelines' && (
              <button
                onClick={() => setIsNewPipelineOpen(true)}
                className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Pipeline</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab Content Panes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: MASTER ROLES & HIERARCHY TREE */}
          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: 3-Tier Hierarchy Tree */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                  <h3 className="font-tight font-bold text-xs uppercase tracking-wider text-stone-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand" />
                    Role Hierarchy Tree ({roles.length})
                  </h3>
                  <span className="text-[10px] font-mono text-stone-400">3-Tier Matrix</span>
                </div>

                {roles.length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-400 italic">No roles configured.</div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {roles.map(r => {
                      const isSelected = selectedRole?.id === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => handleSelectRole(r)}
                          className={`p-3 rounded border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-brand bg-brand/5 shadow-xs'
                              : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: r.color_hex || '#ff6e30' }}
                            />
                            <div>
                              <div className="font-bold text-stone-900 font-tight">{r.name}</div>
                              <div className="text-[10px] text-stone-500 font-mono capitalize">
                                Level: {r.level} {r.parent_id ? '• Nested' : '• Root'}
                              </div>
                            </div>
                          </div>

                          <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-brand' : 'text-stone-300'}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Permissions Matrix Editor */}
              <div className="lg:col-span-2 bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-6">
                {!selectedRole ? (
                  <div className="text-center py-12 text-xs text-stone-400">Select a role from the left hierarchy tree to inspect and edit permissions.</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-stone-150 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: selectedRole.color_hex || '#ff6e30' }}
                          />
                          <h3 className="text-base font-bold text-stone-900 font-tight">{selectedRole.name}</h3>
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded font-semibold text-stone-600">
                            {selectedRole.level} Level
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5 font-mono">
                          Configure sub-section visibilities and action controls for members assigned this role tag.
                        </p>
                      </div>

                      <button
                        onClick={handleSavePermissions}
                        disabled={isSavingRole}
                        className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-mono font-bold uppercase rounded shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        {isSavingRole ? 'Saving...' : 'Save Permissions'}
                      </button>
                    </div>

                    {/* Permissions Category Sections */}
                    <div className="space-y-6 text-xs">
                      {/* Section 1: System & Administration */}
                      <div className="space-y-3">
                        <div className="font-mono text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                          Administration & Governance Rights
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { key: 'administrator', label: 'Master Administrator' },
                            { key: 'audit_logs', label: 'View System Audit Logs' },
                            { key: 'manage_server', label: 'Server & Provisioning Rights' }
                          ].map(item => (
                            <label key={item.key} className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded cursor-pointer hover:bg-stone-100 transition-colors">
                              <input
                                type="checkbox"
                                checked={!!rolePermissions[item.key]}
                                onChange={() => handleTogglePermission(item.key)}
                                className="accent-brand rounded"
                              />
                              <span className="font-semibold text-stone-800">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Recruiter Panel Sub-Section Visibilities */}
                      <div className="space-y-3">
                        <div className="font-mono text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                          Recruiter AI Panel Sub-Section Visibilities
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { key: 'access_recruitment', label: 'Master Recruitment Panel' },
                            { key: 'recruiter_dashboard', label: 'Dashboard Overview' },
                            { key: 'recruiter_mandates', label: 'Clients & Mandates' },
                            { key: 'recruiter_jobs', label: 'Job Catalogue Workspace' },
                            { key: 'recruiter_sourcing', label: 'Sourcing Talent Pool' },
                            { key: 'recruiter_reports', label: 'Reports & Analytics' },
                            { key: 'recruiter_qna', label: 'Candidate Q&A Forms' },
                            { key: 'recruiter_resumes', label: 'Resume Attachments' },
                            { key: 'recruiter_stage_move', label: 'Funnel Stage Movement' }
                          ].map(item => (
                            <label key={item.key} className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded cursor-pointer hover:bg-stone-100 transition-colors">
                              <input
                                type="checkbox"
                                checked={!!rolePermissions[item.key]}
                                onChange={() => handleTogglePermission(item.key)}
                                className="accent-brand rounded"
                              />
                              <span className="font-semibold text-stone-800">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Section 3: Granular Action Controls */}
                      <div className="space-y-3">
                        <div className="font-mono text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                          Granular Action Controls
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { key: 'manage_jobs', label: 'Create / Edit Jobs' },
                            { key: 'view_resumes', label: 'Download Resumes' },
                            { key: 'edit_status', label: 'Update Stage Status' },
                            { key: 'schedule_interviews', label: 'Schedule Rounds' }
                          ].map(item => (
                            <label key={item.key} className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded cursor-pointer hover:bg-stone-100 transition-colors">
                              <input
                                type="checkbox"
                                checked={!!rolePermissions[item.key]}
                                onChange={() => handleTogglePermission(item.key)}
                                className="accent-brand rounded"
                              />
                              <span className="font-semibold text-stone-800">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APPROVAL PIPELINES ENGINE */}
          {activeTab === 'pipelines' && (
            <div className="space-y-6">
              {/* Pending Approvals Queue Banner */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Pending Governance Approvals Queue ({approvals.length})</span>
                  </div>
                </div>

                {approvals.length === 0 ? (
                  <div className="text-center py-6 text-xs text-stone-400 italic">No pending items requiring governance review.</div>
                ) : (
                  <div className="divide-y divide-stone-150 text-xs">
                    {approvals.map(app => (
                      <div key={app.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-bold text-stone-900 text-sm">{app.item_title}</div>
                          <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                            <span>Category: {app.approval_pipelines?.category || 'Governance'}</span>
                            <span>•</span>
                            <span>Stage: {app.current_stage_title}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => handleProcessApproval(app.id, 'approve')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] font-bold uppercase rounded transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleProcessApproval(app.id, 'reject')}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold uppercase rounded transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Configured Pipelines List */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                    <GitPullRequest className="w-4 h-4 text-brand" />
                    <span>Configured Workflows ({pipelines.length})</span>
                  </div>
                </div>

                {pipelines.length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-400 italic">No approval workflows configured yet.</div>
                ) : (
                  <div className="space-y-4 text-xs">
                    {pipelines.map(p => (
                      <div key={p.id} className="p-4 border border-stone-200 rounded-md bg-stone-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-brand/10 text-brand rounded font-bold mr-2">
                              {p.category}
                            </span>
                            <span className="font-bold text-stone-900 text-sm">{p.name}</span>
                          </div>
                          <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                            {p.status}
                          </span>
                        </div>

                        {/* Stages list */}
                        {p.pipeline_stages && p.pipeline_stages.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200">
                            {p.pipeline_stages.map((st: any, idx: number) => (
                              <React.Fragment key={st.id}>
                                <div className="flex items-center gap-1.5 p-2 bg-white border border-stone-200 rounded text-[11px]">
                                  <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-600 font-mono text-[9px] font-bold flex items-center justify-center">
                                    {st.step_number}
                                  </span>
                                  <span className="font-semibold text-stone-800">{st.stage_title}</span>
                                  <span className="font-mono text-[9px] text-stone-400">({st.sla_hours}h SLA)</span>
                                </div>
                                {idx < p.pipeline_stages.length - 1 && (
                                  <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MEMBERS DIRECTORY */}
          {activeTab === 'members' && (
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-150 pb-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <Users className="w-4 h-4 text-brand" />
                  <span>Organization Members Directory ({members.length})</span>
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 font-mono text-[10px] uppercase text-stone-500">
                      <th className="p-3">Member</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Role Tags</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-stone-400 italic">No members in directory.</td>
                      </tr>
                    ) : (
                      members.map(m => {
                        const rolesList = (m.member_roles || []).map((mr: any) => mr.roles).filter(Boolean);
                        return (
                          <tr key={m.id} className="hover:bg-stone-50">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold font-mono text-[10px] text-stone-700">
                                  {m.avatar_initials || m.name?.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-semibold text-stone-900">{m.name}</span>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-stone-600">{m.email}</td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {rolesList.length === 0 ? (
                                  <span className="text-stone-400 italic text-[10px]">No Role Tag</span>
                                ) : (
                                  rolesList.map((r: any) => (
                                    <span
                                      key={r.id}
                                      className="font-mono text-[9px] px-1.5 py-0.5 rounded border font-semibold text-white"
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
                                {m.status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono text-stone-400 text-[10px]">
                              {new Date(m.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM AUDIT LEDGER */}
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
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-stone-400 italic">No audit log entries recorded.</td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal: New Master Role */}
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
                  <option value="org">Organization Level (Top Level)</option>
                  <option value="branch">Branch / Department Level</option>
                  <option value="position">Position / Individual Contributor</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Parent Hierarchy Role (Optional)</label>
                <select
                  value={newRoleParentId}
                  onChange={(e) => setNewRoleParentId(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                >
                  <option value="">None (Root Role)</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.level})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Role Theme Color</label>
                <div className="flex gap-3">
                  {[
                    { hex: '#ff6e30', label: 'Amber Orange' },
                    { hex: '#2563eb', label: 'Royal Blue' },
                    { hex: '#16a34a', label: 'Forest Green' }
                  ].map(c => (
                    <label key={c.hex} className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px]">
                      <input
                        type="radio"
                        name="color"
                        value={c.hex}
                        checked={newRoleColor === c.hex}
                        onChange={() => setNewRoleColor(c.hex)}
                        className="accent-brand"
                      />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => setIsNewRoleOpen(false)}
                  className="px-3 py-1.5 border border-stone-200 hover:bg-stone-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand hover:bg-brand-hover text-white font-mono font-bold text-xs uppercase rounded cursor-pointer"
                >
                  Create Master Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Pipeline */}
      {isNewPipelineOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white border border-stone-200 max-w-md w-full p-6 rounded-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
              <h3 className="font-bold text-stone-900 text-sm">Create New Approval Pipeline Workflow</h3>
              <button onClick={() => setIsNewPipelineOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePipeline} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Workflow Title</label>
                <input
                  type="text"
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  placeholder="e.g. Executive Offer Approval"
                  required
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Category</label>
                <select
                  value={pipelineCategory}
                  onChange={(e) => setPipelineCategory(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                >
                  <option value="Hiring & Offers">Hiring & Offers</option>
                  <option value="Mandates & Job Postings">Mandates & Job Postings</option>
                  <option value="Admin Governance">Admin Governance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  value={pipelineDesc}
                  onChange={(e) => setPipelineDesc(e.target.value)}
                  placeholder="Workflow requirements..."
                  rows={3}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => setIsNewPipelineOpen(false)}
                  className="px-3 py-1.5 border border-stone-200 hover:bg-stone-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand hover:bg-brand-hover text-white font-mono font-bold text-xs uppercase rounded cursor-pointer"
                >
                  Establish Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
