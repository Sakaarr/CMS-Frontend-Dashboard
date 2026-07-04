"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useProject, useUpdateProjectStatus,
  useSites, useMilestones,
  useCreateSite, useCreateMilestone, useUpdateMilestone,
  useProjectMembers, useAddProjectMember, useRemoveProjectMember,
} from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { useBudgetVersions, useBOQSummary, useBOQItems } from "@/hooks/useBoq";
import { usePurchaseOrders, useProcurementStats } from "@/hooks/useProcurement";
import { useDPRs, useSiteOpsSummary } from "@/hooks/useSiteOps";
import { useFinanceSummary, useInvoices } from "@/hooks/useFinance";
import { useMaterialRequests } from "@/hooks/useInventory";
import {
  useProjectSubcontractors, useSubcontractors,
  useCreateContract, useAssignBOQItems, useContractBOQItems,
  useDeleteContract,
} from "@/hooks/useSubcontractors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useThemeStore } from "@/store/theme.store";
import { useHasPermission } from "@/hooks/usePermissions";
import {
  ArrowLeft, MapPin, Calendar, User,
  TrendingUp, CheckCircle, Loader2, Users, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import Chart from "chart.js/auto";
import { Input } from "@/components/ui/input";
import { CommentSection } from "@/components/comments/CommentSection";
import { useAuthStore } from "@/store/auth.store";
import {
  useProgressList, useProgressDashboard, useCreateProgress,
  useSubmitProgress, useApproveProgress, useDeleteProgress,
} from "@/hooks/useProgress";
import {
  useCertificate, useCertificateList, useCreateCertificate,
  useSubmitCertificate, useApproveCertificate,
  useDeleteCertificate, useMarkPaid,
} from "@/hooks/useProgress";
import { extractApiError } from "@/lib/api";
import {
  useComplianceDocList, useCreateComplianceDoc,
  useDeleteComplianceDoc, useVerifyComplianceDoc,
  useExpiringDocs, useRefreshExpiryStatus,
} from "@/hooks/useCompliance";

// ── Tab definitions ───────────────────────────────────────────────
const TABS = [
  "Overview", "Sites", "Milestones", "BOQ",
  "Subcontractors", "Progress", "Certificates",
  "Compliance",
  "Procurement", "Inventory", "Site Ops", "Finance", "Members", "Comments",
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
        <SitesTab projectId={project.id} />
      )}

      {tab === "Milestones" && (
        <MilestonesTab projectId={project.id} />
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

      {/* ── Subcontractors tab ── */}
      {tab === "Subcontractors" && <SubcontractorsTab projectId={projectId} />}

      {/* ── Progress tab ── */}
      {tab === "Progress" && <ProgressTab projectId={projectId} />}

      {/* ── Certificates tab ── */}
      {tab === "Certificates" && <CertificatesTab projectId={projectId} />}

      {/* ── Compliance tab ── */}
      {tab === "Compliance" && <ComplianceTab projectId={projectId} />}

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

      {/* ── Members tab ── */}
      {tab === "Members" && (
        <MembersTab projectId={project.id} />
      )}

      {/* ── Comments tab ── */}
      {tab === "Comments" && (
        <CommentSection targetType="project" targetId={projectId} title="Project Comments" />
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
  // ── Sites sub-component ────────────────────────────────────────────
function SitesTab({ projectId }: { projectId: string }) {
  const { data: sites, isLoading } = useSites(projectId);
  const createSite = useCreateSite(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (d: any) => {
    setError("");
    try {
      await createSite.mutateAsync({
        name: d.name,
        code: d.code,
        description: d.description || undefined,
        city: d.city || undefined,
        district: d.district || undefined,
      });
      reset();
      setShowCreate(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to create site");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Sites ({sites?.length ?? 0})
        </h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add site
        </Button>
      </div>

      {showCreate && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="pt-5">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              New site
            </h4>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-2 gap-4"
            >
              <Input
                label="Site name"
                placeholder="Main Site"
                error={errors.name?.message as string}
                {...register("name", { required: "Required" })}
              />
              <Input
                label="Site code"
                placeholder="SITE-001"
                error={errors.code?.message as string}
                {...register("code", { required: "Required" })}
              />
              <Input label="City" placeholder="Kathmandu" {...register("city")} />
              <Input label="District" placeholder="Kathmandu" {...register("district")} />
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Description
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-16 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("description")}
                />
              </div>
              {error && (
                <p className="col-span-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={() => { setShowCreate(false); reset(); setError(""); }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={createSite.isPending}>
                  Create site
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        {isLoading ? (
          <CardContent className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </CardContent>
        ) : !sites?.length ? (
          <CardContent className="py-10 text-center text-gray-400">
            No sites yet — add the first site
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {sites.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {s.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {s.code}
                    {s.city ? ` · ${s.city}` : ""}
                    {s.district ? `, ${s.district}` : ""}
                  </p>
                </div>
                <Badge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Milestones sub-component ──────────────────────────────────────
function MilestonesTab({ projectId }: { projectId: string }) {
  const { data: milestones, isLoading } = useMilestones(projectId);
  const { data: sites } = useSites(projectId);
  const createMilestone = useCreateMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset } = useForm();

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    delayed: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-400",
  };

  const onSubmit = async (d: any) => {
    setError("");
    try {
      await createMilestone.mutateAsync({
        name: d.name,
        description: d.description || undefined,
        site_id: d.site_id || undefined,
        planned_date: d.planned_date || undefined,
        sequence: parseInt(d.sequence) || 0,
        is_critical: d.is_critical === "true",
        weight: d.weight ? parseFloat(d.weight) : undefined,
      });
      reset();
      setShowCreate(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to create milestone");
    }
  };

  const cycleStatus = async (milestone: any) => {
    const next: Record<string, string> = {
      pending: "in_progress",
      in_progress: "completed",
      completed: "completed",
      delayed: "in_progress",
    };
    const completion: Record<string, number> = {
      pending: 0,
      in_progress: 50,
      completed: 100,
    };
    const newStatus = next[milestone.status] ?? "in_progress";
    await updateMilestone.mutateAsync({
      milestoneId: milestone.id,
      data: {
        status: newStatus,
        completion_percentage: completion[newStatus] ?? 50,
        actual_date:
          newStatus === "completed"
            ? new Date().toISOString().split("T")[0]
            : undefined,
      },
    });
  };

  const completedCount =
    milestones?.filter((m: any) => m.status === "completed").length ?? 0;
  const total = milestones?.length ?? 0;

  const totalWeight = milestones?.reduce((sum: number, m: any) => sum + (m.weight ?? 0), 0) ?? 0;
  const hasWeight = milestones?.some((m: any) => m.weight != null) ?? false;
  const weightWarning = hasWeight && Math.abs(totalWeight - 100) > 0.01;

  const siteMap = new Map(sites?.map((s: any) => [s.id, s.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Milestones ({completedCount}/{total} completed)
        </h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add milestone
        </Button>
      </div>

      {weightWarning && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Weight warning:</strong> Total milestone weight is {totalWeight}%. It should sum to 100%.
        </div>
      )}

      {showCreate && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="pt-5">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              New milestone
            </h4>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-2 gap-4"
            >
              <Input
                label="Milestone name"
                placeholder="Foundation complete"
                {...register("name", { required: "Required" })}
              />
              <Input label="Planned date" type="date" {...register("planned_date")} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Site
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                  {...register("site_id")}
                >
                  <option value="">None</option>
                  {sites?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Sequence order
                </label>
                <input
                  type="number"
                  defaultValue={1}
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("sequence")}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Critical milestone?
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                  {...register("is_critical")}
                >
                  <option value="false">No</option>
                  <option value="true">Yes — critical path</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Weight (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 15"
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("weight")}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Description
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-16 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("description")}
                />
              </div>
              {error && (
                <p className="col-span-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={() => { setShowCreate(false); reset(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={createMilestone.isPending}>
                  Create milestone
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        {isLoading ? (
          <CardContent className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </CardContent>
        ) : !milestones?.length ? (
          <CardContent className="py-10 text-center text-gray-400">
            No milestones yet
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Milestone</th>
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Progress</th>
                  <th className="px-4 py-3 text-left">Planned date</th>
                  <th className="px-4 py-3 text-left">Actual date</th>
                  <th className="px-4 py-3 text-right">Weight</th>
                  <th className="px-4 py-3 text-left">Critical</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {milestones.map((m: any) => (
                  <tr
                    key={m.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${
                      m.is_critical ? "bg-red-50/30 dark:bg-red-900/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.sequence}</td>
                    <td className="px-4 py-3 max-w-48">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate" title={m.name}>
                        {m.name}
                      </p>
                      {m.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5" title={m.description}>
                          {m.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {m.site_id ? (siteMap.get(m.site_id) ?? "\u2014") : "\u2014"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          STATUS_COLORS[m.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {m.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${m.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">
                          {m.completion_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(m.planned_date)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(m.actual_date)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={`text-sm font-semibold ${m.weight != null ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>
                        {m.weight != null ? `${m.weight}%` : "\u2014"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.is_critical && (
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          ⚡ Critical
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {m.status !== "completed" && m.status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cycleStatus(m)}
                          loading={updateMilestone.isPending}
                        >
                          {m.status === "pending"
                            ? "Start"
                            : m.status === "in_progress"
                            ? "Complete"
                            : "Resume"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Members sub-component ────────────────────────────────────────
function MembersTab({ projectId }: { projectId: string }) {
  const { data: members, isLoading } = useProjectMembers(projectId);
  const { data: users } = useUsers();
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);
  const currentUser = useAuthStore((s) => s.user);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("viewer");
  const [addError, setAddError] = useState("");

  const currentMember = members?.find((m: any) => m.user_id === currentUser?.id);
  const canManage = currentMember?.role === "project_manager" || currentMember?.role === "company_admin";

  const memberUserIds = new Set(members?.map((m: any) => m.user_id) ?? []);
  const availableUsers = users?.filter((u: any) => !memberUserIds.has(u.id)) ?? [];
  const userMap = new Map(users?.map((u: any) => [u.id, u]) ?? []);

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    const user = userMap.get(userId);
    if (user?.role) setSelectedRole(user.role);
  };

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setAddError("");
    try {
      await addMember.mutateAsync({ user_id: selectedUserId, role: selectedRole });
      setSelectedUserId("");
      setSelectedRole("viewer");
      setShowAdd(false);
    } catch (e: any) {
      setAddError(e?.response?.data?.message || "Failed to add member");
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
    } catch (e: any) {
      setAddError(e?.response?.data?.message || "Failed to remove member");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Members ({members?.length ?? 0})
        </h3>
        {canManage && (
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Add member
          </Button>
        )}
      </div>

      {showAdd && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="pt-5">
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">User</label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
                  value={selectedUserId}
                  onChange={(e) => handleUserChange(e.target.value)}
                >
                  <option value="">Select user...</option>
                  {availableUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Role</label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="project_manager">Project Manager</option>
                  <option value="site_engineer">Site Engineer</option>
                  <option value="finance">Finance</option>
                  <option value="procurement">Procurement</option>
                  <option value="qa_officer">QA Officer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <Button size="sm" onClick={handleAdd} loading={addMember.isPending}>Add</Button>
            </div>
            {addError && <p className="text-sm text-red-600 mt-2">{addError}</p>}
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        {isLoading ? (
          <CardContent className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </CardContent>
        ) : !members?.length ? (
          <CardContent className="py-10 text-center text-gray-400">No members yet</CardContent>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{m.user_name ?? m.user_id}</td>
                  <td className="px-4 py-3 text-gray-500">{m.user_email ?? "\u2014"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {m.role?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <Button variant="outline" size="sm" onClick={() => handleRemove(m.id)} loading={removeMember.isPending}>
                        Remove
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function SubcontractorsTab({ projectId }: { projectId: string }) {
  const [showCreateContract, setShowCreateContract] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [assignBoqContractId, setAssignBoqContractId] = useState<string | null>(null);
  const [boqItemIds, setBoqItemIds] = useState<string[]>([]);
  const [contractError, setContractError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null);
  const canManageSubcontractors = useHasPermission("can_subcontractors");

  const { data: subsData } = useSubcontractors();
  const { data: projectSubs, refetch: refetchSubs } = useProjectSubcontractors(projectId);
  const { data: boqItems } = useContractBOQItems(assignBoqContractId ?? "");
  const createContract = useCreateContract();
  const assignBOQ = useAssignBOQItems();
  const deleteContract = useDeleteContract();
  const { data: versions } = useBudgetVersions(projectId);
  const approvedVersion = versions?.find(v => v.status === "approved") ?? versions?.[0];
  const { data: boqItemsAll } = useBOQItems(approvedVersion?.id ?? "");

  const contractForm = useForm();

  const subs = subsData?.data ?? [];
  const projectContracts = projectSubs?.data ?? [];

  const onCreateContract = async (formData: any) => {
    try {
      setContractError(null);
      await createContract.mutateAsync({
        projectId,
        data: {
          subcontractor_id: formData.subcontractor_id,
          contract_number: formData.contract_number || undefined,
          title: formData.title,
          scope_of_work: formData.scope_of_work,
          contract_value: Number(formData.contract_value) || 0,
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          retention_percentage: Number(formData.retention_percentage) || 0,
        },
      });
      contractForm.reset();
      setShowCreateContract(false);
      refetchSubs();
    } catch (err) {
      setContractError(extractApiError(err));
    }
  };

  const handleAssignBOQ = async () => {
    if (!assignBoqContractId || boqItemIds.length === 0) return;
    try {
      setAssignError(null);
      const items = boqItemIds.map(id => {
        const item = (boqItemsAll ?? []).find((b: any) => b.id === id);
        return {
          boq_item_id: id,
          assigned_quantity: item?.quantity ?? 0,
          unit_rate: item?.unit_rate ?? 0,
          contract_amount: (item?.quantity ?? 0) * (item?.unit_rate ?? 0),
        };
      });
      await assignBOQ.mutateAsync({ contractId: assignBoqContractId, data: { items } });
      setAssignBoqContractId(null);
      setBoqItemIds([]);
    } catch (err) {
      setAssignError(extractApiError(err));
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    try {
      setContractError(null);
      await deleteContract.mutateAsync(contractId);
      setDeleteContractId(null);
      refetchSubs();
    } catch (err) {
      setContractError(extractApiError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Subcontractors on this project
        </h3>
        {canManageSubcontractors && (
          <Button size="sm" onClick={() => setShowCreateContract(!showCreateContract)}>
            <Plus className="h-4 w-4 mr-1" />
            Assign subcontractor
          </Button>
        )}
      </div>

      {showCreateContract && (
        <Card>
          <CardHeader><CardTitle>New Contract</CardTitle></CardHeader>
          <CardContent>
            {contractError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {contractError}
              </div>
            )}
            <form onSubmit={contractForm.handleSubmit(onCreateContract)} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Subcontractor *
                </label>
                <select
                  {...contractForm.register("subcontractor_id", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select...</option>
                  {subs.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <Input label="Contract Number (optional)" {...contractForm.register("contract_number")} />
              <Input label="Title *" {...contractForm.register("title", { required: true })} />
              <Input label="Contract Value" type="number" {...contractForm.register("contract_value")} />
              <Input label="Retention %" type="number" step="0.1" {...contractForm.register("retention_percentage")} />
              <Input label="Start Date" type="date" {...contractForm.register("start_date")} />
              <Input label="End Date" type="date" {...contractForm.register("end_date")} />
              <div className="col-span-2">
                <Input label="Scope of Work" {...contractForm.register("scope_of_work")} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateContract(false)}>Cancel</Button>
                <Button type="submit" loading={createContract.isPending}>Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {projectContracts.length === 0 && !showCreateContract && (
        <Card>
          <CardContent className="py-10 text-center text-gray-400">
            <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            No subcontractors assigned yet
          </CardContent>
        </Card>
      )}

      {projectContracts.map((pc: any) => (
        <Card key={pc.contract_id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{pc.subcontractor_name}</CardTitle>
                <p className="text-xs text-gray-400">{pc.contract_number} · {pc.contract_title}</p>
              </div>
              <Badge status={pc.contract_status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm mb-4">
              <div>
                <p className="text-xs text-gray-500">Value</p>
                <p className="font-medium">{formatCurrency(pc.contract_value, pc.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Retention</p>
                <p className="font-medium">{pc.retention_percentage}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">BOQ items</p>
                <p className="font-medium">{pc.boq_items_count}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">BOQ amount</p>
                <p className="font-medium">{formatCurrency(pc.boq_items_total_amount)}</p>
              </div>
            </div>
            {pc.scope_of_work && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{pc.scope_of_work}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedContractId(selectedContractId === pc.contract_id ? null : pc.contract_id)}
              >
                View BOQ items
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignBoqContractId(assignBoqContractId === pc.contract_id ? null : pc.contract_id)}
              >
                Assign BOQ items
              </Button>
              {deleteContractId === pc.contract_id ? (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="danger" onClick={() => handleDeleteContract(pc.contract_id)}>
                    Confirm delete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteContractId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => setDeleteContractId(pc.contract_id)}
                >
                  Delete
                </Button>
              )}
            </div>

            {selectedContractId === pc.contract_id && (
              <div className="mt-4">
                <SubcontractorBOQItems contractId={pc.contract_id} />
              </div>
            )}

            {assignBoqContractId === pc.contract_id && boqItemsAll && (
              <div className="mt-4 border-t pt-4">
                {assignError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 mb-4">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {assignError}
                  </div>
                )}
                <p className="text-sm font-medium mb-2">Select BOQ items to assign</p>
                <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                  {boqItemsAll.filter((b: any) => !b.is_section_header).map((item: any) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        value={item.id}
                        checked={boqItemIds.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBoqItemIds([...boqItemIds, item.id]);
                          } else {
                            setBoqItemIds(boqItemIds.filter(id => id !== item.id));
                          }
                        }}
                      />
                      <span>{item.item_number} — {item.description}</span>
                      <span className="text-gray-400 ml-auto">{item.quantity} {item.unit}</span>
                    </label>
                  ))}
                </div>
                <Button size="sm" onClick={handleAssignBOQ} loading={assignBOQ.isPending}>
                  Assign selected ({boqItemIds.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SubcontractorBOQItems({ contractId }: { contractId: string }) {
  const { data, isLoading } = useContractBOQItems(contractId);

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;

  const items = data?.data ?? [];

  if (items.length === 0) {
    return <p className="text-sm text-gray-400">No BOQ items assigned</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-xs text-gray-500">
          <th className="text-left py-1 pr-2">Item</th>
          <th className="text-left py-1 pr-2">Description</th>
          <th className="text-right py-1 pr-2">Qty</th>
          <th className="text-right py-1 pr-2">Rate</th>
          <th className="text-right py-1 pr-2">Amount</th>
          <th className="text-left py-1">Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any) => (
          <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
            <td className="py-1.5 pr-2 font-mono text-xs">{item.item_number}</td>
            <td className="py-1.5 pr-2 text-gray-600 dark:text-gray-300">{item.description}</td>
            <td className="py-1.5 pr-2 text-right">{item.assigned_quantity}</td>
            <td className="py-1.5 pr-2 text-right">{formatCurrency(item.unit_rate)}</td>
            <td className="py-1.5 pr-2 text-right font-medium">{formatCurrency(item.contract_amount)}</td>
            <td className="py-1.5"><Badge status={item.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


// ── Progress Tab ─────────────────────────────────────────────────

function ProgressTab({ projectId }: { projectId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string>("");

  const { data: subsData } = useProjectSubcontractors(projectId);
  const { data: progressData, isLoading } = useProgressList(projectId);
  const { data: dashboard } = useProgressDashboard(projectId);
  const { data: boqItems } = useContractBOQItems(selectedContractId);

  const createProgress = useCreateProgress(projectId);
  const submitProgress = useSubmitProgress(projectId);
  const approveProgress = useApproveProgress(projectId);
  const deleteProgress = useDeleteProgress(projectId);

  const progressEntries = progressData?.data ?? [];
  const contracts = subsData?.data ?? [];
  const assignedBOQItems = boqItems?.data ?? [];

  const onCreate = async (formData: any) => {
    try {
      setError(null);
      await createProgress.mutateAsync({
        contract_id: formData.contract_id,
        boq_item_id: formData.boq_item_id,
        work_date: formData.work_date,
        quantity_completed: Number(formData.quantity_completed),
        remarks: formData.remarks || undefined,
      });
      setShowCreate(false);
      setSelectedContractId("");
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const progressForm = useForm();

  return (
    <div className="space-y-4">
      {dashboard && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total Entries</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{dashboard.total_progress_entries}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Approval</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{dashboard.pending_approval_entries}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Completion Rate</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{dashboard.contracts.length > 0 ? Math.round(dashboard.contracts.reduce((s: number, c: any) => s + c.completion_percentage, 0) / dashboard.contracts.length) : 0}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Payment</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(dashboard.total_pending_payment)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Progress Entries
        </h3>
        <Button size="sm" onClick={() => { setShowCreate(!showCreate); progressForm.reset(); setSelectedContractId(""); }}>
          <Plus className="h-4 w-4 mr-1" />
          Record progress
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Progress Entry</CardTitle></CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={progressForm.handleSubmit(onCreate)} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Contract *</label>
                <select
                  {...progressForm.register("contract_id", { required: true })}
                  onChange={(e) => {
                    progressForm.setValue("contract_id", e.target.value);
                    progressForm.setValue("boq_item_id", "");
                    setSelectedContractId(e.target.value);
                  }}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {contracts.map((c: any) => (
                    <option key={c.contract_id} value={c.contract_id}>
                      {c.subcontractor_name} - {c.contract_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">BOQ Item *</label>
                <select
                  {...progressForm.register("boq_item_id", { required: true })}
                  disabled={!selectedContractId}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">{selectedContractId ? "Select BOQ item..." : "Select a contract first"}</option>
                  {assignedBOQItems.map((item: any) => (
                    <option key={item.boq_item_id} value={item.boq_item_id}>
                      {item.item_number} — {item.description} ({item.assigned_quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Work Date *</label>
                <input type="date" {...progressForm.register("work_date", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Qty Completed *</label>
                <input type="number" step="0.01" {...progressForm.register("quantity_completed", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Remarks</label>
                <input {...progressForm.register("remarks")}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={createProgress.isPending}>Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></CardContent></Card>
      ) : progressEntries.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-400">No progress entries yet</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Work Date</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Cumulative</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Remarks</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {progressEntries.map((e: any) => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(e.report_date)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(e.work_date)}</td>
                  <td className="px-4 py-3 text-right font-medium">{e.quantity_completed}</td>
                  <td className="px-4 py-3 text-right">{e.cumulative_quantity}</td>
                  <td className="px-4 py-3"><Badge status={e.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{e.remarks || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {e.status === "draft" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => submitProgress.mutate(e.id)}>Submit</Button>
                          <Button size="sm" variant="danger" onClick={() => deleteProgress.mutate(e.id)}>Delete</Button>
                        </>
                      )}
                      {e.status === "submitted" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="success" onClick={() => approveProgress.mutate({ entryId: e.id })}>Approve</Button>
                          <Button size="sm" variant="outline" className="text-red-500" onClick={() => {
                            const reason = prompt("Rejection reason:");
                            if (reason) approveProgress.mutate({ entryId: e.id, rejection_reason: reason });
                          }}>Reject</Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ── Certificates Tab ─────────────────────────────────────────────

function CertificatesTab({ projectId }: { projectId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterContract, setFilterContract] = useState<string>("");

  const { data: subsData } = useProjectSubcontractors(projectId);
  const { data: certData, isLoading } = useCertificateList(projectId, { contract_id: filterContract || undefined });
  const { data: singleCert } = useCertificate(selectedCertId ?? "");
  const createCert = useCreateCertificate(projectId);
  const submitCert = useSubmitCertificate(projectId);
  const approveCert = useApproveCertificate(projectId);
  const markPaid = useMarkPaid(projectId);
  const deleteCert = useDeleteCertificate(projectId);

  const certs = certData?.data ?? [];
  const contracts = subsData?.data ?? [];

  const certForm = useForm();

  const onCreate = async (formData: any) => {
    try {
      setError(null);
      await createCert.mutateAsync({
        contract_id: formData.contract_id,
        period_start: formData.period_start,
        period_end: formData.period_end,
        deductions: Number(formData.deductions) || 0,
        is_final: formData.is_final === "true",
        remarks: formData.remarks || undefined,
      });
      setShowCreate(false);
      certForm.reset();
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Payment Certificates (IPC)
        </h3>
        <div className="flex gap-2">
          <select
            value={filterContract}
            onChange={(e) => setFilterContract(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="">All contracts</option>
            {contracts.map((c: any) => (
              <option key={c.contract_id} value={c.contract_id}>{c.subcontractor_name}</option>
            ))}
          </select>
          <Button size="sm" onClick={() => { setShowCreate(!showCreate); certForm.reset(); }}>
            <Plus className="h-4 w-4 mr-1" />
            Generate certificate
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Generate Payment Certificate</CardTitle></CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={certForm.handleSubmit(onCreate)} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Contract *</label>
                <select {...certForm.register("contract_id", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {contracts.map((c: any) => (
                    <option key={c.contract_id} value={c.contract_id}>{c.subcontractor_name} - {c.contract_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Period Start *</label>
                <input type="date" {...certForm.register("period_start", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Period End *</label>
                <input type="date" {...certForm.register("period_end", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Deductions</label>
                <input type="number" step="0.01" {...certForm.register("deductions")}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Final Certificate?</label>
                <select {...certForm.register("is_final")}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Remarks</label>
                <input {...certForm.register("remarks")}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={createCert.isPending}>Generate</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></CardContent></Card>
      ) : certs.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-400">No certificates yet</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {certs.map((cert: any) => (
            <Card key={cert.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{cert.certificate_number}</CardTitle>
                    <p className="text-xs text-gray-400">
                      {formatDate(cert.period_start)} — {formatDate(cert.period_end)}
                      {cert.is_final ? " (Final)" : ""}
                      {cert.revision_number > 1 ? ` · Rev ${cert.revision_number}` : ""}
                    </p>
                  </div>
                  <Badge status={cert.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Current Work Value</p>
                    <p className="font-medium">{formatCurrency(cert.current_completed_value)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Retention ({cert.retention_percentage}%)</p>
                    <p className="font-medium text-amber-600">{formatCurrency(cert.retention_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Net Payable</p>
                    <p className="font-medium text-green-600">{formatCurrency(cert.net_payable)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount Due</p>
                    <p className="font-medium">{formatCurrency(cert.amount_due)}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setSelectedCertId(selectedCertId === cert.id ? null : cert.id)}>
                    {selectedCertId === cert.id ? "Hide items" : "View items"}
                  </Button>
                  {cert.status === "draft" && (
                    <>
                      <Button size="sm" onClick={() => submitCert.mutate(cert.id)}>Submit</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteCert.mutate(cert.id)}>Delete</Button>
                    </>
                  )}
                  {cert.status === "submitted" && (
                    <Button size="sm" variant="success" onClick={() => approveCert.mutate(cert.id)}>Approve</Button>
                  )}
                  {cert.status === "approved" && (
                    <Button size="sm" onClick={() => markPaid.mutate(cert.id)}>Mark Paid</Button>
                  )}
                </div>

                {selectedCertId === cert.id && singleCert?.id === cert.id && (
                  <div className="mt-4 border-t pt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-gray-500">
                          <th className="text-left py-1 pr-2">Description</th>
                          <th className="text-right py-1 pr-2">Prev Certified</th>
                          <th className="text-right py-1 pr-2">Current</th>
                          <th className="text-right py-1 pr-2">Total Certified</th>
                          <th className="text-right py-1 pr-2">Amount</th>
                          <th className="text-right py-1 pr-2">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {singleCert?.items?.map((item: any) => (
                          <tr key={item.id} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="py-1.5 pr-2 text-gray-600 dark:text-gray-300">{item.description}</td>
                            <td className="py-1.5 pr-2 text-right">{item.previous_certified_qty} ({formatCurrency(item.previous_certified_amount)})</td>
                            <td className="py-1.5 pr-2 text-right">{item.current_qty}</td>
                            <td className="py-1.5 pr-2 text-right">{item.total_certified_qty}</td>
                            <td className="py-1.5 pr-2 text-right font-medium">{formatCurrency(item.total_certified_amount)}</td>
                            <td className="py-1.5 pr-2 text-right">{item.remaining_qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Compliance sub-component ──────────────────────────────────────
function ComplianceTab({ projectId }: { projectId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const { register, handleSubmit, reset } = useForm();

  const { data: docsData, isLoading } = useComplianceDocList(projectId, {
    category: categoryFilter || undefined,
  });
  const { data: expiringDocs } = useExpiringDocs(projectId, 30);
  const createDoc = useCreateComplianceDoc(projectId);
  const deleteDoc = useDeleteComplianceDoc(projectId);
  const verifyDoc = useVerifyComplianceDoc(projectId);
  const refreshExpiry = useRefreshExpiryStatus(projectId);

  const docs = docsData?.data ?? [];

  const onSubmit = async (d: any) => {
    setError(null);
    try {
      await createDoc.mutateAsync({
        subcontractor_id: d.subcontractor_id,
        title: d.title,
        category: d.category,
        issuing_authority: d.issuing_authority || undefined,
        reference_number: d.reference_number || undefined,
        issued_date: d.issued_date || undefined,
        expiry_date: d.expiry_date || undefined,
        renewable: d.renewable === "true",
        reminder_days_before: Number(d.reminder_days_before) || 30,
        description: d.description || undefined,
        file_name: d.file_name || undefined,
        notes: d.notes || undefined,
      });
      reset();
      setShowCreate(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to create compliance document");
    }
  };

  const { data: projectSubs } = useProjectSubcontractors(projectId);
  const subs = projectSubs?.data ?? [];

  return (
    <div className="space-y-4">
      {expiringDocs && expiringDocs.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {expiringDocs.length} document{expiringDocs.length > 1 ? "s" : ""} expiring within 30 days
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => refreshExpiry.mutate()}>
              Refresh status
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Compliance documents
        </h3>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs"
          >
            <option value="">All categories</option>
            <option value="license">License</option>
            <option value="tax_certificate">Tax Certificate</option>
            <option value="insurance">Insurance</option>
            <option value="safety_cert">Safety Cert</option>
            <option value="quality_cert">Quality Cert</option>
            <option value="registration">Registration</option>
            <option value="other">Other</option>
          </select>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add document
          </Button>
        </div>
      </div>

      {showCreate && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="pt-5">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              New compliance document
            </h4>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Subcontractor *
                </label>
                <select
                  {...register("subcontractor_id", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {subs.map((s: any) => (
                    <option key={s.subcontractor_id} value={s.subcontractor_id}>
                      {s.subcontractor_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Category *
                </label>
                <select
                  {...register("category", { required: true })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  <option value="license">License</option>
                  <option value="tax_certificate">Tax Certificate</option>
                  <option value="insurance">Insurance</option>
                  <option value="safety_cert">Safety Cert</option>
                  <option value="quality_cert">Quality Cert</option>
                  <option value="registration">Registration</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input label="Title *" {...register("title", { required: true })} />
              <Input label="Issuing Authority" {...register("issuing_authority")} />
              <Input label="Reference Number" {...register("reference_number")} />
              <Input label="Issued Date" type="date" {...register("issued_date")} />
              <Input label="Expiry Date" type="date" {...register("expiry_date")} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Renewable
                </label>
                <select
                  {...register("renewable")}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  defaultValue="true"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <Input
                label="Reminder (days before expiry)"
                type="number"
                defaultValue={30}
                {...register("reminder_days_before")}
              />
              <Input label="File name" {...register("file_name")} />
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Description
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-16 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register("description")}
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" size="sm" onClick={() => { setShowCreate(false); reset(); setError(null); }}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={createDoc.isPending}>
                  Create document
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        {isLoading ? (
          <CardContent className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </CardContent>
        ) : !docs.length ? (
          <CardContent className="py-10 text-center text-gray-400">
            No compliance documents yet
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Document</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Expiry</th>
                  <th className="px-4 py-3 text-left">Verified</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {docs.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{doc.title}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{doc.document_number}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-400">
                      {doc.category.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        status={
                          doc.status === "active" ? "active" :
                          doc.status === "expiring_soon" ? "on_hold" :
                          doc.status === "expired" ? "cancelled" :
                          doc.status === "revoked" ? "cancelled" : "draft"
                        }
                        label={doc.status.replace(/_/g, " ")}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {doc.expiry_date ? (
                        <span className={doc.status === "expired" ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}>
                          {formatDate(doc.expiry_date)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {doc.verified_at ? (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {formatDate(doc.verified_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {!doc.verified_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyDoc.mutate(doc.id)}
                            loading={verifyDoc.isPending}
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm("Delete this document?")) {
                              deleteDoc.mutate(doc.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
