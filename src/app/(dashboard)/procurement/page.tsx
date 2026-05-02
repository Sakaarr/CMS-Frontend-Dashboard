"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
  useVendors, usePurchaseOrders, useRFQs,
  useGRNs, useProcurementStats, useApprovePO,
  useCreateVendor, useCreatePO,
} from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, CheckCircle, Loader2, Users, ShoppingCart, FileText, Package } from "lucide-react";
import { useForm } from "react-hook-form";

const TABS = ["Purchase Orders", "Vendors", "RFQs", "GRNs"] as const;
type Tab = typeof TABS[number];

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Purchase Orders");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [showNewPO, setShowNewPO] = useState(false);

  const { data: projects } = useProjects();
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const { data: pos, isLoading: posLoading } = usePurchaseOrders(selectedProjectId);
  const { data: rfqs, isLoading: rfqsLoading } = useRFQs(selectedProjectId);
  const { data: grns, isLoading: grnsLoading } = useGRNs(selectedProjectId);
  const { data: stats } = useProcurementStats(selectedProjectId);
  const approvePO = useApprovePO(selectedProjectId);
  const createVendor = useCreateVendor();
  const createPO = useCreatePO(selectedProjectId);

  const { register: regV, handleSubmit: handleV, reset: resetV } = useForm();
  const { register: regPO, handleSubmit: handlePO, reset: resetPO } = useForm();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement</h1>
          <p className="text-sm text-gray-500">Vendors, RFQs, purchase orders and receipts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNewVendor(true)}>
            <Plus className="h-4 w-4 mr-1" /> Vendor
          </Button>
          {selectedProjectId && (
            <Button size="sm" onClick={() => setShowNewPO(true)}>
              <Plus className="h-4 w-4 mr-1" /> Purchase Order
            </Button>
          )}
        </div>
      </div>

      {/* Project selector + stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <select
          className="h-10 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
        >
          <option value="">All projects</option>
          {projects?.data.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      {stats && selectedProjectId && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-5">
            <p className="text-xs text-gray-500">Total POs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_pos}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-xs text-gray-500">Total PO value</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(stats.total_po_value)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <p className="text-xs text-gray-500">Pending approval</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending_approval}</p>
          </CardContent></Card>
        </div>
      )}

      {/* New Vendor form */}
      {showNewVendor && (
        <Card>
          <CardHeader><CardTitle>New Vendor</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4 lg:grid-cols-3"
              onSubmit={handleV(async d => {
                await createVendor.mutateAsync(d);
                resetV();
                setShowNewVendor(false);
              })}
            >
              <Input label="Vendor name" {...regV("name", { required: true })} />
              <Input label="Code" placeholder="VND-001" {...regV("code", { required: true })} />
              <Input label="Contact person" {...regV("contact_person")} />
              <Input label="Phone" {...regV("phone")} />
              <Input label="Email" type="email" {...regV("email")} />
              <Input label="PAN number" {...regV("pan_number")} />
              <div className="col-span-2 lg:col-span-3 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowNewVendor(false)}>Cancel</Button>
                <Button type="submit" loading={createVendor.isPending}>Create vendor</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* New PO form */}
      {showNewPO && selectedProjectId && (
        <Card>
          <CardHeader><CardTitle>New Purchase Order</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handlePO(async d => {
                await createPO.mutateAsync({
                  vendor_id: d.vendor_id,
                  delivery_date: d.delivery_date || undefined,
                  payment_terms: d.payment_terms,
                  currency: "NPR",
                  items: [{
                    description: d.item_description,
                    unit: d.item_unit,
                    quantity: parseFloat(d.item_quantity) || 0,
                    unit_rate: parseFloat(d.item_rate) || 0,
                  }],
                });
                resetPO();
                setShowNewPO(false);
              })}
            >
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Vendor</label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...regPO("vendor_id", { required: true })}
                >
                  <option value="">Select vendor...</option>
                  {vendors?.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                  ))}
                </select>
              </div>
              <Input label="Delivery date" type="date" {...regPO("delivery_date")} />
              <Input label="Item description" placeholder="Cement OPC 43 Grade" {...regPO("item_description", { required: true })} />
              <Input label="Unit" placeholder="bag" {...regPO("item_unit", { required: true })} />
              <Input label="Quantity" type="number" {...regPO("item_quantity", { required: true })} />
              <Input label="Unit rate (NPR)" type="number" {...regPO("item_rate", { required: true })} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowNewPO(false)}>Cancel</Button>
                <Button type="submit" loading={createPO.isPending}>Create PO</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Purchase Orders" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-left">Delivery</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posLoading ? (
                  <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : !pos?.length ? (
                  <tr><td colSpan={6} className="py-10 text-center text-gray-400">No purchase orders yet</td></tr>
                ) : pos.map((po: any) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{po.po_number}</td>
                    <td className="px-4 py-3 text-gray-900">{po.vendor_id}</td>
                    <td className="px-4 py-3"><Badge status={po.status} /></td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(po.grand_total)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(po.delivery_date)}</td>
                    <td className="px-4 py-3">
                      {po.status === "pending_approval" && (
                        <Button
                          size="sm"
                          variant="success"
                          loading={approvePO.isPending}
                          onClick={() => approvePO.mutate(po.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Approve
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

      {activeTab === "Vendors" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendorsLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : !vendors?.length ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No vendors yet</td></tr>
                ) : vendors.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-500">{v.code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{v.category?.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-gray-600">{v.contact_person ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{v.phone ?? "—"}</td>
                    <td className="px-4 py-3"><Badge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "RFQs" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">RFQ Number</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rfqsLoading ? (
                  <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : !rfqs?.length ? (
                  <tr><td colSpan={4} className="py-10 text-center text-gray-400">No RFQs for this project</td></tr>
                ) : rfqs.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.rfq_number}</td>
                    <td className="px-4 py-3 text-gray-900">{r.title}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(r.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "GRNs" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">GRN Number</th>
                  <th className="px-4 py-3 text-left">Received Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grnsLoading ? (
                  <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : !grns?.length ? (
                  <tr><td colSpan={4} className="py-10 text-center text-gray-400">No GRNs yet</td></tr>
                ) : grns.map((g: any) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{g.grn_number}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(g.received_date)}</td>
                    <td className="px-4 py-3"><Badge status={g.status} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${g.inspection_passed ? "text-green-600" : "text-red-600"}`}>
                        {g.inspection_passed ? "Passed" : "Failed"}
                      </span>
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