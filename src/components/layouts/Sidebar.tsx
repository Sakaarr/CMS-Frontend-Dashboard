"use client";

import { useLogout } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import {
  Building2,
  DollarSign,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "BOQ & Estimation", href: "/boq", icon: FileSpreadsheet },
  { label: "Procurement", href: "/procurement", icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Site Operations", href: "/site-ops", icon: HardHat },
  { label: "Finance", href: "/finance", icon: DollarSign },
  { label: "Quality", href: "/quality", icon: ShieldCheck },
  { label: "Documents", href: "/documents", icon: FileText },
];

const THEME_OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
  { value: "dark", icon: Moon, label: "Dark" },
] as const;

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            "flex flex-1 items-center justify-center rounded-md p-1.5 transition-colors",
            theme === value
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const logout = useLogout();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 dark:border-gray-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">CMS Platform</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {user?.is_superadmin ? "Super Admin" : "Dashboard"}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map(({ label, href, icon: Icon, soon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={soon ? "#" : href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100",
                    soon && "cursor-not-allowed opacity-50"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {soon && (
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      Soon
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin section — only for superadmin */}
      {user?.is_superadmin && (
        <>
          <div className="mx-3 my-2 border-t border-gray-200 dark:border-gray-800" />
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Super Admin
          </p>
          <li>
            <Link
              href="/admin/tenants"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Building2 className="h-4 w-4 flex-shrink-0" />
              Tenant Management
            </Link>
          </li>
        </>
      )}

      {/* User footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            {user?.full_name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {user?.full_name}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}