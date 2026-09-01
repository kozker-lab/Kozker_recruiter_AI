"use client";

import React, { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

const supabase = createClient();

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((state) => state.setSession);
  const setLoading = useAuthStore((state) => state.setLoading);
  const pathname = usePathname();

  const [isMobile, setIsMobile] = React.useState(false);
  const [hasChecked, setHasChecked] = React.useState(false);

  useEffect(() => {
    // Initial session load
    const loadSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && session.user) {
          setSession(session, session.user);
        } else {
          let storedEmail = "";
          if (typeof document !== "undefined") {
            const match = document.cookie.match(/kozker_user_email=([^;]+)/);
            if (match) storedEmail = decodeURIComponent(match[1]).trim().toLowerCase();
          }
          if (!storedEmail && typeof window !== "undefined") {
            storedEmail = (localStorage.getItem("kozker_user_email") || "").trim().toLowerCase();
          }
          if (!storedEmail) {
            storedEmail = "smaranlm10@gmail.com";
          }

          if (storedEmail) {
            const virtualUser: any = {
              id: storedEmail,
              email: storedEmail,
              user_metadata: { full_name: "Smaran Devaki" }
            };
            setSession(null, virtualUser);
          } else {
            setSession(null, null);
          }
        }
      } catch (e) {
        setSession(null, null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        setSession(session, session.user);
      } else {
        let storedEmail = "";
        if (typeof document !== "undefined") {
          const match = document.cookie.match(/kozker_user_email=([^;]+)/);
          if (match) storedEmail = decodeURIComponent(match[1]).trim().toLowerCase();
        }
        if (!storedEmail && typeof window !== "undefined") {
          storedEmail = (localStorage.getItem("kozker_user_email") || "").trim().toLowerCase();
        }
        if (!storedEmail) {
          storedEmail = "smaranlm10@gmail.com";
        }

        if (storedEmail) {
          const virtualUser: any = {
            id: storedEmail,
            email: storedEmail,
            user_metadata: { full_name: "Smaran Devaki" }
          };
          setSession(null, virtualUser);
        } else {
          setSession(null, null);
        }
      }
      setLoading(false);
    });

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setHasChecked(true);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("resize", checkMobile);
    };
  }, [supabase, setSession, setLoading]);

  const isCandidateRoute = pathname?.startsWith("/apply");

  if (hasChecked && isMobile && !isCandidateRoute) {
    return (
      <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center p-6 bg-stone-950 text-stone-200 font-sans select-none">
        <div className="w-full max-w-md bg-stone-900/50 border border-stone-800 rounded-sm p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
          {/* Brand/Logo */}
          <div className="flex justify-center mb-2">
            <Logo className="w-16 h-16 text-amber-500" />
          </div>

          <div className="space-y-2">
            <span className="text-[9px] bg-red-950/40 border border-red-900/50 text-red-400 font-mono px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider animate-pulse">
              Desktop Only Portal
            </span>
            <h1 className="text-lg font-bold uppercase tracking-tight text-white">
              Application Incompatible
            </h1>
          </div>

          <div className="p-4 bg-stone-950 border border-stone-850 rounded-sm text-[11px] text-stone-400 flex flex-col items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-amber-500/80 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
            </svg>
            <p className="font-medium">
              Please switch to a desktop, laptop, or landscape tablet device to continue.
            </p>
          </div>

          <div className="text-[9px] font-mono text-stone-600">
            KOZKER RECRUITER AI v3.0
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
