"use client";

import React, { useState } from "react";
import JobsView from "@/components/JobsView";
import ReviewWorkspace from "@/components/ReviewWorkspace";
import { useSearchParams } from "next/navigation";

export default function JobsPage() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("id");
  const initialAppId = searchParams.get("appId");
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(initialAppId || null);

  React.useEffect(() => {
    if (initialAppId) {
      setSelectedAppId(initialAppId);
    } else {
      setSelectedAppId(null);
    }
  }, [initialAppId]);

  const handleNavigateToReview = (appId: string) => {
    setSelectedAppId(appId);
  };

  return (
    <div className="relative w-full min-h-full">
      <div className={selectedAppId ? "hidden" : ""}>
        <JobsView initialJobId={initialJobId} onNavigateToReview={handleNavigateToReview} />
      </div>
      {selectedAppId && (
        <ReviewWorkspace applicationId={selectedAppId} onBack={() => setSelectedAppId(null)} />
      )}
    </div>
  );
}
