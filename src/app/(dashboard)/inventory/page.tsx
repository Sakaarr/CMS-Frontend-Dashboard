"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
    useApproveMR,
    useCreateMR,
    useLowStockAlerts,
    useMaterialRequests,
    useStock,
    useSubmitMR,
    useWarehouses,
} from "@/hooks/useInventory";
import { useProjects } from "@/hooks/useProjects";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, Loader2, Plus, Warehouse } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";

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

const TABS = ["Warehouses & Stock", "Material Requests", "Low Stock Alerts"] as const;
type Tab = typeof TABS[number];

export default function InventoryPage() {
  return (
    <PermissionGuard module="can_inventory">
      <InventoryPageContent />
    </PermissionGuard>
  );
}
function InventoryPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>("Warehouses & Stock");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [showNewMR, setShowNewMR] = useState(false);

  const { data: projects } = useProjects();
  const { data: warehouses, isLoading: whLoading } = useWarehouses(selectedProjectId || undefined);
  const { data: stock, isLoading: stockLoading } = useStock(selectedWarehouseId);
  const { data: alerts } = useLowStockAlerts(selectedProjectId || undefined);
  const { data: mrs, isLoading: mrsLoading } = useMaterialRequests(selectedProjectId);
  const createMR = useCreateMR(selectedProjectId);
  const submitMR = useSubmitMR(selectedProjectId);
  const approveMR = useApproveMR(selectedProjectId);

  const { register, handleSubmit, reset } = useForm();

  const selectClass =
    "h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Warehouses, stock and material requests</p>
        </div>
        {alerts && alerts.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {alerts.length} low stock alert{alerts.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          className={`w-56 ${selectClass}`}
          value={selectedProjectId}
          onChange={e => { setSelectedProjectId(e.target.value); setSelectedWarehouseId(""); }}
        >
          <option value="">All projects</option>
          {projects?.data.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {warehouses && warehouses.length > 0 && activeTab === "Warehouses & Stock" && (
          <select
            className={`w-56 ${selectClass}`}
            value={selectedWarehouseId}
            onChange={e => setSelectedWarehouseId(e.target.value)}
          >
            <option value="">Select warehouse...</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
        )}
        {selectedProjectId && activeTab === "Material Requests" && (
          <Button size="sm" onClick={() => setShowNewMR(true)}>
            <Plus className="h-4 w-4 mr-1" /> New MR
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab}
            {tab === "Low Stock Alerts" && alerts?.length ? (
              <span className="ml-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-xs font-medium">
                {alerts.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Warehouses & Stock */}
      {activeTab === "Warehouses & Stock" && (
        <div className="space-y-4">
          {whLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          ) : !warehouses?.length ? (
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="py-10 text-center text-gray-400 dark:text-gray-500">
                No warehouses found
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {warehouses.map((wh: any) => (
                <Card
                  key={wh.id}
                  className={`cursor-pointer transition-all dark:bg-gray-900 dark:border-gray-800 ${
                    selectedWarehouseId === wh.id
                      ? "ring-2 ring-blue-500 dark:ring-blue-400"
                      : "hover:shadow-md dark:hover:border-gray-600"
                  }`}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                >
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50">
                        <Warehouse className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{wh.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{wh.code}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge status={wh.status} />
                      {wh.is_site_store && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Site store</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stock table */}
          {selectedWarehouseId && (
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">
                  Stock — {warehouses?.find((w: any) => w.id === selectedWarehouseId)?.name}
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Unit</th>
                      <th className="px-4 py-3 text-right">On Hand</th>
                      <th className="px-4 py-3 text-right">Available</th>
                      <th className="px-4 py-3 text-right">Reorder Level</th>
                      <th className="px-4 py-3 text-right">Unit Cost</th>
                      <th className="px-4 py-3 text-left">Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stockLoading ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
                        </td>
                      </tr>
                    ) : !stock?.length ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-gray-400 dark:text-gray-500">
                          No stock items in this warehouse
                        </td>
                      </tr>
                    ) : stock.map((item: any) => (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          item.needs_reorder
                            ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{item.material_code}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{item.description}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.unit}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{item.quantity_on_hand.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{item.available_quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{item.reorder_level.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(item.unit_cost)}</td>
                        <td className="px-4 py-3">
                          {item.needs_reorder && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                              <AlertTriangle className="h-3 w-3" /> Low
                            </span>
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
      )}

      {/* Material Requests */}
      {activeTab === "Material Requests" && (
        <div className="space-y-4">
          {showNewMR && (
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">New Material Request</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="grid grid-cols-2 gap-4"
                  onSubmit={handleSubmit(async d => {
                    await createMR.mutateAsync({
                      purpose: d.purpose,
                      required_date: d.required_date,
                      items: [{
                        material_code: d.material_code,
                        description: d.description,
                        unit: d.unit,
                        requested_quantity: parseFloat(d.quantity) || 0,
                      }],
                    });
                    reset();
                    setShowNewMR(false);
                  })}
                >
                  <Field label="Purpose" placeholder="Foundation concrete pour" {...register("purpose")} />
                  <Field label="Required date" type="date" {...register("required_date")} />
                  <Field label="Material code" placeholder="CEM-001" {...register("material_code", { required: true })} />
                  <Field label="Description" placeholder="OPC Cement 43 Grade" {...register("description", { required: true })} />
                  <Field label="Unit" placeholder="bag" {...register("unit", { required: true })} />
                  <Field label="Quantity" type="number" {...register("quantity", { required: true })} />
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setShowNewMR(false)}>Cancel</Button>
                    <Button type="submit" loading={createMR.isPending}>Create MR</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 text-left">MR Number</th>
                    <th className="px-4 py-3 text-left">Purpose</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Required Date</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {mrsLoading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
                      </td>
                    </tr>
                  ) : !mrs?.length ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-gray-400 dark:text-gray-500">
                        No material requests yet
                      </td>
                    </tr>
                  ) : mrs.map((mr: any) => (
                    <tr key={mr.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{mr.mr_number}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{mr.purpose ?? "—"}</td>
                      <td className="px-4 py-3"><Badge status={mr.status} /></td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{mr.required_date ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {mr.status === "draft" && (
                            <Button
                              size="sm" variant="outline"
                              loading={submitMR.isPending}
                              onClick={() => submitMR.mutate(mr.id)}
                            >Submit</Button>
                          )}
                          {mr.status === "submitted" && (
                            <Button
                              size="sm" variant="success"
                              loading={approveMR.isPending}
                              onClick={() => approveMR.mutate({
                                mrId: mr.id,
                                items: mr.items.map((i: any) => ({
                                  item_id: i.id,
                                  approved_quantity: i.requested_quantity,
                                })),
                              })}
                            >Approve</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Low Stock Alerts */}
      {activeTab === "Low Stock Alerts" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Reorder Level</th>
                  <th className="px-4 py-3 text-right">Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!alerts?.length ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400 dark:text-gray-500">
                      No low stock alerts 🎉
                    </td>
                  </tr>
                ) : alerts.map((item: any) => (
                  <tr
                    key={item.id}
                    className="bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{item.material_code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{item.description}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{item.quantity_on_hand}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.reorder_level}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-700 dark:text-amber-400">
                      {(item.reorder_level - item.quantity_on_hand).toFixed(2)}
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