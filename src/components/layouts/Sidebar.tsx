"use client";

import { useLogout } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import {
  Building2,
  DollarSign,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart
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
  { label: "Documents", href: "/documents", icon: FileText, soon: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const logout = useLogout();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">CMS Platform</p>
          <p className="text-xs text-gray-500 capitalize">
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
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    soon && "cursor-not-allowed opacity-50"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {soon && (
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
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
        <div className="mx-3 my-2 border-t border-gray-200" />
        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Super Admin
        </p>
        <li>
          <Link
            href="/admin/tenants"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              pathname.startsWith("/admin")
                ? "bg-red-50 text-red-700 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Building2 className="h-4 w-4 flex-shrink-0" />
            Tenant Management
          </Link>
        </li>
      </>
    )}

      {/* User footer */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            {user?.full_name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {user?.full_name}
            </p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}