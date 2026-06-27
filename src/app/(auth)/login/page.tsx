"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Building2, HardHat } from "lucide-react";
import { useLogin } from "@/hooks/useAuth";
import { usePortalLogin } from "@/hooks/usePortal";
import { useAuthStore } from "@/store/auth.store";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";

const loginSchema = z.object({
  tenant_slug: z.string().min(1, "Organisation slug is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

type UserType = "cms" | "subcontractor";

interface TenantPreview {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

export default function LoginPage() {
  const { isAuthenticated: cmsAuth, _hasHydrated: cmsHydrated } = useAuthStore();
  const { isAuthenticated: portalAuth, _hasHydrated: portalHydrated } = usePortalAuthStore();
  const router = useRouter();
  const cmsLogin = useLogin();
  const portalLogin = usePortalLogin();

  const [userType, setUserType] = useState<UserType>("cms");
  const [showPassword, setShowPassword] = useState(false);
  const [tenantPreview, setTenantPreview] = useState<TenantPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const tenantSlug = watch("tenant_slug");

  const { user: authUser } = useAuthStore();

  useEffect(() => {
    if (cmsHydrated && cmsAuth) {
      router.replace(authUser?.is_superadmin ? "/admin/dashboard" : "/overview");
      return;
    }
    if (portalHydrated && portalAuth) {
      router.replace("/portal/dashboard");
    }
  }, [cmsAuth, cmsHydrated, portalAuth, portalHydrated, router, authUser]);

  useEffect(() => {
    if (!tenantSlug || tenantSlug.length < 3 || userType !== "cms") {
      setTenantPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await apiClient.get("/tenants/my/branding", {
          headers: { "X-Tenant-Slug": tenantSlug },
        });
        setTenantPreview(res.data.data ?? null);
      } catch {
        setTenantPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [tenantSlug, userType]);

  const onSubmit = (data: LoginForm) => {
    if (userType === "cms") {
      cmsLogin.mutate(data);
    } else {
      localStorage.setItem("portal_tenant_slug", data.tenant_slug);
      portalLogin.mutate({ email: data.email, password: data.password });
    }
  };

  const error = userType === "cms" ? cmsLogin.error : portalLogin.error;
  const isPending = userType === "cms" ? cmsLogin.isPending : portalLogin.isPending;
  const primaryColor = tenantPreview?.primary_color ?? "#2563eb";
  const isSubcontractor = userType === "subcontractor";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo / branding area */}
        <div className="mb-8 flex flex-col items-center">
          {isSubcontractor ? (
            <>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-600 shadow-sm">
                <HardHat className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Subcontractor Portal
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sign in to access your projects and tasks
              </p>
            </>
          ) : tenantPreview?.logo_url ? (
            <>
              <img
                src={tenantPreview.logo_url}
                alt={tenantPreview.name}
                className="h-16 w-16 rounded-xl object-contain mb-4 bg-white shadow-sm border border-gray-200"
              />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {tenantPreview.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sign in to your account
              </p>
            </>
          ) : (
            <>
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                CMS Platform
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Sign in to your organisation
              </p>
            </>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
          {/* User type selector */}
          <div className="mb-6 flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setUserType("cms")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                userType === "cms"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Building2 className="h-4 w-4" />
              CMS User
            </button>
            <button
              type="button"
              onClick={() => setUserType("subcontractor")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                userType === "subcontractor"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <HardHat className="h-4 w-4" />
              Subcontractor
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Org slug */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Organisation slug
              </label>
              <div className="relative">
                <input
                  className={`h-10 w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:border-transparent ${
                    isSubcontractor
                      ? "focus:ring-amber-500"
                      : "focus:ring-blue-500"
                  } ${
                    errors.tenant_slug
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                  placeholder="e.g. acme-construction"
                  autoCapitalize="off"
                  autoCorrect="off"
                  {...register("tenant_slug")}
                />
                {previewLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}
                {tenantPreview && !previewLoading && !isSubcontractor && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                    ✓
                  </div>
                )}
              </div>
              {errors.tenant_slug && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.tenant_slug.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder={isSubcontractor ? "subcontractor@example.com" : "you@company.com"}
                className={`h-10 w-full rounded-lg border px-3 py-2 text-sm
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:outline-none focus:ring-2 focus:border-transparent
                  disabled:bg-gray-50 dark:disabled:bg-gray-900
                  disabled:cursor-not-allowed
                  ${isSubcontractor ? "focus:ring-amber-500" : "focus:ring-blue-500"}
                  ${
                    errors.email
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`h-10 w-full rounded-lg border px-3 pr-10 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:border-transparent ${
                    isSubcontractor ? "focus:ring-amber-500" : "focus:ring-blue-500"
                  } ${
                    errors.password
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {(error as any)?.response?.data?.message
                    ?? "Invalid credentials. Please try again."}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isPending}
              style={
                isSubcontractor
                  ? { backgroundColor: "#d97706" }
                  : tenantPreview?.primary_color
                    ? { backgroundColor: tenantPreview.primary_color }
                    : undefined
              }
            >
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            Powered by CMS Platform
          </p>
        </div>
      </div>
    </div>
  );
}
