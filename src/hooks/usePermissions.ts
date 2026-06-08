import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  usePermissionsStore,
  FULL_ACCESS,
  type ModulePermissions,
} from "@/store/permissions.store";
import { useAuthStore } from "@/store/auth.store";
import { useEffect } from "react";

export function useFetchPermissions() {
  const { isAuthenticated, user } = useAuthStore();
  const { setPermissions } = usePermissionsStore();

  // Superadmin always gets full access — no API call needed
  useEffect(() => {
    if (user?.is_superadmin) {
      setPermissions(FULL_ACCESS);
    }
  }, [user?.is_superadmin]);

  return useQuery({
    queryKey: ["my-permissions"],
    queryFn: async () => {
      const res = await apiClient.get("/users/me/permissions");
      const perms = res.data.data as ModulePermissions;
      setPermissions(perms);
      return perms;
    },
    // Only fetch for non-superadmin authenticated users
    enabled: isAuthenticated && !!user && !user.is_superadmin,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useHasPermission(
  module: keyof ModulePermissions
): boolean {
  const { permissions } = usePermissionsStore();
  const { user } = useAuthStore();
  // Superadmin bypasses all checks
  if (user?.is_superadmin) return true;
  return permissions[module] ?? false;
}