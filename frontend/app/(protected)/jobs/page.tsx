"use client";

import React, { useState } from "react";
import JobsView from "@/components/JobsView";
import ReviewWorkspace from "@/components/ReviewWorkspace";
import { useSearchParams } from "next/navigation";

export default function JobsPage() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("id");
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const handleNavigateToReview = (appId: string) => {
    setSelectedAppId(appId);
  };

  if (selectedAppId) {
    return <ReviewWorkspace applicationId={selectedAppId} onBack={() => setSelectedAppId(null)} />;
  }

  return <JobsView initialJobId={initialJobId} onNavigateToReview={handleNavigateToReview} />;
}
