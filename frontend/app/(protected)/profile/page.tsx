"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  User, Mail, Lock, Sparkles, Bell, Volume2, Cpu, Sliders, Layout, 
  Save, Globe, Building2, Shield, Check, UserCheck, Settings, KeyRound, Palette,
  Upload, X, ImageIcon, Camera
} from "lucide-react";
import { useCurrentUser, useProfile, useUpdateProfile } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import UserAvatar, { GRADIENTS, ICONS } from "@/components/UserAvatar";
import { API_BASE_URL } from "@/lib/api";

const THEMES = [
  { id: "sunset", name: "Sunset Orange", color: "#FF6E30" },
  { id: "ocean", name: "Ocean Breeze", color: "#0EA5E9" },
  { id: "forest", name: "Forest Green", color: "#10B981" },
  { id: "pine", name: "Pine Green", color: "#2F5A27" },
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

  // Active Tab: "profile" | "preferences" | "workspace" | "integrations"
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "workspace" | "integrations">("profile");

  // LinkedIn Integration States
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [linkedinMemberId, setLinkedinMemberId] = useState<string | null>(null);
  const [linkedinCompanyPageId, setLinkedinCompanyPageId] = useState("");
  const [loadingLinkedin, setLoadingLinkedin] = useState(true);
  const [savingCompanyPage, setSavingCompanyPage] = useState(false);
  const [disconnectingLinkedin, setDisconnectingLinkedin] = useState(false);

  const searchParams = useSearchParams();
  const paramTab = searchParams ? searchParams.get("tab") : null;
  const paramStatus = searchParams ? searchParams.get("status") : null;
  const paramMessage = searchParams ? searchParams.get("message") : null;

  // Profile Form States
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [useInitials, setUseInitials] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [useUploadedPhoto, setUseUploadedPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGradient, setSelectedGradient] = useState("gradient-1");
  const [selectedIcon, setSelectedIcon] = useState("user");

  // Settings States (persisted in localStorage)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState("sunset");

  // Workspace tab states
  const [isEditingSubdomain, setIsEditingSubdomain] = useState(false);
  const [subdomain, setSubdomain] = useState("default");
  const [isEditingAgency, setIsEditingAgency] = useState(false);
  const [agencyInput, setAgencyInput] = useState("Kozker ATS Operations");

  // Status message states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isConfirm: boolean;
    onConfirm?: () => void;
  } | null>(null);

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      isConfirm: true,
      onConfirm
    });
  };

  const showCustomAlert = (title: string, message: string) => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      isConfirm: false
    });
  };

  // Load profile and preferences on component mount
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      
      // Parse avatar settings
      const avatarUrl = profile.avatar_url;
      if (avatarUrl) {
        if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://") || avatarUrl.startsWith("/")) {
          // It's an uploaded photo URL
          setUploadedPhotoUrl(avatarUrl);
          setUseUploadedPhoto(true);
          setUseInitials(false);
        } else if (avatarUrl.startsWith("initials:")) {
          setUseInitials(true);
          setUseUploadedPhoto(false);
        } else if (avatarUrl.includes("|")) {
          setUseInitials(false);
          setUseUploadedPhoto(false);
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

      // Load workspace settings
      setSubdomain(localStorage.getItem("kozker_workspace_subdomain") || "default");
      setAgencyInput(localStorage.getItem("kozker_workspace_agency") || "Kozker ATS Operations");
    }
  }, [profile]);

  // OTP Countdown Timer
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // Fetch LinkedIn status
  const fetchLinkedinStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch(`${API_BASE_URL}/integrations/linkedin/status`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setLinkedinConnected(data.connected);
        setLinkedinMemberId(data.linkedin_member_id);
        setLinkedinCompanyPageId(data.company_page_id || "");
      }
    } catch (err) {
      console.error("Error fetching LinkedIn status:", err);
    } finally {
      setLoadingLinkedin(false);
    }
  };

  useEffect(() => {
    fetchLinkedinStatus();
  }, []);

  // Handle URL query parameters for LinkedIn redirects
  useEffect(() => {
    if (paramTab === "integrations") {
      setActiveTab("integrations");
      if (paramStatus === "success") {
        setSuccessMsg("Successfully connected to LinkedIn!");
        // Clear params from URL
        window.history.replaceState({}, "", "/profile");
      } else if (paramStatus === "error") {
        setErrorMsg(paramMessage || "Failed to connect to LinkedIn.");
        window.history.replaceState({}, "", "/profile");
      }
    }
  }, [paramTab, paramStatus, paramMessage]);

  const handleConnectLinkedin = async () => {
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch(`${API_BASE_URL}/integrations/linkedin/authorize?t=${Date.now()}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error("Failed to get authorization URL");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start LinkedIn connection flow");
    }
  };

  const handleDisconnectLinkedin = async () => {
    showCustomConfirm(
      "Disconnect Account",
      "Are you sure you want to disconnect your LinkedIn account?",
      async () => {
        setSuccessMsg("");
        setErrorMsg("");
        setDisconnectingLinkedin(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          const res = await fetch(`${API_BASE_URL}/integrations/linkedin/disconnect`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
          });
          if (!res.ok) {
            throw new Error("Failed to disconnect LinkedIn account");
          }
          setLinkedinConnected(false);
          setLinkedinMemberId(null);
          setLinkedinCompanyPageId("");
          setSuccessMsg("LinkedIn account disconnected successfully.");
          setTimeout(() => setSuccessMsg(""), 4000);
        } catch (err: any) {
          setErrorMsg(err.message || "Failed to disconnect LinkedIn");
        } finally {
          setDisconnectingLinkedin(false);
        }
      }
    );
  };

  const handleSaveCompanyPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setSavingCompanyPage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch(`${API_BASE_URL}/integrations/linkedin/company-page`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ company_page_id: linkedinCompanyPageId }),
      });
      if (!res.ok) {
        throw new Error("Failed to save Company Page ID");
      }
      setSuccessMsg("LinkedIn Company Page ID saved successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save Company Page ID");
    } finally {
      setSavingCompanyPage(false);
    }
  };

  // Compute live preview avatar string
  const getPreviewAvatarUrl = () => {
    if (useUploadedPhoto && uploadedPhotoUrl) {
      return uploadedPhotoUrl;
    }
    if (useInitials) {
      return `initials:${fullName ? fullName.slice(0, 2) : "US"}`;
    }
    return `gradient:${selectedGradient}|icon:${selectedIcon}`;
  };

  // Handle profile picture upload via backend endpoint
  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg("Please upload a valid image file (JPEG, PNG, WebP, or GIF).");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    setErrorMsg("");

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(API_BASE_URL.replace("/api/v1", "") + "/upload-avatar", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Upload failed");
      }

      const { url } = await res.json();
      setUploadedPhotoUrl(url);
      setUseUploadedPhoto(true);
      setUseInitials(false);

      setSuccessMsg("Profile picture uploaded! Click 'Save Profile' to apply.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMsg(err.message || "Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setUploadedPhotoUrl(null);
    setUseUploadedPhoto(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  const [otpError, setOtpError] = useState("");

  // Update password: request OTP first
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!password) {
      setErrorMsg("Please enter a new password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/auth/request-password-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ new_password: password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to request password OTP.");
      }

      setOtpModalOpen(true);
      setOtpValue("");
      setOtpError("");
      setOtpTimer(60);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to request password verification.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Confirm password OTP code
  const handleConfirmPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setVerifyingOtp(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/auth/confirm-password-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ otp: otpValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Verification failed. Invalid or expired OTP.");
      }

      setOtpModalOpen(false);
      setSuccessMsg("Password updated successfully!");
      setPassword("");
      setOtpValue("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setOtpError(err.message || "Failed to confirm password update.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Resend password OTP
  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setOtpError("");
    setSendingOtp(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_BASE_URL}/auth/request-password-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ new_password: password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to resend OTP.");
      }

      setOtpTimer(60);
      setOtpError("A new verification code has been sent.");
    } catch (err: any) {
      setOtpError(err.message || "Failed to resend OTP.");
    } finally {
      setSendingOtp(false);
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

  const handleSaveSubdomain = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    try {
      if (typeof window !== "undefined") {
        const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
        localStorage.setItem("kozker_workspace_subdomain", cleanSubdomain);
        setSubdomain(cleanSubdomain);
        window.dispatchEvent(new Event("kozker_subdomain_changed"));
      }
      setSuccessMsg("Workspace routing subdomain updated successfully!");
      setIsEditingSubdomain(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg("Failed to update workspace subdomain.");
    }
  };

  const handleSaveAgency = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("kozker_workspace_agency", agencyInput);
        window.dispatchEvent(new Event("kozker_subdomain_changed"));
      }
      setSuccessMsg("Workspace organization name updated successfully!");
      setIsEditingAgency(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg("Failed to update organization name.");
    }
  };

  // Publish profile settings context to AI Copilot
  useEffect(() => {
    if (typeof window !== "undefined") {
      const context = {
        page: "settings",
        profile: profile ? {
          recruiter_id: profile.id,
          name: profile.full_name || fullName,
          email: profile.email || "",
          role: profile.role || "recruiter"
        } : {
          recruiter_id: user?.id || "usr-1",
          name: fullName,
          email: "",
          role: "recruiter"
        },
        preferences: {
          email_alerts: emailNotifs,
          slack_sync: slackNotifs,
          sound_effects: soundAlerts,
          theme: selectedTheme
        },
        workspace: {
          subdomain: subdomain,
          title: agencyInput + " Workspace"
        },
        // Global format
        selected_entity: null,
        visible_rows: [
          { name: "Full Name", value: fullName },
          { name: "Email Notifications", value: emailNotifs ? "Enabled" : "Disabled" },
          { name: "Slack Sync", value: slackNotifs ? "Enabled" : "Disabled" },
          { name: "Sound Effects", value: soundAlerts ? "Enabled" : "Disabled" },
          { name: "Active Theme", value: selectedTheme }
        ],
        visible_data: {
          active_tab: activeTab,
          linkedin_connected: linkedinConnected,
          linkedin_member_id: linkedinMemberId,
          linkedin_company_page_id: linkedinCompanyPageId
        },
        entities: {
          recruiter_id: profile?.id || user?.id
        }
      };

      window.dispatchEvent(new CustomEvent("copilot-context-update", { detail: context }));
    }
  }, [profile, user, fullName, emailNotifs, slackNotifs, soundAlerts, selectedTheme, activeTab, linkedinConnected, linkedinMemberId, linkedinCompanyPageId]);

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
          onClick={() => { setActiveTab("integrations"); setSuccessMsg(""); setErrorMsg(""); }}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "integrations" 
              ? "border-primary text-neutral-900" 
              : "border-transparent text-neutral-400 hover:text-neutral-600 hover:border-neutral-200"
          }`}
        >
          <svg className="w-4 h-4 animate-fade-in" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
          LinkedIn Integration
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
              <div className="relative group">
                <UserAvatar 
                  avatarUrl={getPreviewAvatarUrl()}
                  fullName={fullName}
                  email={user?.email}
                  className="w-20 h-20 text-3xl"
                  size={40}
                />
                {useUploadedPhoto && uploadedPhotoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center cursor-pointer shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove uploaded photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <div className="text-center space-y-1">
                <h4 className="text-xs font-bold text-neutral-800 truncate max-w-[180px]">{fullName || "Recruiter"}</h4>
                <p className="text-[10px] text-neutral-400 font-mono uppercase">{profile?.role || "RECRUITER"}</p>
              </div>

              {/* Upload Profile Picture Section */}
              <div className="w-full pt-4 border-t border-neutral-100 space-y-3">
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block">Profile Picture</span>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                />

                {useUploadedPhoto && uploadedPhotoUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-success">
                      <Check className="w-3.5 h-3.5" />
                      <span className="font-semibold uppercase">Photo Uploaded</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 px-2 py-1.5 text-[10px] bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-sm font-semibold uppercase tracking-wider text-neutral-600 cursor-pointer transition-colors flex items-center justify-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="flex-1 px-2 py-1.5 text-[10px] bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-sm font-semibold uppercase tracking-wider text-red-500 dark:text-red-400 cursor-pointer transition-colors flex items-center justify-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handlePhotoUpload(file);
                    }}
                    className="w-full flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-250 hover:border-primary/50 rounded-sm bg-neutral-50 hover:bg-primary/[0.02] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-mono text-primary font-semibold uppercase">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 bg-neutral-100 border border-neutral-200 rounded-sm flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-neutral-400" />
                        </div>
                        <div className="text-center space-y-0.5">
                          <span className="text-[10px] font-semibold text-neutral-600 block">Upload your own photo</span>
                          <span className="text-[9px] text-neutral-400 block">Click or drag an image here</span>
                          <span className="text-[8px] text-neutral-400 font-mono block">JPEG, PNG, WebP, GIF • Max 5 MB</span>
                        </div>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Avatar Type Toggle — only visible when no photo is uploaded */}
              {!useUploadedPhoto && (
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
              )}
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
              {!useInitials && !useUploadedPhoto && (
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

      {/* TAB 3: Workspace Information */}
      {activeTab === "workspace" && (
        <div className="bg-white border border-neutral-200 rounded-sm p-6 space-y-6 animate-fade-in">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Active Workspace Configurations
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-sm space-y-1.5 relative group">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Organization Name</span>
                {isEditingAgency ? (
                  <form onSubmit={handleSaveAgency} className="space-y-2">
                    <input
                      type="text"
                      value={agencyInput}
                      onChange={(e) => setAgencyInput(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-neutral-250 bg-white rounded-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      required
                      placeholder="Organization Name"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-primary text-white text-[9px] font-bold uppercase rounded-xs cursor-pointer transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAgencyInput(localStorage.getItem("kozker_workspace_agency") || "Kozker ATS Operations");
                          setIsEditingAgency(false);
                        }}
                        className="px-2.5 py-1 border border-neutral-200 text-neutral-505 text-[9px] font-bold uppercase rounded-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-neutral-800">{agencyInput}</p>
                      <button
                        type="button"
                        onClick={() => setIsEditingAgency(true)}
                        className="px-2 py-0.5 border border-neutral-200 hover:bg-neutral-100 text-neutral-600 text-[9px] font-bold uppercase rounded-xs cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <span className="text-[9px] text-neutral-450 block font-mono">ID: org-kozker-prod-v3</span>
                  </>
                )}
              </div>

              <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-sm space-y-1.5 relative group">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Routing Subdomain</span>
                {isEditingSubdomain ? (
                  <form onSubmit={handleSaveSubdomain} className="space-y-2">
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                        className="px-2 py-1 text-xs border border-neutral-250 bg-white rounded-xs font-mono w-24 focus:ring-1 focus:ring-primary focus:outline-none"
                        required
                        placeholder="subdomain"
                      />
                      <span className="text-xs font-mono text-neutral-500">.kozker.ai</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-primary text-white text-[9px] font-bold uppercase rounded-xs cursor-pointer transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSubdomain(localStorage.getItem("kozker_workspace_subdomain") || "default");
                          setIsEditingSubdomain(false);
                        }}
                        className="px-2.5 py-1 border border-neutral-200 text-neutral-505 text-[9px] font-bold uppercase rounded-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-primary font-mono">{subdomain}.kozker.ai</p>
                      <button
                        type="button"
                        onClick={() => setIsEditingSubdomain(true)}
                        className="px-2 py-0.5 border border-neutral-200 hover:bg-neutral-100 text-neutral-600 text-[9px] font-bold uppercase rounded-xs cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <span className="text-[9px] text-neutral-455 block font-mono">SSL Cert Status: Verified</span>
                  </>
                )}
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

      {/* TAB 4: LinkedIn Integration */}
      {activeTab === "integrations" && (
        <div className="bg-white border border-neutral-200 rounded-sm p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              LinkedIn Company Page Integration
            </h3>
            
            <p className="text-xs text-neutral-500 leading-relaxed">
              Connect your LinkedIn account to enable publishing generated job openings directly to your organization's LinkedIn Company Page with a single click.
            </p>

            {loadingLinkedin ? (
              <div className="flex items-center gap-2 py-4">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-neutral-500 font-mono">Loading Integration Status...</span>
              </div>
            ) : linkedinConnected ? (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50/10 dark:bg-emerald-950/20 border border-emerald-100/20 dark:border-emerald-900/30 rounded-sm space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="text-xs font-bold text-neutral-800">Connected to LinkedIn</span>
                    </div>
                    <button
                      onClick={handleDisconnectLinkedin}
                      disabled={disconnectingLinkedin}
                      type="button"
                      className="px-3 py-1.5 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 dark:text-red-400 font-semibold text-[10px] tracking-wider uppercase transition-colors rounded-sm cursor-pointer disabled:opacity-50"
                    >
                      {disconnectingLinkedin ? "Disconnecting..." : "Disconnect"}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono pt-2 border-t border-emerald-100/20 dark:border-emerald-900/10 text-neutral-600">
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Connected Member ID</span>
                      <span className="text-neutral-800 font-semibold">{linkedinMemberId || "Unknown"}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveCompanyPage} className="space-y-4 pt-2 border-t border-neutral-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-800 block">
                      LinkedIn Company Page ID
                    </label>
                    <span className="text-[10px] text-neutral-400 block">
                      To publish to your company page, find your organization's numeric ID on LinkedIn (e.g., from your company page admin URL).
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 12345678"
                      value={linkedinCompanyPageId}
                      onChange={(e) => setLinkedinCompanyPageId(e.target.value)}
                      className="w-full max-w-md px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary text-sm transition-colors font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingCompanyPage}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingCompanyPage ? "Saving..." : "Save Company Page ID"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-sm flex flex-col items-center text-center space-y-4 max-w-lg mx-auto">
                <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-full text-neutral-400">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-neutral-800">Account Not Connected</h4>
                  <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
                    Connect your LinkedIn profile to start posting job descriptions automatically from your dashboard.
                  </p>
                </div>
                <button
                  onClick={handleConnectLinkedin}
                  type="button"
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  Connect LinkedIn
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {otpModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white border border-neutral-200 rounded-sm w-full max-w-md p-6 space-y-5 shadow-2xl text-neutral-700 animate-slide-up">
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
              <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-tight font-black text-sm text-neutral-800 uppercase tracking-wider">Confirm Password Change</h3>
                <p className="text-[10px] text-neutral-400 font-mono uppercase">Identity Verification</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-neutral-500 text-xs leading-relaxed">
              For security, we sent a 6-digit One-Time Password (OTP) to your registered email <strong className="text-neutral-850 font-semibold">{user?.email ? user.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + "*".repeat(gp3.length)) : "your email"}</strong>. Please enter the code below to complete the password update.
            </p>

            {/* Error or Info Feedback */}
            {otpError && (
              <div className={`p-2.5 rounded-sm border text-[11px] font-medium flex items-center gap-2 ${
                otpError.includes("sent") 
                  ? "bg-indigo-50 text-indigo-700 border-indigo-150" 
                  : "bg-rose-50 text-rose-800 border-rose-150"
              }`}>
                {otpError.includes("sent") ? (
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-rose-600 rounded-full shrink-0"></span>
                )}
                <span>{otpError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleConfirmPasswordOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="0 0 0 0 0 0"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center py-3 bg-neutral-50 border border-neutral-250 rounded-sm text-lg font-mono font-bold tracking-widest text-neutral-900 placeholder:text-neutral-300 focus:border-primary transition-all outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOtpModalOpen(false);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="flex-1 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-sm text-neutral-500 font-bold uppercase tracking-wider text-[10px] cursor-pointer text-center transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingOtp || otpValue.length < 6}
                  className="flex-1 py-2 bg-primary hover:bg-primary/95 text-neutral-white font-bold uppercase tracking-wider text-[10px] rounded-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {verifyingOtp ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-neutral-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      Verify & Update
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Resend Options */}
            <div className="text-center pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-neutral-450">
              <span>Didn't receive the email?</span>
              {otpTimer > 0 ? (
                <span>Resend in <strong className="text-primary font-bold">{otpTimer}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={sendingOtp}
                  className="text-primary hover:text-primary/80 font-bold uppercase tracking-wider text-[10px] cursor-pointer disabled:opacity-50"
                >
                  {sendingOtp ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {customDialog && customDialog.isOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center z-[9999] animate-fade-in font-sans p-4 select-none">
          <div className="bg-white dark:bg-stone-900 border border-neutral-200 dark:border-stone-800 max-w-sm w-full p-5 space-y-4 shadow-xl rounded-sm">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="font-tight font-bold text-[10px] uppercase tracking-wider">{customDialog.title}</span>
            </div>
            
            <p className="text-neutral-700 dark:text-neutral-300 text-xs leading-relaxed">
              {customDialog.message}
            </p>
            
            <div className="flex items-center justify-end gap-2.5 pt-2">
              {customDialog.isConfirm ? (
                <>
                  <button
                    onClick={() => setCustomDialog(null)}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-neutral-600 dark:text-neutral-300 text-[10px] font-tight font-semibold uppercase tracking-wider transition-colors cursor-pointer rounded-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (customDialog.onConfirm) customDialog.onConfirm();
                      setCustomDialog(null);
                    }}
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-neutral-white text-[10px] font-tight font-semibold uppercase tracking-wider transition-colors cursor-pointer rounded-sm"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setCustomDialog(null)}
                  className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-neutral-white text-[10px] font-tight font-semibold uppercase tracking-wider transition-colors cursor-pointer rounded-sm"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
