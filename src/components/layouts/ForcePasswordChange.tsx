"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound } from "lucide-react";

const schema = z
  .object({
    current_password: z.string().min(1, "Required"),
    new_password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[0-9]/, "Must contain a digit"),
    confirm_password: z.string(),
  })
  .refine(d => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type Form = z.infer<typeof schema>;

export function ForcePasswordChange() {
  const { user, setAuth, tenantSlug } = useAuthStore();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      // Refresh user data — must_change_password should now be false
      const meRes = await apiClient.get("/auth/me");
      setAuth(meRes.data.data, tenantSlug!);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <KeyRound className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Change your password
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Your account was created with a temporary password.
            <br />
            Please set a new password to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="current_password"
              type="password"
              label="Temporary password"
              placeholder="Your temporary password"
              error={errors.current_password?.message}
              {...register("current_password")}
            />
            <Input
              id="new_password"
              type="password"
              label="New password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              error={errors.new_password?.message}
              {...register("new_password")}
            />
            <Input
              id="confirm_password"
              type="password"
              label="Confirm new password"
              placeholder="Repeat new password"
              error={errors.confirm_password?.message}
              {...register("confirm_password")}
            />

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Set new password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}