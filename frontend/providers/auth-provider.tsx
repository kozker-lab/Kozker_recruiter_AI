"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { apiRequest } from "../lib/api";
import { UserCheck, Sparkles, Building2, UserCircle2, ShieldCheck, Mail, Lock } from "lucide-react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  signup: (email: string, fullName: string) => Promise<void>;
  onboard: (fullName: string, agencyName: string, domainName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Onboarding Form States
  const [onboardStep, setOnboardStep] = useState<number>(1);
  const [onboardName, setOnboardName] = useState<string>("");
  const [onboardAgency, setOnboardAgency] = useState<string>("");
  const [onboardDomain, setOnboardDomain] = useState<string>("");
  const [onboardSubmitting, setOnboardSubmitting] = useState<boolean>(false);

  // Login Form States
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [nameInput, setNameInput] = useState<string>("");

  useEffect(() => {
    // Initial user load
    const loadUser = async () => {
      try {
        const u = await apiRequest<User>("GET", "/auth/me");
        setUser(u);
      } catch (err) {
        console.error("Failed to load user session, staying logged out.", err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email: string) => {
    try {
      setAuthError(null);
      const res = await apiRequest<{ user: User }>("POST", "/auth/login", { email });
      setUser(res.user);
    } catch (err: any) {
      setAuthError(err.message || "Failed to log in.");
    }
  };

  const signup = async (email: string, fullName: string) => {
    try {
      setAuthError(null);
      const res = await apiRequest<{ user: User }>("POST", "/auth/signup", { email, full_name: fullName });
      setUser(res.user);
    } catch (err: any) {
      setAuthError(err.message || "Failed to register.");
    }
  };

  const onboard = async (fullName: string, agencyName: string, domainName: string) => {
    setOnboardSubmitting(true);
    try {
      // Patch user to be onboarded
      const updatedUser = await apiRequest<User>("PATCH", "/auth/onboarded", {
        full_name: fullName,
        metadata: { agencyName, domainName }
      });
      setUser(updatedUser);
    } catch (err) {
      console.error("Onboarding failed", err);
    } finally {
      setOnboardSubmitting(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsLoginView(true);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    login(emailInput);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !nameInput) return;
    signup(emailInput, nameInput);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-200">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent animate-spin rounded-full mb-4"></div>
        <p className="font-tight text-sm tracking-wider text-neutral-400">LOADING KOZKER RECRUITER AI...</p>
      </div>
    );
  }

  // 1. Gate 1: If User is null, render Login/Signup Panel
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row items-stretch justify-stretch font-sans text-neutral-200">
        {/* Decorative branding column */}
        <div className="hidden md:flex md:w-1/2 bg-neutral-900 border-r border-neutral-800 p-12 flex-col justify-between relative overflow-hidden select-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-success/5 rounded-full blur-[90px] pointer-events-none"></div>
          
          <div className="flex items-center gap-2 relative z-10">
            <span className="w-3.5 h-3.5 bg-primary rounded-sm animate-pulse"></span>
            <span className="font-tight font-bold text-lg tracking-wider text-neutral-white">KOZKER RECRUITER AI</span>
          </div>
          
          <div className="relative z-10 space-y-6">
            <h1 className="text-4xl font-tight font-bold text-neutral-white leading-tight">
              Enterprise ATS powered by Machine Intelligence.
            </h1>
            <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
              Accelerate client recruitment, auto-generate job descriptions, match talent using high-fidelity skills alignment, and automate personalized candidate review questions.
            </p>
          </div>

          <div className="relative z-10 border-t border-neutral-800/80 pt-6 flex items-center justify-between text-xs text-neutral-500 font-mono">
            <span>PLATFORM: v1.0.0-PRO</span>
            <span>DESIGN: LINEAR INSPIRATION</span>
          </div>
        </div>

        {/* Input form column */}
        <div className="flex-1 flex flex-col justify-center items-center p-8 bg-neutral-950">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl font-tight font-semibold text-neutral-white tracking-tight">
                {isLoginView ? "Welcome back" : "Create recruiter account"}
              </h2>
              <p className="text-neutral-400 text-xs">
                {isLoginView ? "Log in to manage requirements & pipelines" : "Begin high-efficiency talent acquisition"}
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-sm font-mono">
                {authError}
              </div>
            )}

            <form onSubmit={isLoginView ? handleLoginSubmit : handleSignupSubmit} className="space-y-4 font-sans text-sm">
              {!isLoginView && (
                <div className="space-y-1.5">
                  <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Full Name</label>
                  <div className="relative">
                    <UserCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Alex Mercer"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all focus:border-primary text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="email"
                    placeholder="recruiter@kozker.ai"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all focus:border-primary text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary hover:bg-primary/95 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer"
              >
                {isLoginView ? "Log In" : "Register Recruiter"}
              </button>
            </form>

            <div className="text-center font-sans text-xs">
              <button
                onClick={() => {
                  setIsLoginView(!isLoginView);
                  setAuthError(null);
                }}
                className="text-neutral-400 hover:text-primary transition-colors cursor-pointer underline underline-offset-4"
              >
                {isLoginView ? "Need an account? Sign up" : "Already registered? Log in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Gate 2: If User is logged in but not onboarded, render Onboarding Steps
  if (!user.is_onboarded) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-neutral-200">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-primary rounded-sm"></span>
              <span className="font-tight font-bold tracking-wider text-xs text-neutral-white">RECRUITER ONBOARDING</span>
            </div>
            <span className="font-mono text-xs text-neutral-500">Step {onboardStep} of 2</span>
          </div>

          {onboardStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-tight font-semibold text-neutral-white">Personal Profile Setup</h3>
                <p className="text-neutral-400 text-xs">Specify your recruiter name for client audit logging.</p>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  placeholder="Alex Mercer"
                  value={onboardName}
                  onChange={(e) => setOnboardName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all text-xs"
                />
              </div>

              <button
                disabled={!onboardName}
                onClick={() => setOnboardStep(2)}
                className="w-full py-2 bg-primary disabled:opacity-50 hover:bg-primary/95 text-neutral-white font-medium text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer mt-2"
              >
                Continue Setup
              </button>
            </div>
          )}

          {onboardStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-tight font-semibold text-neutral-white">Recruitment Workspace</h3>
                <p className="text-neutral-400 text-xs">Configure your organization and workspace subdomains.</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Agency / Organization Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-neutral-600" />
                    <input
                      type="text"
                      placeholder="Kozker Talent Hub"
                      value={onboardAgency}
                      onChange={(e) => setOnboardAgency(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-sm text-neutral-white placeholder:text-neutral-600 transition-all text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider block">Subdomain Mapping</label>
                  <div className="flex rounded-sm overflow-hidden border border-neutral-800">
                    <input
                      type="text"
                      placeholder="kozker-agency"
                      value={onboardDomain}
                      onChange={(e) => setOnboardDomain(e.target.value)}
                      className="flex-1 px-3 py-2 bg-neutral-950 text-neutral-white placeholder:text-neutral-600 transition-all text-xs border-r border-neutral-800"
                    />
                    <span className="bg-neutral-850 px-3 py-2 text-xs text-neutral-500 font-mono flex items-center">.kozker.ai</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setOnboardStep(1)}
                  className="flex-1 py-2 border border-neutral-800 hover:bg-neutral-850 text-neutral-400 text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={!onboardAgency || !onboardDomain || onboardSubmitting}
                  onClick={() => onboard(onboardName, onboardAgency, onboardDomain)}
                  className="flex-1 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 text-neutral-white text-xs tracking-wider uppercase transition-colors rounded-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {onboardSubmitting ? "Finishing..." : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Complete Onboarding
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Gate 3: User is fully logged in and onboarded. Render Children (App)
  return (
    <AuthContext.Provider value={{ user, loading, login, signup, onboard, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
