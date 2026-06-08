import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ModulePermissions {
  can_projects: boolean;
  can_boq: boolean;
  can_procurement: boolean;
  can_inventory: boolean;
  can_site_ops: boolean;
  can_finance: boolean;
  can_quality: boolean;
  can_documents: boolean;
}

const FULL_ACCESS: ModulePermissions = {
  can_projects: true,
  can_boq: true,
  can_procurement: true,
  can_inventory: true,
  can_site_ops: true,
  can_finance: true,
  can_quality: true,
  can_documents: true,
};

interface PermissionsState {
  permissions: ModulePermissions;
  isLoaded: boolean;
  setPermissions: (p: ModulePermissions) => void;
  clearPermissions: () => void;
}

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set) => ({
      permissions: FULL_ACCESS,
      isLoaded: false,
      setPermissions: (permissions) => set({ permissions, isLoaded: true }),
      clearPermissions: () =>
        set({ permissions: FULL_ACCESS, isLoaded: false }),
    }),
    { name: "cms-permissions" }
  )
);