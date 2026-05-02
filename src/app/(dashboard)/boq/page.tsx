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

export default function BOQPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">BOQ & Estimation</h1>
        <p className="text-sm text-gray-500">Manage bill of quantities and budgets</p>
      </div>

      {/* Project selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-1">Project</label>
              <select
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="text-sm font-medium text-gray-700 block mb-1">Budget version</label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="mt-4 grid grid-cols-3 gap-3 border-t pt-4"
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
              <Input label="Version name" placeholder="Original Budget" {...regV("name", { required: true })} />
              <Input label="Contingency %" type="number" placeholder="5" {...regV("contingency_percentage")} />
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
            { label: "Grand Total", value: formatCurrency(summary.grand_total), color: "text-gray-900" },
            { label: "Planned", value: formatCurrency(summary.planned_total), color: "text-blue-600" },
            { label: "Actual", value: formatCurrency(summary.actual_total), color: "text-green-600" },
            { label: "Variance", value: formatCurrency(summary.variance), color: summary.variance >= 0 ? "text-green-600" : "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedVersionId && summary && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Cost breakdown pie */}
          <Card>
            <CardHeader><CardTitle>Cost breakdown</CardTitle></CardHeader>
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
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No cost data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Version details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Version details</CardTitle>
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
                  <div key={label} className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BOQ Items table */}
      {selectedVersionId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bill of Quantities ({summary?.items_count ?? 0} items)</CardTitle>
              <Button size="sm" onClick={() => setShowNewItem(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
            </div>
          </CardHeader>

          {/* New item form */}
          {showNewItem && (
            <div className="mx-6 mb-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
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
                <Input label="Item no." placeholder="1.1" {...regI("item_number", { required: true })} />
                <Input label="Description" placeholder="Earthwork excavation" {...regI("description", { required: true })} />
                <Input label="Unit" placeholder="cum" {...regI("unit", { required: true })} />
                <Input label="Quantity" type="number" {...regI("quantity")} />
                <Input label="Unit rate (NPR)" type="number" {...regI("unit_rate")} />
                <Input label="Material rate" type="number" {...regI("material_rate")} />
                <Input label="Labour rate" type="number" {...regI("labour_rate")} />
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
                <tr className="border-y border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
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
              <tbody className="divide-y divide-gray-100">
                {itemsLoading ? (
                  <tr><td colSpan={8} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : items?.length === 0 ? (
                  <tr><td colSpan={8} className="py-10 text-center text-gray-400">No items yet — add your first BOQ item</td></tr>
                ) : items?.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 transition-colors ${item.is_section_header ? "bg-blue-50 font-semibold" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.item_number}</td>
                    <td className="px-4 py-3 text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{item.unit}</td>
                    <td className="px-4 py-3 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{item.unit_rate.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium">{item.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{item.actual_quantity.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td colSpan={5} className="px-4 py-3 text-right text-gray-700">Grand Total</td>
                    <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(summary.grand_total)}</td>
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