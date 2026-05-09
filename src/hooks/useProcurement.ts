import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useVendors(search?: string) {
  return useQuery({
    queryKey: ["vendors", search],
    queryFn: async () => {
      const p = search ? `?search=${search}` : "";
      const res = await apiClient.get(`/vendors${p}`);
      return res.data.data;
    },
  });
}

export function usePurchaseOrders(projectId: string) {
  return useQuery({
    queryKey: ["purchase-orders", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/purchase-orders`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useRFQs(projectId: string) {
  return useQuery({
    queryKey: ["rfqs", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/rfqs`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useGRNs(projectId: string) {
  return useQuery({
    queryKey: ["grns", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/grns`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useProcurementStats(projectId: string) {
  return useQuery({
    queryKey: ["procurement-stats", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/procurement-stats`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useApprovePO(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poId: string) => apiClient.post(`/purchase-orders/${poId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders", projectId] }),
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post("/vendors", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

export function useCreatePO(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post(`/projects/${projectId}/purchase-orders`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders", projectId] }),
  });
}