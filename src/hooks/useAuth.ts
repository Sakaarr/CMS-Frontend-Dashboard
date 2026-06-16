import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { usePermissionsStore } from "@/store/permissions.store";
import { useRouter } from "next/navigation";
import type { User, TokenResponse } from "@/types";

export function useLogin() {
  const { setAuth } = useAuthStore();
  const { clearPermissions } = usePermissionsStore();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      tenant_slug: string;
    }) => {
      const { tenant_slug, ...credentials } = data;
      // Set slug before request so middleware picks it up
      if (typeof window !== "undefined") {
        localStorage.setItem("tenant_slug", tenant_slug);
      }
      const res = await apiClient.post<{ data: TokenResponse }>(
        "/auth/login",
        credentials
      );
      return { tokens: res.data.data, tenant_slug };
    },
    onSuccess: async ({ tokens, tenant_slug }) => {
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      localStorage.setItem("tenant_slug", tenant_slug);
      clearPermissions();
      const meRes = await apiClient.get<{ data: User }>("/auth/me");
      setAuth(meRes.data.data, tenant_slug);
      router.push("/overview");
    },
    onError: () => {
      // Clean up on failed login
      if (typeof window !== "undefined") {
        localStorage.removeItem("tenant_slug");
      }
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const { clearPermissions } = usePermissionsStore();
  const router = useRouter();

  return () => {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) {
      apiClient
        .post("/auth/logout", { refresh_token: refresh })
        .catch(() => {});
    }
    logout();
    clearPermissions();
    router.push("/login");
  };
}

export function useMe() {
  return { data: useAuthStore((s) => s.user) };
}