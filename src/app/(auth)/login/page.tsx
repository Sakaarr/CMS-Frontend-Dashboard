"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

const loginSchema = z.object({
  tenant_slug: z.string().min(1, "Organisation slug is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.replace("/overview");
    }
  }, [isAuthenticated, _hasHydrated, router]);
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CMS Platform</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to your organisation
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <form
            onSubmit={handleSubmit((data) => login.mutate(data))}
            className="space-y-4"
          >
            <Input
              id="tenant_slug"
              label="Organisation slug"
              placeholder="e.g. my-company"
              error={errors.tenant_slug?.message}
              {...register("tenant_slug")}
            />
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="you@company.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            {login.error && (
              <p className="text-sm text-red-600">
                Invalid credentials. Please check and try again.
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={login.isPending}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}