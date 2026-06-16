"use client";

import { useEffect } from "react";
import { useBranding, useBrandingStore, applyBrandColors } from "@/hooks/useBranding";
import { useAuthStore } from "@/store/auth.store";

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const { branding } = useBrandingStore();

  // Fetch latest branding when authenticated
  useBranding();

  // Apply brand colors as CSS variables whenever branding changes
  useEffect(() => {
    if (branding) {
      applyBrandColors(branding.primary_color, branding.secondary_color);
    }
  }, [branding]);

  return <>{children}</>;
}