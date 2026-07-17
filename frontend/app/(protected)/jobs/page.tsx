"use client";

import React, { useState } from "react";
import JobsView from "@/components/JobsView";
import ReviewWorkspace from "@/components/ReviewWorkspace";
import { useSearchParams, useRouter } from "next/navigation";

export default function JobsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
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

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const currentAppId = url.searchParams.get("appId") || null;
      if (currentAppId !== selectedAppId) {
        if (selectedAppId) {
          url.searchParams.set("appId", selectedAppId);
        } else {
          url.searchParams.delete("appId");
        }
        router.replace(url.pathname + url.search, { scroll: false });
      }
    }
  }, [selectedAppId, router]);

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
