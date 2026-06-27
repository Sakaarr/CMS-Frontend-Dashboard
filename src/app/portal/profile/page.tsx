"use client";

import { useState } from "react";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import { usePortalChangePassword } from "@/hooks/usePortal";
import { extractApiError } from "@/lib/api";

export default function PortalProfilePage() {
  const { user } = usePortalAuthStore();
  const { mutate: changePassword, isPending, error, reset } = usePortalChangePassword();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    if (form.new_password !== form.confirm_password) {
      return;
    }
    changePassword(
      { current_password: form.current_password, new_password: form.new_password },
      {
        onSuccess: () => {
          setSuccess(true);
          setForm({ current_password: "", new_password: "", confirm_password: "" });
          setTimeout(() => setSuccess(false), 3000);
        },
      }
    );
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Account Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">Full Name</label>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Email</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Phone</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.phone || "-"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Role</label>
            <p className="mt-1 text-sm capitalize text-gray-900 dark:text-white">{user.role.replace("_", " ")}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Subcontractor</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.subcontractor_name || "-"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Last Login</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
            <input
              type="password"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
            <input
              type="password"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            {form.new_password !== form.confirm_password && form.confirm_password && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{extractApiError(error)}</p>}
          {success && <p className="text-sm text-green-600">Password changed successfully.</p>}

          <button
            type="submit"
            disabled={isPending || (form.new_password !== form.confirm_password)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
