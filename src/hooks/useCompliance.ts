import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  APIResponse, PaginatedResponse,
  ComplianceDoc, ComplianceDocSummary,
} from "@/types";

export function useComplianceDocList(
  projectId: string,
  params?: {
    subcontractor_id?: string;
    category?: string;
    status?: string;
    expiring_within_days?: number;
    page?: number;
  },
) {
  return useQuery({
    queryKey: ["compliance-docs", projectId, params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.subcontractor_id) p.set("subcontractor_id", params.subcontractor_id);
      if (params?.category) p.set("category", params.category);
      if (params?.status) p.set("status", params.status);
      if (params?.expiring_within_days) p.set("expiring_within_days", String(params.expiring_within_days));
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get<PaginatedResponse<ComplianceDocSummary>>(
        `/projects/${projectId}/compliance-docs?${p}`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useComplianceDoc(docId: string) {
  return useQuery({
    queryKey: ["compliance-doc", docId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<ComplianceDoc>>(`/compliance-docs/${docId}`);
      return res.data.data;
    },
    enabled: !!docId,
  });
}

export function useCreateComplianceDoc(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post(`/projects/${projectId}/compliance-docs`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-docs", projectId] });
      qc.invalidateQueries({ queryKey: ["compliance-docs-expiring", projectId] });
    },
  });
}

export function useUpdateComplianceDoc(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: any }) =>
      apiClient.patch(`/compliance-docs/${docId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-docs", projectId] });
      qc.invalidateQueries({ queryKey: ["compliance-doc"] });
    },
  });
}

export function useDeleteComplianceDoc(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => apiClient.delete(`/compliance-docs/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-docs", projectId] }),
  });
}

export function useVerifyComplianceDoc(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => apiClient.post(`/compliance-docs/${docId}/verify`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-docs", projectId] });
      qc.invalidateQueries({ queryKey: ["compliance-doc"] });
    },
  });
}

export function useRefreshExpiryStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/projects/${projectId}/compliance-docs/refresh-expiry`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-docs", projectId] }),
  });
}

export function useExpiringDocs(projectId: string, withinDays: number = 30) {
  return useQuery({
    queryKey: ["compliance-docs-expiring", projectId, withinDays],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<ComplianceDocSummary[]>>(
        `/projects/${projectId}/compliance-docs/expiring?within_days=${withinDays}`,
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}
