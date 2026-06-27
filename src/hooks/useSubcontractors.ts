import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useSubcontractors(params?: {
  status?: string; specialty?: string; search?: string; page?: number;
}) {
  return useQuery({
    queryKey: ["subcontractors", params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.status) p.set("status", params.status);
      if (params?.specialty) p.set("specialty", params.specialty);
      if (params?.search) p.set("search", params.search);
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get(`/subcontractors?${p}`);
      return res.data;
    },
  });
}

export function useSubcontractor(id: string) {
  return useQuery({
    queryKey: ["subcontractor", id],
    queryFn: async () => {
      const res = await apiClient.get(`/subcontractors/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateSubcontractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post("/subcontractors", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subcontractors"] }),
  });
}

export function useUpdateSubcontractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.patch(`/subcontractors/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subcontractors"] });
      qc.invalidateQueries({ queryKey: ["subcontractor"] });
    },
  });
}

export function useDeleteSubcontractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/subcontractors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subcontractors"] }),
  });
}

export function useContracts(params?: {
  project_id?: string; subcontractor_id?: string; status?: string; page?: number;
}) {
  return useQuery({
    queryKey: ["contracts", params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.project_id) p.set("project_id", params.project_id);
      if (params?.subcontractor_id) p.set("subcontractor_id", params.subcontractor_id);
      if (params?.status) p.set("status", params.status);
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get(`/contracts?${p}`);
      return res.data;
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      apiClient.post(`/projects/${projectId}/contracts`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
}

export function useWorkOrders(params?: {
  project_id?: string; contract_id?: string; status?: string; page?: number;
}) {
  return useQuery({
    queryKey: ["work-orders", params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.project_id) p.set("project_id", params.project_id);
      if (params?.contract_id) p.set("contract_id", params.contract_id);
      if (params?.status) p.set("status", params.status);
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get(`/work-orders?${p}`);
      return res.data;
    },
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) =>
      apiClient.post(`/projects/${projectId}/work-orders`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-orders"] }),
  });
}

// ── BOQ Item Assignment ──────────────────────────────────────────

export function useAssignBOQItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, data }: { contractId: string; data: any }) =>
      apiClient.post(`/contracts/${contractId}/boq-items`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-boq-items"] });
      qc.invalidateQueries({ queryKey: ["subcontractor-workload"] });
    },
  });
}

export function useContractBOQItems(contractId: string, params?: { page?: number }) {
  return useQuery({
    queryKey: ["contract-boq-items", contractId, params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get(`/contracts/${contractId}/boq-items?${p}`);
      return res.data;
    },
    enabled: !!contractId,
  });
}

// ── Project & Subcontractor Queries ──────────────────────────────

export function useSubcontractorProjects(subcontractorId: string, params?: { page?: number }) {
  return useQuery({
    queryKey: ["subcontractor-projects", subcontractorId, params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get(`/subcontractors/${subcontractorId}/projects?${p}`);
      return res.data;
    },
    enabled: !!subcontractorId,
  });
}

export function useProjectSubcontractors(projectId: string, params?: { page?: number }) {
  return useQuery({
    queryKey: ["project-subcontractors", projectId, params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.page) p.set("page", String(params.page));
      const res = await apiClient.get(`/projects/${projectId}/subcontractors?${p}`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

// ── Dashboard / Workload ────────────────────────────────────────

export function useSubcontractorWorkload(subcontractorId: string) {
  return useQuery({
    queryKey: ["subcontractor-workload", subcontractorId],
    queryFn: async () => {
      const res = await apiClient.get(`/subcontractors/${subcontractorId}/workload`);
      return res.data.data;
    },
    enabled: !!subcontractorId,
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) => apiClient.delete(`/contracts/${contractId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["project-subcontractors"] });
      qc.invalidateQueries({ queryKey: ["subcontractor-projects"] });
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contractId, data }: { contractId: string; data: any }) =>
      apiClient.patch(`/contracts/${contractId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["project-subcontractors"] });
      qc.invalidateQueries({ queryKey: ["subcontractor-projects"] });
    },
  });
}

export function useUpdateBOQItemAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: any }) =>
      apiClient.patch(`/boq-item-assignments/${assignmentId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-boq-items"] });
      qc.invalidateQueries({ queryKey: ["subcontractor-workload"] });
    },
  });
}
