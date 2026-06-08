import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TenantBranding {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  currency: string;
  plan: string;
}

// Persisted branding store — survives page reload
interface BrandingState {
  branding: TenantBranding | null;
  setBranding: (b: TenantBranding) => void;
  clearBranding: () => void;
}

export const useBrandingStore = create<BrandingState>()(
  persist(
    (set) => ({
      branding: null,
      setBranding: (branding) => set({ branding }),
      clearBranding: () => set({ branding: null }),
    }),
    { name: "cms-branding" }
  )
);

export function useBranding() {
  const { setBranding, branding } = useBrandingStore();

  return useQuery({
    queryKey: ["tenant-branding"],
    queryFn: async () => {
      const res = await apiClient.get("/tenants/my/branding");
      const data = res.data.data as TenantBranding;
      if (data) setBranding(data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!localStorage.getItem("tenant_slug"),
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  const { setBranding } = useBrandingStore();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("logo", file);
      const res = await apiClient.post("/tenants/my/branding/logo", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data as TenantBranding;
    },
    onSuccess: (data) => {
      setBranding(data);
      qc.invalidateQueries({ queryKey: ["tenant-branding"] });
    },
  });
}

export function useUpdateColors() {
  const qc = useQueryClient();
  const { setBranding } = useBrandingStore();
  return useMutation({
    mutationFn: async (data: {
      primary_color?: string;
      secondary_color?: string;
    }) => {
      const res = await apiClient.patch("/tenants/my/branding/colors", data);
      return res.data.data as TenantBranding;
    },
    onSuccess: (data) => {
      setBranding(data);
      qc.invalidateQueries({ queryKey: ["tenant-branding"] });
    },
  });
}

// Apply brand colors as CSS variables
export function applyBrandColors(primary?: string | null, secondary?: string | null) {
  if (primary) {
    document.documentElement.style.setProperty("--brand-primary", primary);
    document.documentElement.style.setProperty("--color-brand", primary);
  }
  if (secondary) {
    document.documentElement.style.setProperty("--brand-secondary", secondary);
  }
}