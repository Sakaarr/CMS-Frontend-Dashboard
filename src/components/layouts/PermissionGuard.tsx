"use client";

import { useHasPermission } from "@/hooks/usePermissions";
import { usePermissionsStore } from "@/store/permissions.store";
import type { ModulePermissions } from "@/store/permissions.store";
import { ShieldOff } from "lucide-react";
import Link from "next/link";

interface Props {
  module: keyof ModulePermissions;
  children: React.ReactNode;
}

export function PermissionGuard({ module, children }: Props) {
  const { isLoaded } = usePermissionsStore();
  const hasAccess = useHasPermission(module);

  // Still loading permissions — show nothing to avoid flash
  if (!isLoaded) return null;

  if (!hasAccess) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <ShieldOff className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Access denied
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to access this module.
            <br />
            Contact your company admin to request access.
          </p>
        </div>
        <Link
          href="/overview"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to overview
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}