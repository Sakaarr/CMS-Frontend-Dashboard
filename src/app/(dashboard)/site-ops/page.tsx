"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjects, useSites } from "@/hooks/useProjects";
import { useDPR, useDPRs, useSiteOpsSummary, useSubmitDPR } from "@/hooks/useSiteOps";
import { formatDate } from "@/lib/utils";
import { CheckCircle, Clock, HardHat, Loader2, Users } from "lucide-react";
import { useState } from "react";

export default function SiteOpsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Site Operations</h1>
        <p className="text-sm text-gray-500">Daily progress reports, attendance and equipment</p>
      </div>

      {/* Project + Site selectors */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="h-10 w-56 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="h-10 w-48 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            { label: "Total DPRs", value: summary.total_dprs, icon: <HardHat className="h-5 w-5 text-blue-600" />, bg: "bg-blue-50" },
            { label: "Submitted", value: summary.submitted_dprs, icon: <CheckCircle className="h-5 w-5 text-green-600" />, bg: "bg-green-50" },
            { label: "Worker Days", value: summary.total_worker_days, icon: <Users className="h-5 w-5 text-purple-600" />, bg: "bg-purple-50" },
            { label: "Labour Cost", value: `NPR ${Number(summary.total_labour_cost).toLocaleString()}`, icon: <Clock className="h-5 w-5 text-amber-600" />, bg: "bg-amber-50" },
          ].map(({ label, value, icon, bg }) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
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
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>DPR List</CardTitle></CardHeader>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {dprsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : !dprs.length ? (
                <p className="py-8 text-center text-sm text-gray-400">No DPRs yet</p>
              ) : dprs.map((d: any) => (
                <button
                  key={d.id}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selectedDPRId === d.id ? "bg-blue-50" : ""}`}
                  onClick={() => setSelectedDPRId(d.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formatDate(d.report_date)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{d.total_workers} workers</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge status={d.is_submitted ? "approved" : "draft"} label={d.is_submitted ? "Submitted" : "Draft"} />
                      <span className="text-xs text-gray-400 capitalize">{d.weather}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* DPR Detail */}
          <Card className="lg:col-span-2">
            {!selectedDPRId ? (
              <CardContent className="flex h-64 items-center justify-center text-gray-400">
                <p>Select a DPR to view details</p>
              </CardContent>
            ) : dprLoading ? (
              <CardContent className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </CardContent>
            ) : dpr ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{formatDate(dpr.report_date)}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1 capitalize">
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
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Work done</h4>
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-gray-500">Description</th>
                              <th className="px-3 py-2 text-right text-gray-500">Achieved</th>
                              <th className="px-3 py-2 text-right text-gray-500">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {dpr.work_items.map((w: any) => (
                              <tr key={w.id}>
                                <td className="px-3 py-2 text-gray-900">{w.description}</td>
                                <td className="px-3 py-2 text-right font-medium">{w.achieved_quantity}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{w.unit}</td>
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
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Labour attendance ({dpr.attendance_records.length})
                      </h4>
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-gray-500">Name</th>
                              <th className="px-3 py-2 text-left text-gray-500">Trade</th>
                              <th className="px-3 py-2 text-left text-gray-500">Status</th>
                              <th className="px-3 py-2 text-right text-gray-500">Wage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {dpr.attendance_records.map((a: any) => (
                              <tr key={a.id}>
                                <td className="px-3 py-2 text-gray-900">{a.worker_name}</td>
                                <td className="px-3 py-2 text-gray-600">{a.trade}</td>
                                <td className="px-3 py-2"><Badge status={a.status} /></td>
                                <td className="px-3 py-2 text-right">NPR {a.daily_wage.toLocaleString()}</td>
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
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{dpr.general_notes}</p>
                    </div>
                  )}
                  {dpr.safety_notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Safety</h4>
                      <p className="text-sm text-gray-600 bg-amber-50 rounded-lg p-3 border border-amber-100">{dpr.safety_notes}</p>
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