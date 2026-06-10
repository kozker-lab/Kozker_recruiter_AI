"use client";

import React, { useState, useEffect } from "react";
import { User, Lock, Mail } from "lucide-react";
import { useCurrentUser, useProfile, useUpdateProfile } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const user = useCurrentUser();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await updateProfile.mutateAsync({
        full_name: fullName,
      });

      if (password) {
        const { error: pwError } = await supabase.auth.updateUser({
          password: password,
        });
        if (pwError) throw pwError;
      }

      setSuccessMsg("Profile updated successfully!");
      setPassword(""); // Clear password field
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-tight font-bold text-neutral-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-neutral-500">Manage your profile information and security preferences.</p>
      </div>

      <div className="bg-neutral-white border border-neutral-200 rounded-sm shadow-xs overflow-hidden">
        <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
          
          {successMsg && (
            <div className="p-3 bg-success/10 text-success text-sm rounded-sm font-medium border border-success/20">
              {successMsg}
            </div>
          )}
          
          {errorMsg && (
            <div className="p-3 bg-error/10 text-error text-sm rounded-sm font-medium border border-error/20">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2">
              Public Profile
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary text-sm transition-colors"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full pl-9 pr-3 py-2 bg-neutral-100 border border-neutral-200 rounded-sm text-neutral-500 text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-neutral-400">Email addresses cannot be changed directly.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-2">
              Security
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">Change Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                  type="password"
                  placeholder="Leave blank to keep current password"
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
              disabled={updateProfile.isPending}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer shadow-xs disabled:opacity-50"
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
