"use client";

import React, { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((state) => state.setSession);
  const setLoading = useAuthStore((state) => state.setLoading);
  const supabase = createClient();

  useEffect(() => {
    // Initial session load
    const loadSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session, session?.user ?? null);
      } catch (err) {
        console.error("Failed to load session:", err);
        setSession(null, null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session, session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setSession, setLoading]);

  return <>{children}</>;
}
