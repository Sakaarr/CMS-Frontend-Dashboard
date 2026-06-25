import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useComments(targetType: string, targetId: string) {
  return useQuery({
    queryKey: ["comments", targetType, targetId],
    queryFn: async () => {
      const res = await apiClient.get(`/comments/${targetType}/${targetId}`);
      return res.data.data;
    },
    enabled: !!targetType && !!targetId,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      content: string; target_type: string; target_id: string; parent_id?: string;
    }) => apiClient.post("/comments", data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.target_type, vars.target_id] });
    },
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: { content: string } }) =>
      apiClient.patch(`/comments/${commentId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments"] }),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, targetType, targetId }: { commentId: string; targetType: string; targetId: string }) =>
      apiClient.delete(`/comments/${commentId}`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.targetType, vars.targetId] });
    },
  });
}
