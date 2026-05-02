import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  email: string;
  country: string;
  currency: string;
  max_projects: number;
  max_users: number;
  created_at: string;
}

export function useTenants(page = 1) {
  return useQuery({
    queryKey: ["tenants", page],
    queryFn: async () => {
      const res = await apiClient.get(`/tenants?page=${page}&page_size=20`);
      return res.data;
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post("/tenants", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useSuspendTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => apiClient.post(`/tenants/${tenantId}/suspend`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useActivateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => apiClient.post(`/tenants/${tenantId}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}