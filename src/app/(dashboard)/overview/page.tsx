"use client";

import { useState, useEffect, useRef } from "react";
import { useProjectStats, useProjects } from "@/hooks/useProjects";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
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
  const { data: stats, isLoading: statsLoading } = useProjectStats();
  const { data: projects, isLoading: projectsLoading } = useProjects({ page: 1 });
  const chartsRef = useRef<Record<string, Chart>>({});

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

    // 3 — Cashflow area chart (mock trend data)
    destroyChart("cashflow-area");
    const cashEl = document.getElementById("cashflow-area") as HTMLCanvasElement;
    if (cashEl) {
      const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
      chartsRef.current["cashflow-area"] = new Chart(cashEl, {
        type: "line",
        data: {
          labels: months,
          datasets: [
            {
              label: "Invoiced",
              data: [4.2, 5.1, 3.8, 6.2, 5.5, 7.1],
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
              data: [3.1, 4.2, 3.0, 5.1, 4.8, 6.2],
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
              data: [1.8, 2.1, 1.5, 2.8, 2.3, 3.1],
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
                callback: (v: any) => `${v}M`,
              },
            },
          },
        },
      });
    }

    // 4 — Labour attendance bar (last 14 days)
    destroyChart("labour-bar");
    const labourEl = document.getElementById("labour-bar") as HTMLCanvasElement;
    if (labourEl) {
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return d.toLocaleDateString("en", { day: "numeric" });
      });
      const workers = [42, 38, 0, 44, 41, 39, 43, 0, 47, 45, 42, 38, 44, 46];
      chartsRef.current["labour-bar"] = new Chart(labourEl, {
        type: "bar",
        data: {
          labels: days,
          datasets: [{
            label: "Workers",
            data: workers,
            backgroundColor: workers.map(v =>
              v === 0
                ? (isDark ? "#374151" : "#e5e7eb")
                : (isDark ? "rgba(99,102,241,0.7)" : "rgba(99,102,241,0.6)")
            ),
            borderRadius: 3,
            borderSkipped: false,
          }],
        },
        options: {
          ...baseOpts,
          scales: {
            x: { grid: { display: false }, ticks: { color: c.tick, font: { size: 10 }, autoSkip: false } },
            y: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 11 } } },
          },
        },
      });
    }

    // 5 — Procurement pipeline horizontal
    destroyChart("procurement-pipe");
    const procEl = document.getElementById("procurement-pipe") as HTMLCanvasElement;
    if (procEl) {
      chartsRef.current["procurement-pipe"] = new Chart(procEl, {
        type: "bar",
        data: {
          labels: ["Draft", "Pending", "Approved", "Partial", "Complete"],
          datasets: [{
            label: "POs",
            data: [12, 5, 8, 3, 14],
            backgroundColor: ["#e2e8f0", "#fbbf24", "#3b82f6", "#8b5cf6", "#10b981"],
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

    // 6 — Progress radar-style (use grouped bar as simple alt)
    destroyChart("module-activity");
    const actEl = document.getElementById("module-activity") as HTMLCanvasElement;
    if (actEl) {
      chartsRef.current["module-activity"] = new Chart(actEl, {
        type: "radar",
        data: {
          labels: ["Projects", "BOQ", "Procurement", "Inventory", "Site Ops", "Finance"],
          datasets: [{
            label: "Activity",
            data: [85, 60, 72, 45, 90, 55],
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
  }, [statsLoading, projectsLoading, isDark, stats, projects]);
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

      {/* Row 3 — Labour + Procurement + Radar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Labour attendance (14d)</CardTitle>
          </CardHeader>
          <CardContent>
            <Legend items={[
              { color: "#6366f1", label: "Working days" },
              { color: "#e5e7eb", label: "Weekend / holiday" },
            ]} />
            <ChartCanvas id="labour-bar" height={160} />
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Procurement pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartCanvas id="procurement-pipe" height={160} />
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Module activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartCanvas id="module-activity" height={160} />
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
          {projectsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {projects?.data.slice(0, 6).map(p => (
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