import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useDocuments(projectId: string, params?: {
  category?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["documents", projectId, params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.category) p.set("category", params.category);
      if (params?.status) p.set("status", params.status);
      if (params?.search) p.set("search", params.search);
      const res = await apiClient.get(
        `/projects/${projectId}/documents?${p}`
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: async () => {
      const res = await apiClient.get(`/documents/${documentId}`);
      return res.data.data;
    },
    enabled: !!documentId,
  });
}

export function useDocumentSummary(projectId: string) {
  return useQuery({
    queryKey: ["document-summary", projectId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/projects/${projectId}/document-summary`
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useUploadDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/projects/${projectId}/documents`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", projectId] });
      qc.invalidateQueries({ queryKey: ["document-summary", projectId] });
    },
  });
}

export function useSubmitDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiClient.post(`/documents/${documentId}/submit`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["documents", projectId] }),
  });
}

export function useApproveDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      approvalId,
      status,
      comments,
    }: {
      documentId: string;
      approvalId: string;
      status: string;
      comments?: string;
    }) =>
      apiClient.patch(
        `/documents/${documentId}/approvals/${approvalId}`,
        { status, comments }
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["documents", projectId] }),
  });
}

export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiClient.delete(`/documents/${documentId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["documents", projectId] }),
  });
}

export function useAddRevision(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string;
      data: any;
    }) => apiClient.post(`/documents/${documentId}/revisions`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["documents", projectId] }),
  });
}