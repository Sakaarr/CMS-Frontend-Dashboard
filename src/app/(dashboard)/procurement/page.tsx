"use client";

import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
  useVendors, usePurchaseOrders, useRFQs,
  useGRNs, useProcurementStats, useApprovePO,
  useCreateVendor, useCreatePO,
} from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, CheckCircle, Loader2, Moon, Sun } from "lucide-react";
import { useForm } from "react-hook-form";

const TABS = ["Purchase Orders", "Vendors", "RFQs", "GRNs"] as const;
type Tab = typeof TABS[number];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") ??
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  return { theme, toggle };
}

export default function ProcurementPage() {
  const { theme, toggle } = useTheme();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Procurement</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vendors, RFQs, purchase orders and receipts</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Project selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <select
          className="h-10 w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total POs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total_pos}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total PO value</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(stats.total_po_value)}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="pt-5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending approval</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.pending_approval}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Vendor form */}
      {showNewVendor && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">New Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {[
                { label: "Vendor name", placeholder: "", key: "name", required: true },
                { label: "Code", placeholder: "VND-001", key: "code", required: true },
                { label: "Contact person", placeholder: "", key: "contact_person" },
                { label: "Phone", placeholder: "", key: "phone" },
                { label: "Email", placeholder: "", key: "email", type: "email" },
                { label: "PAN number", placeholder: "", key: "pan_number" },
              ].map(({ label, placeholder, key, required, type }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
                  <input
                    type={type ?? "text"}
                    placeholder={placeholder}
                    className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    {...regV(key, { required })}
                  />
                </div>
              ))}
              <div className="col-span-2 lg:col-span-3 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowNewVendor(false)}>Cancel</Button>
                <Button
                  type="button"
                  loading={createVendor.isPending}
                  onClick={handleV(async d => {
                    await createVendor.mutateAsync(d);
                    resetV();
                    setShowNewVendor(false);
                  })}
                >
                  Create vendor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New PO form */}
      {showNewPO && selectedProjectId && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">New Purchase Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Vendor select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Vendor</label>
                <select
                  className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  {...regPO("vendor_id", { required: true })}
                >
                  <option value="">Select vendor...</option>
                  {vendors?.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                  ))}
                </select>
              </div>
              {/* Delivery date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Delivery date</label>
                <input
                  type="date"
                  className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  {...regPO("delivery_date")}
                />
              </div>
              {/* Remaining fields */}
              {[
                { label: "Item description", placeholder: "Cement OPC 43 Grade", key: "item_description", required: true },
                { label: "Unit", placeholder: "bag", key: "item_unit", required: true },
                { label: "Quantity", placeholder: "0", key: "item_quantity", required: true, type: "number" },
                { label: "Unit rate (NPR)", placeholder: "0", key: "item_rate", required: true, type: "number" },
              ].map(({ label, placeholder, key, required, type }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
                  <input
                    type={type ?? "text"}
                    placeholder={placeholder}
                    className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    {...regPO(key, { required })}
                  />
                </div>
              ))}
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowNewPO(false)}>Cancel</Button>
                <Button
                  type="button"
                  loading={createPO.isPending}
                  onClick={handlePO(async d => {
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
                  Create PO
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Purchase Orders tab */}
      {activeTab === "Purchase Orders" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-left">Delivery</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {posLoading ? (
                  <tr><td colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" /></td></tr>
                ) : !pos?.length ? (
                  <tr><td colSpan={6} className="py-10 text-center text-gray-400 dark:text-gray-500">No purchase orders yet</td></tr>
                ) : pos.map((po: any) => (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{po.po_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{po.vendor_id}</td>
                    <td className="px-4 py-3"><Badge status={po.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(po.grand_total)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(po.delivery_date)}</td>
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

      {/* Vendors tab */}
      {activeTab === "Vendors" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {vendorsLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" /></td></tr>
                ) : !vendors?.length ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400 dark:text-gray-500">No vendors yet</td></tr>
                ) : vendors.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{v.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{v.code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{v.category?.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.contact_person ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.phone ?? "—"}</td>
                    <td className="px-4 py-3"><Badge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* RFQs tab */}
      {activeTab === "RFQs" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">RFQ Number</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rfqsLoading ? (
                  <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" /></td></tr>
                ) : !rfqs?.length ? (
                  <tr><td colSpan={4} className="py-10 text-center text-gray-400 dark:text-gray-500">No RFQs for this project</td></tr>
                ) : rfqs.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{r.rfq_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{r.title}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(r.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* GRNs tab */}
      {activeTab === "GRNs" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">GRN Number</th>
                  <th className="px-4 py-3 text-left">Received Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {grnsLoading ? (
                  <tr><td colSpan={4} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" /></td></tr>
                ) : !grns?.length ? (
                  <tr><td colSpan={4} className="py-10 text-center text-gray-400 dark:text-gray-500">No GRNs yet</td></tr>
                ) : grns.map((g: any) => (
                  <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{g.grn_number}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(g.received_date)}</td>
                    <td className="px-4 py-3"><Badge status={g.status} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${g.inspection_passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
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