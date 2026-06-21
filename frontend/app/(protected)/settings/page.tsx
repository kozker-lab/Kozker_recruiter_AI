"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
    </div>
  );
}

