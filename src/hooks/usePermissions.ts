import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { usePermissionsStore, type ModulePermissions } from "@/store/permissions.store";
import { useAuthStore } from "@/store/auth.store";
import { useEffect } from "react";

export function useFetchPermissions() {
  const { isAuthenticated, user } = useAuthStore();
  const { setPermissions } = usePermissionsStore();

  const query = useQuery({
    queryKey: ["my-permissions"],
    queryFn: async () => {
      const res = await apiClient.get("/users/me/permissions");
      return res.data.data as ModulePermissions;
    },
    enabled: isAuthenticated && !!user && !user.is_superadmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (query.data) {
      setPermissions(query.data);
    }
    // Superadmin always gets full access
    if (user?.is_superadmin) {
      setPermissions({
        can_projects: true, can_boq: true, can_procurement: true,
        can_inventory: true, can_site_ops: true, can_finance: true,
        can_quality: true, can_documents: true,
      });
    }
  }, [query.data, user?.is_superadmin]);

  return query;
}

export function useHasPermission(module: keyof ModulePermissions): boolean {
  const { permissions } = usePermissionsStore();
  const { user } = useAuthStore();
  if (user?.is_superadmin) return true;
  return permissions[module] ?? false;
}