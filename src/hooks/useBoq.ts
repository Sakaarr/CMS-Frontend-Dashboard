import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  BudgetVersion, BOQItem, CostCode,
  BOQSummary, APIResponse, RateAnalysis
} from "@/types";

export function useBudgetVersions(projectId: string) {
  return useQuery({
    queryKey: ["budget-versions", projectId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<BudgetVersion[]>>(
        `/projects/${projectId}/budget-versions`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useBOQItems(versionId: string) {
  return useQuery({
    queryKey: ["boq-items", versionId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<BOQItem[]>>(
        `/budget-versions/${versionId}/items`
      );
      return res.data.data;
    },
    enabled: !!versionId,
  });
}

export function useBOQSummary(versionId: string) {
  return useQuery({
    queryKey: ["boq-summary", versionId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<BOQSummary>>(
        `/budget-versions/${versionId}/summary`
      );
      return res.data.data;
    },
    enabled: !!versionId,
  });
}

export function useCostCodes(search?: string) {
  return useQuery({
    queryKey: ["cost-codes", search],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      const res = await apiClient.get<APIResponse<CostCode[]>>(
        `/cost-codes?${p}`
      );
      return res.data.data;
    },
  });
}

export function useCreateBudgetVersion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      contingency_percentage: number;
      currency: string;
    }) => apiClient.post(`/projects/${projectId}/budget-versions`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["budget-versions", projectId] }),
  });
}

export function useCreateBOQItem(projectId: string, versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiClient.post(
        `/projects/${projectId}/budget-versions/${versionId}/items`,
        data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boq-items", versionId] });
      qc.invalidateQueries({ queryKey: ["boq-summary", versionId] });
    },
  });
}

export function useApproveBudgetVersion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      apiClient.post(`/budget-versions/${versionId}/approve`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["budget-versions", projectId] }),
  });
}

export function useImportBOQItems(projectId: string, versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiClient.post(
        `/projects/${projectId}/budget-versions/${versionId}/import-items`,
        fd,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boq-items", versionId] });
      qc.invalidateQueries({ queryKey: ["boq-summary", versionId] });
    },
  });
}

export function useUpdateBOQItem(versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<BOQItem> }) =>
      apiClient.patch(`/boq-items/${itemId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boq-items", versionId] });
      qc.invalidateQueries({ queryKey: ["boq-summary", versionId] });
    },
  });
}

export function useDeleteBOQItem(versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient.delete(`/boq-items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boq-items", versionId] });
      qc.invalidateQueries({ queryKey: ["boq-summary", versionId] });
    },
  });
}

export function useCreateCostCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      code: string;
      name: string;
      description?: string;
      category: string;
      unit: string;
      standard_rate?: number;
    }) => apiClient.post("/cost-codes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost-codes"] }),
  });
}

export function useCreateRateAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      cost_code_id: string;
      name: string;
      description?: string;
      unit: string;
      output_quantity?: number;
      overhead_percentage?: number;
      components: Array<{
        component_type: string;
        description: string;
        unit: string;
        quantity: number;
        rate: number;
        wastage_percentage?: number;
      }>;
    }) => apiClient.post("/rate-analysis", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rate-analyses"] }),
  });
}

export function useCopyBudgetVersion(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, name }: { versionId: string; name?: string }) =>
      apiClient.post(`/budget-versions/${versionId}/copy`, null, {
        params: { name },
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["budget-versions", projectId] }),
  });
}

export function useRateAnalyses(costCodeId: string) {
  return useQuery({
    queryKey: ["rate-analyses", costCodeId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<RateAnalysis[]>>(
        `/cost-codes/${costCodeId}/rate-analysis`
      );
      return res.data.data;
    },
    enabled: !!costCodeId,
  });
}