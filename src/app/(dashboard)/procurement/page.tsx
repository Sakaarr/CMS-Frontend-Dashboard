"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import {
  useVendors, usePurchaseOrders, useRFQs, useGRNs,
  useProcurementStats, useApprovePO, useSubmitPO,
  useCreateVendor, useCreatePO, useCreateRFQ,
  useSendRFQ, useCreateGRN, useConfirmGRN,
} from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, downloadFile } from "@/lib/utils";
import {
  Plus, CheckCircle, Loader2, Send,
  PackageCheck, FileText, FileDown,
} from "lucide-react";
import { useForm } from "react-hook-form";

const TABS = ["Purchase Orders", "Vendors", "RFQs", "GRNs"] as const;
type Tab = typeof TABS[number];

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Purchase Orders");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [showNewPO, setShowNewPO] = useState(false);
  const [showNewRFQ, setShowNewRFQ] = useState(false);
  const [showNewGRN, setShowNewGRN] = useState(false);
  const [grnForPO, setGrnForPO] = useState<any>(null);
  const [formError, setFormError] = useState("");

  const { data: projects } = useProjects();
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const { data: pos, isLoading: posLoading } = usePurchaseOrders(selectedProjectId);
  const { data: rfqs, isLoading: rfqsLoading } = useRFQs(selectedProjectId);
  const { data: grns, isLoading: grnsLoading } = useGRNs(selectedProjectId);
  const { data: stats } = useProcurementStats(selectedProjectId);

  const approvePO = useApprovePO(selectedProjectId);
  const submitPO = useSubmitPO(selectedProjectId);
  const createVendor = useCreateVendor();
  const createPO = useCreatePO(selectedProjectId);
  const createRFQ = useCreateRFQ(selectedProjectId);
  const sendRFQ = useSendRFQ(selectedProjectId);
  const createGRN = useCreateGRN(selectedProjectId);
  const confirmGRN = useConfirmGRN(selectedProjectId);

  const { register: regV, handleSubmit: handleV, reset: resetV } = useForm();
  const { register: regPO, handleSubmit: handlePO, reset: resetPO } = useForm();
  const { register: regRFQ, handleSubmit: handleRFQ, reset: resetRFQ } = useForm();
  const { register: regGRN, handleSubmit: handleGRN, reset: resetGRN } = useForm();

  const approvedOrSentPOs = (pos ?? []).filter((p: any) =>
    ["approved", "sent", "partially_received"].includes(p.status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Procurement
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vendors, RFQs, purchase orders and goods receipts
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowNewVendor(true)}>
            <Plus className="h-4 w-4 mr-1" /> Vendor
          </Button>
          {selectedProjectId && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowNewRFQ(true)}>
                <Plus className="h-4 w-4 mr-1" /> RFQ
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => setShowNewGRN(true)}
                disabled={!approvedOrSentPOs.length}
                title={!approvedOrSentPOs.length ? "Need an approved PO first" : ""}
              >
                <PackageCheck className="h-4 w-4 mr-1" /> GRN
              </Button>
              <Button size="sm" onClick={() => setShowNewPO(true)}>
                <Plus className="h-4 w-4 mr-1" /> Purchase Order
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Project selector */}
      <select
        className="h-10 w-full max-w-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={selectedProjectId}
        onChange={e => setSelectedProjectId(e.target.value)}
      >
        <option value="">Select a project to view POs, RFQs & GRNs</option>
        {projects?.data.map((p: any) => (
          <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
        ))}
      </select>

      {/* Stats */}
      {stats && selectedProjectId && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total POs", value: stats.total_pos, color: "text-gray-900 dark:text-gray-100" },
            { label: "Total PO value", value: formatCurrency(stats.total_po_value), color: "text-blue-600 dark:text-blue-400" },
            { label: "Pending approval", value: stats.pending_approval, color: stats.pending_approval > 0 ? "text-amber-600" : "text-gray-900 dark:text-gray-100" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-5">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── New Vendor form ── */}
      {showNewVendor && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">New Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4 lg:grid-cols-3"
              onSubmit={handleV(async d => {
                setFormError("");
                try {
                  await createVendor.mutateAsync(d);
                  resetV(); setShowNewVendor(false);
                } catch (e: any) {
                  setFormError(e?.response?.data?.message || "Failed to create vendor");
                }
              })}
            >
              <Input label="Vendor name" {...regV("name", { required: true })} />
              <Input label="Code" placeholder="VND-001" {...regV("code", { required: true })} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Category</label>
                <select className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm" {...regV("category")}>
                  <option value="material_supplier">Material Supplier</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="equipment_rental">Equipment Rental</option>
                  <option value="consultant">Consultant</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Input label="Contact person" {...regV("contact_person")} />
              <Input label="Phone" {...regV("phone")} />
              <Input label="Email" type="email" {...regV("email")} />
              <Input label="PAN number" {...regV("pan_number")} />
              <Input label="VAT number" {...regV("vat_number")} />
              <Input label="Credit days" type="number" defaultValue="0" {...regV("credit_days", { valueAsNumber: true })} />
              {formError && <p className="col-span-3 text-sm text-red-600">{formError}</p>}
              <div className="col-span-3 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setShowNewVendor(false); resetV(); setFormError(""); }}>Cancel</Button>
                <Button type="submit" loading={createVendor.isPending}>Create vendor</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── New RFQ form ── */}
      {showNewRFQ && selectedProjectId && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">New RFQ</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleRFQ(async d => {
                setFormError("");
                try {
                  await createRFQ.mutateAsync({
                    title: d.title,
                    description: d.description || undefined,
                    due_date: d.due_date || undefined,
                    items: [{
                      description: d.item_description,
                      unit: d.item_unit,
                      quantity: parseFloat(d.item_quantity) || 0,
                    }],
                    vendor_ids: [],
                  });
                  resetRFQ(); setShowNewRFQ(false);
                } catch (e: any) {
                  setFormError(e?.response?.data?.message || "Failed to create RFQ");
                }
              })}
            >
              <Input label="RFQ title" placeholder="Cement and aggregates Q3 2026" {...regRFQ("title", { required: true })} />
              <Input label="Due date" type="date" {...regRFQ("due_date")} />
              <Input label="First item description" placeholder="OPC Cement 43 Grade" {...regRFQ("item_description", { required: true })} />
              <Input label="Unit" placeholder="bag" {...regRFQ("item_unit", { required: true })} />
              <Input label="Quantity" type="number" {...regRFQ("item_quantity", { required: true })} />
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Description</label>
                <textarea className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-16 text-gray-900 dark:text-gray-100" {...regRFQ("description")} />
              </div>
              {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setShowNewRFQ(false); resetRFQ(); setFormError(""); }}>Cancel</Button>
                <Button type="submit" loading={createRFQ.isPending}>Create RFQ</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── New PO form ── */}
      {showNewPO && selectedProjectId && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">New Purchase Order</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handlePO(async d => {
                setFormError("");
                try {
                  await createPO.mutateAsync({
                    vendor_id: d.vendor_id,
                    delivery_date: d.delivery_date || undefined,
                    payment_terms: d.payment_terms || undefined,
                    currency: "NPR",
                    items: [{
                      description: d.item_description,
                      unit: d.item_unit,
                      quantity: parseFloat(d.item_quantity) || 0,
                      unit_rate: parseFloat(d.item_rate) || 0,
                    }],
                  });
                  resetPO(); setShowNewPO(false);
                } catch (e: any) {
                  setFormError(e?.response?.data?.message || "Failed to create PO");
                }
              })}
            >
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Vendor</label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                  {...regPO("vendor_id", { required: true })}
                >
                  <option value="">Select vendor...</option>
                  {(vendors ?? []).map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                  ))}
                </select>
              </div>
              <Input label="Delivery date" type="date" {...regPO("delivery_date")} />
              <Input label="Item description" placeholder="OPC Cement 43 Grade" {...regPO("item_description", { required: true })} />
              <Input label="Unit" placeholder="bag" {...regPO("item_unit", { required: true })} />
              <Input label="Quantity" type="number" {...regPO("item_quantity", { required: true })} />
              <Input label="Unit rate (NPR)" type="number" {...regPO("item_rate", { required: true })} />
              <Input label="Payment terms" placeholder="30 days net" {...regPO("payment_terms")} />
              {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setShowNewPO(false); resetPO(); setFormError(""); }}>Cancel</Button>
                <Button type="submit" loading={createPO.isPending}>Create PO</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── New GRN form ── */}
      {showNewGRN && selectedProjectId && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">New Goods Receipt Note</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleGRN(async d => {
                setFormError("");
                if (!d.po_id) { setFormError("Please select a Purchase Order"); return; }
                const po = (pos ?? []).find((p: any) => p.id === d.po_id);
                if (!po?.items?.length) { setFormError("Selected PO has no items"); return; }
                try {
                  await createGRN.mutateAsync({
                    po_id: d.po_id,
                    received_date: d.received_date,
                    delivery_note: d.delivery_note || undefined,
                    inspection_passed: d.inspection_passed !== "false",
                    notes: d.notes || undefined,
                    items: po.items.map((item: any) => ({
                      po_item_id: item.id,
                      description: item.description,
                      unit: item.unit,
                      ordered_quantity: item.quantity,
                      received_quantity: parseFloat(d[`qty_${item.id}`]) || 0,
                      rejected_quantity: parseFloat(d[`rejected_${item.id}`]) || 0,
                      unit_rate: item.unit_rate,
                    })),
                  });
                  resetGRN(); setShowNewGRN(false); setGrnForPO(null);
                } catch (e: any) {
                  setFormError(e?.response?.data?.message || "Failed to create GRN");
                }
              })}
            >
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  Purchase Order
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                  {...regGRN("po_id", { required: true })}
                  onChange={e => {
                    const po = (pos ?? []).find((p: any) => p.id === e.target.value);
                    setGrnForPO(po ?? null);
                  }}
                >
                  <option value="">Select approved PO...</option>
                  {approvedOrSentPOs.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.po_number} — {formatCurrency(p.grand_total)}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Received date" type="date" defaultValue={new Date().toISOString().split("T")[0]} {...regGRN("received_date", { required: true })} />
              <Input label="Delivery note number" placeholder="DN-2026-001" {...regGRN("delivery_note")} />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Inspection</label>
                <select className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm" {...regGRN("inspection_passed")}>
                  <option value="true">✅ Passed</option>
                  <option value="false">❌ Failed</option>
                </select>
              </div>

              {/* Dynamic item rows from selected PO */}
              {grnForPO?.items?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Items received
                  </p>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Ordered</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Received</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grnForPO.items.map((item: any) => (
                          <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.description}</td>
                            <td className="px-3 py-2 text-right text-gray-500">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                defaultValue={item.quantity}
                                min={0}
                                max={item.quantity}
                                step="0.01"
                                className="h-8 w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-right ml-auto block"
                                {...regGRN(`qty_${item.id}`)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                defaultValue={0}
                                min={0}
                                step="0.01"
                                className="h-8 w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-right ml-auto block"
                                {...regGRN(`rejected_${item.id}`)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Notes</label>
                <textarea className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm h-16 text-gray-900 dark:text-gray-100" {...regGRN("notes")} />
              </div>
              {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setShowNewGRN(false); resetGRN(); setGrnForPO(null); setFormError(""); }}>Cancel</Button>
                <Button type="submit" loading={createGRN.isPending}>Create GRN</Button>
              </div>
            </form>
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
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* PO Table with Submit + Approve buttons */}
      {activeTab === "Purchase Orders" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">VAT</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-left">Delivery</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {posLoading ? (
                  <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : !selectedProjectId ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">Select a project above to view purchase orders</td></tr>
                ) : !pos?.length ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">No purchase orders yet — create one above</td></tr>
                ) : (pos ?? []).map((po: any) => (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{po.po_number}</td>
                    <td className="px-4 py-3"><Badge status={po.status} /></td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(po.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(po.tax_amount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(po.grand_total)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(po.delivery_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {po.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={submitPO.isPending}
                            onClick={() => submitPO.mutate(po.id)}
                          >
                            <Send className="h-3 w-3 mr-1" /> Submit
                          </Button>
                        )}
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
                        {["approved", "sent", "partially_received"].includes(po.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setGrnForPO(po);
                              setShowNewGRN(true);
                              setActiveTab("GRNs");
                            }}
                          >
                            <PackageCheck className="h-3 w-3 mr-1" /> Receive
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadFile(`/purchase-orders/${po.id}/pdf`, `po-${po.po_number}.pdf`)}
                        >
                          <FileDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vendors */}
      {activeTab === "Vendors" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">PAN</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {vendorsLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : !(vendors ?? []).length ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No vendors yet — click '+ Vendor' to add one</td></tr>
                ) : (vendors ?? []).map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{v.name}</p>
                      <p className="text-xs text-gray-500">{v.code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{v.category?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.contact_person ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{v.pan_number ?? "—"}</td>
                    <td className="px-4 py-3"><Badge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* RFQs */}
      {activeTab === "RFQs" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">RFQ Number</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rfqsLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : !selectedProjectId ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">Select a project above</td></tr>
                ) : !(rfqs ?? []).length ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No RFQs yet — click '+ RFQ' to create one</td></tr>
                ) : (rfqs ?? []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{r.rfq_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{r.title}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.due_date)}</td>
                    <td className="px-4 py-3">
                      {r.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={sendRFQ.isPending}
                          onClick={() => sendRFQ.mutate(r.id)}
                        >
                          <Send className="h-3 w-3 mr-1" /> Send to vendors
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

      {/* GRNs */}
      {activeTab === "GRNs" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">GRN Number</th>
                  <th className="px-4 py-3 text-left">Received Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Inspection</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {grnsLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" /></td></tr>
                ) : !selectedProjectId ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">Select a project above</td></tr>
                ) : !(grns ?? []).length ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No GRNs yet — approve a PO first, then click GRN</td></tr>
                ) : (grns ?? []).map((g: any) => (
                  <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{g.grn_number}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{formatDate(g.received_date)}</td>
                    <td className="px-4 py-3"><Badge status={g.status} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${g.inspection_passed ? "text-green-600" : "text-red-600"}`}>
                        {g.inspection_passed ? "✅ Passed" : "❌ Failed"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {g.status === "draft" && (
                        <Button
                          size="sm"
                          variant="success"
                          loading={confirmGRN.isPending}
                          onClick={() => confirmGRN.mutate(g.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Confirm GRN
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
    </div>
  );
}