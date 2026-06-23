"use client";

import { useState, useEffect, useRef } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useDashboardOverview } from "@/hooks/useDashboard";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, ArrowRight, Bell, Package } from "lucide-react";
import Link from "next/link";
import Chart from "chart.js/auto";

// ── Chart color helpers ───────────────────────────────────────────
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

// ── KPI card ──────────────────────────────────────────────────────
function KPICard({
  label, value, sub, trend, color,
}: {
  label: string; value: string; sub?: string;
  trend?: "up" | "down"; color?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
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

// ── Chart wrapper ─────────────────────────────────────────────────
function ChartCanvas({ id, height = 200 }: { id: string; height?: number }) {
  return (
    <div style={{ position: "relative", height }}>
      <canvas id={id} />
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────
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

export default function OverviewPage() {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const { data: dash, isLoading: dashLoading, isError: dashIsError, error: dashError } = useDashboardOverview();
  const { data: projects, isLoading: projectsLoading, isError: projectsIsError, error: projectsError } = useProjects({ page: 1 });
  const chartsRef = useRef<Record<string, Chart>>({});
  const stats = dash?.project_stats;
  const statsLoading = dashLoading;

  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Destroy old charts on re-render
  const destroyChart = (id: string) => {
    if (chartsRef.current[id]) {
      chartsRef.current[id].destroy();
      delete chartsRef.current[id];
    }
  };

  useEffect(() => {
    if (statsLoading || projectsLoading) return;
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

    // 1 — Project status donut
    destroyChart("status-donut");
    const statusEl = document.getElementById("status-donut") as HTMLCanvasElement;
    if (statusEl) {
      const byStatus = stats?.by_status ?? {};
      const labels = Object.keys(byStatus);
      const data = Object.values(byStatus) as number[];
      const STATUS_COLORS: Record<string, string> = {
        active: "#3b82f6", planning: "#8b5cf6", draft: "#94a3b8",
        on_hold: "#f59e0b", completed: "#10b981", cancelled: "#ef4444",
      };
      chartsRef.current["status-donut"] = new Chart(statusEl, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: labels.map(l => STATUS_COLORS[l] ?? "#94a3b8"),
            borderWidth: 0,
            hoverOffset: 6,
          }],
        },
        options: { ...baseOpts, cutout: "72%" },
      });
    }

    // 2 — Budget vs actual (top 5 projects by budget)
    destroyChart("budget-bar");
    const budgetEl = document.getElementById("budget-bar") as HTMLCanvasElement;
    if (budgetEl) {
      const top5 = [...(projects?.data ?? [])]
        .filter(p => p.estimated_budget)
        .sort((a, b) => (b.estimated_budget ?? 0) - (a.estimated_budget ?? 0))
        .slice(0, 5);
      chartsRef.current["budget-bar"] = new Chart(budgetEl, {
        type: "bar",
        data: {
          labels: top5.map(p => p.name.split(" ").slice(0, 2).join(" ")),
          datasets: [
            {
              label: "Budget",
              data: top5.map(p => Math.round((p.estimated_budget ?? 0) / 1_000_000)),
              backgroundColor: isDark ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.15)",
              borderColor: "#3b82f6",
              borderWidth: 1.5,
              borderRadius: 4,
            },
            {
              label: "Approved",
              data: top5.map(p => Math.round((p.approved_budget ?? (p.estimated_budget ?? 0) * 0.7) / 1_000_000)),
              backgroundColor: isDark ? "rgba(16,185,129,0.4)" : "rgba(16,185,129,0.3)",
              borderColor: "#10b981",
              borderWidth: 1.5,
              borderRadius: 4,
            },
          ],
        },
        options: {
          ...baseOpts,
          indexAxis: "y" as const,
          scales: {
            x: {
              grid: { color: c.grid },
              ticks: {
                color: c.tick, font: { size: 11 },
                callback: (v: any) => `NPR ${v}M`,
              },
            },
            y: {
              grid: { display: false },
              ticks: { color: c.tick, font: { size: 11 } },
            },
          },
        },
      });
    }

    // 3 — Cashflow area chart (real data from API)
    destroyChart("cashflow-area");
    const cashEl = document.getElementById("cashflow-area") as HTMLCanvasElement;
    if (cashEl && dash?.monthly_cashflow?.length) {
      const cf = dash.monthly_cashflow;
      const labels = cf.map(m => {
        const [y, mo] = m.month.split("-");
        const d = new Date(+y, +mo - 1);
        return d.toLocaleDateString("en", { month: "short" });
      });
      chartsRef.current["cashflow-area"] = new Chart(cashEl, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Invoiced",
              data: cf.map(m => Math.round(m.invoiced / 1_000_000 * 10) / 10),
              borderColor: "#3b82f6",
              backgroundColor: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.06)",
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#3b82f6",
            },
            {
              label: "Received",
              data: cf.map(m => Math.round(m.received / 1_000_000 * 10) / 10),
              borderColor: "#10b981",
              backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)",
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#10b981",
            },
            {
              label: "Expenses",
              data: cf.map(m => Math.round(m.expenses / 1_000_000 * 10) / 10),
              borderColor: "#ef4444",
              backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)",
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              borderDash: [5, 3],
              pointRadius: 3,
              pointBackgroundColor: "#ef4444",
            },
          ],
        },
        options: {
          ...baseOpts,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: c.tick, font: { size: 11 } },
            },
            y: {
              grid: { color: c.grid },
              ticks: {
                color: c.tick, font: { size: 11 },
                callback: (v: any) => `NPR ${v}M`,
              },
            },
          },
        },
      });
    }

    // 4 — Procurement pipeline (real data)
    destroyChart("procurement-pipe");
    const procEl = document.getElementById("procurement-pipe") as HTMLCanvasElement;
    if (procEl && dash?.procurement_pipeline) {
      const pipe = dash.procurement_pipeline.by_status;
      const STATUS_LABELS: Record<string, string> = {
        draft: "Draft", pending_approval: "Pending", approved: "Approved",
        sent: "Sent", partially_received: "Partial", fully_received: "Complete",
        cancelled: "Cancelled",
      };
      const STATUS_COLORS: Record<string, string> = {
        draft: "#e2e8f0", pending_approval: "#fbbf24", approved: "#3b82f6",
        sent: "#8b5cf6", partially_received: "#f97316", fully_received: "#10b981",
        cancelled: "#ef4444",
      };
      const entries = Object.entries(pipe).sort(([, a], [, b]) => b.count - a.count);
      chartsRef.current["procurement-pipe"] = new Chart(procEl, {
        type: "bar",
        data: {
          labels: entries.map(([k]) => STATUS_LABELS[k] ?? k),
          datasets: [{
            label: "POs",
            data: entries.map(([, v]) => v.count),
            backgroundColor: entries.map(([k]) => STATUS_COLORS[k] ?? "#94a3b8"),
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          ...baseOpts,
          indexAxis: "y" as const,
          scales: {
            x: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 11 } } },
            y: { grid: { display: false }, ticks: { color: c.tick, font: { size: 10 } } },
          },
        },
      });
    }

    // 5 — Module activity radar (real data)
    destroyChart("module-activity");
    const actEl = document.getElementById("module-activity") as HTMLCanvasElement;
    if (actEl && dash?.module_activity) {
      const ma = dash.module_activity;
      const maxVal = Math.max(ma.projects, ma.procurement, ma.finance, ma.site_ops, ma.inventory, ma.quality, 1);
      const pct = (v: number) => Math.round(v / maxVal * 100);
      chartsRef.current["module-activity"] = new Chart(actEl, {
        type: "radar",
        data: {
          labels: ["Projects", "Procurement", "Finance", "Site Ops", "Inventory", "Quality"],
          datasets: [{
            label: "Activity",
            data: [pct(ma.projects), pct(ma.procurement), pct(ma.finance), pct(ma.site_ops), pct(ma.inventory), pct(ma.quality)],
            borderColor: "#3b82f6",
            backgroundColor: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
            borderWidth: 2,
            pointBackgroundColor: "#3b82f6",
            pointRadius: 4,
          }],
        },
        options: {
          ...baseOpts,
          scales: {
            r: {
              grid: { color: c.grid },
              pointLabels: { color: c.tick, font: { size: 11 } },
              ticks: { display: false },
            },
          },
        },
      });
    }



    return () => {
      Object.keys(chartsRef.current).forEach(destroyChart);
    };
  }, [dashLoading, projectsLoading, isDark, dash, projects]);
  if (dashIsError || projectsIsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="text-destructive text-4xl">!</div>
        <h3 className="text-lg font-semibold">Failed to load data</h3>
        <p className="text-muted-foreground text-sm">{(dashError || projectsError)?.message || "An error occurred"}</p>
      </div>
    );
  }

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Let's Kick off the day"
      : hour < 17
      ? "Afternoon Fuel Activated"
      : hour < 21
      ? "A Productive Evening Ahead"
      : "The Night Shift Begins";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {greeting}, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Platform overview - {new Date().toLocaleDateString("en-NP", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))
        ) : (
          <>
            <KPICard label="Total projects" value={String(stats?.total ?? 0)} sub="All tenants" />
            <KPICard
              label="Active projects"
              value={String(stats?.by_status?.active ?? 0)}
              sub="Currently running"
              trend="up"
              color="text-blue-600 dark:text-blue-400"
            />
            <KPICard
              label="Active budget"
              value={formatCurrency(stats?.active_budget_total ?? 0)}
              sub="Across active projects"
              color="text-purple-600 dark:text-purple-400"
            />
            <KPICard
              label="Completed"
              value={String(stats?.by_status?.completed ?? 0)}
              sub="This year"
              trend="up"
              color="text-green-600 dark:text-green-400"
            />
          </>
        )}
      </div>
      {/* Secondary KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {dashLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))
        ) : (
          <>
            <KPICard
              label="Pending approvals"
              value={String(dash?.pending_approvals ?? 0)}
              sub="Awaiting review"
              color="text-amber-600 dark:text-amber-400"
            />
            <KPICard
              label="Low stock alerts"
              value={String(dash?.low_stock_count ?? 0)}
              sub="Items below reorder level"
              color="text-red-600 dark:text-red-400"
            />
            <KPICard
              label="Total POs"
              value={String(dash?.procurement_pipeline?.total_pos ?? 0)}
              sub={`Value ${formatCurrency(dash?.procurement_pipeline?.total_po_value ?? 0)}`}
              color="text-indigo-600 dark:text-indigo-400"
            />
            <KPICard
              label="Total invoiced"
              value={formatCurrency(
                dash?.monthly_cashflow?.reduce((s, m) => s + m.invoiced, 0) ?? 0
              )}
              sub="All time"
              color="text-emerald-600 dark:text-emerald-400"
            />
          </>
        )}
      </div>

      {/* Row 1 — Donut + Budget bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Project status</CardTitle>
          </CardHeader>
          <CardContent>
            <Legend items={[
              { color: "#3b82f6", label: "Active" },
              { color: "#10b981", label: "Completed" },
              { color: "#f59e0b", label: "On hold" },
              { color: "#8b5cf6", label: "Planning" },
              { color: "#94a3b8", label: "Draft" },
            ]} />
            {statsLoading
              ? <div className="flex justify-center h-48 items-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              : <ChartCanvas id="status-donut" height={200} />
            }
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Budget vs approved (top projects)</CardTitle>
          </CardHeader>
          <CardContent>
            <Legend items={[
              { color: "#3b82f6", label: "Estimated budget" },
              { color: "#10b981", label: "Approved budget" },
            ]} />
            <ChartCanvas id="budget-bar" height={200} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Cashflow full width */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Platform cashflow — last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <Legend items={[
            { color: "#3b82f6", label: "Invoiced" },
            { color: "#10b981", label: "Received" },
            { color: "#ef4444", label: "Expenses" },
          ]} />
          <ChartCanvas id="cashflow-area" height={240} />
        </CardContent>
      </Card>

      {/* Row 3 — Procurement Pipeline + Module Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Procurement pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartCanvas id="procurement-pipe" height={180} />
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Module activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartCanvas id="module-activity" height={180} />
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Recent projects */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="dark:text-gray-100">Recent projects</CardTitle>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {dashLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {dash?.recent_projects?.map(p => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between py-3 hover:opacity-75 transition-opacity"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {p.code} · {p.city ?? "—"} · {formatDate(p.planned_end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="hidden sm:flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${p.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
                          {p.progress_percentage}%
                        </span>
                      </div>
                      {p.estimated_budget && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatCurrency(p.estimated_budget, p.currency)}
                        </p>
                      )}
                    </div>
                    <Badge status={p.status} />
                  </div>
                </Link>
              ))}
              {!projects?.data.length && (
                <p className="py-8 text-center text-sm text-gray-400">No projects yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}