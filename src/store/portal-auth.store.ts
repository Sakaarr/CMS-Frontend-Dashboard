import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PortalUser {
  id: string;
  subcontractor_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: "manager" | "site_engineer" | "foreman";
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  subcontractor_name: string | null;
}

interface PortalAuthState {
  user: PortalUser | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setPortalAuth: (user: PortalUser) => void;
  logout: () => void;
  setHasHydrated: (val: boolean) => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setPortalAuth: (user) => {
        set({ user, isAuthenticated: true });
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
        localStorage.removeItem("portal_access_token");
        localStorage.removeItem("portal_refresh_token");
      },
      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: "portal-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
