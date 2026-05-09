"use client";

import { useEffect, useRef } from "react";
import { useProjectStats, useProjects } from "@/hooks/useProjects";
import { useAuthStore } from "@/store/auth.store";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { formatCurrency, formatDate } from "@/lib/utils";

import {
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

import Link from "next/link";
import Chart from "chart.js/auto";

// ─────────────────────────────────────────────────────────────
// Chart colors
// ─────────────────────────────────────────────────────────────

function chartColors() {
  return {
    grid: "rgba(0,0,0,0.06)",
    tick: "#6b7280",
    tooltip: {
      backgroundColor: "#ffffff",
      titleColor: "#111827",
      bodyColor: "#6b7280",
      borderColor: "#e5e7eb",
    },
  };
}

const COLORS = {
  blue: "#2563eb",
  green: "#059669",
  purple: "#7c3aed",
  red: "#dc2626",
  amber: "#d97706",
  gray: "#94a3b8",
  slate: "#64748b",
};

// ─────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  trend,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down";
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-1 text-xs text-gray-500">{label}</p>

      <p className={`text-2xl font-semibold ${color ?? "text-gray-900"}`}>
        {value}
      </p>

      {sub && (
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
          {trend === "up" && (
            <TrendingUp className="h-3 w-3 text-green-500" />
          )}

          {trend === "down" && (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}

          {sub}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chart Canvas
// ─────────────────────────────────────────────────────────────

function ChartCanvas({
  id,
  height = 200,
}: {
  id: string;
  height?: number;
}) {
  return (
    <div style={{ position: "relative", height }}>
      <canvas id={id} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Legend
// ─────────────────────────────────────────────────────────────

function Legend({
  items,
}: {
  items: { color: string; label: string }[];
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-3">
      {items.map(({ color, label }) => (
        <span
          key={label}
          className="flex items-center gap-1.5 text-xs text-gray-500"
        >
          <span
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ background: color }}
          />

          {label}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Overview Page
// ─────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useProjectStats();

  const { data: projects, isLoading: projectsLoading } = useProjects({
    page: 1,
  });

  const chartsRef = useRef<Record<string, Chart>>({});

  // Destroy old chart

  const destroyChart = (id: string) => {
    if (chartsRef.current[id]) {
      chartsRef.current[id].destroy();
      delete chartsRef.current[id];
    }
  };

  useEffect(() => {
    if (statsLoading || projectsLoading) return;

    const c = chartColors();

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
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
      },
    };

    // ─────────────────────────────────────────────
    // 1. Status Donut
    // ─────────────────────────────────────────────

    destroyChart("status-donut");

    const statusEl = document.getElementById(
      "status-donut"
    ) as HTMLCanvasElement;

    if (statusEl) {
      const byStatus = stats?.by_status ?? {};

      const labels = Object.keys(byStatus);

      const data = Object.values(byStatus) as number[];

      const STATUS_COLORS: Record<string, string> = {
        active: COLORS.blue,
        planning: COLORS.purple,
        draft: COLORS.gray,
        on_hold: COLORS.amber,
        completed: COLORS.green,
        cancelled: COLORS.red,
      };

      chartsRef.current["status-donut"] = new Chart(statusEl, {
        type: "doughnut",

        data: {
          labels,

          datasets: [
            {
              data,

              backgroundColor: labels.map(
                (l) => STATUS_COLORS[l] ?? COLORS.gray
              ),

              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        },

        options: {
          ...baseOpts,
          cutout: "72%",
        },
      });
    }

    // ─────────────────────────────────────────────
    // 2. Budget Bar
    // ─────────────────────────────────────────────

    destroyChart("budget-bar");

    const budgetEl = document.getElementById(
      "budget-bar"
    ) as HTMLCanvasElement;

    if (budgetEl) {
      const top5 = [...(projects?.data ?? [])]
        .filter((p) => p.estimated_budget)
        .sort(
          (a, b) =>
            (b.estimated_budget ?? 0) - (a.estimated_budget ?? 0)
        )
        .slice(0, 5);

      chartsRef.current["budget-bar"] = new Chart(budgetEl, {
        type: "bar",

        data: {
          labels: top5.map((p) =>
            p.name.split(" ").slice(0, 2).join(" ")
          ),

          datasets: [
            {
              label: "Budget",

              data: top5.map((p) =>
                Math.round((p.estimated_budget ?? 0) / 1_000_000)
              ),

              backgroundColor: "rgba(37,99,235,0.15)",
              borderColor: COLORS.blue,
              borderWidth: 1.5,
              borderRadius: 4,
            },

            {
              label: "Approved",

              data: top5.map((p) =>
                Math.round(
                  (
                    p.approved_budget ??
                    (p.estimated_budget ?? 0) * 0.7
                  ) / 1_000_000
                )
              ),

              backgroundColor: "rgba(5,150,105,0.15)",
              borderColor: COLORS.green,
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
                color: c.tick,

                callback: (v: any) => `NPR ${v}M`,
              },
            },

            y: {
              grid: { display: false },

              ticks: {
                color: c.tick,
              },
            },
          },
        },
      });
    }

    // ─────────────────────────────────────────────
    // 3. Cashflow
    // ─────────────────────────────────────────────

    destroyChart("cashflow-area");

    const cashEl = document.getElementById(
      "cashflow-area"
    ) as HTMLCanvasElement;

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

              borderColor: COLORS.blue,
              backgroundColor: "rgba(37,99,235,0.08)",

              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 3,
            },

            {
              label: "Received",

              data: [3.1, 4.2, 3.0, 5.1, 4.8, 6.2],

              borderColor: COLORS.green,
              backgroundColor: "rgba(5,150,105,0.08)",

              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 3,
            },

            {
              label: "Expenses",

              data: [1.8, 2.1, 1.5, 2.8, 2.3, 3.1],

              borderColor: COLORS.red,
              backgroundColor: "rgba(220,38,38,0.06)",

              fill: true,
              tension: 0.4,
              borderWidth: 2,
              borderDash: [5, 3],
              pointRadius: 3,
            },
          ],
        },

        options: {
          ...baseOpts,

          scales: {
            x: {
              grid: { display: false },

              ticks: {
                color: c.tick,
              },
            },

            y: {
              grid: { color: c.grid },

              ticks: {
                color: c.tick,

                callback: (v: any) => `${v}M`,
              },
            },
          },
        },
      });
    }

    // ─────────────────────────────────────────────
    // 4. Labour
    // ─────────────────────────────────────────────

    destroyChart("labour-bar");

    const labourEl = document.getElementById(
      "labour-bar"
    ) as HTMLCanvasElement;

    if (labourEl) {
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();

        d.setDate(d.getDate() - (13 - i));

        return d.toLocaleDateString("en", {
          day: "numeric",
        });
      });

      const workers = [42, 38, 0, 44, 41, 39, 43, 0, 47, 45, 42, 38, 44, 46];

      chartsRef.current["labour-bar"] = new Chart(labourEl, {
        type: "bar",

        data: {
          labels: days,

          datasets: [
            {
              label: "Workers",

              data: workers,

              backgroundColor: workers.map((v) =>
                v === 0
                  ? "#e5e7eb"
                  : "rgba(99,102,241,0.65)"
              ),

              borderRadius: 3,
              borderSkipped: false,
            },
          ],
        },

        options: {
          ...baseOpts,

          scales: {
            x: {
              grid: { display: false },

              ticks: {
                color: c.tick,
                autoSkip: false,
              },
            },

            y: {
              grid: { color: c.grid },

              ticks: {
                color: c.tick,
              },
            },
          },
        },
      });
    }

    // ─────────────────────────────────────────────
    // 5. Procurement
    // ─────────────────────────────────────────────

    destroyChart("procurement-pipe");

    const procEl = document.getElementById(
      "procurement-pipe"
    ) as HTMLCanvasElement;

    if (procEl) {
      chartsRef.current["procurement-pipe"] = new Chart(procEl, {
        type: "bar",

        data: {
          labels: [
            "Draft",
            "Pending",
            "Approved",
            "Partial",
            "Complete",
          ],

          datasets: [
            {
              label: "POs",

              data: [12, 5, 8, 3, 14],

              backgroundColor: [
                "#cbd5e1",
                "#fbbf24",
                COLORS.blue,
                COLORS.purple,
                COLORS.green,
              ],

              borderRadius: 4,
              borderSkipped: false,
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
                color: c.tick,
              },
            },

            y: {
              grid: { display: false },

              ticks: {
                color: c.tick,
              },
            },
          },
        },
      });
    }

    // ─────────────────────────────────────────────
    // 6. Radar
    // ─────────────────────────────────────────────

    destroyChart("module-activity");

    const actEl = document.getElementById(
      "module-activity"
    ) as HTMLCanvasElement;

    if (actEl) {
      chartsRef.current["module-activity"] = new Chart(actEl, {
        type: "radar",

        data: {
          labels: [
            "Projects",
            "BOQ",
            "Procurement",
            "Inventory",
            "Site Ops",
            "Finance",
          ],

          datasets: [
            {
              label: "Activity",

              data: [85, 60, 72, 45, 90, 55],

              borderColor: COLORS.blue,
              backgroundColor: "rgba(37,99,235,0.1)",

              borderWidth: 2,
              pointBackgroundColor: COLORS.blue,
              pointRadius: 4,
            },
          ],
        },

        options: {
          ...baseOpts,

          scales: {
            r: {
              grid: { color: c.grid },

              pointLabels: {
                color: c.tick,
              },

              ticks: {
                display: false,
              },
            },
          },
        },
      });
    }

    return () => {
      Object.keys(chartsRef.current).forEach(destroyChart);
    };
  }, [statsLoading, projectsLoading, stats, projects]);

  return (
    <div className="space-y-6 bg-gray-50 p-1">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Good morning, {user?.full_name?.split(" ")[0]} 👋
        </h1>

        <p className="mt-0.5 text-sm text-gray-500">
          Platform overview —{" "}
          {new Date().toLocaleDateString("en-NP", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-gray-100"
            />
          ))
        ) : (
          <>
            <KPICard
              label="Total projects"
              value={String(stats?.total ?? 0)}
              sub="All tenants"
            />

            <KPICard
              label="Active projects"
              value={String(stats?.by_status?.active ?? 0)}
              sub="Currently running"
              trend="up"
              color="text-blue-600"
            />

            <KPICard
              label="Active budget"
              value={formatCurrency(stats?.active_budget_total ?? 0)}
              sub="Across active projects"
              color="text-purple-600"
            />

            <KPICard
              label="Completed"
              value={String(stats?.by_status?.completed ?? 0)}
              sub="This year"
              trend="up"
              color="text-green-600"
            />
          </>
        )}
      </div>

      {/* Row 1 */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Project status
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Legend
              items={[
                { color: COLORS.blue, label: "Active" },
                { color: COLORS.green, label: "Completed" },
                { color: COLORS.amber, label: "On hold" },
                { color: COLORS.purple, label: "Planning" },
                { color: COLORS.gray, label: "Draft" },
              ]}
            />

            {statsLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <ChartCanvas id="status-donut" height={200} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Budget vs approved
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Legend
              items={[
                {
                  color: COLORS.blue,
                  label: "Estimated budget",
                },

                {
                  color: COLORS.green,
                  label: "Approved budget",
                },
              ]}
            />

            <ChartCanvas id="budget-bar" height={200} />
          </CardContent>
        </Card>
      </div>

      {/* Cashflow */}

      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900">
            Platform cashflow — last 6 months
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Legend
            items={[
              { color: COLORS.blue, label: "Invoiced" },
              { color: COLORS.green, label: "Received" },
              { color: COLORS.red, label: "Expenses" },
            ]}
          />

          <ChartCanvas id="cashflow-area" height={240} />
        </CardContent>
      </Card>

      {/* Row 3 */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Labour attendance
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Legend
              items={[
                {
                  color: "#6366f1",
                  label: "Working days",
                },

                {
                  color: "#e5e7eb",
                  label: "Weekend / holiday",
                },
              ]}
            />

            <ChartCanvas id="labour-bar" height={160} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Procurement pipeline
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ChartCanvas id="procurement-pipe" height={160} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Module activity
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ChartCanvas id="module-activity" height={160} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}

      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">
              Recent projects
            </CardTitle>

            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          {projectsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects?.data.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between py-3 transition-opacity hover:opacity-75"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p.name}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {p.code} · {p.city ?? "—"} ·{" "}
                      {formatDate(p.planned_end_date)}
                    </p>
                  </div>

                  <div className="ml-4 flex items-center gap-4">
                    <div className="hidden flex-col items-end sm:flex">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-gray-200">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{
                              width: `${p.progress_percentage}%`,
                            }}
                          />
                        </div>

                        <span className="w-8 text-xs text-gray-500">
                          {p.progress_percentage}%
                        </span>
                      </div>

                      {p.estimated_budget && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {formatCurrency(
                            p.estimated_budget,
                            p.currency
                          )}
                        </p>
                      )}
                    </div>

                    <Badge status={p.status} />
                  </div>
                </Link>
              ))}

              {!projects?.data.length && (
                <p className="py-8 text-center text-sm text-gray-400">
                  No projects yet
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}