"use client";

import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  const { setAuth, tenantSlug } = useAuthStore();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      const meRes = await apiClient.get("/auth/me");
      setAuth(meRes.data.data, tenantSlug!);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({
    id,
    label,
    placeholder,
    show,
    onToggle,
    registration,
    fieldError,
  }: {
    id: string;
    label: string;
    placeholder: string;
    show: boolean;
    onToggle: () => void;
    registration: ReturnType<typeof register>;
    fieldError?: string;
  }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className={`h-10 w-full rounded-lg border px-3 pr-10 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            fieldError ? "border-red-500" : "border-gray-300 dark:border-gray-700"
          }`}
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {fieldError && (
        <p className="text-xs text-red-600 mt-1">{fieldError}</p>
      )}
    </div>
  );

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
            <PasswordField
              id="current_password"
              label="Temporary password"
              placeholder="Your temporary password"
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
              registration={register("current_password")}
              fieldError={errors.current_password?.message}
            />

            <PasswordField
              id="new_password"
              label="New password"
              placeholder="At least 8 characters"
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
              registration={register("new_password")}
              fieldError={errors.new_password?.message}
            />

            <PasswordField
              id="confirm_password"
              label="Confirm new password"
              placeholder="Repeat your new password"
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              registration={register("confirm_password")}
              fieldError={errors.confirm_password?.message}
            />

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading ? "Updating…" : "Set new password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}