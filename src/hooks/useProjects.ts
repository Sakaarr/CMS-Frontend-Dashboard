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