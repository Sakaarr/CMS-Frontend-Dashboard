import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import type { User, TokenResponse } from "@/types";

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      tenant_slug: string;
    }) => {
      const { tenant_slug, ...credentials } = data;
      localStorage.setItem("tenant_slug", tenant_slug);
      const res = await apiClient.post<{ data: TokenResponse }>(
        "/auth/login",
        credentials
      );
      return { tokens: res.data.data, tenant_slug };
    },
    onSuccess: async ({ tokens, tenant_slug }) => {
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      const meRes = await apiClient.get<{ data: User }>("/auth/me");
      setAuth(meRes.data.data, tenant_slug);
      router.push("/overview");
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: User }>("/auth/me");
      return res.data.data;
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();

  return () => {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) {
      apiClient.post("/auth/logout", { refresh_token: refresh }).catch(() => {});
    }
    logout();
    router.push("/login");
  };
}