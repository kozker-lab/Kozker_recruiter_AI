"use client";

import React from "react";
import QnaView from "@/components/QnaView";
import { useRouter } from "next/navigation";

export default function QnaPage() {
  const router = useRouter();

  const handleNavigate = (view: string, targetId?: string) => {
    if (view === "jobs" && targetId) {
      router.push(`/jobs?id=${targetId}`);
    } else {
      router.push(`/${view}`);
    }
  };

  return <QnaView onNavigate={handleNavigate} />;
}
