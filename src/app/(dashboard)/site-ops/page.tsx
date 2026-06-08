"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjects, useSites } from "@/hooks/useProjects";
import { useDPR, useDPRs, useSiteOpsSummary, useSubmitDPR } from "@/hooks/useSiteOps";
import { formatDate } from "@/lib/utils";
import { CheckCircle, Clock, HardHat, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";

export default function SiteOpsPage() {
  return (
    <PermissionGuard module="can_site_ops">
      <SiteOpsPageContent />
    </PermissionGuard>
  );
}
function SiteOpsPageContent() {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedDPRId, setSelectedDPRId] = useState("");

  const { data: projects } = useProjects();
  const { data: sites } = useSites(selectedProjectId);
  const { data: dprsData, isLoading: dprsLoading } = useDPRs(selectedProjectId, selectedSiteId || undefined);
  const { data: dpr, isLoading: dprLoading } = useDPR(selectedDPRId);
  const { data: summary } = useSiteOpsSummary(selectedProjectId);
  const submitDPR = useSubmitDPR(selectedProjectId);

  const dprs = dprsData?.data ?? [];

  const selectClass =
    "h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Site Operations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Daily progress reports, attendance and equipment</p>
      </div>

      {/* Project + Site selectors */}
      <div className="flex gap-3 flex-wrap">
        <select
          className={`w-56 ${selectClass}`}
          value={selectedProjectId}
          onChange={e => { setSelectedProjectId(e.target.value); setSelectedSiteId(""); setSelectedDPRId(""); }}
        >
          <option value="">Select project...</option>
          {projects?.data.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {sites && sites.length > 0 && (
          <select
            className={`w-48 ${selectClass}`}
            value={selectedSiteId}
            onChange={e => { setSelectedSiteId(e.target.value); setSelectedDPRId(""); }}
          >
            <option value="">All sites</option>
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Summary KPIs */}
      {summary && selectedProjectId && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total DPRs", value: summary.total_dprs, icon: <HardHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />, bg: "bg-blue-50 dark:bg-blue-950/50" },
            { label: "Submitted", value: summary.submitted_dprs, icon: <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />, bg: "bg-green-50 dark:bg-green-950/50" },
            { label: "Worker Days", value: summary.total_worker_days, icon: <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />, bg: "bg-purple-50 dark:bg-purple-950/50" },
            { label: "Labour Cost", value: `NPR ${Number(summary.total_labour_cost).toLocaleString()}`, icon: <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />, bg: "bg-amber-50 dark:bg-amber-950/50" },
          ].map(({ label, value, icon, bg }) => (
            <Card key={label} className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DPR list + detail */}
      {selectedProjectId && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* DPR List */}
          <Card className="lg:col-span-1 dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">DPR List</CardTitle>
            </CardHeader>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
              {dprsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
                </div>
              ) : !dprs.length ? (
                <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No DPRs yet</p>
              ) : dprs.map((d: any) => (
                <button
                  key={d.id}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selectedDPRId === d.id
                      ? "bg-blue-50 dark:bg-blue-950/40"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                  onClick={() => setSelectedDPRId(d.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(d.report_date)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{d.total_workers} workers</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge status={d.is_submitted ? "approved" : "draft"} label={d.is_submitted ? "Submitted" : "Draft"} />
                      <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{d.weather}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* DPR Detail */}
          <Card className="lg:col-span-2 dark:bg-gray-900 dark:border-gray-800">
            {!selectedDPRId ? (
              <CardContent className="flex h-64 items-center justify-center text-gray-400 dark:text-gray-500">
                <p>Select a DPR to view details</p>
              </CardContent>
            ) : dprLoading ? (
              <CardContent className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
              </CardContent>
            ) : dpr ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="dark:text-gray-100">{formatDate(dpr.report_date)}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                        {dpr.weather} · {dpr.work_hours}h · {dpr.total_workers} workers
                      </p>
                    </div>
                    {!dpr.is_submitted && (
                      <Button
                        size="sm"
                        variant="success"
                        loading={submitDPR.isPending}
                        onClick={() => submitDPR.mutate(selectedDPRId)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Submit DPR
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Work items */}
                  {dpr.work_items?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Work done</h4>
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                              <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Description</th>
                              <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">Achieved</th>
                              <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {dpr.work_items.map((w: any) => (
                              <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{w.description}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{w.achieved_quantity}</td>
                                <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{w.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Attendance */}
                  {dpr.attendance_records?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Labour attendance ({dpr.attendance_records.length})
                      </h4>
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                              <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Name</th>
                              <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Trade</th>
                              <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">Status</th>
                              <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">Wage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {dpr.attendance_records.map((a: any) => (
                              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{a.worker_name}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.trade}</td>
                                <td className="px-3 py-2"><Badge status={a.status} /></td>
                                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">NPR {a.daily_wage.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {dpr.general_notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">{dpr.general_notes}</p>
                    </div>
                  )}
                  {dpr.safety_notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Safety</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-100 dark:border-amber-800/50">{dpr.safety_notes}</p>
                    </div>
                  )}
                </CardContent>
              </>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}