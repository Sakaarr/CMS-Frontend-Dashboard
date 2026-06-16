"use client";

import { useState } from "react";
import {
  useWarehouses, useStock, useLowStockAlerts,
  useMaterialRequests, useCreateWarehouse,
  useRecordTransaction, useCreateMR,
  useSubmitMR, useApproveMR, useIssueMR,
} from "@/hooks/useInventory";
import { useProjects } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, Plus, Warehouse, Loader2, CheckCircle, ArrowDown, ArrowUp } from "lucide-react";
import { useForm } from "react-hook-form";

const TABS = ["Warehouses & Stock", "Stock Adjustment", "Material Requests", "Low Stock Alerts"] as const;
type Tab = typeof TABS[number];

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Warehouses & Stock");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [showNewWarehouse, setShowNewWarehouse] = useState(false);
  const [showNewMR, setShowNewMR] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: projects } = useProjects();
  const { data: warehouses, isLoading: whLoading } = useWarehouses(selectedProjectId || undefined);
  const { data: stock, isLoading: stockLoading } = useStock(selectedWarehouseId);
  const { data: alerts } = useLowStockAlerts(selectedProjectId || undefined);
  const { data: mrs, isLoading: mrsLoading } = useMaterialRequests(selectedProjectId);

  const createWarehouse = useCreateWarehouse();
  const recordTransaction = useRecordTransaction(selectedWarehouseId);
  const createMR = useCreateMR(selectedProjectId);
  const submitMR = useSubmitMR(selectedProjectId);
  const approveMR = useApproveMR(selectedProjectId);
  const issueMR = useIssueMR(selectedProjectId);

  const { register: regWH, handleSubmit: handleWH, reset: resetWH } = useForm();
  const { register: regAdj, handleSubmit: handleAdj, reset: resetAdj } = useForm();
  const { register: regMR, handleSubmit: handleMR, reset: resetMR } = useForm();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Warehouses, stock and material requests</p>
        </div>
        {alerts && alerts.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {alerts.length} low stock alert{alerts.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="h-10 w-56 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedProjectId}
          onChange={e => { setSelectedProjectId(e.target.value); setSelectedWarehouseId(""); }}
        >
          <option value="">Select project...</option>
          {projects?.data.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Button size="sm" onClick={() => setShowNewWarehouse(true)}>
          <Plus className="h-4 w-4 mr-1" /> New warehouse
        </Button>
        {selectedProjectId && (
          <Button size="sm" variant="outline" onClick={() => setShowNewMR(true)}>
            <Plus className="h-4 w-4 mr-1" /> Material request
          </Button>
        )}
        {selectedWarehouseId && (
          <Button size="sm" variant="outline" onClick={() => setShowAdjustment(true)}>
            <ArrowDown className="h-4 w-4 mr-1" /> Add stock / adjustment
          </Button>
        )}
      </div>

      {/* Create warehouse form */}
      {showNewWarehouse && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">New Warehouse</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleWH(async d => {
                setFormError("");
                try {
                  await createWarehouse.mutateAsync({
                    name: d.name,
                    code: d.code,
                    project_id: selectedProjectId || undefined,
                    is_site_store: d.is_site_store === "true",
                    address: d.address || undefined,
                  });
                  resetWH(); setShowNewWarehouse(false);
                } catch (e: any) {
                  setFormError(e?.response?.data?.message || "Failed to create warehouse");
                }
              })}
            >
              <Input label="Warehouse name" placeholder="Main Store" {...regWH("name", { required: true })} />
              <Input label="Code" placeholder="WH-001" {...regWH("code", { required: true })} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Type</label>
                <select className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm" {...regWH("is_site_store")}>
                  <option value="false">Central warehouse</option>
                  <option value="true">Site store</option>
                </select>
              </div>
              <Input label="Address" placeholder="Location/address" {...regWH("address")} />
              {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setShowNewWarehouse(false); resetWH(); }}>Cancel</Button>
                <Button type="submit" loading={createWarehouse.isPending}>Create warehouse</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stock adjustment form */}
      {showAdjustment && selectedWarehouseId && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">
              Add Stock / Adjustment — {(warehouses ?? []).find((w: any) => w.id === selectedWarehouseId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleAdj(async d => {
                setFormError("");
                try {
                  await recordTransaction.mutateAsync({
                    material_code: d.material_code,
                    description: d.description,
                    unit: d.unit,
                    quantity: parseFloat(d.quantity) || 0,
                    unit_cost: parseFloat(d.unit_cost) || 0,
                    transaction_type: d.transaction_type,
                    notes: d.notes || undefined,
                  });
                  resetAdj(); setShowAdjustment(false);
                } catch (e: any) {
                  setFormError(e?.response?.data?.message || "Failed to record transaction");
                }
              })}
            >
              <Input label="Material code" placeholder="CEM-001" {...regAdj("material_code", { required: true })} />
              <Input label="Description" placeholder="OPC Cement 43 Grade" {...regAdj("description", { required: true })} />
              <Input label="Unit" placeholder="bag" {...regAdj("unit", { required: true })} />
              <Input label="Quantity" type="number" step="0.01" {...regAdj("quantity", { required: true })} />
              <Input label="Unit cost (NPR)" type="number" step="0.01" defaultValue="0" {...regAdj("unit_cost")} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Transaction type</label>
                <select className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm" {...regAdj("transaction_type")}>
                  <option value="receipt">Receipt (stock in)</option>
                  <option value="adjustment">Adjustment (manual correction)</option>
                  <option value="return">Return (from site)</option>
                </select>
              </div>
              <Input label="Notes" placeholder="Source or reason" {...regAdj("notes")} />
              {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setShowAdjustment(false); resetAdj(); }}>Cancel</Button>
                <Button type="submit" loading={recordTransaction.isPending}>Record transaction</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Material request form */}
      {showNewMR && selectedProjectId && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">New Material Request</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleMR(async d => {
                setFormError("");
                try {
                  await createMR.mutateAsync({
                    purpose: d.purpose || undefined,
                    required_date: d.required_date || undefined,
                    from_warehouse_id: d.from_warehouse_id || undefined,
                    items: [{
                      material_code: d.material_code,
                      description: d.description,
                      unit: d.unit,
                      requested_quantity: parseFloat(d.quantity) || 0,
                    }],
                  });
                  resetMR(); setShowNewMR(false);
                } catch (e: any) {
                  setFormError(e?.response?.data?.message || "Failed to create MR");
                }
              })}
            >
              <Input label="Purpose" placeholder="Foundation concrete pour" {...regMR("purpose")} />
              <Input label="Required date" type="date" {...regMR("required_date")} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">From warehouse</label>
                <select className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm" {...regMR("from_warehouse_id")}>
                  <option value="">Any warehouse</option>
                  {(warehouses ?? []).map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>
              <div />
              <Input label="Material code" placeholder="CEM-001" {...regMR("material_code", { required: true })} />
              <Input label="Description" placeholder="OPC Cement 43 Grade" {...regMR("description", { required: true })} />
              <Input label="Unit" placeholder="bag" {...regMR("unit", { required: true })} />
              <Input label="Quantity" type="number" {...regMR("quantity", { required: true })} />
              {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setShowNewMR(false); resetMR(); }}>Cancel</Button>
                <Button type="submit" loading={createMR.isPending}>Create MR</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {tab}
            {tab === "Low Stock Alerts" && alerts?.length ? (
              <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-xs font-medium">
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
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : !(warehouses ?? []).length ? (
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="py-12 text-center">
                <Warehouse className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-400">No warehouses yet</p>
                <p className="text-xs text-gray-400 mt-1">Click '+ New warehouse' to create one</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(warehouses ?? []).map((wh: any) => (
                <Card
                  key={wh.id}
                  className={`cursor-pointer transition-all dark:bg-gray-900 dark:border-gray-800 ${
                    selectedWarehouseId === wh.id
                      ? "ring-2 ring-blue-500"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                >
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
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
                    {selectedWarehouseId === wh.id && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        ← Click to view stock below
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stock table */}
          {selectedWarehouseId && (
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="dark:text-gray-100">
                    Stock — {(warehouses ?? []).find((w: any) => w.id === selectedWarehouseId)?.name}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowAdjustment(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add stock
                  </Button>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Unit</th>
                      <th className="px-4 py-3 text-right">On Hand</th>
                      <th className="px-4 py-3 text-right">Available</th>
                      <th className="px-4 py-3 text-right">Reorder level</th>
                      <th className="px-4 py-3 text-right">Unit cost</th>
                      <th className="px-4 py-3 text-center">Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {stockLoading ? (
                      <tr><td colSpan={8} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                    ) : !(stock ?? []).length ? (
                      <tr><td colSpan={8} className="py-10 text-center text-gray-400">No stock items — use 'Add stock' to record inventory</td></tr>
                    ) : (stock ?? []).map((item: any) => (
                      <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 ${item.needs_reorder ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{item.material_code}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{item.description}</td>
                        <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{item.quantity_on_hand.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{item.available_quantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{item.reorder_level.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(item.unit_cost)}</td>
                        <td className="px-4 py-3 text-center">
                          {item.needs_reorder && (
                            <span className="flex items-center justify-center gap-1 text-xs text-amber-600 font-medium">
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
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">MR Number</th>
                  <th className="px-4 py-3 text-left">Purpose</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Required date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {mrsLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : !selectedProjectId ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">Select a project above</td></tr>
                ) : !(mrs ?? []).length ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No material requests — click '+ Material request' to create one</td></tr>
                ) : (mrs ?? []).map((mr: any) => (
                  <tr key={mr.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{mr.mr_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{mr.purpose ?? "—"}</td>
                    <td className="px-4 py-3"><Badge status={mr.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{mr.required_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {mr.status === "draft" && (
                          <Button size="sm" variant="outline"
                            loading={submitMR.isPending}
                            onClick={() => submitMR.mutate(mr.id)}
                          >Submit</Button>
                        )}
                        {mr.status === "submitted" && (
                          <Button size="sm" variant="success"
                            loading={approveMR.isPending}
                            onClick={() => approveMR.mutate({
                              mrId: mr.id,
                              items: (mr.items ?? []).map((i: any) => ({
                                item_id: i.id,
                                approved_quantity: i.requested_quantity,
                              })),
                            })}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        )}
                        {mr.status === "approved" && (
                          <Button size="sm" variant="default"
                            loading={issueMR.isPending}
                            onClick={() => issueMR.mutate(mr.id)}
                          >Issue materials</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Low Stock */}
      {activeTab === "Low Stock Alerts" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Reorder Level</th>
                  <th className="px-4 py-3 text-right">Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!(alerts ?? []).length ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">🎉 No low stock alerts</td></tr>
                ) : (alerts ?? []).map((item: any) => (
                  <tr key={item.id} className="bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20">
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

      {activeTab === "Stock Adjustment" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="py-10 text-center">
            {!selectedWarehouseId ? (
              <p className="text-gray-400">Select a warehouse from the Warehouses & Stock tab first, then use the 'Add stock' button</p>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Recording adjustment for: <strong>{(warehouses ?? []).find((w: any) => w.id === selectedWarehouseId)?.name}</strong>
                </p>
                <Button onClick={() => setShowAdjustment(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add stock / adjustment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}