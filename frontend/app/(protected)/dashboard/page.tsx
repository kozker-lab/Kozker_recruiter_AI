"use client";

import React from "react";
import DashboardView from "@/components/DashboardView";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const handleNavigate = (view: string, targetId?: string) => {
    if (view === "jobs" && targetId) {
      router.push(`/jobs?id=${targetId}`);
    } else {
      router.push(`/${view}`);
    }
  };

  return <DashboardView onNavigate={handleNavigate} />;
}
