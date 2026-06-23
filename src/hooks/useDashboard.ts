import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { APIResponse, DashboardOverview, ProjectDashboard } from "@/types";

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<DashboardOverview>>(
        "/dashboard/overview"
      );
      return res.data.data;
    },
  });
}

export function useProjectDashboard(projectId: string) {
  return useQuery({
    queryKey: ["project-dashboard", projectId],
    queryFn: async () => {
      const res = await apiClient.get<APIResponse<ProjectDashboard>>(
        `/dashboard/projects/${projectId}`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}
