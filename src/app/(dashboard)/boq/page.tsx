"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
  useBudgetVersions, useBOQItems,
  useBOQSummary, useCreateBudgetVersion,
  useCreateBOQItem, useApproveBudgetVersion,
} from "@/hooks/useBoq";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";

// Reusable dark-mode-aware field
function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [color-scheme:light] dark:[color-scheme:dark]"
        {...props}
      />
    </div>
  );
}
export default function BOQPage() {
return (
    <PermissionGuard module="can_boq">
      <BOQPageContent />
    </PermissionGuard>
  );
}

function BOQPageContent() {
  const { data: projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);

  const { data: versions, isLoading: versionsLoading } = useBudgetVersions(selectedProjectId);
  const { data: items, isLoading: itemsLoading } = useBOQItems(selectedVersionId);
  const { data: summary } = useBOQSummary(selectedVersionId);
  const createVersion = useCreateBudgetVersion(selectedProjectId);
  const createItem = useCreateBOQItem(selectedProjectId, selectedVersionId);
  const approveVersion = useApproveBudgetVersion(selectedProjectId);

  const { register: regV, handleSubmit: handleV, reset: resetV } = useForm();
  const { register: regI, handleSubmit: handleI, reset: resetI } = useForm();

  const costBreakdown = summary
    ? [
        { name: "Material", value: summary.total_material_cost, color: "#3b82f6" },
        { name: "Labour", value: summary.total_labour_cost, color: "#10b981" },
        { name: "Equipment", value: summary.total_equipment_cost, color: "#f59e0b" },
        { name: "Contingency", value: summary.contingency_amount, color: "#8b5cf6" },
      ].filter(d => d.value > 0)
    : [];

  const selectClass = "h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">BOQ & Estimation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage bill of quantities and budgets</p>
      </div>

      {/* Project selector */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Project</label>
              <select
                className={selectClass}
                value={selectedProjectId}
                onChange={e => { setSelectedProjectId(e.target.value); setSelectedVersionId(""); }}
              >
                <option value="">Select a project...</option>
                {projects?.data.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            {selectedProjectId && (
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Budget version</label>
                <select
                  className={selectClass}
                  value={selectedVersionId}
                  onChange={e => setSelectedVersionId(e.target.value)}
                >
                  <option value="">Select version...</option>
                  {versions?.map(v => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} — {v.name} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedProjectId && (
              <Button variant="outline" onClick={() => setShowNewVersion(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> New version
              </Button>
            )}
          </div>

          {/* New version form */}
          {showNewVersion && (
            <form
              className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-200 dark:border-gray-700 pt-4"
              onSubmit={handleV(async d => {
                await createVersion.mutateAsync({
                  name: d.name,
                  contingency_percentage: parseFloat(d.contingency_percentage) || 5,
                  currency: "NPR",
                });
                resetV();
                setShowNewVersion(false);
              })}
            >
              <Field label="Version name" placeholder="Original Budget" {...regV("name", { required: true })} />
              <Field label="Contingency %" type="number" placeholder="5" {...regV("contingency_percentage")} />
              <div className="flex items-end gap-2">
                <Button type="submit" loading={createVersion.isPending} size="sm">Create</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewVersion(false)}>Cancel</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Grand Total", value: formatCurrency(summary.grand_total), color: "text-gray-900 dark:text-gray-100" },
            { label: "Planned", value: formatCurrency(summary.planned_total), color: "text-blue-600 dark:text-blue-400" },
            { label: "Actual", value: formatCurrency(summary.actual_total), color: "text-green-600 dark:text-green-400" },
            { label: "Variance", value: formatCurrency(summary.variance), color: summary.variance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedVersionId && summary && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Cost breakdown pie */}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Cost breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {costBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={costBreakdown} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={false}>
                      {costBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => formatCurrency(v)}
                      contentStyle={{
                        borderRadius: 8,
                        fontSize: 12,
                        backgroundColor: "var(--tooltip-bg, #fff)",
                        borderColor: "var(--tooltip-border, #e5e7eb)",
                        color: "var(--tooltip-text, #111827)",
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No cost data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Version details */}
          <Card className="lg:col-span-2 dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="dark:text-gray-100">Version details</CardTitle>
                {versions?.find(v => v.id === selectedVersionId)?.status === "draft" && (
                  <Button
                    size="sm"
                    variant="success"
                    loading={approveVersion.isPending}
                    onClick={() => approveVersion.mutate(selectedVersionId)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve budget
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Material cost", formatCurrency(summary.total_material_cost)],
                  ["Labour cost", formatCurrency(summary.total_labour_cost)],
                  ["Equipment cost", formatCurrency(summary.total_equipment_cost)],
                  ["Subtotal", formatCurrency(summary.total_amount)],
                  ["Contingency", formatCurrency(summary.contingency_amount)],
                  ["Grand total", formatCurrency(summary.grand_total)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BOQ Items table */}
      {selectedVersionId && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="dark:text-gray-100">Bill of Quantities ({summary?.items_count ?? 0} items)</CardTitle>
              <Button size="sm" onClick={() => setShowNewItem(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
            </div>
          </CardHeader>

          {/* New item form */}
          {showNewItem && (
            <div className="mx-6 mb-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
              <form
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
                onSubmit={handleI(async d => {
                  await createItem.mutateAsync({
                    item_number: d.item_number,
                    description: d.description,
                    unit: d.unit,
                    quantity: parseFloat(d.quantity) || 0,
                    unit_rate: parseFloat(d.unit_rate) || 0,
                    material_rate: parseFloat(d.material_rate) || 0,
                    labour_rate: parseFloat(d.labour_rate) || 0,
                  });
                  resetI();
                  setShowNewItem(false);
                })}
              >
                <Field label="Item no." placeholder="1.1" {...regI("item_number", { required: true })} />
                <Field label="Description" placeholder="Earthwork excavation" {...regI("description", { required: true })} />
                <Field label="Unit" placeholder="cum" {...regI("unit", { required: true })} />
                <Field label="Quantity" type="number" {...regI("quantity")} />
                <Field label="Unit rate (NPR)" type="number" {...regI("unit_rate")} />
                <Field label="Material rate" type="number" {...regI("material_rate")} />
                <Field label="Labour rate" type="number" {...regI("labour_rate")} />
                <div className="flex items-end gap-2">
                  <Button type="submit" size="sm" loading={createItem.isPending}>Add</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewItem(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">No.</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Unit</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Rate (NPR)</th>
                  <th className="px-4 py-3 text-right">Amount (NPR)</th>
                  <th className="px-4 py-3 text-right">Actual qty</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {itemsLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
                    </td>
                  </tr>
                ) : items?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400 dark:text-gray-500">
                      No items yet — add your first BOQ item
                    </td>
                  </tr>
                ) : items?.map(item => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.is_section_header
                        ? "bg-blue-50 dark:bg-blue-950/40 font-semibold"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{item.item_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{item.description}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{item.unit}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{item.unit_rate.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{item.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{item.actual_quantity.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold border-t-2 border-gray-300 dark:border-gray-700">
                    <td colSpan={5} className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">Grand Total</td>
                    <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-400">{formatCurrency(summary.grand_total)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}