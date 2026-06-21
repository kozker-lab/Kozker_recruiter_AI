"use client";

import React, { useState, useEffect } from "react";
import { 
  User, Mail, Lock, Sparkles, Bell, Volume2, Cpu, Sliders, Layout, 
  Save, Globe, Building2, Shield, Check, UserCheck, Settings, KeyRound, Palette
} from "lucide-react";
import { useCurrentUser, useProfile, useUpdateProfile } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import UserAvatar, { GRADIENTS, ICONS } from "@/components/UserAvatar";

const THEMES = [
  { id: "sunset", name: "Sunset Orange", color: "#FF6E30" },
  { id: "ocean", name: "Ocean Breeze", color: "#0EA5E9" },
  { id: "forest", name: "Forest Green", color: "#10B981" },
  { id: "cosmic", name: "Cosmic Orchid", color: "#8B5CF6" },
  { id: "rose", name: "Rose Quartz", color: "#F43F5E" },
  { id: "amber", name: "Classic Amber", color: "#F59E0B" },
  { id: "midnight", name: "Midnight Blue", color: "#6366F1" },
];

export default function ProfilePage() {
  const user = useCurrentUser();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const supabase = createClient();

  // Active Tab: "profile" | "preferences" | "workspace"
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "workspace">("profile");

  // Profile Form States
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [useInitials, setUseInitials] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState("gradient-1");
  const [selectedIcon, setSelectedIcon] = useState("user");

  // Settings States (persisted in localStorage)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState("sunset");

  // Status message states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Load profile and preferences on component mount
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      
      // Parse avatar settings
      const avatarUrl = profile.avatar_url;
      if (avatarUrl) {
        if (avatarUrl.startsWith("initials:")) {
          setUseInitials(true);
        } else if (avatarUrl.includes("|")) {
          setUseInitials(false);
          const parts = avatarUrl.split("|");
          parts.forEach((part) => {
            if (part.startsWith("gradient:")) {
              setSelectedGradient(part.replace("gradient:", ""));
            } else if (part.startsWith("icon:")) {
              setSelectedIcon(part.replace("icon:", ""));
            }
          });
        }
      }
    }

    // Load settings from localStorage
    if (typeof window !== "undefined") {
      setEmailNotifs(localStorage.getItem("kozker_pref_email_notifs") !== "false");
      setSlackNotifs(localStorage.getItem("kozker_pref_slack_notifs") === "true");
      setSoundAlerts(localStorage.getItem("kozker_pref_sound_alerts") !== "false");
      setSelectedTheme(localStorage.getItem("kozker_pref_theme") || "sunset");
    }
  }, [profile]);

  // Compute live preview avatar string
  const getPreviewAvatarUrl = () => {
    if (useInitials) {
      return `initials:${fullName ? fullName.slice(0, 2) : "US"}`;
    }
    return `gradient:${selectedGradient}|icon:${selectedIcon}`;
  };

  // Save changes for Profile tab
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setSaving(true);

    try {
      const avatarUrl = getPreviewAvatarUrl();
      
      // Update public profile details in Supabase
      await updateProfile.mutateAsync({
        full_name: fullName,
        avatar_url: avatarUrl,
      });

      setSuccessMsg("Public profile updated successfully!");
      
      // Clear message after 4s
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile details");
    } finally {
      setSaving(false);
    }
  };

  // Update password separately
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!password) {
      setErrorMsg("Please enter a new password.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error: pwError } = await supabase.auth.updateUser({
        password: password,
      });
      if (pwError) throw pwError;

      setSuccessMsg("Password updated successfully!");
      setPassword("");
      
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Save changes for Preferences tab
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("kozker_pref_email_notifs", String(emailNotifs));
        localStorage.setItem("kozker_pref_slack_notifs", String(slackNotifs));
        localStorage.setItem("kozker_pref_sound_alerts", String(soundAlerts));
      }

      setSuccessMsg("Platform preferences saved successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg("Failed to save platform preferences.");
    }
  };

  const handleSelectTheme = (themeName: string) => {
    setSelectedTheme(themeName);
    if (typeof window !== "undefined") {
      localStorage.setItem("kozker_pref_theme", themeName);
      document.documentElement.setAttribute("data-theme", themeName);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Title Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-tight font-bold text-neutral-900 tracking-tight">Recruiter Profile & Settings</h1>
        <p className="text-sm text-neutral-500">Configure your public-facing card, profile picture, workspace subdomains, and AI helper settings.</p>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-neutral-200 gap-1 select-none">
        <button
          onClick={() => { setActiveTab("profile"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "profile" 
              ? "border-primary text-neutral-900" 
              : "border-transparent text-neutral-400 hover:text-neutral-600 hover:border-neutral-200"
          }`}
        >
          <User className="w-4 h-4" />
          Public Profile
        </button>
        <button
          onClick={() => { setActiveTab("preferences"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "preferences" 
              ? "border-primary text-neutral-900" 
              : "border-transparent text-neutral-400 hover:text-neutral-600 hover:border-neutral-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Preferences & Themes
        </button>
        <button
          onClick={() => { setActiveTab("workspace"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "workspace" 
              ? "border-primary text-neutral-900" 
              : "border-transparent text-neutral-400 hover:text-neutral-600 hover:border-neutral-200"
          }`}
        >
          <Globe className="w-4 h-4" />
          Workspace
        </button>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-sm font-semibold border border-emerald-250 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-sm font-semibold border border-rose-250">
          {errorMsg}
        </div>
      )}

      {/* TAB 1: Public Profile Form */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avatar Settings Column */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white border border-neutral-200 rounded-sm p-5 space-y-5 flex flex-col items-center">
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-full text-center">Live Preview</span>
              
              {/* Giant Preview Avatar */}
              <UserAvatar 
                avatarUrl={getPreviewAvatarUrl()}
                fullName={fullName}
                email={user?.email}
                className="w-20 h-20 text-3xl"
                size={40}
              />
              
              <div className="text-center space-y-1">
                <h4 className="text-xs font-bold text-neutral-800 truncate max-w-[180px]">{fullName || "Recruiter"}</h4>
                <p className="text-[10px] text-neutral-400 font-mono uppercase">{profile?.role || "RECRUITER"}</p>
              </div>

              {/* Avatar Type Toggle */}
              <div className="w-full pt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-medium">Use Name Initials</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useInitials}
                    onChange={(e) => setUseInitials(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-250 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:height-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* General details display */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-sm p-4 space-y-3 font-mono text-[10px] text-neutral-500">
              <div className="flex justify-between">
                <span>Account ID</span>
                <span className="text-neutral-700 truncate max-w-[120px]" title={profile?.id}>{profile?.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Onboarding Stage</span>
                <span className="text-neutral-700 font-bold uppercase">{profile?.is_onboarded ? "Completed" : "Pending"}</span>
              </div>
              <div className="flex justify-between">
                <span>Created At</span>
                <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}</span>
              </div>
            </div>
          </div>

          {/* Edit Fields Column */}
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="bg-white border border-neutral-200 rounded-sm p-6 space-y-6">
              
              {/* Profile Details Inputs */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2">
                  Identity Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <input
                        type="text"
                        required
                        placeholder="Alex Mercer"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary text-sm transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Email (Non-Editable)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <input
                        type="email"
                        disabled
                        value={user?.email || ""}
                        className="w-full pl-9 pr-3 py-2 bg-neutral-100 border border-neutral-200 rounded-sm text-neutral-400 text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Avatar Selector Grid */}
              {!useInitials && (
                <div className="space-y-4 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800">
                      Avatar Gradient & Icon Selection
                    </h3>
                    <span className="text-[10px] text-primary font-bold tracking-wider uppercase">Select options below</span>
                  </div>

                  {/* Gradient Grid Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Select Base Gradient</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {Object.keys(GRADIENTS).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedGradient(key)}
                          className={`h-11 rounded-sm border cursor-pointer transition-all flex items-center justify-center relative overflow-hidden ${GRADIENTS[key]} ${
                            selectedGradient === key 
                              ? "ring-2 ring-primary ring-offset-2 scale-102 border-transparent shadow-md" 
                              : "hover:scale-102 border-neutral-200"
                          }`}
                        >
                          <span className="text-[8px] font-bold tracking-tighter capitalize opacity-90">
                            {key.replace("-", " ")}
                          </span>
                          {selectedGradient === key && (
                            <div className="absolute top-0.5 right-0.5 bg-neutral-900/60 p-0.5 rounded-sm">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon Selection */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Select Overlay Icon</label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                      {Object.keys(ICONS).map((key) => {
                        const IconComponent = ICONS[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedIcon(key)}
                            className={`p-2.5 border rounded-sm flex items-center justify-center cursor-pointer transition-all ${
                              selectedIcon === key
                                ? "bg-primary border-primary text-white scale-105 shadow-sm"
                                : "bg-neutral-50 border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                            }`}
                            title={`Select ${key} icon`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Action */}
              <div className="pt-4 border-t border-neutral-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>
            </form>

            {/* Security Settings - Password Change Form */}
            <form onSubmit={handleUpdatePassword} className="bg-white border border-neutral-200 rounded-sm p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Security Settings
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Update Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <input
                      type="password"
                      required
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary text-sm transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {updatingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* TAB 2: Preferences & AI Settings */}
      {activeTab === "preferences" && (
        <form onSubmit={handleSavePreferences} className="bg-white border border-neutral-200 rounded-sm p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left side: System Notification Preferences */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Notification Preferences
              </h3>

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 pr-4">
                    <label className="text-xs font-semibold text-neutral-800 block">Email Alerts</label>
                    <span className="text-[10px] text-neutral-400 block">Receive email notifications when background matching or resume uploads complete.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                    <input
                      type="checkbox"
                      checked={emailNotifs}
                      onChange={(e) => setEmailNotifs(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-250 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:height-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 pr-4">
                    <label className="text-xs font-semibold text-neutral-800 block">Slack Operations Sync</label>
                    <span className="text-[10px] text-neutral-400 block">Dispatch system notifications into the active team Slack channel.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                    <input
                      type="checkbox"
                      checked={slackNotifs}
                      onChange={(e) => setSlackNotifs(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-250 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:height-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 pr-4">
                    <label className="text-xs font-semibold text-neutral-800 block">Alert Sound Effects</label>
                    <span className="text-[10px] text-neutral-400 block">Play sound effects upon receiving new matching agent completed alerts.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                    <input
                      type="checkbox"
                      checked={soundAlerts}
                      onChange={(e) => setSoundAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-250 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:height-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

            </div>

            {/* Right side: Theme Selection */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Platform Theme Selection
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`p-3 border rounded-sm flex items-center justify-between transition-all cursor-pointer text-left ${
                      selectedTheme === theme.id
                        ? "border-primary bg-primary/[0.02] shadow-xs"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span 
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-neutral-300" 
                        style={{ backgroundColor: theme.color }} 
                      />
                      <div className="leading-tight">
                        <p className="text-xs font-semibold text-neutral-800">{theme.name}</p>
                        <p className="text-[9px] text-neutral-400 font-mono uppercase">{theme.id}</p>
                      </div>
                    </div>
                    {selectedTheme === theme.id && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Form Action */}
          <div className="pt-4 border-t border-neutral-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer shadow-xs flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              Save Preferences
            </button>
          </div>

        </form>
      )}

      {/* TAB 3: Workspace Information (Read Only Details) */}
      {activeTab === "workspace" && (
        <div className="bg-white border border-neutral-200 rounded-sm p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Active Workspace Configurations
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-sm space-y-1.5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Organization Name</span>
                <p className="text-sm font-bold text-neutral-800">Kozker ATS Operations</p>
                <span className="text-[9px] text-neutral-450 block font-mono">ID: org-kozker-prod-v3</span>
              </div>

              <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-sm space-y-1.5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Routing Subdomain</span>
                <p className="text-sm font-bold text-primary font-mono">default.kozker.ai</p>
                <span className="text-[9px] text-neutral-450 block font-mono">SSL Cert Status: Verified</span>
              </div>

              <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-sm space-y-1.5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Connected System Status</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold text-neutral-800">Active & Syncing</span>
                </div>
                <span className="text-[9px] text-neutral-450 block font-mono">Last Sync: Just Now</span>
              </div>

            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-neutral-100">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Security & Permissions
            </h3>
            
            <div className="bg-neutral-50 border border-neutral-150 rounded-sm p-4 text-xs text-neutral-600 leading-relaxed space-y-2">
              <p>Your account is configured with the <strong className="text-neutral-800">RECRUITER</strong> role permissions under Row-Level Security (RLS).</p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-500 font-mono text-[10px]">
                <li>Create and update mandate specifications (Requirements).</li>
                <li>Audit and match sourced candidates.</li>
                <li>Approve screening questions and push jobs to active pipelines.</li>
                <li>Full access permissions to your created clients & mandates log.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
