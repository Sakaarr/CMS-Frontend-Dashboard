"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
  useQualitySummary, useInspections, useNCRs,
  useIncidents, usePunchList,
  useCreateInspection, useCreateNCR, useCreateIncident,
  useCreatePunchItem, useUpdateNCR, useUpdatePunchItem,
  usePassInspection, useFailInspection,
} from "@/hooks/useQuality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Plus, CheckCircle, XCircle,
  Loader2, ShieldCheck, AlertTriangle,
  ClipboardList, Search,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";

const TABS = ["Inspections", "NCRs", "Safety Incidents", "Punch List"] as const;
type Tab = typeof TABS[number];

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
  near_miss: "bg-gray-100 text-gray-600",
  minor: "bg-blue-100 text-blue-700",
  moderate: "bg-yellow-100 text-yellow-700",
  major: "bg-orange-100 text-orange-700",
  fatal: "bg-red-100 text-red-700",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${SEVERITY_COLORS[severity] ?? "bg-gray-100 text-gray-600"}`}>
      {severity.replace(/_/g, " ")}
    </span>
  );
}

export default function QualityPage() {
  return (
    <PermissionGuard module="can_quality">
      <QualityPageContent />
    </PermissionGuard>
  );
}
function QualityPageContent() {
  const [tab, setTab] = useState<Tab>("Inspections");
  const [projectId, setProjectId] = useState("");
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [showNewNCR, setShowNewNCR] = useState(false);
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [showNewPunch, setShowNewPunch] = useState(false);

  const { data: projects } = useProjects();
  const { data: summary, isError: summaryError, error: summaryErrorObj } = useQualitySummary(projectId);
  const { data: inspectionsData } = useInspections(projectId);
  const { data: ncrsData } = useNCRs(projectId);
  const { data: incidentsData } = useIncidents(projectId);
  const { data: punchData } = usePunchList(projectId);

  const createInspection = useCreateInspection(projectId);
  const createNCR = useCreateNCR(projectId);
  const createIncident = useCreateIncident(projectId);
  const createPunch = useCreatePunchItem(projectId);
  const updateNCR = useUpdateNCR(projectId);
  const updatePunch = useUpdatePunchItem(projectId);
  const passInspection = usePassInspection(projectId);
  const failInspection = useFailInspection(projectId);

  const { register: regI, handleSubmit: handleI, reset: resetI } = useForm();
  const { register: regN, handleSubmit: handleN, reset: resetN } = useForm();
  const { register: regInc, handleSubmit: handleInc, reset: resetInc } = useForm();
  const { register: regP, handleSubmit: handleP, reset: resetP } = useForm();

  const inspections = inspectionsData?.data ?? [];
  const ncrs = ncrsData?.data ?? [];
  const incidents = incidentsData?.data ?? [];
  const punch = punchData?.data ?? [];

  if (summaryError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="text-destructive text-4xl">!</div>
        <h3 className="text-lg font-semibold">Failed to load data</h3>
        <p className="text-muted-foreground text-sm">{(summaryErrorObj as Error)?.message || "An error occurred"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quality & Safety</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Inspections, NCRs, safety incidents and punch lists
          </p>
        </div>
        {projectId && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowNewPunch(true)}>
              <Plus className="h-4 w-4 mr-1" /> Punch item
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowNewNCR(true)}>
              <Plus className="h-4 w-4 mr-1" /> NCR
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowNewIncident(true)}>
              <Plus className="h-4 w-4 mr-1" /> Incident
            </Button>
            <Button size="sm" onClick={() => setShowNewInspection(true)}>
              <Plus className="h-4 w-4 mr-1" /> Inspection
            </Button>
          </div>
        )}
      </div>

      {/* Project selector */}
      <select
        className="h-10 w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={projectId}
        onChange={e => setProjectId(e.target.value)}
      >
        <option value="">Select a project...</option>
        {projects?.data.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
        ))}
      </select>

      {/* KPI summary */}
      {summary && projectId && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {[
            {
              label: "Inspections",
              value: `${summary.passed_inspections}/${summary.total_inspections} passed`,
              icon: <ShieldCheck className="h-5 w-5 text-green-600" />,
              bg: "bg-green-50 dark:bg-green-900/20",
              sub: summary.avg_inspection_score ? `Avg score: ${summary.avg_inspection_score}%` : undefined,
            },
            {
              label: "Open NCRs",
              value: String(summary.open_ncrs),
              icon: <ClipboardList className="h-5 w-5 text-orange-600" />,
              bg: "bg-orange-50 dark:bg-orange-900/20",
              sub: summary.critical_ncrs > 0 ? `${summary.critical_ncrs} critical` : undefined,
              alert: summary.critical_ncrs > 0,
            },
            {
              label: "Open incidents",
              value: String(summary.open_incidents),
              icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
              bg: "bg-red-50 dark:bg-red-900/20",
              alert: summary.open_incidents > 0,
            },
            {
              label: "Punch items",
              value: String(summary.open_punch_items),
              icon: <Search className="h-5 w-5 text-blue-600" />,
              bg: "bg-blue-50 dark:bg-blue-900/20",
            },
          ].map(({ label, value, icon, bg, sub, alert }) => (
            <div
              key={label}
              className={`rounded-xl p-4 ${bg} ${alert ? "ring-2 ring-red-300 dark:ring-red-700" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div>{icon}</div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                  {sub && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{sub}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create forms */}
      {showNewInspection && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">New inspection</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleI(async d => {
                await createInspection.mutateAsync({
                  title: d.title,
                  inspection_type: d.inspection_type,
                  scheduled_date: d.scheduled_date,
                  inspector_name: d.inspector_name,
                  location: d.location,
                  is_third_party: false,
                  checklist_items: [],
                });
                resetI();
                setShowNewInspection(false);
              })}
            >
              <Input label="Title" placeholder="Foundation inspection" {...regI("title", { required: true })} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Type</label>
                <select className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm" {...regI("inspection_type", { required: true })}>
                  {["structural","electrical","plumbing","fire_safety","quality","safety","environmental","final","other"].map(t => (
                    <option key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <Input label="Scheduled date" type="date" {...regI("scheduled_date", { required: true })} />
              <Input label="Inspector name" {...regI("inspector_name")} />
              <Input label="Location" placeholder="Block A, Floor 3" {...regI("location")} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowNewInspection(false)}>Cancel</Button>
                <Button type="submit" loading={createInspection.isPending}>Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showNewNCR && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">Raise NCR</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleN(async d => {
                await createNCR.mutateAsync({
                  title: d.title,
                  description: d.description,
                  severity: d.severity,
                  location: d.location,
                  due_date: d.due_date || undefined,
                });
                resetN();
                setShowNewNCR(false);
              })}
            >
              <Input label="Title" {...regN("title", { required: true })} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Severity</label>
                <select className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm" {...regN("severity")}>
                  {["low","medium","high","critical"].map(s => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-20 text-gray-900 dark:text-gray-100"
                  {...regN("description", { required: true })}
                />
              </div>
              <Input label="Location" {...regN("location")} />
              <Input label="Due date" type="date" {...regN("due_date")} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowNewNCR(false)}>Cancel</Button>
                <Button type="submit" loading={createNCR.isPending}>Raise NCR</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showNewIncident && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">Report safety incident</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleInc(async d => {
                await createIncident.mutateAsync({
                  title: d.title,
                  description: d.description,
                  severity: d.severity,
                  incident_date: d.incident_date,
                  location: d.location,
                  persons_involved: parseInt(d.persons_involved) || 0,
                  injuries: parseInt(d.injuries) || 0,
                  fatalities: parseInt(d.fatalities) || 0,
                  property_damage: parseFloat(d.property_damage) || 0,
                  immediate_action: d.immediate_action,
                  is_reportable: d.is_reportable === "true",
                });
                resetInc();
                setShowNewIncident(false);
              })}
            >
              <Input label="Title" {...regInc("title", { required: true })} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Severity</label>
                <select className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm" {...regInc("severity", { required: true })}>
                  {["near_miss","minor","moderate","major","fatal"].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g," ")}</option>
                  ))}
                </select>
              </div>
              <Input label="Incident date" type="date" {...regInc("incident_date", { required: true })} />
              <Input label="Location" {...regInc("location")} />
              <Input label="Persons involved" type="number" defaultValue="0" {...regInc("persons_involved")} />
              <Input label="Injuries" type="number" defaultValue="0" {...regInc("injuries")} />
              <Input label="Fatalities" type="number" defaultValue="0" {...regInc("fatalities")} />
              <Input label="Property damage (NPR)" type="number" defaultValue="0" {...regInc("property_damage")} />
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-16 text-gray-900 dark:text-gray-100"
                  {...regInc("description", { required: true })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Immediate action taken</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-16 text-gray-900 dark:text-gray-100"
                  {...regInc("immediate_action")}
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowNewIncident(false)}>Cancel</Button>
                <Button type="submit" variant="danger" loading={createIncident.isPending}>Report incident</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showNewPunch && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">Add punch list item</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleP(async d => {
                await createPunch.mutateAsync({
                  description: d.description,
                  location: d.location,
                  priority: d.priority,
                  due_date: d.due_date || undefined,
                });
                resetP();
                setShowNewPunch(false);
              })}
            >
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-16 text-gray-900 dark:text-gray-100"
                  {...regP("description", { required: true })}
                />
              </div>
              <Input label="Location" {...regP("location")} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Priority</label>
                <select className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm" {...regP("priority")}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <Input label="Due date" type="date" {...regP("due_date")} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowNewPunch(false)}>Cancel</Button>
                <Button type="submit" loading={createPunch.isPending}>Add item</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Inspections */}
      {tab === "Inspections" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Number</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Scheduled</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!inspections.length ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">No inspections yet</td></tr>
                ) : inspections.map((insp: any) => (
                  <tr key={insp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{insp.inspection_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{insp.title}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{insp.inspection_type?.replace(/_/g," ")}</td>
                    <td className="px-4 py-3"><Badge status={insp.status} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(insp.scheduled_date)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 font-medium">
                      {insp.score != null ? `${insp.score}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {["scheduled","in_progress"].includes(insp.status) && (
                        <div className="flex gap-1">
                          <Button
                            size="sm" variant="success"
                            loading={passInspection.isPending}
                            onClick={() => passInspection.mutate(insp.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Pass
                          </Button>
                          <Button
                            size="sm" variant="danger"
                            loading={failInspection.isPending}
                            onClick={() => failInspection.mutate(insp.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Fail
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* NCRs */}
      {tab === "NCRs" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Number</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Due date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!ncrs.length ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">No NCRs raised</td></tr>
                ) : ncrs.map((ncr: any) => (
                  <tr key={ncr.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${ncr.severity === "critical" ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{ncr.ncr_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{ncr.title}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={ncr.severity} /></td>
                    <td className="px-4 py-3"><Badge status={ncr.status} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{ncr.location ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(ncr.due_date)}</td>
                    <td className="px-4 py-3">
                      {ncr.status !== "closed" && (
                        <Button
                          size="sm" variant="outline"
                          loading={updateNCR.isPending}
                          onClick={() => updateNCR.mutate({
                            ncrId: ncr.id,
                            data: { status: ncr.status === "open" ? "acknowledged" : "resolved" },
                          })}
                        >
                          {ncr.status === "open" ? "Acknowledge" : "Resolve"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Safety Incidents */}
      {tab === "Safety Incidents" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Number</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Injuries</th>
                  <th className="px-4 py-3 text-right">Damage (NPR)</th>
                  <th className="px-4 py-3 text-left">Reportable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!incidents.length ? (
                  <tr><td colSpan={8} className="py-10 text-center text-gray-400">No incidents reported</td></tr>
                ) : incidents.map((inc: any) => (
                  <tr key={inc.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${inc.severity === "fatal" || inc.severity === "major" ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{inc.incident_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{inc.title}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={inc.severity} /></td>
                    <td className="px-4 py-3"><Badge status={inc.status} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(inc.incident_date)}</td>
                    <td className="px-4 py-3 text-right">
                      {inc.injuries > 0
                        ? <span className="text-red-600 font-medium">{inc.injuries}</span>
                        : <span className="text-gray-400">0</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {inc.property_damage > 0 ? inc.property_damage.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {inc.is_reportable
                        ? <span className="text-red-600 text-xs font-medium">Yes</span>
                        : <span className="text-gray-400 text-xs">No</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Punch List */}
      {tab === "Punch List" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Due</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!punch.length ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">No punch list items</td></tr>
                ) : punch.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{item.item_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs truncate">{item.description}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className={`text-xs font-medium ${
                        item.priority === "high" ? "text-red-600" :
                        item.priority === "medium" ? "text-yellow-600" :
                        "text-gray-500"
                      }`}>{item.priority}</span>
                    </td>
                    <td className="px-4 py-3"><Badge status={item.status} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.location ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(item.due_date)}</td>
                    <td className="px-4 py-3">
                      {item.status === "open" && (
                        <Button
                          size="sm" variant="outline"
                          loading={updatePunch.isPending}
                          onClick={() => updatePunch.mutate({
                            itemId: item.id,
                            data: { status: "completed" },
                          })}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Complete
                        </Button>
                      )}
                      {item.status === "completed" && (
                        <Button
                          size="sm" variant="success"
                          loading={updatePunch.isPending}
                          onClick={() => updatePunch.mutate({
                            itemId: item.id,
                            data: { status: "verified" },
                          })}
                        >
                          Verify
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}