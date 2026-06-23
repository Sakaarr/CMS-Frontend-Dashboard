"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    useApproveChangeOrder,
    useApproveExpense,
    useApproveInvoice,
    useCashflow,
    useChangeOrders,
    useCreateChangeOrder,
    useCreateExpense,
    useCreateInvoice,
    useExpenses,
    useFinanceSummary,
    useInvoices,
    usePaymentCerts,
    useRecordPayment,
    useSubmitInvoice,
} from "@/hooks/useFinance";
import { useProjects } from "@/hooks/useProjects";
import { formatCurrency, formatDate, downloadFile } from "@/lib/utils";
import {
    AlertTriangle,
    CheckCircle,
    DollarSign,
    FileDown,
    Loader2,
    Plus,
    TrendingDown,
    TrendingUp,
    Send,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
    Area,
    AreaChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis
} from "recharts";
import { PermissionGuard } from "@/components/layouts/PermissionGuard";

const TABS = [
  "Overview", "Invoices", "Expenses",
  "Change Orders", "Payment Certs",
] as const;
type Tab = typeof TABS[number];

export default function FinancePage() {
  return (
    <PermissionGuard module="can_finance">
      <FinancePageContent />
    </PermissionGuard>
  );
}

function FinancePageContent() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [projectId, setProjectId] = useState("");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [showNewCO, setShowNewCO] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const { data: projects } = useProjects();
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(projectId);
  const { data: cashflow } = useCashflow(projectId);
  const { data: invoicesData } = useInvoices(projectId);
  const { data: expensesData } = useExpenses(projectId);
  const { data: changeOrders } = useChangeOrders(projectId);
  const { data: paymentCerts } = usePaymentCerts(projectId);

  const createInvoice = useCreateInvoice(projectId);
  const approveInvoice = useApproveInvoice(projectId);
  const recordPayment = useRecordPayment(projectId);
  const createExpense = useCreateExpense(projectId);
  const approveExpense = useApproveExpense(projectId);
  const approveChangeOrder = useApproveChangeOrder(projectId);
  const createCO = useCreateChangeOrder(projectId);

  const { register: regInv, handleSubmit: handleInv, reset: resetInv } = useForm();
  const { register: regExp, handleSubmit: handleExp, reset: resetExp } = useForm();
  const { register: regCO, handleSubmit: handleCO, reset: resetCO } = useForm();
  const { register: regPay, handleSubmit: handlePay, reset: resetPay } = useForm();

  const invoices = invoicesData?.data ?? [];
  const submitInvoice = useSubmitInvoice(projectId);
  const expenses = expensesData?.data ?? [];

  // Shared input className
  const inputCls = "h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";
  const selectCls = "h-10 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";
  const labelCls = "text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Finance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Invoices, expenses, payments and change orders
          </p>
        </div>
        <div className="flex gap-2">
          {projectId && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowNewExpense(true)}>
                <Plus className="h-4 w-4 mr-1" /> Expense
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowNewCO(true)}>
                <Plus className="h-4 w-4 mr-1" /> Change Order
              </Button>
              <Button size="sm" onClick={() => setShowNewInvoice(true)}>
                <Plus className="h-4 w-4 mr-1" /> Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Project selector */}
      <select
        className={`${selectCls} max-w-sm`}
        value={projectId}
        onChange={e => setProjectId(e.target.value)}
      >
        <option value="">Select a project...</option>
        {projects?.data.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
        ))}
      </select>

      {/* New Invoice form */}
      {showNewInvoice && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">New Invoice</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4 lg:grid-cols-3"
              onSubmit={handleInv(async d => {
                await createInvoice.mutateAsync({
                  invoice_type: d.invoice_type,
                  client_name: d.client_name,
                  invoice_date: d.invoice_date,
                  due_date: d.due_date,
                  vat_rate: parseFloat(d.vat_rate) || 13,
                  retention_rate: parseFloat(d.retention_rate) || 0,
                  currency: "NPR",
                  notes: d.notes,
                  line_items: [{
                    description: d.item_description,
                    unit: d.item_unit,
                    quantity: parseFloat(d.item_quantity) || 0,
                    unit_rate: parseFloat(d.item_rate) || 0,
                  }],
                });
                resetInv();
                setShowNewInvoice(false);
              })}
            >
              <div>
                <label className={labelCls}>Type</label>
                <select className={selectCls} {...regInv("invoice_type")}>
                  <option value="client">Client invoice</option>
                  <option value="vendor">Vendor invoice</option>
                  <option value="subcontractor">Subcontractor</option>
                </select>
              </div>
              <Input label="Client / vendor name" {...regInv("client_name")} />
              <Input label="Invoice date" type="date" {...regInv("invoice_date", { required: true })} />
              <Input label="Due date" type="date" {...regInv("due_date")} />
              <Input label="VAT rate %" type="number" defaultValue="13" {...regInv("vat_rate")} />
              <Input label="Retention rate %" type="number" defaultValue="0" {...regInv("retention_rate")} />
              <Input label="Item description" placeholder="Concrete works — Foundation" {...regInv("item_description", { required: true })} />
              <Input label="Unit" placeholder="cum" {...regInv("item_unit", { required: true })} />
              <Input label="Quantity" type="number" {...regInv("item_quantity", { required: true })} />
              <Input label="Unit rate (NPR)" type="number" {...regInv("item_rate", { required: true })} />
              <Input label="Notes" {...regInv("notes")} />
              <div className="flex items-end gap-2">
                <Button type="submit" loading={createInvoice.isPending}>Create</Button>
                <Button type="button" variant="outline" onClick={() => setShowNewInvoice(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* New Expense form */}
      {showNewExpense && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">New Expense</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4 lg:grid-cols-3"
              onSubmit={handleExp(async d => {
                await createExpense.mutateAsync({
                  category: d.category,
                  description: d.description,
                  amount: parseFloat(d.amount),
                  expense_date: d.expense_date,
                  vendor_name: d.vendor_name,
                  pan_number: d.pan_number,
                  include_vat: d.include_vat === "true",
                });
                resetExp();
                setShowNewExpense(false);
              })}
            >
              <div>
                <label className={labelCls}>Category</label>
                <select className={selectCls} {...regExp("category", { required: true })}>
                  {["material","labour","equipment","transport","office","utilities","professional","miscellaneous"].map(c => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select>
              </div>
              <Input label="Description" {...regExp("description", { required: true })} />
              <Input label="Amount (NPR)" type="number" {...regExp("amount", { required: true })} />
              <Input label="Expense date" type="date" {...regExp("expense_date", { required: true })} />
              <Input label="Vendor name" {...regExp("vendor_name")} />
              <Input label="PAN number" {...regExp("pan_number")} />
              <div className="flex items-end gap-2">
                <Button type="submit" loading={createExpense.isPending}>Create</Button>
                <Button type="button" variant="outline" onClick={() => setShowNewExpense(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* New Change Order form */}
      {showNewCO && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="dark:text-gray-100">New Change Order</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleCO(async d => {
                await createCO.mutateAsync({
                  title: d.title,
                  description: d.description,
                  reason: d.reason,
                  amount: parseFloat(d.amount),
                  impact_days: parseInt(d.impact_days) || 0,
                });
                resetCO();
                setShowNewCO(false);
              })}
            >
              <Input label="Title" {...regCO("title", { required: true })} />
              <Input label="Amount (NPR)" type="number" {...regCO("amount", { required: true })} />
              <Input label="Impact (days)" type="number" defaultValue="0" {...regCO("impact_days")} />
              <Input label="Reason" {...regCO("reason")} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="submit" loading={createCO.isPending}>Create</Button>
                <Button type="button" variant="outline" onClick={() => setShowNewCO(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payment modal */}
      {payingInvoiceId && (
        <Card className="border-2 border-blue-200 dark:border-blue-800 dark:bg-gray-900">
          <CardHeader><CardTitle className="dark:text-gray-100">Record Payment</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handlePay(async d => {
                await recordPayment.mutateAsync({
                  invoiceId: payingInvoiceId,
                  data: {
                    payment_date: d.payment_date,
                    amount: parseFloat(d.amount),
                    method: d.method,
                    reference: d.reference,
                  },
                });
                resetPay();
                setPayingInvoiceId(null);
              })}
            >
              <Input label="Payment date" type="date" {...regPay("payment_date", { required: true })} />
              <Input label="Amount (NPR)" type="number" {...regPay("amount", { required: true })} />
              <div>
                <label className={labelCls}>Method</label>
                <select className={selectCls} {...regPay("method")}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="esewa">eSewa</option>
                  <option value="khalti">Khalti</option>
                  <option value="fonepay">FonePay</option>
                </select>
              </div>
              <Input label="Reference" placeholder="Transaction ID / cheque no." {...regPay("reference")} />
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="submit" loading={recordPayment.isPending}>Record payment</Button>
                <Button type="button" variant="outline" onClick={() => setPayingInvoiceId(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "Overview" && (
        <div className="space-y-6">
          {!projectId ? (
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="py-12 text-center text-gray-400 dark:text-gray-500">
                Select a project to view finance overview
              </CardContent>
            </Card>
          ) : summaryLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          ) : summary ? (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KPICard label="Total invoiced" value={formatCurrency(summary.total_invoiced)}
                  icon={<DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />} bg="bg-blue-50 dark:bg-blue-900/20" />
                <KPICard label="Total received" value={formatCurrency(summary.total_received)}
                  icon={<TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />} bg="bg-green-50 dark:bg-green-900/20" />
                <KPICard label="Outstanding" value={formatCurrency(summary.total_outstanding)}
                  icon={<TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />} bg="bg-red-50 dark:bg-red-900/20" />
                <KPICard label="Total expenses" value={formatCurrency(summary.total_expenses)}
                  icon={<DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />} bg="bg-purple-50 dark:bg-purple-900/20" />
              </div>

              {(summary.overdue_invoices > 0 || summary.pending_approval > 0) && (
                <div className="flex flex-wrap gap-3">
                  {summary.overdue_invoices > 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        {summary.overdue_invoices} overdue invoice{summary.overdue_invoices > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {summary.pending_approval > 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {summary.pending_approval} awaiting approval
                      </span>
                    </div>
                  )}
                </div>
              )}

              {cashflow && cashflow.length > 0 && (
                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader><CardTitle className="dark:text-gray-100">Cashflow</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={cashflow}>
                        <defs>
                          <linearGradient id="invoiced" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="received" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip
                          formatter={(v: any) => formatCurrency(v)}
                          contentStyle={{ borderRadius: 8, border: "1px solid #374151", backgroundColor: "#1f2937", fontSize: 12 }}
                          labelStyle={{ color: "#d1d5db" }}
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="invoiced" name="Invoiced"
                          stroke="#3b82f6" fill="url(#invoiced)" strokeWidth={2} />
                        <Area type="monotone" dataKey="received" name="Received"
                          stroke="#10b981" fill="url(#received)" strokeWidth={2} />
                        <Area type="monotone" dataKey="expenses" name="Expenses"
                          stroke="#ef4444" fill="url(#expenses)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Invoices tab */}
      {tab === "Invoices" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Client / Vendor</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-left">Due date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!invoices.length ? (
                  <tr><td colSpan={9} className="py-10 text-center text-gray-400 dark:text-gray-500">No invoices yet</td></tr>
                ) : invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{inv.invoice_type}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{inv.client_name ?? "—"}</td>
                    <td className="px-4 py-3"><Badge status={inv.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(inv.grand_total)}</td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(inv.paid_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(inv.balance_due)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {inv.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={submitInvoice?.isPending}
                            onClick={() => submitInvoice.mutate(inv.id)}
                          >
                            <Send className="h-3 w-3 mr-1" /> Submit
                          </Button>
                        )}
                        {inv.status === "submitted" && (
                          <Button
                            size="sm"
                            variant="success"
                            loading={approveInvoice.isPending}
                            onClick={() => approveInvoice.mutate(inv.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        )}
                        {["approved", "partially_paid", "overdue"].includes(inv.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPayingInvoiceId(inv.id)}
                          >
                            Record payment
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadFile(`/invoices/${inv.id}/pdf`, `invoice-${inv.invoice_number}.pdf`)}
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

      {/* Expenses tab */}
      {tab === "Expenses" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Number</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">VAT</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!expenses.length ? (
                  <tr><td colSpan={9} className="py-10 text-center text-gray-400 dark:text-gray-500">No expenses yet</td></tr>
                ) : expenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{exp.expense_number}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{exp.category}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{exp.description}</td>
                    <td className="px-4 py-3"><Badge status={exp.status} /></td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{formatCurrency(exp.vat_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(exp.total_amount)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{formatDate(exp.expense_date)}</td>
                    <td className="px-4 py-3">
                      {exp.status === "submitted" && (
                        <Button size="sm" variant="success"
                          loading={approveExpense.isPending}
                          onClick={() => approveExpense.mutate(exp.id)}
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

      {/* Change Orders tab */}
      {tab === "Change Orders" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">CO Number</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Impact (days)</th>
                  <th className="px-4 py-3 text-right">Revised value</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!changeOrders?.length ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400 dark:text-gray-500">No change orders yet</td></tr>
                ) : changeOrders.map((co: any) => (
                  <tr key={co.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{co.co_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{co.title}</td>
                    <td className="px-4 py-3"><Badge status={co.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(co.amount)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{co.impact_days}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {co.revised_contract_value ? formatCurrency(co.revised_contract_value) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {co.status === "submitted" && (
                        <Button size="sm" variant="success"
                          loading={approveChangeOrder.isPending}
                          onClick={() => approveChangeOrder.mutate(co.id)}
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

      {/* Payment Certificates tab */}
      {tab === "Payment Certs" && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-left">Certificate</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-right">Work done</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Retention</th>
                  <th className="px-4 py-3 text-right">Net payable</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!paymentCerts?.length ? (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400 dark:text-gray-500">No payment certificates yet</td></tr>
                ) : paymentCerts.map((cert: any) => (
                  <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{cert.cert_number}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {formatDate(cert.period_from)} → {formatDate(cert.period_to)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(cert.work_done_value)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(cert.gross_amount)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{formatCurrency(cert.retention_amount)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700 dark:text-blue-400">{formatCurrency(cert.net_payable)}</td>
                    <td className="px-4 py-3"><Badge status={cert.status} /></td>
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

function KPICard({ label, value, icon, bg }: {
  label: string; value: string;
  icon: React.ReactNode; bg: string;
}) {
  return (
    <Card className="dark:bg-gray-900 dark:border-gray-800">
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
