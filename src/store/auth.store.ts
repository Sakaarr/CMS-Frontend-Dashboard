import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tenantSlug: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenantSlug: null,
      isAuthenticated: false,
      setAuth: (user, tenantSlug) => {
        set({ user, tenantSlug, isAuthenticated: true });
        localStorage.setItem("tenant_slug", tenantSlug);
      },
      logout: () => {
        set({ user: null, tenantSlug: null, isAuthenticated: false });
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("tenant_slug");
      },
    }),
    { name: "cms-auth" }
  )
);