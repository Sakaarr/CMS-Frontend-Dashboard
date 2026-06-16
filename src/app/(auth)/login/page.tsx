"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { useLogin } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";

const loginSchema = z.object({
  tenant_slug: z.string().min(1, "Organisation slug is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface TenantPreview {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

export default function LoginPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const login = useLogin();

  // Eye toggle state for password
  const [showPassword, setShowPassword] = useState(false);

  // Tenant preview — fetched after slug is entered
  const [tenantPreview, setTenantPreview] = useState<TenantPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const tenantSlug = watch("tenant_slug");

  // Redirect if already logged in
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.replace("/overview");
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Fetch tenant branding preview after slug is entered (debounced)
  useEffect(() => {
    if (!tenantSlug || tenantSlug.length < 3) {
      setTenantPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        // Temporarily set the slug header for this one request
        const res = await apiClient.get("/tenants/my/branding", {
          headers: { "X-Tenant-Slug": tenantSlug },
        });
        if (res.data.data) {
          setTenantPreview(res.data.data);
        } else {
          setTenantPreview(null);
        }
      } catch {
        setTenantPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [tenantSlug]);

  const primaryColor = tenantPreview?.primary_color ?? "#2563eb";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo / branding area */}
        <div className="mb-8 flex flex-col items-center">
          {tenantPreview?.logo_url ? (
            <img
              src={tenantPreview.logo_url}
              alt={tenantPreview.name}
              className="h-16 w-16 rounded-xl object-contain mb-4 bg-white shadow-sm border border-gray-200"
            />
          ) : (
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Building2 className="h-8 w-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {tenantPreview?.name ?? "CMS Platform"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tenantPreview ? "Sign in to your account" : "Sign in to your organisation"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
          <form
            onSubmit={handleSubmit((data) => login.mutate(data))}
            className="space-y-4"
          >
            {/* Org slug */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Organisation slug
              </label>
              <div className="relative">
                <input
                  className={`h-10 w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.tenant_slug
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                  placeholder="e.g. acme-construction"
                  autoCapitalize="none"
                  autoCorrect="off"
                  {...register("tenant_slug")}
                />
                {previewLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}
                {tenantPreview && !previewLoading && (
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
                id="email"
                type="email"
                placeholder="you@company.com"
                className={`h-10 w-full rounded-lg border px-3 py-2 text-sm
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-gray-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:bg-gray-50 dark:disabled:bg-gray-900
                  disabled:cursor-not-allowed
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

            {/* Password with eye toggle */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`h-10 w-full rounded-lg border px-3 pr-10 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error */}
            {login.error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {(login.error as any)?.response?.data?.message
                    ?? "Invalid credentials. Please try again."}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={login.isPending}
              style={
                tenantPreview?.primary_color
                  ? { backgroundColor: tenantPreview.primary_color }
                  : undefined
              }
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}