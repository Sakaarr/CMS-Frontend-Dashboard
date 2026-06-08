"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { usePermissionsStore } from "@/store/permissions.store";
import { useFetchPermissions } from "@/hooks/usePermissions";
import { Sidebar } from "@/components/layouts/Sidebar";
import { ThemeToggle } from "@/components/layouts/ThemeToggle";
import { ForcePasswordChange } from "@/components/layouts/ForcePasswordChange";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();
  const { isLoaded: permsLoaded } = usePermissionsStore();
  const router = useRouter();

  // This fetches and populates permissions into the store
  const { isLoading: permsLoading } = useFetchPermissions();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, _hasHydrated, router]);

  // 1. Auth store not yet hydrated from localStorage
  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // 2. Force password change before showing anything
  if (user?.must_change_password) {
    return <ForcePasswordChange />;
  }

  // 3. Wait for permissions to load for non-superadmin
  const waitingForPerms =
    !user?.is_superadmin && permsLoading && !permsLoaded;

  if (waitingForPerms) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-end border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}