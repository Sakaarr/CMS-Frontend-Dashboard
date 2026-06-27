"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortalLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
    </div>
  );
}
