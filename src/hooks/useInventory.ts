import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useWarehouses(projectId?: string) {
  return useQuery({
    queryKey: ["warehouses", projectId],
    queryFn: async () => {
      const p = projectId ? `?project_id=${projectId}` : "";
      const res = await apiClient.get(`/warehouses${p}`);
      return res.data.data;
    },
  });
}

export function useStock(warehouseId: string) {
  return useQuery({
    queryKey: ["stock", warehouseId],
    queryFn: async () => {
      const res = await apiClient.get(`/warehouses/${warehouseId}/stock`);
      return res.data.data;
    },
    enabled: !!warehouseId,
  });
}

export function useLowStockAlerts(projectId?: string) {
  return useQuery({
    queryKey: ["low-stock", projectId],
    queryFn: async () => {
      const p = projectId ? `?project_id=${projectId}` : "";
      const res = await apiClient.get(`/inventory/low-stock${p}`);
      return res.data.data;
    },
  });
}

export function useMaterialRequests(projectId: string) {
  return useQuery({
    queryKey: ["material-requests", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/material-requests`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateMR(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/projects/${projectId}/material-requests`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["material-requests", projectId] }),
  });
}

export function useSubmitMR(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mrId: string) => apiClient.post(`/material-requests/${mrId}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["material-requests", projectId] }),
  });
}

export function useApproveMR(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mrId, items }: { mrId: string; items: any[] }) =>
      apiClient.post(`/material-requests/${mrId}/approve`, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["material-requests", projectId] }),
  });
}