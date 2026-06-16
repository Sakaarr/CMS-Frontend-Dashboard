import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { APIResponse, PaginatedResponse } from "@/types";

export interface DPRWorkItem {
  id: string;
  description: string;
  achieved_quantity: number;
  unit: string;
}

export interface DPRAttendanceRecord {
  id: string;
  worker_name: string;
  trade: string | null;
  status: string;
  daily_wage: number;
}

export interface DPR {
  id: string;
  project_id: string;
  site_id: string | null;
  report_date: string;
  weather: string;
  work_hours: number;
  total_workers: number;
  is_submitted: boolean;
  general_notes: string | null;
  safety_notes: string | null;
  work_items?: DPRWorkItem[];
  attendance_records?: DPRAttendanceRecord[];
}

export interface SiteOpsSummary {
  total_dprs: number;
  submitted_dprs: number;
  total_worker_days: number;
  total_labour_cost: number;
}

export function useDPRs(projectId: string, siteId?: string) {
  return useQuery({
    queryKey: ["dprs", projectId, siteId ?? null],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (siteId) p.set("site_id", siteId);
      const qs = p.toString();
      const res = await apiClient.get<PaginatedResponse<DPR>>(
        `/projects/${projectId}/dprs${qs ? `?${qs}` : ""}`
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useDPR(dprId: string) {
  return useQuery({
    queryKey: ["dpr", dprId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<DPR>>(`/dprs/${dprId}`);
      return res.data.data;
    },
    enabled: !!dprId,
  });
}

export function useSiteOpsSummary(projectId: string) {
  return useQuery({
    queryKey: ["site-ops-summary", projectId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<SiteOpsSummary>>(
        `/projects/${projectId}/dprs/summary`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}


export function useCreateDPR(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/projects/${projectId}/dprs`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dprs", projectId] });
      qc.invalidateQueries({ queryKey: ["site-ops-summary", projectId] });
    },
  });
}

export function useSubmitDPR(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dprId: string) => apiClient.post(`/dprs/${dprId}/submit`),
    onSuccess: (_, dprId) => {
      qc.invalidateQueries({ queryKey: ["dpr", dprId] });
      qc.invalidateQueries({ queryKey: ["dprs", projectId] });
      qc.invalidateQueries({ queryKey: ["site-ops-summary", projectId] });
    },
  });
}

