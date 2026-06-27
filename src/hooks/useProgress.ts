import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  APIResponse, PaginatedResponse,
  ProgressEntry, SubcontractorCertificate, BOQProgressSummary,
  ProgressDashboard,
} from "@/types";

// ── Progress Entries ──────────────────────────────────────────

export function useProgressList(
  projectId: string,
  params?: { contract_id?: string; boq_item_id?: string; status?: string; page?: number },
) {
  return useQuery({
    queryKey: ["progress", projectId, params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.contract_id) p.set("contract_id", params.contract_id);
      if (params?.boq_item_id) p.set("boq_item_id", params.boq_item_id);
      if (params?.status) p.set("status", params.status);
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get<PaginatedResponse<ProgressEntry>>(
        `/projects/${projectId}/progress?${p}`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useProgressEntry(entryId: string) {
  return useQuery({
    queryKey: ["progress-entry", entryId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<ProgressEntry>>(`/progress/${entryId}`);
      return res.data.data;
    },
    enabled: !!entryId,
  });
}

export function useCreateProgress(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post(`/projects/${projectId}/progress`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress", projectId] });
      qc.invalidateQueries({ queryKey: ["progress-dashboard", projectId] });
    },
  });
}

export function useUpdateProgress(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: any }) =>
      apiClient.patch(`/progress/${entryId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress", projectId] });
      qc.invalidateQueries({ queryKey: ["progress-entry"] });
    },
  });
}

export function useDeleteProgress(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => apiClient.delete(`/progress/${entryId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress", projectId] }),
  });
}

export function useSubmitProgress(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => apiClient.post(`/progress/${entryId}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress", projectId] });
      qc.invalidateQueries({ queryKey: ["progress-dashboard", projectId] });
    },
  });
}

export function useApproveProgress(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, rejection_reason }: { entryId: string; rejection_reason?: string }) => {
      const p = rejection_reason ? `?rejection_reason=${encodeURIComponent(rejection_reason)}` : "";
      return apiClient.post(`/progress/${entryId}/approve${p}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress", projectId] });
      qc.invalidateQueries({ queryKey: ["progress-dashboard", projectId] });
    },
  });
}

// ── BOQ Progress Summary ─────────────────────────────────────

export function useBOQProgressSummary(contractId: string) {
  return useQuery({
    queryKey: ["boq-progress-summary", contractId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<BOQProgressSummary[]>>(
        `/contracts/${contractId}/progress-summary`,
      );
      return res.data.data;
    },
    enabled: !!contractId,
  });
}

// ── Payment Certificates ─────────────────────────────────────

export function useCertificateList(
  projectId: string,
  params?: { contract_id?: string; status?: string; page?: number },
) {
  return useQuery({
    queryKey: ["certificates", projectId, params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.contract_id) p.set("contract_id", params.contract_id);
      if (params?.status) p.set("status", params.status);
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get<PaginatedResponse<SubcontractorCertificate>>(
        `/projects/${projectId}/certificates?${p}`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useCertificate(certId: string) {
  return useQuery({
    queryKey: ["certificate", certId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<SubcontractorCertificate>>(`/certificates/${certId}`);
      return res.data.data;
    },
    enabled: !!certId,
  });
}

export function useCreateCertificate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post(`/projects/${projectId}/certificates`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificates", projectId] });
      qc.invalidateQueries({ queryKey: ["progress-dashboard", projectId] });
    },
  });
}

export function useDeleteCertificate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certId: string) => apiClient.delete(`/certificates/${certId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificates", projectId] }),
  });
}

export function useSubmitCertificate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certId: string) => apiClient.post(`/certificates/${certId}/submit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificates", projectId] }),
  });
}

export function useApproveCertificate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certId: string) => apiClient.post(`/certificates/${certId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificates", projectId] }),
  });
}

export function useMarkPaid(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certId: string) => apiClient.post(`/certificates/${certId}/pay`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificates", projectId] }),
  });
}

export function useReviseCertificate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (certId: string) => apiClient.post(`/certificates/${certId}/revise`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificates", projectId] }),
  });
}

// ── Dashboard ────────────────────────────────────────────────

export function useProgressDashboard(projectId: string) {
  return useQuery({
    queryKey: ["progress-dashboard", projectId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<ProgressDashboard>>(
        `/projects/${projectId}/progress/dashboard`,
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}
