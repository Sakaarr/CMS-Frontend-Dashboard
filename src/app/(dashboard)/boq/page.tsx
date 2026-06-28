"use client";

import { useState, useRef } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
  useBudgetVersions, useBOQItems,
  useBOQSummary, useCreateBudgetVersion,
  useCreateBOQItem, useApproveBudgetVersion,
  useImportBOQItems, useUpdateBOQItem,
  useDeleteBOQItem, useCostCodes,
  useCopyBudgetVersion,
} from "@/hooks/useBoq";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, CheckCircle, Loader2, Pencil, Trash2, Download, Copy, FileText, X } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";

const UNITS = ["sqm", "cum", "rmt", "nos", "kg", "mt", "lit", "bag", "ls", "day", "hour", "percent"] as const;
const selectClass = "h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";
const inputClass = "h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [color-scheme:light] dark:[color-scheme:dark]";

function Field({ label, className, ...props }: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input className={inputClass} {...props} />
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
  const { data: costCodes } = useCostCodes();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: versions, isLoading: versionsLoading, isError: versionsError } = useBudgetVersions(selectedProjectId);
  const { data: items, isLoading: itemsLoading, isError: itemsError } = useBOQItems(selectedVersionId);
  const { data: summary } = useBOQSummary(selectedVersionId);
  const createVersion = useCreateBudgetVersion(selectedProjectId);
  const copyVersion = useCopyBudgetVersion(selectedProjectId);
  const createItem = useCreateBOQItem(selectedProjectId, selectedVersionId);
  const updateItem = useUpdateBOQItem(selectedVersionId);
  const deleteItem = useDeleteBOQItem(selectedVersionId);
  const approveVersion = useApproveBudgetVersion(selectedProjectId);
  const importItems = useImportBOQItems(selectedProjectId, selectedVersionId);

  const { register: regV, handleSubmit: handleV, reset: resetV } = useForm();
  const { register: regI, handleSubmit: handleI, reset: resetI, watch: watchI, setValue: setValueI } = useForm();

  const selectedVersion = versions?.find(v => v.id === selectedVersionId);
  const isApproved = selectedVersion?.status === "approved";

  const costBreakdown = summary
    ? [
        { name: "Material", value: summary.total_material_cost, color: "#3b82f6" },
        { name: "Labour", value: summary.total_labour_cost, color: "#10b981" },
        { name: "Equipment", value: summary.total_equipment_cost, color: "#f59e0b" },
        { name: "Contingency", value: summary.contingency_amount, color: "#8b5cf6" },
      ].filter(d => d.value > 0)
    : [];

  const startEditing = (item: any) => {
    setEditingItemId(item.id);
    setEditValues({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      material_rate: item.material_rate,
      labour_rate: item.labour_rate,
      equipment_rate: item.equipment_rate,
      actual_quantity: item.actual_quantity,
    });
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditValues({});
  };

  const saveEditing = async (itemId: string) => {
    await updateItem.mutateAsync({ itemId, data: editValues });
    cancelEditing();
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm("Delete this BOQ item?")) {
      await deleteItem.mutateAsync(itemId);
    }
  };

  const exportCSV = () => {
    if (!items || items.length === 0) return;
    const headers = ["Item No", "Description", "Unit", "Quantity", "Unit Rate", "Material Rate", "Labour Rate", "Equipment Rate", "Amount", "Actual Qty", "Status"];
    const rows = items.map(i => [
      i.item_number, i.description, i.unit, i.quantity, i.unit_rate,
      i.material_rate, i.labour_rate, i.equipment_rate, i.amount,
      i.actual_quantity, i.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boq-${selectedVersion?.name ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBlob = async (endpoint: string, filename: string) => {
    try {
      const res = await apiClient.get(endpoint, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback to CSV if export fails
    }
  };

  const exportPDF = () => {
    downloadBlob(
      `/projects/${selectedProjectId}/budget-versions/${selectedVersionId}/pdf`,
      `boq-${selectedVersion?.name ?? "export"}.pdf`
    );
  };

  const exportExcel = () => {
    downloadBlob(
      `/projects/${selectedProjectId}/budget-versions/${selectedVersionId}/xlsx`,
      `boq-${selectedVersion?.name ?? "export"}.xlsx`
    );
  };

  // Calculate unit_rate from material+labour+equipment in add form
  const watchMatRate = watchI("material_rate");
  const watchLabRate = watchI("labour_rate");
  const watchEqpRate = watchI("equipment_rate");
  const watchQty = watchI("quantity");

  if (versionsError || itemsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="text-destructive text-4xl">!</div>
        <h3 className="text-lg font-semibold">Failed to load data</h3>
        <p className="text-muted-foreground text-sm">An error occurred while loading BOQ data</p>
      </div>
    );
  }

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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewVersion(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> New version
                </Button>
                {versions && versions.length > 0 && (
                  <Button variant="outline" onClick={async () => {
                    const latest = versions[0];
                    await copyVersion.mutateAsync({
                      versionId: latest.id,
                      name: `Copy of ${latest.name}`,
                    });
                  }} size="sm" loading={copyVersion.isPending}>
                    <Copy className="h-4 w-4 mr-1" /> Create from previous
                  </Button>
                )}
              </div>
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
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportPDF}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportExcel}>
                    <Download className="h-4 w-4 mr-1" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  {isApproved ? (
                    <Badge status="approved" label="Approved & Locked" />
                  ) : (
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
              {!isApproved && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setShowImport(!showImport); setShowNewItem(false); }}>
                    <Plus className="h-4 w-4 mr-1" /> Import Excel
                  </Button>
                  <Button size="sm" onClick={() => { setShowNewItem(true); setShowImport(false); }}>
                    <Plus className="h-4 w-4 mr-1" /> Add item
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          {isApproved && (
            <div className="mx-6 mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              This budget version is approved and locked. No changes allowed.
            </div>
          )}

          {/* Import from Excel */}
          {showImport && (
            <div className="mx-6 mb-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload an Excel file (.xlsx) with columns: item_number, description, unit, quantity, unit_rate, etc.
              </p>
              <input
                type="file" accept=".xlsx,.xls"
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                onChange={e => {
                  const f = e.target.files?.[0];
                  setImportFile(f ?? null);
                  setImportResult(null);
                  setImportError(null);
                }}
              />
              {importFile && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">
                    File selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                  {importError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mb-2">✕ {importError}</p>
                  )}
                  {importResult && (
                    <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                      ✓ {importResult.imported} items imported
                      {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                    </p>
                  )}
                  {!importResult && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        loading={importItems.isPending}
                        onClick={async () => {
                          if (!importFile) return;
                          try {
                            const res = await importItems.mutateAsync(importFile);
                            setImportResult({ imported: res.data.data.imported, skipped: res.data.data.skipped });
                            setImportFile(null);
                            setImportError(null);
                          } catch (e: any) {
                            setImportError(e?.response?.data?.message ?? "Import failed");
                          }
                        }}
                      >
                        Import
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); setImportError(null); }}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New item form */}
          {showNewItem && (
            <div className="mx-6 mb-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
              <form
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
                onSubmit={handleI(async d => {
                  const mat = parseFloat(d.material_rate) || 0;
                  const lab = parseFloat(d.labour_rate) || 0;
                  const eqp = parseFloat(d.equipment_rate) || 0;
                  await createItem.mutateAsync({
                    item_number: d.item_number,
                    description: d.description,
                    unit: d.unit,
                    quantity: parseFloat(d.quantity) || 0,
                    unit_rate: mat + lab + eqp,
                    material_rate: mat,
                    labour_rate: lab,
                    equipment_rate: eqp,
                    is_section_header: d.is_section_header === "true",
                    cost_code_id: d.cost_code_id || null,
                  });
                  resetI();
                  setShowNewItem(false);
                })}
              >
                <Field label="Item no." placeholder="1.1" {...regI("item_number", { required: true })} />
                <Field label="Description" placeholder="Earthwork excavation" {...regI("description")} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit</label>
                  <select className={selectClass} {...regI("unit")}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <Field label="Quantity" type="number" placeholder="0" {...regI("quantity")} />
                <Field label="Material rate" type="number" placeholder="0" {...regI("material_rate")} />
                <Field label="Labour rate" type="number" placeholder="0" {...regI("labour_rate")} />
                <Field label="Equipment rate" type="number" placeholder="0" {...regI("equipment_rate")} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Cost code</label>
                  <select className={selectClass} {...regI("cost_code_id")}>
                    <option value="">None</option>
                    {costCodes?.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Section header</label>
                  <select className={selectClass} {...regI("is_section_header")}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" size="sm" loading={createItem.isPending}>Add</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewItem(false)}>Cancel</Button>
                </div>
              </form>
              <p className="text-xs text-gray-400 mt-2">
                Unit rate = material + labour + equipment. Amount = qty × unit rate.
              </p>
            </div>
          )}

          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">No.</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Unit</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Mat Rate</th>
                  <th className="px-4 py-3 text-right">Lab Rate</th>
                  <th className="px-4 py-3 text-right">Eqp Rate</th>
                  <th className="px-4 py-3 text-right">Unit Rate</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  {!isApproved && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {itemsLoading ? (
                  <tr>
                    <td colSpan={isApproved ? 11 : 12} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
                    </td>
                  </tr>
                ) : items?.length === 0 ? (
                  <tr>
                    <td colSpan={isApproved ? 11 : 12} className="py-10 text-center text-gray-400 dark:text-gray-500">
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
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {editingItemId === item.id ? (
                        <input className={`${inputClass} w-full`} value={editValues.description ?? ""} onChange={e => setEditValues(prev => ({ ...prev, description: e.target.value }))} />
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {editingItemId === item.id ? (
                        <select className={selectClass} value={editValues.unit ?? item.unit} onChange={e => setEditValues(prev => ({ ...prev, unit: e.target.value }))}>
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      ) : item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {editingItemId === item.id ? (
                        <input className={`${inputClass} w-20 text-right`} type="number" value={editValues.quantity ?? ""} onChange={e => setEditValues(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))} />
                      ) : item.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                      {editingItemId === item.id ? (
                        <input className={`${inputClass} w-20 text-right`} type="number" value={editValues.material_rate ?? ""} onChange={e => setEditValues(prev => ({ ...prev, material_rate: parseFloat(e.target.value) || 0 }))} />
                      ) : item.material_rate.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                      {editingItemId === item.id ? (
                        <input className={`${inputClass} w-20 text-right`} type="number" value={editValues.labour_rate ?? ""} onChange={e => setEditValues(prev => ({ ...prev, labour_rate: parseFloat(e.target.value) || 0 }))} />
                      ) : item.labour_rate.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                      {editingItemId === item.id ? (
                        <input className={`${inputClass} w-20 text-right`} type="number" value={editValues.equipment_rate ?? ""} onChange={e => setEditValues(prev => ({ ...prev, equipment_rate: parseFloat(e.target.value) || 0 }))} />
                      ) : item.equipment_rate.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{item.unit_rate.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{item.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {editingItemId === item.id ? (
                        <input className={`${inputClass} w-20 text-right`} type="number" value={editValues.actual_quantity ?? ""} onChange={e => setEditValues(prev => ({ ...prev, actual_quantity: parseFloat(e.target.value) || 0 }))} />
                      ) : item.actual_quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3"><Badge status={item.status} /></td>
                    {!isApproved && (
                      <td className="px-4 py-3 text-right">
                        {editingItemId === item.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Button size="sm" variant="success" onClick={() => saveEditing(item.id)} loading={updateItem.isPending}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => startEditing(item)} className="p-1 text-gray-400 hover:text-blue-500" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-400 hover:text-red-500" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold border-t-2 border-gray-300 dark:border-gray-700">
                    <td colSpan={8} className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">Grand Total</td>
                    <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-400">{formatCurrency(summary.grand_total)}</td>
                    <td colSpan={isApproved ? 2 : 3} />
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
