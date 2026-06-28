import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { APIResponse, SuperAdminOverview, SuperTenantDetail } from "@/types";

export function useSuperAdminOverview() {
  return useQuery({
    queryKey: ["superadmin-dashboard"],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<SuperAdminOverview>>(
        "/dashboard/superadmin/overview"
      );
      return res.data.data;
    },
  });
}

export function useSuperAdminTenantDetail(tenantId: string | null) {
  return useQuery({
    queryKey: ["superadmin-tenant-detail", tenantId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<SuperTenantDetail>>(
        `/dashboard/superadmin/tenants/${tenantId}`
      );
      return res.data.data;
    },
    enabled: !!tenantId,
  });
}
