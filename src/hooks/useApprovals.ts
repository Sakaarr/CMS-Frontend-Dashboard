import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { ApprovalInboxResponse } from "@/types";

export function useApprovalsInbox(limit = 100, enabled = true) {
  return useQuery({
    queryKey: ["approvals-inbox", limit],
    queryFn: async () => {
      const res = await apiClient.get(`/approvals/inbox?limit=${limit}`);
      return res.data.data as ApprovalInboxResponse;
    },
    staleTime: 30 * 1000,
    enabled,
  });
}
