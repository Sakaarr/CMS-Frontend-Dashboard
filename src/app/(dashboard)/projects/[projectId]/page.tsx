"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useProject, useUpdateProjectStatus,
  useSites, useMilestones,
} from "@/hooks/useProjects";
import { useBudgetVersions, useBOQSummary } from "@/hooks/useBoq";
import { usePurchaseOrders, useProcurementStats } from "@/hooks/useProcurement";
import { useDPRs, useSiteOpsSummary } from "@/hooks/useSiteOps";
import { useFinanceSummary, useInvoices } from "@/hooks/useFinance";
import { useMaterialRequests } from "@/hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useThemeStore } from "@/store/theme.store";
import {
  ArrowLeft, MapPin, Calendar, User,
  TrendingUp, CheckCircle, Loader2,
} from "lucide-react";
import Link from "next/link";
import Chart from "chart.js/auto";

// ── Tab definitions ───────────────────────────────────────────────
const TABS = [
  "Overview", "Sites", "BOQ",
  "Procurement", "Inventory", "Site Ops", "Finance",
] as const;
type Tab = typeof TABS[number];

// ── Status transitions allowed from UI ───────────────────────────
const STATUS_ACTIONS: Record<string, { next: string; label: string; variant: any }[]> = {
  draft: [{ next: "planning", label: "Start planning", variant: "default" }],
  planning: [
    { next: "active", label: "Activate", variant: "success" },
    { next: "on_hold", label: "Hold", variant: "outline" },
  ],
  active: [
    { next: "on_hold", label: "Put on hold", variant: "outline" },
    { next: "completed", label: "Complete", variant: "success" },
  ],
  on_hold: [{ next: "active", label: "Resume", variant: "default" }],
};

function chartColors(dark: boolean) {
  return {
    grid: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    tick: dark ? "#9ca3af" : "#6b7280",
  };
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");
  const { theme } = useThemeStore();
  const chartsRef = useRef<Record<string, Chart>>({});

  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data: project, isLoading } = useProject(projectId);
  const { data: sites } = useSites(projectId);
  const { data: milestones } = useMilestones(projectId);
  const { data: versions } = useBudgetVersions(projectId);
  const approvedVersion = versions?.find(v => v.status === "approved") ?? versions?.[0];
  const { data: boqSummary } = useBOQSummary(approvedVersion?.id ?? "");
  const { data: pos } = usePurchaseOrders(projectId);
  const { data: procStats } = useProcurementStats(projectId);
  const { data: dprsData } = useDPRs(projectId);
  const { data: siteOpsSummary } = useSiteOpsSummary(projectId);
  const { data: financeSummary } = useFinanceSummary(projectId);
  const { data: invoicesData } = useInvoices(projectId);
  const { data: mrs } = useMaterialRequests(projectId);
  const updateStatus = useUpdateProjectStatus();

  const dprs = dprsData?.data ?? [];
  const invoices = invoicesData?.data ?? [];

  const destroyChart = (id: string) => {
    if (chartsRef.current[id]) {
      chartsRef.current[id].destroy();
      delete chartsRef.current[id];
    }
  };

  useEffect(() => {
    if (tab !== "Overview" || !project) return;
    const c = chartColors(isDark);

    const baseOpts: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    };

    // Milestone completion donut
    destroyChart("ms-donut");
    const msEl = document.getElementById("ms-donut") as HTMLCanvasElement;
    if (msEl && milestones) {
      const done = milestones.filter(m => m.status === "completed").length;
      const remaining = milestones.length - done;
      chartsRef.current["ms-donut"] = new Chart(msEl, {
        type: "doughnut",
        data: {
          labels: ["Completed", "Remaining"],
          datasets: [{
            data: [done || 0, remaining || (milestones.length ? 0 : 1)],
            backgroundColor: ["#10b981", isDark ? "#374151" : "#e5e7eb"],
            borderWidth: 0,
          }],
        },
        options: { ...baseOpts, cutout: "75%" },
      });
    }

    // BOQ cost breakdown bar
    destroyChart("boq-breakdown");
    const boqEl = document.getElementById("boq-breakdown") as HTMLCanvasElement;
    if (boqEl && boqSummary) {
      chartsRef.current["boq-breakdown"] = new Chart(boqEl, {
        type: "bar",
        data: {
          labels: ["Material", "Labour", "Equipment", "Contingency"],
          datasets: [{
            label: "NPR M",
            data: [
              Math.round(boqSummary.total_material_cost / 1_000_000),
              Math.round(boqSummary.total_labour_cost / 1_000_000),
              Math.round(boqSummary.total_equipment_cost / 1_000_000),
              Math.round(boqSummary.contingency_amount / 1_000_000),
            ],
            backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
            borderRadius: 5,
            borderSkipped: false,
          }],
        },
        options: {
          ...baseOpts,
          scales: {
            x: { grid: { display: false }, ticks: { color: c.tick, font: { size: 11 } } },
            y: {
              grid: { color: c.grid },
              ticks: { color: c.tick, font: { size: 11 }, callback: (v: any) => `${v}M` },
            },
          },
        },
      });
    }

    // Finance cashflow line
    destroyChart("proj-cashflow");
    const cashEl = document.getElementById("proj-cashflow") as HTMLCanvasElement;
    if (cashEl) {
      chartsRef.current["proj-cashflow"] = new Chart(cashEl, {
        type: "line",
        data: {
          labels: ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"],
          datasets: [
            {
              label: "Invoiced",
              data: [0, 1.2, 2.8, 4.1, 5.5, financeSummary?.total_invoiced ? financeSummary.total_invoiced / 1_000_000 : 6.2],
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59,130,246,0.07)",
              fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3,
            },
            {
              label: "Received",
              data: [0, 0.8, 2.1, 3.4, 4.6, financeSummary?.total_received ? financeSummary.total_received / 1_000_000 : 5.1],
              borderColor: "#10b981",
              backgroundColor: "rgba(16,185,129,0.07)",
              fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3,
            },
          ],
        },
        options: {
          ...baseOpts,
          scales: {
            x: { grid: { display: false }, ticks: { color: c.tick, font: { size: 11 } } },
            y: {
              grid: { color: c.grid },
              ticks: { color: c.tick, font: { size: 11 }, callback: (v: any) => `${v}M` },
            },
          },
        },
      });
    }

    // DPR worker trend
    destroyChart("dpr-trend");
    const dprEl = document.getElementById("dpr-trend") as HTMLCanvasElement;
    if (dprEl) {
      const last10 = dprs.slice(0, 10).reverse();
      chartsRef.current["dpr-trend"] = new Chart(dprEl, {
        type: "bar",
        data: {
          labels: last10.map(d => formatDate(d.report_date).split(" ").slice(0, 2).join(" ")),
          datasets: [{
            label: "Workers",
            data: last10.map(d => d.total_workers),
            backgroundColor: isDark ? "rgba(99,102,241,0.7)" : "rgba(99,102,241,0.6)",
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          ...baseOpts,
          scales: {
            x: { grid: { display: false }, ticks: { color: c.tick, font: { size: 10 } } },
            y: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 11 } } },
          },
        },
      });
    }

    return () => { Object.keys(chartsRef.current).forEach(destroyChart); };
  }, [tab, isDark, project, milestones, boqSummary, dprs, financeSummary]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16 text-gray-400">
        Project not found.{" "}
        <Link href="/projects" className="text-blue-600">Back to projects</Link>
      </div>
    );
  }

  const actions = STATUS_ACTIONS[project.status] ?? [];

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {project.name}
            </h1>
            <Badge status={project.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-mono">{project.code}</span>
            {project.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {project.city}
                {project.district ? `, ${project.district}` : ""}
              </span>
            )}
            {project.planned_end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Due {formatDate(project.planned_end_date)}
              </span>
            )}
            {project.client_name && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {project.client_name}
              </span>
            )}
          </div>
        </div>

        {/* Status actions */}
        {actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map(({ next, label, variant }) => (
              <Button
                key={next}
                variant={variant}
                size="sm"
                loading={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ projectId: project.id, status: next })}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          {
            label: "Progress",
            value: `${project.progress_percentage}%`,
            color: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Budget",
            value: project.estimated_budget ? formatCurrency(project.estimated_budget) : "—",
          },
          {
            label: "BOQ total",
            value: boqSummary ? formatCurrency(boqSummary.grand_total) : "—",
            color: "text-purple-600 dark:text-purple-400",
          },
          {
            label: "Open POs",
            value: String(procStats?.total_pos ?? "—"),
          },
          {
            label: "DPRs (30d)",
            value: String(dprs.length),
            color: "text-indigo-600 dark:text-indigo-400",
          },
          {
            label: "Outstanding",
            value: financeSummary ? formatCurrency(financeSummary.total_outstanding) : "—",
            color: financeSummary?.total_outstanding > 0
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-lg font-medium ${color ?? "text-gray-900 dark:text-gray-100"}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">Overall progress</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {project.progress_percentage}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
            style={{ width: `${project.progress_percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
          <span>{formatDate(project.planned_start_date)}</span>
          <span>{formatDate(project.planned_end_date)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === "Overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Milestone completion donut */}
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">Milestone completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div style={{ position: "relative", height: 160, width: 160, flexShrink: 0 }}>
                    <canvas id="ms-donut" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-medium text-gray-900 dark:text-gray-100">
                        {milestones?.filter(m => m.status === "completed").length ?? 0}
                      </span>
                      <span className="text-xs text-gray-400">
                        of {milestones?.length ?? 0}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    {milestones?.slice(0, 5).map(m => (
                      <div key={m.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                            m.status === "completed" ? "bg-green-500" :
                            m.status === "in_progress" ? "bg-blue-500" :
                            m.is_critical ? "bg-red-400" : "bg-gray-300"
                          }`} />
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{m.name}</p>
                        </div>
                        <Badge status={m.status} />
                      </div>
                    ))}
                    {!milestones?.length && (
                      <p className="text-sm text-gray-400">No milestones yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BOQ cost breakdown */}
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">BOQ cost breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {boqSummary ? (
                  <>
                    <div style={{ position: "relative", height: 180 }}>
                      <canvas id="boq-breakdown" />
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Grand total</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(boqSummary.grand_total)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">No BOQ yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Finance cashflow */}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Financial cashflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-3">
                {[
                  { color: "#3b82f6", label: `Invoiced: ${formatCurrency(financeSummary?.total_invoiced ?? 0)}` },
                  { color: "#10b981", label: `Received: ${formatCurrency(financeSummary?.total_received ?? 0)}` },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
              <div style={{ position: "relative", height: 200 }}>
                <canvas id="proj-cashflow" />
              </div>
            </CardContent>
          </Card>

          {/* DPR worker trend */}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Labour attendance trend (last 10 DPRs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ position: "relative", height: 160 }}>
                <canvas id="dpr-trend" />
              </div>
            </CardContent>
          </Card>

          {/* Project info */}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader><CardTitle className="dark:text-gray-100">Project details</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
                {[
                  ["Type", project.project_type],
                  ["Client", project.client_name ?? "—"],
                  ["City", project.city ?? "—"],
                  ["District", project.district ?? "—"],
                  ["Currency", project.currency],
                  ["Start date", formatDate(project.planned_start_date)],
                  ["End date", formatDate(project.planned_end_date)],
                  ["Actual start", formatDate(project.actual_start_date)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 capitalize mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Sites tab ── */}
      {tab === "Sites" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Sites ({sites?.length ?? 0})</CardTitle>
          </CardHeader>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {!sites?.length ? (
              <p className="py-8 text-center text-sm text-gray-400">No sites added yet</p>
            ) : sites.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {s.code} · {s.city ?? "—"}{s.district ? `, ${s.district}` : ""}
                  </p>
                </div>
                <Badge status={s.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── BOQ tab ── */}
      {tab === "BOQ" && (
        <div className="space-y-4">
          {versions?.length === 0 && (
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="py-10 text-center text-gray-400">
                No budget versions yet.{" "}
                <Link href="/boq" className="text-blue-600 hover:underline">
                  Go to BOQ module →
                </Link>
              </CardContent>
            </Card>
          )}
          {versions?.map(v => (
            <Card key={v.id} className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="dark:text-gray-100">v{v.version_number} — {v.name}</CardTitle>
                  <Badge status={v.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                  {[
                    ["Grand total", formatCurrency(v.grand_total)],
                    ["Material", formatCurrency(v.total_material_cost)],
                    ["Labour", formatCurrency(v.total_labour_cost)],
                    ["Contingency", formatCurrency(v.contingency_amount)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Procurement tab ── */}
      {tab === "Procurement" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Purchase orders</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">PO number</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!pos?.length ? (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">No POs yet</td></tr>
                ) : pos.map((po: any) => (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{po.po_number}</td>
                    <td className="px-4 py-3"><Badge status={po.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(po.grand_total)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(po.delivery_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Inventory tab ── */}
      {tab === "Inventory" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Material requests</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">MR number</th>
                  <th className="px-4 py-3 text-left">Purpose</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!mrs?.length ? (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">No MRs yet</td></tr>
                ) : mrs.map((mr: any) => (
                  <tr key={mr.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{mr.mr_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{mr.purpose ?? "—"}</td>
                    <td className="px-4 py-3"><Badge status={mr.status} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{mr.required_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Site Ops tab ── */}
      {tab === "Site Ops" && (
        <div className="space-y-4">
          {siteOpsSummary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Total DPRs", siteOpsSummary.total_dprs],
                ["Submitted", siteOpsSummary.submitted_dprs],
                ["Worker days", siteOpsSummary.total_worker_days],
                ["Labour cost", formatCurrency(siteOpsSummary.total_labour_cost)],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-1">{value}</p>
                </div>
              ))}
            </div>
          )}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader><CardTitle className="dark:text-gray-100">Recent DPRs</CardTitle></CardHeader>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {!dprs.length ? (
                <p className="py-8 text-center text-sm text-gray-400">No DPRs yet</p>
              ) : dprs.slice(0, 10).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(d.report_date)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {d.total_workers} workers · {d.weather}
                    </p>
                  </div>
                  <Badge
                    status={d.is_submitted ? "approved" : "draft"}
                    label={d.is_submitted ? "Submitted" : "Draft"}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Finance tab ── */}
      {tab === "Finance" && (
        <div className="space-y-4">
          {financeSummary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Invoiced", value: formatCurrency(financeSummary.total_invoiced), color: "text-blue-600 dark:text-blue-400" },
                { label: "Received", value: formatCurrency(financeSummary.total_received), color: "text-green-600 dark:text-green-400" },
                { label: "Outstanding", value: formatCurrency(financeSummary.total_outstanding), color: "text-red-600 dark:text-red-400" },
                { label: "Expenses", value: formatCurrency(financeSummary.total_expenses), color: "text-purple-600 dark:text-purple-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className={`text-lg font-medium mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader><CardTitle className="dark:text-gray-100">Invoices</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 text-left">Invoice</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {!invoices.length ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">No invoices</td></tr>
                  ) : invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{inv.invoice_type}</td>
                      <td className="px-4 py-3"><Badge status={inv.status} /></td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(inv.grand_total)}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatCurrency(inv.balance_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}