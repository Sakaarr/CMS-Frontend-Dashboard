import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useQualitySummary(projectId: string) {
  return useQuery({
    queryKey: ["quality-summary", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/quality-summary`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useInspections(projectId: string, status?: string) {
  return useQuery({
    queryKey: ["inspections", projectId, status],
    queryFn: async () => {
      const p = status ? `?status=${status}` : "";
      const res = await apiClient.get(`/projects/${projectId}/inspections${p}`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useNCRs(projectId: string, status?: string, severity?: string) {
  return useQuery({
    queryKey: ["ncrs", projectId, status, severity],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (status) p.set("status", status);
      if (severity) p.set("severity", severity);
      const res = await apiClient.get(`/projects/${projectId}/ncrs?${p}`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useIncidents(projectId: string) {
  return useQuery({
    queryKey: ["incidents", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/safety-incidents`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function usePunchList(projectId: string, status?: string) {
  return useQuery({
    queryKey: ["punch-list", projectId, status],
    queryFn: async () => {
      const p = status ? `?status=${status}` : "";
      const res = await apiClient.get(`/projects/${projectId}/punch-list${p}`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateInspection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/projects/${projectId}/inspections`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections", projectId] });
      qc.invalidateQueries({ queryKey: ["quality-summary", projectId] });
    },
  });
}

export function useCreateNCR(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post(`/projects/${projectId}/ncrs`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ncrs", projectId] });
      qc.invalidateQueries({ queryKey: ["quality-summary", projectId] });
    },
  });
}

export function useUpdateNCR(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ncrId, data }: { ncrId: string; data: any }) =>
      apiClient.patch(`/ncrs/${ncrId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ncrs", projectId] }),
  });
}

export function useCreateIncident(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/projects/${projectId}/safety-incidents`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents", projectId] });
      qc.invalidateQueries({ queryKey: ["quality-summary", projectId] });
    },
  });
}

export function useCreatePunchItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/projects/${projectId}/punch-list`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["punch-list", projectId] }),
  });
}

export function useUpdatePunchItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) =>
      apiClient.patch(`/punch-list/${itemId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["punch-list", projectId] }),
  });
}

export function usePassInspection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: string) =>
      apiClient.post(`/inspections/${inspectionId}/pass`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections", projectId] });
      qc.invalidateQueries({ queryKey: ["quality-summary", projectId] });
    },
  });
}

export function useFailInspection(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inspectionId: string) =>
      apiClient.post(`/inspections/${inspectionId}/fail`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections", projectId] });
      qc.invalidateQueries({ queryKey: ["quality-summary", projectId] });
    },
  });
}