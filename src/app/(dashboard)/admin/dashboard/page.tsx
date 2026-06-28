"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import { useSuperAdminOverview, useSuperAdminTenantDetail } from "@/hooks/useSuperAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Users, Building2, FolderKanban, DollarSign, ArrowRight } from "lucide-react";
import Link from "next/link";
import Chart from "chart.js/auto";

const PLAN_COLORS_RECORD: Record<string, string> = {
  free: "#94a3b8",
  starter: "#3b82f6",
  professional: "#8b5cf6",
  enterprise: "#f59e0b",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  inactive: "#94a3b8",
  suspended: "#ef4444",
  trial: "#f59e0b",
};

function chartColors(dark: boolean) {
  return {
    grid: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    tick: dark ? "#9ca3af" : "#6b7280",
    tooltip: {
      backgroundColor: dark ? "#1f2937" : "#ffffff",
      titleColor: dark ? "#f9fafb" : "#111827",
      bodyColor: dark ? "#9ca3af" : "#6b7280",
      borderColor: dark ? "#374151" : "#e5e7eb",
    },
  };
}

function KPICard({ label, value, sub, trend, color, icon: Icon }: {
  label: string; value: string; sub?: string;
  trend?: "up" | "down"; color?: string; icon?: React.ElementType;
}) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`h-4 w-4 ${color ?? "text-gray-400"}`} />}
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className={`text-2xl font-medium ${color ?? "text-gray-900 dark:text-gray-100"}`}>
        {value}
      </p>
      {sub && (
        <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
          {sub}
        </p>
      )}
    </div>
  );
}

function ChartCanvas({ id, height = 200 }: { id: string; height?: number }) {
  return (
    <div style={{ position: "relative", height }}>
      <canvas id={id} />
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mb-3">
      {items.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { theme } = useThemeStore();
  const { data, isLoading, isError } = useSuperAdminOverview();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const { data: tenantDetail } = useSuperAdminTenantDetail(selectedTenantId);
  const chartsRef = useRef<Record<string, Chart>>({});

  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    if (!user?.is_superadmin) router.replace("/overview");
  }, [user, router]);

  const destroyChart = (id: string) => {
    if (chartsRef.current[id]) {
      chartsRef.current[id].destroy();
      delete chartsRef.current[id];
    }
  };

  useEffect(() => {
    if (isLoading || !data) return;
    const c = chartColors(isDark);

    const baseOpts: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.tooltip.backgroundColor,
          titleColor: c.tooltip.titleColor,
          bodyColor: c.tooltip.bodyColor,
          borderColor: c.tooltip.borderColor,
          borderWidth: 0.5,
          padding: 10,
          cornerRadius: 8,
        },
      },
    };

    // 1 — Tenant status doughnut
    destroyChart("tenant-status");
    const statusEl = document.getElementById("tenant-status") as HTMLCanvasElement;
    if (statusEl && data.tenant_stats) {
      const byStatus = data.tenant_stats.by_status ?? {};
      const labels = Object.keys(byStatus);
      const values = Object.values(byStatus) as number[];
      chartsRef.current["tenant-status"] = new Chart(statusEl, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: labels.map(l => STATUS_COLORS[l] ?? "#94a3b8"),
            borderWidth: 0,
            hoverOffset: 6,
          }],
        },
        options: { ...baseOpts, cutout: "72%" },
      });
    }

    // 2 — Plan distribution doughnut
    destroyChart("plan-dist");
    const planEl = document.getElementById("plan-dist") as HTMLCanvasElement;
    if (planEl && data.plan_distribution?.length) {
      const labels = data.plan_distribution.map(p => p.plan);
      const values = data.plan_distribution.map(p => p.count);
      chartsRef.current["plan-dist"] = new Chart(planEl, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: labels.map(l => PLAN_COLORS_RECORD[l] ?? "#94a3b8"),
            borderWidth: 0,
            hoverOffset: 6,
          }],
        },
        options: { ...baseOpts, cutout: "72%" },
      });
    }

    // 3 — Monthly signups bar
    destroyChart("monthly-signups");
    const signupEl = document.getElementById("monthly-signups") as HTMLCanvasElement;
    if (signupEl && data.monthly_signups?.length) {
      const labels = data.monthly_signups.map(m => {
        const [y, mo] = m.month.split("-");
        const d = new Date(+y, +mo - 1);
        return d.toLocaleDateString("en", { month: "short", year: "2-digit" });
      });
      chartsRef.current["monthly-signups"] = new Chart(signupEl, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "New tenants",
            data: data.monthly_signups.map(m => m.count),
            backgroundColor: isDark ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.15)",
            borderColor: "#3b82f6",
            borderWidth: 1.5,
            borderRadius: 4,
          }],
        },
        options: {
          ...baseOpts,
          scales: {
            x: { grid: { display: false }, ticks: { color: c.tick, font: { size: 11 } } },
            y: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 11 }, stepSize: 1 } },
          },
        },
      });
    }

    // 4 — Users per tenant (top 8)
    destroyChart("users-per-tenant");
    const usersEl = document.getElementById("users-per-tenant") as HTMLCanvasElement;
    if (usersEl && data.tenant_user_counts?.length) {
      const top8 = data.tenant_user_counts.slice(0, 8);
      chartsRef.current["users-per-tenant"] = new Chart(usersEl, {
        type: "bar",
        data: {
          labels: top8.map(t => t.tenant_name.length > 15 ? t.tenant_name.slice(0, 15) + "..." : t.tenant_name),
          datasets: [{
            label: "Users",
            data: top8.map(t => t.user_count),
            backgroundColor: isDark ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.15)",
            borderColor: "#8b5cf6",
            borderWidth: 1.5,
            borderRadius: 4,
          }],
        },
        options: {
          ...baseOpts,
          indexAxis: "y" as const,
          scales: {
            x: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 11 }, stepSize: 1 } },
            y: { grid: { display: false }, ticks: { color: c.tick, font: { size: 10 } } },
          },
        },
      });
    }

    // 5 — Projects per tenant (top 8)
    destroyChart("projects-per-tenant");
    const projEl = document.getElementById("projects-per-tenant") as HTMLCanvasElement;
    if (projEl && data.tenant_project_counts?.length) {
      const top8 = data.tenant_project_counts.slice(0, 8);
      chartsRef.current["projects-per-tenant"] = new Chart(projEl, {
        type: "bar",
        data: {
          labels: top8.map(t => t.tenant_name.length > 15 ? t.tenant_name.slice(0, 15) + "..." : t.tenant_name),
          datasets: [{
            label: "Projects",
            data: top8.map(t => t.project_count),
            backgroundColor: isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.15)",
            borderColor: "#10b981",
            borderWidth: 1.5,
            borderRadius: 4,
          }],
        },
        options: {
          ...baseOpts,
          indexAxis: "y" as const,
          scales: {
            x: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 11 }, stepSize: 1 } },
            y: { grid: { display: false }, ticks: { color: c.tick, font: { size: 10 } } },
          },
        },
      });
    }

    // 6 — Top tenants by revenue
    destroyChart("revenue-by-tenant");
    const revEl = document.getElementById("revenue-by-tenant") as HTMLCanvasElement;
    if (revEl && data.top_tenants_by_revenue?.length) {
      const top8 = data.top_tenants_by_revenue.slice(0, 8);
      chartsRef.current["revenue-by-tenant"] = new Chart(revEl, {
        type: "bar",
        data: {
          labels: top8.map(t => t.tenant_name.length > 15 ? t.tenant_name.slice(0, 15) + "..." : t.tenant_name),
          datasets: [{
            label: "Revenue (NPR)",
            data: top8.map(t => Math.round(t.revenue / 1_000_000 * 10) / 10),
            backgroundColor: isDark ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.15)",
            borderColor: "#f59e0b",
            borderWidth: 1.5,
            borderRadius: 4,
          }],
        },
        options: {
          ...baseOpts,
          indexAxis: "y" as const,
          scales: {
            x: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 11 }, callback: (v: any) => `NPR ${v}M` } },
            y: { grid: { display: false }, ticks: { color: c.tick, font: { size: 10 } } },
          },
        },
      });
    }

    return () => {
      Object.keys(chartsRef.current).forEach(destroyChart);
    };
  }, [isLoading, data, isDark]);

  useEffect(() => {
    if (selectedTenantId && tenantDetail) {
      const el = document.getElementById("tenant-detail-modal");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedTenantId, tenantDetail]);

  if (!user?.is_superadmin) return null;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="text-destructive text-4xl">!</div>
        <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
        <p className="text-muted-foreground text-sm">Could not fetch platform data</p>
      </div>
    );
  }

  const stats = data?.tenant_stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Platform Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Cross-tenant analytics and management overview
          </p>
        </div>
        <Link href="/admin/tenants">
          <Button variant="outline">
            <Building2 className="h-4 w-4 mr-2" /> Tenant Management
          </Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))
        ) : (
          <>
            <KPICard label="Total Tenants" value={String(stats?.total ?? 0)} sub="Across all plans" icon={Building2} color="text-blue-600 dark:text-blue-400" />
            <KPICard label="Total Users" value={String(data?.total_users ?? 0)} sub="Platform-wide" icon={Users} color="text-purple-600 dark:text-purple-400" />
            <KPICard label="Total Projects" value={String(data?.total_projects ?? 0)} sub="All tenants" icon={FolderKanban} color="text-green-600 dark:text-green-400" />
            <KPICard label="Total Revenue" value={formatCurrency(data?.total_revenue ?? 0)} sub="Invoiced across all tenants" icon={DollarSign} color="text-amber-600 dark:text-amber-400" />
          </>
        )}
      </div>

      {/* Secondary KPI strip */}
      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard label="Active Tenants" value={String(stats?.by_status?.active ?? 0)} sub="Currently live" trend="up" color="text-emerald-600 dark:text-emerald-400" />
          <KPICard label="Trial Tenants" value={String(stats?.by_status?.trial ?? 0)} sub="On free trial" color="text-amber-600 dark:text-amber-400" />
          <KPICard label="Suspended" value={String(stats?.by_status?.suspended ?? 0)} sub="Account suspended" trend="down" color="text-red-600 dark:text-red-400" />
          <KPICard label="Avg Users/Tenant" value={stats?.total ? String(Math.round((data.total_users ?? 0) / stats.total)) : "0"} sub="Platform average" />
        </div>
      )}

      {/* Row 1 — Status donut + Plan donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Tenants by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Legend items={[
              { color: "#10b981", label: "Active" },
              { color: "#f59e0b", label: "Trial" },
              { color: "#ef4444", label: "Suspended" },
              { color: "#94a3b8", label: "Inactive" },
            ]} />
            {isLoading
              ? <div className="flex justify-center h-48 items-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              : <ChartCanvas id="tenant-status" height={200} />
            }
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Tenants by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Legend items={[
              { color: "#94a3b8", label: "Free" },
              { color: "#3b82f6", label: "Starter" },
              { color: "#8b5cf6", label: "Professional" },
              { color: "#f59e0b", label: "Enterprise" },
            ]} />
            {isLoading
              ? <div className="flex justify-center h-48 items-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              : <ChartCanvas id="plan-dist" height={200} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Monthly signups */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Monthly Tenant Signups</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading
            ? <div className="flex justify-center h-48 items-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
            : <ChartCanvas id="monthly-signups" height={200} />
          }
        </CardContent>
      </Card>

      {/* Row 3 — Users + Projects per tenant */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Users per Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <div className="flex justify-center h-48 items-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              : <ChartCanvas id="users-per-tenant" height={250} />
            }
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Projects per Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <div className="flex justify-center h-48 items-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              : <ChartCanvas id="projects-per-tenant" height={250} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Revenue by tenant */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Revenue by Tenant (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading
            ? <div className="flex justify-center h-48 items-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
            : <ChartCanvas id="revenue-by-tenant" height={280} />
          }
        </CardContent>
      </Card>

      {/* Row 5 — Recent tenants + Tenant drill-down */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="dark:text-gray-100">Recent Tenants</CardTitle>
              <Link
                href="/admin/tenants"
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {data?.recent_tenants?.map(tenant => (
                  <button
                    key={tenant.id}
                    onClick={() => setSelectedTenantId(tenant.id === selectedTenantId ? null : tenant.id)}
                    className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.slug} · {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge status={tenant.status} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        tenant.plan === "enterprise" ? "bg-amber-100 text-amber-700" :
                        tenant.plan === "professional" ? "bg-purple-100 text-purple-700" :
                        tenant.plan === "starter" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {tenant.plan}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant drill-down detail */}
        <Card id="tenant-detail-modal" className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">
              {selectedTenantId ? "Tenant Overview" : "Tenant Detail"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedTenantId ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                <Building2 className="h-8 w-8 mb-2" />
                <p className="text-sm">Click a tenant from the list to see details</p>
              </div>
            ) : !tenantDetail ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{tenantDetail.tenant.name}</p>
                  <p className="text-xs text-gray-500">{tenantDetail.tenant.slug} · {tenantDetail.tenant.email}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400">Users</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{tenantDetail.user_count}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400">Projects</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">{tenantDetail.project_count}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                    <p className="text-xs text-amber-600 dark:text-amber-400">Invoiced</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(tenantDetail.total_invoiced)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Plan:</span>
                  <Badge status={tenantDetail.tenant.plan} />
                  <span className="text-xs text-gray-500 ml-2">Status:</span>
                  <Badge status={tenantDetail.tenant.status} />
                </div>

                {tenantDetail.tenant.pan_number && (
                  <p className="text-xs text-gray-500">PAN: {tenantDetail.tenant.pan_number}</p>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Users</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {tenantDetail.users.map(u => (
                      <div key={u.email} className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-800">
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{u.full_name}</p>
                          <p className="text-[11px] text-gray-500">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 capitalize">{u.role.replace(/_/g, " ")}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-green-500" : "bg-red-500"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Link href={`/admin/tenants`}>
                    <Button size="sm" variant="outline" className="w-full">
                      <Building2 className="h-3.5 w-3.5 mr-1.5" /> Manage Tenant
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
