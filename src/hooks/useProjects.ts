import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  Project, ProjectStats, Site, Milestone,
  APIResponse, PaginatedResponse
} from "@/types";

export function useProjects(params?: {
  status?: string;
  search?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.status) p.set("status", params.status);
      if (params?.search) p.set("search", params.search);
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get<PaginatedResponse<Project>>(
        `/projects?${p}`
      );
      return res.data;
    },
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<Project>>(
        `/projects/${projectId}`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useProjectStats() {
  return useQuery({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<ProjectStats>>(
        "/projects/stats"
      );
      return res.data.data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) =>
      apiClient.post("/projects", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project-stats"] });
    },
  });
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      status,
    }: {
      projectId: string;
      status: string;
    }) => apiClient.patch(`/projects/${projectId}/status`, { status }),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useSites(projectId: string) {
  return useQuery({
    queryKey: ["sites", projectId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<Site[]>>(
        `/projects/${projectId}/sites`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ["milestones", projectId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<Milestone[]>>(
        `/projects/${projectId}/milestones`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateSite(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      code: string;
      description?: string;
      city?: string;
      district?: string;
      latitude?: number;
      longitude?: number;
      site_incharge_id?: string;
    }) => apiClient.post(`/projects/${projectId}/sites`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sites", projectId] }),
  });
}

export function useCreateMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      site_id?: string;
      planned_date?: string;
      sequence?: number;
      is_critical?: boolean;
    }) => apiClient.post(`/projects/${projectId}/milestones`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });
}

export function useUpdateMilestone(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      milestoneId,
      data,
    }: {
      milestoneId: string;
      data: { completion_percentage?: number; status?: string; actual_date?: string };
    }) => apiClient.patch(`/projects/${projectId}/milestones/${milestoneId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/members`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}