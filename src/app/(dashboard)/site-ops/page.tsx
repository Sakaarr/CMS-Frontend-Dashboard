"use client";

import { useState } from "react";
import { useProjects, useSites } from "@/hooks/useProjects";
import {
  useDPRs, useDPR, useSiteOpsSummary,
  useSubmitDPR, useCreateDPR,
} from "@/hooks/useSiteOps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { CheckCircle, Loader2, HardHat, Users, Clock, Plus, X } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";

const WEATHER_OPTIONS = ["sunny", "cloudy", "rainy", "foggy", "stormy"];

export default function SiteOpsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedDPRId, setSelectedDPRId] = useState("");
  const [showCreateDPR, setShowCreateDPR] = useState(false);
  const [weather, setWeather] = useState("sunny");
  const [formError, setFormError] = useState("");

  const { data: projects } = useProjects();
  const { data: sites } = useSites(selectedProjectId);
  const { data: dprsData, isLoading: dprsLoading, isError: dprsError, error: dprsErrorObj } = useDPRs(selectedProjectId, selectedSiteId || undefined);
  const { data: dpr, isLoading: dprLoading } = useDPR(selectedDPRId);
  const { data: summary } = useSiteOpsSummary(selectedProjectId);

  const submitDPR = useSubmitDPR(selectedProjectId);
  const createDPR = useCreateDPR(selectedProjectId);

  const dprs = dprsData?.data ?? [];

  const { register, handleSubmit, control, reset, setValue } = useForm({
    defaultValues: {
      report_date: new Date().toISOString().split("T")[0],
      work_hours: 8,
      general_notes: "",
      safety_notes: "",
      work_items: [{ description: "", unit: "sqm", achieved_quantity: 0, planned_quantity: 0 }],
      attendance: [{ worker_name: "", trade: "", status: "present", daily_wage: 0 }],
      equipment_logs: [] as any[],
    },
  });

  const { fields: workFields, append: appendWork, remove: removeWork } = useFieldArray({ control, name: "work_items" });
  const { fields: attFields, append: appendAtt, remove: removeAtt } = useFieldArray({ control, name: "attendance" });

  const onSubmitDPR = async (data: any) => {
    setFormError("");
    if (!selectedSiteId) { setFormError("Please select a site first"); return; }
    try {
      await createDPR.mutateAsync({
        site_id: selectedSiteId,
        report_date: data.report_date,
        weather,
        work_hours: parseFloat(data.work_hours) || 8,
        general_notes: data.general_notes || undefined,
        safety_notes: data.safety_notes || undefined,
        work_items: (data.work_items ?? []).filter((w: any) => w.description).map((w: any) => ({
          ...w,
          achieved_quantity: parseFloat(w.achieved_quantity) || 0,
          planned_quantity: parseFloat(w.planned_quantity) || 0,
        })),
        attendance: (data.attendance ?? []).filter((a: any) => a.worker_name).map((a: any) => ({
          ...a,
          daily_wage: parseFloat(a.daily_wage) || 0,
          overtime_hours: 0,
          is_subcontractor: false,
        })),
        equipment_logs: [],
      });
      reset();
      setShowCreateDPR(false);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || "Failed to create DPR");
    }
  };

  if (dprsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="text-destructive text-4xl">!</div>
        <h3 className="text-lg font-semibold">Failed to load data</h3>
        <p className="text-muted-foreground text-sm">{(dprsErrorObj as Error)?.message || "An error occurred"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Site Operations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Daily progress reports, attendance and equipment logs</p>
      </div>

      {/* Selectors */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          className="h-10 w-56 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedProjectId}
          onChange={e => { setSelectedProjectId(e.target.value); setSelectedSiteId(""); setSelectedDPRId(""); }}
        >
          <option value="">Select project...</option>
          {projects?.data.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {sites && sites.length > 0 && (
          <select
            className="h-10 w-48 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSiteId}
            onChange={e => { setSelectedSiteId(e.target.value); setSelectedDPRId(""); }}
          >
            <option value="">All sites</option>
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {selectedProjectId && (
          <Button size="sm" onClick={() => setShowCreateDPR(true)}>
            <Plus className="h-4 w-4 mr-1" /> New DPR
          </Button>
        )}
      </div>

      {/* Create DPR form */}
      {showCreateDPR && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="dark:text-gray-100">New Daily Progress Report</CardTitle>
              <button onClick={() => { setShowCreateDPR(false); reset(); setFormError(""); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitDPR)} className="space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Report date" type="date" {...register("report_date", { required: true })} />
                <Input label="Work hours" type="number" step="0.5" {...register("work_hours")} />
              </div>

              {/* Weather */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Weather</label>
                <div className="flex gap-2 flex-wrap">
                  {WEATHER_OPTIONS.map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeather(w)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors ${
                        weather === w
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Work done today</label>
                  <Button type="button" size="sm" variant="outline"
                    onClick={() => appendWork({ description: "", unit: "sqm", achieved_quantity: 0, planned_quantity: 0 })}>
                    <Plus className="h-3 w-3 mr-1" /> Add item
                  </Button>
                </div>
                <div className="space-y-2">
                  {workFields.map((field, i) => (
                    <div key={field.id} className="grid grid-cols-4 gap-2 items-end">
                      <div className="col-span-2">
                        <input
                          placeholder="Description (e.g. Column concrete pour)"
                          className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                          {...register(`work_items.${i}.description`)}
                        />
                      </div>
                      <input
                        placeholder="Qty achieved"
                        type="number"
                        step="0.01"
                        className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                        {...register(`work_items.${i}.achieved_quantity`)}
                      />
                      <div className="flex gap-1">
                        <input
                          placeholder="Unit"
                          className="h-9 flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                          {...register(`work_items.${i}.unit`)}
                        />
                        {workFields.length > 1 && (
                          <button type="button" onClick={() => removeWork(i)}
                            className="h-9 w-9 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Labour attendance</label>
                  <Button type="button" size="sm" variant="outline"
                    onClick={() => appendAtt({ worker_name: "", trade: "", status: "present", daily_wage: 0 })}>
                    <Plus className="h-3 w-3 mr-1" /> Add worker
                  </Button>
                </div>
                <div className="space-y-2">
                  {attFields.map((field, i) => (
                    <div key={field.id} className="grid grid-cols-4 gap-2 items-end">
                      <input
                        placeholder="Worker name"
                        className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                        {...register(`attendance.${i}.worker_name`)}
                      />
                      <input
                        placeholder="Trade (mason, labour...)"
                        className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                        {...register(`attendance.${i}.trade`)}
                      />
                      <select
                        className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
                        {...register(`attendance.${i}.status`)}
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half day</option>
                        <option value="on_leave">On leave</option>
                      </select>
                      <div className="flex gap-1">
                        <input
                          placeholder="Daily wage"
                          type="number"
                          className="h-9 flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                          {...register(`attendance.${i}.daily_wage`)}
                        />
                        {attFields.length > 1 && (
                          <button type="button" onClick={() => removeAtt(i)}
                            className="h-9 w-9 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">General notes</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-20 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Progress notes, observations..."
                    {...register("general_notes")}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Safety notes</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-20 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Safety observations, incidents..."
                    {...register("safety_notes")}
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setShowCreateDPR(false); reset(); setFormError(""); }}>Cancel</Button>
                <Button type="submit" loading={createDPR.isPending}>Save DPR</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Summary KPIs */}
      {summary && selectedProjectId && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total DPRs", value: summary.total_dprs, icon: <HardHat className="h-5 w-5 text-blue-600" />, bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Submitted", value: summary.submitted_dprs, icon: <CheckCircle className="h-5 w-5 text-green-600" />, bg: "bg-green-50 dark:bg-green-900/20" },
            { label: "Worker days", value: summary.total_worker_days, icon: <Users className="h-5 w-5 text-purple-600" />, bg: "bg-purple-50 dark:bg-purple-900/20" },
            { label: "Labour cost", value: `NPR ${Number(summary.total_labour_cost).toLocaleString()}`, icon: <Clock className="h-5 w-5 text-amber-600" />, bg: "bg-amber-50 dark:bg-amber-900/20" },
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
            <CardHeader><CardTitle className="dark:text-gray-100">DPR List</CardTitle></CardHeader>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
              {dprsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : !dprs.length ? (
                <p className="py-8 text-center text-sm text-gray-400">No DPRs yet — click '+ New DPR' to create one</p>
              ) : dprs.map((d: any) => (
                <button
                  key={d.id}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedDPRId === d.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                  onClick={() => setSelectedDPRId(d.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(d.report_date)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{d.total_workers} workers</p>
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
          <Card className="lg:col-span-2 dark:bg-gray-900 dark:border-gray-800">
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
                      <CardTitle className="dark:text-gray-100">{formatDate(dpr.report_date)}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                        {dpr.weather} · {dpr.work_hours}h · {dpr.total_workers} workers
                      </p>
                    </div>
                    {!dpr.is_submitted && (
                      <Button size="sm" variant="success"
                        loading={submitDPR.isPending}
                        onClick={() => submitDPR.mutate(selectedDPRId)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Submit DPR
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {(dpr.work_items?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Work done</h4>
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <th className="px-3 py-2 text-left text-gray-500">Description</th>
                              <th className="px-3 py-2 text-right text-gray-500">Achieved</th>
                              <th className="px-3 py-2 text-right text-gray-500">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {dpr.work_items?.map((w: any) => (
                              <tr key={w.id}>
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{w.description}</td>
                                <td className="px-3 py-2 text-right font-medium">{w.achieved_quantity}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{w.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(dpr.attendance_records?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Labour attendance ({dpr.attendance_records?.length ?? 0})
                      </h4>
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <th className="px-3 py-2 text-left text-gray-500">Name</th>
                              <th className="px-3 py-2 text-left text-gray-500">Trade</th>
                              <th className="px-3 py-2 text-left text-gray-500">Status</th>
                              <th className="px-3 py-2 text-right text-gray-500">Wage (NPR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {dpr.attendance_records?.map((a: any) => (
                              <tr key={a.id}>
                                <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{a.worker_name}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.trade}</td>
                                <td className="px-3 py-2"><Badge status={a.status} /></td>
                                <td className="px-3 py-2 text-right">{a.daily_wage.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {dpr.general_notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">{dpr.general_notes}</p>
                    </div>
                  )}
                  {dpr.safety_notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Safety notes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800">{dpr.safety_notes}</p>
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