"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { usePortalAuthStore, PortalUser } from "@/store/portal-auth.store";
import { usePortalUnreadCount, usePortalChangePassword } from "@/hooks/usePortal";
import { extractApiError } from "@/lib/api";
import { setPortalUnauthenticatedHandler } from "@/lib/portal-api";

const NAV_ITEMS = [
  { href: "/portal/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/portal/contracts", label: "Contracts", icon: "📄" },
  { href: "/portal/progress", label: "Progress", icon: "📈" },
  { href: "/portal/certificates", label: "Certificates", icon: "🏅" },
  { href: "/portal/quality", label: "Quality", icon: "✅" },
  { href: "/portal/compliance", label: "Compliance", icon: "🔒" },
  { href: "/portal/payments", label: "Payments", icon: "💰" },
  { href: "/portal/notifications", label: "Notifications", icon: "🔔" },
  { href: "/portal/profile", label: "Profile", icon: "👤" },
];

function Sidebar({
  user,
  onLogout,
  unreadCount,
}: {
  user: PortalUser;
  onLogout: () => void;
  unreadCount: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            {user.subcontractor_name?.[0] || "S"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {user.subcontractor_name || "Portal"}
            </p>
            <p className="truncate text-xs capitalize text-gray-500">
              {user.role.replace("_", " ")}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {item.href === "/portal/notifications" && unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
          <div className="mb-3 text-xs text-gray-500">
            <p className="truncate">{user.full_name}</p>
            <p className="truncate">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function PortalForcePasswordChange() {
  const { user, logout } = usePortalAuthStore();
  const { mutate: changePassword, isPending, error, reset } = usePortalChangePassword();
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    reset();
    if (form.new_password !== form.confirm_password) return;
    changePassword(
      { current_password: form.current_password, new_password: form.new_password },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => {
            // Re-fetch the user to get updated must_change_password
            window.location.href = "/portal/dashboard";
          }, 1000);
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Change your password
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Your portal account was created with a temporary password.
            <br />Please set a new password to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Current password
              </label>
              <input
                type="password"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                required
                placeholder="The password set by admin"
                className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                New password
              </label>
              <input
                type="password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                required
                placeholder="Repeat your new password"
                className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {form.confirm_password && form.new_password !== form.confirm_password && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                {extractApiError(error)}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-600 dark:text-green-400">
                Password changed! Redirecting...
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || success}
              className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isPending ? "Updating..." : "Set new password"}
            </button>

            <button
              type="button"
              onClick={() => { logout(); router.push("/portal/login"); }}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-2"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, _hasHydrated, logout } = usePortalAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/portal/login";
  const { data: unreadCount } = usePortalUnreadCount(isLoginPage);

  useEffect(() => {
    setPortalUnauthenticatedHandler(() => {
      logout();
      router.replace("/login");
    });
    return () => setPortalUnauthenticatedHandler(() => {});
  }, [logout, router]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated && pathname !== "/portal/login") {
      router.replace("/login");
    }
  }, [_hasHydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && pathname === "/portal/login") {
      router.replace("/portal/dashboard");
    }
  }, [_hasHydrated, isAuthenticated, pathname, router]);

  if (pathname === "/portal/login") {
    return <>{children}</>;
  }

  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (user.must_change_password) {
    return <PortalForcePasswordChange />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar user={user} onLogout={logout} unreadCount={unreadCount ?? 0} />
      <main className="ml-64 min-h-screen p-6">{children}</main>
    </div>
  );
}
