import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { ModulePermissions } from "@/store/permissions.store";

export interface TenantUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  is_superadmin: boolean;
  status: string;
  must_change_password: boolean;
  role: string;
  is_owner: boolean;
  permissions: ModulePermissions | null;
}

export interface CreateUserPayload {
  email: string;
  full_name: string;
  phone?: string;
  role: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
}

export function useUsers() {
  return useQuery({
    queryKey: ["tenant-users"],
    queryFn: async () => {
      const res = await apiClient.get("/users");
      return res.data.data as TenantUser[];
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserPayload) =>
      apiClient.post("/users", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserPayload }) =>
      apiClient.patch(`/users/${userId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-users"] }),
  });
}

export function useUpdatePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: ModulePermissions;
    }) => apiClient.put(`/users/${userId}/permissions`, permissions),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-users"] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/users/${userId}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-users"] }),
  });
}

export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/users/${userId}/reset-password`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-users"] }),
  });
}